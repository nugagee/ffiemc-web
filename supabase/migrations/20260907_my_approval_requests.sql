-- Requesters can track their own approval requests, add feedback, and cancel pending items.

create table if not exists public.admin_change_request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.admin_change_requests(id) on delete cascade,
  admin_id uuid references public.admins(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_change_request_comments_req_idx
  on public.admin_change_request_comments (request_id, created_at);

alter table public.admin_change_request_comments enable row level security;

create or replace function public._change_request_json(p_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select to_jsonb(x)
  from (
    select
      r.*,
      coalesce(req.username, req.email, '') as requested_by_name,
      req.email as requested_by_email,
      coalesce(rev.username, rev.email, '') as reviewed_by_name,
      rev.email as reviewed_by_email,
      case
        when r.status = 'pending' and exists (
          select 1 from public.admin_change_request_comments c where c.request_id = r.id
        ) then 'in_review'
        else r.status
      end as progress,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', c.id,
          'body', c.body,
          'created_at', c.created_at,
          'admin_id', c.admin_id,
          'author_name', coalesce(a.username, a.email, '')
        ) order by c.created_at)
        from public.admin_change_request_comments c
        left join public.admins a on a.id = c.admin_id
        where c.request_id = r.id
      ), '[]'::jsonb) as comments
    from public.admin_change_requests r
    left join public.admins req on req.id = r.requested_by
    left join public.admins rev on rev.id = r.reviewed_by
    where r.id = p_id
  ) x
$$;

create or replace function public.admin_inbox_counts(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_members_pending integer := 0;
  v_members_approved integer := 0;
  v_members_all integer := 0;
  v_approvals_pending integer := 0;
  v_my_pending integer := 0;
begin
  v_admin := public._require_admin(p_token);
  if public._has_perm(v_admin, 'church_members', 'view') then
    select
      count(*) filter (where status = 'pending'),
      count(*) filter (where status in ('approved', 'active')),
      count(*)
    into v_members_pending, v_members_approved, v_members_all
    from public.church_members;
  end if;
  if v_admin.role = 'superadmin' or coalesce((v_admin.permissions -> 'approvals' ->> 'view')::boolean, false)
     or coalesce((v_admin.permissions -> 'approvals' ->> 'edit')::boolean, false) then
    select count(*) into v_approvals_pending
    from public.admin_change_requests
    where status = 'pending';
  end if;
  select count(*) into v_my_pending
  from public.admin_change_requests
  where status = 'pending' and requested_by = v_admin.id;
  return jsonb_build_object(
    'members_pending', v_members_pending,
    'members_approved', v_members_approved,
    'members_all', v_members_all,
    'approvals_pending', v_approvals_pending,
    'my_requests_pending', v_my_pending,
    'approvals_by_feature', coalesce((
      select jsonb_object_agg(feature, cnt)
      from (
        select feature, count(*)::int as cnt
        from public.admin_change_requests
        where status = 'pending'
        group by feature
      ) s
    ), '{}'::jsonb)
  );
end;
$$;

create or replace function public.admin_list_change_requests(
  p_token text,
  p_feature text default null,
  p_status text default 'pending',
  p_scope text default 'inbox'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_review boolean;
  v_scope text := coalesce(nullif(trim(p_scope), ''), 'inbox');
begin
  v_admin := public._require_admin(p_token);
  v_review := v_admin.role = 'superadmin'
    or coalesce((v_admin.permissions -> 'approvals' ->> 'view')::boolean, false)
    or coalesce((v_admin.permissions -> 'approvals' ->> 'edit')::boolean, false);

  if v_scope = 'mine' then
    return coalesce((
      select jsonb_agg(public._change_request_json(r.id) order by r.created_at desc)
      from public.admin_change_requests r
      where r.requested_by = v_admin.id
        and (p_status is null or p_status = 'all' or r.status = p_status)
        and (p_feature is null or p_feature = '' or p_feature = 'all' or r.feature = p_feature)
    ), '[]'::jsonb);
  end if;

  if not v_review then
    raise exception 'You do not have permission to view the approval inbox';
  end if;

  return coalesce((
    select jsonb_agg(public._change_request_json(r.id) order by r.created_at desc)
    from public.admin_change_requests r
    where (p_status is null or p_status = 'all' or r.status = p_status)
      and (p_feature is null or p_feature = '' or p_feature = 'all' or r.feature = p_feature)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_add_change_request_comment(
  p_token text,
  p_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_row public.admin_change_requests%rowtype;
  v_review boolean;
begin
  v_admin := public._require_admin(p_token);
  select * into v_row from public.admin_change_requests where id = p_id;
  if not found then raise exception 'Request not found'; end if;
  v_review := v_admin.role = 'superadmin'
    or coalesce((v_admin.permissions -> 'approvals' ->> 'edit')::boolean, false);
  if not (v_review or v_row.requested_by = v_admin.id) then
    raise exception 'You cannot comment on this request';
  end if;
  if trim(coalesce(p_body, '')) = '' then
    raise exception 'Comment cannot be empty';
  end if;
  insert into public.admin_change_request_comments (request_id, admin_id, body)
  values (p_id, v_admin.id, trim(p_body));
  return public._change_request_json(p_id);
end;
$$;

create or replace function public.admin_cancel_change_request(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_row public.admin_change_requests%rowtype;
begin
  v_admin := public._require_admin(p_token);
  select * into v_row from public.admin_change_requests where id = p_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_row.requested_by <> v_admin.id then
    raise exception 'Only the requester can withdraw this request';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Only pending requests can be withdrawn';
  end if;
  update public.admin_change_requests
  set status = 'cancelled',
      review_note = coalesce(nullif(trim(v_row.review_note), ''), 'Withdrawn by requester'),
      reviewed_by = v_admin.id,
      reviewed_at = now()
  where id = p_id;
  return public._change_request_json(p_id);
end;
$$;

grant execute on function public._change_request_json(uuid) to anon, authenticated;
drop function if exists public.admin_list_change_requests(text, text, text);
grant execute on function public.admin_list_change_requests(text, text, text, text) to anon, authenticated;
grant execute on function public.admin_add_change_request_comment(text, uuid, text) to anon, authenticated;
grant execute on function public.admin_cancel_change_request(text, uuid) to anon, authenticated;
