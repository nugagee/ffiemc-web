-- Member status filters, inbox counts, and admin change-request approvals.
-- Non-superadmin edits/deletes of critical records queue here until a superadmin
-- (or an admin with approvals.edit) confirms.

create table if not exists public.admin_change_requests (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  action text not null check (action in ('update', 'delete', 'create')),
  resource_type text not null,
  resource_id uuid,
  title text not null default '',
  payload jsonb not null default '{}'::jsonb,
  previous jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by uuid references public.admins(id) on delete set null,
  reviewed_by uuid references public.admins(id) on delete set null,
  review_note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists admin_change_requests_status_idx
  on public.admin_change_requests (status, feature, created_at desc);

alter table public.admin_change_requests enable row level security;

create or replace function public._can_review_approvals(p_admin public.admins)
returns boolean
language plpgsql
stable
set search_path = public
as $$
begin
  if p_admin.role = 'superadmin' then return true; end if;
  return coalesce((p_admin.permissions -> 'approvals' ->> 'edit')::boolean, false);
end;
$$;

create or replace function public.admin_list_church_members(
  p_token text,
  p_role_id uuid default null,
  p_branch_id uuid default null,
  p_status_group text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'church_members', 'view');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'full_name', m.full_name, 'email', m.email, 'phone', m.phone,
      'gender', m.gender, 'date_of_birth', m.date_of_birth,
      'address', m.address, 'city', m.city, 'state', m.state, 'country', m.country,
      'role_id', m.role_id, 'role_name', r.name,
      'branch_id', m.branch_id, 'branch_name', b.name, 'branch_region', b.region,
      'ministry', m.ministry, 'baptism_status', m.baptism_status,
      'marital_status', m.marital_status, 'occupation', m.occupation,
      'emergency_contact_name', m.emergency_contact_name,
      'emergency_contact_phone', m.emergency_contact_phone,
      'notes', m.notes, 'form_data', m.form_data,
      'status', m.status, 'registered_by_admin', m.registered_by_admin,
      'email_sent', m.email_sent, 'created_at', m.created_at, 'updated_at', m.updated_at
    ) order by m.created_at desc)
    from public.church_members m
    left join public.church_roles r on r.id = m.role_id
    left join public.church_branches b on b.id = m.branch_id
    where (p_role_id is null or m.role_id = p_role_id)
      and (p_branch_id is null or m.branch_id = p_branch_id)
      and (
        p_status_group is null or p_status_group in ('', 'all')
        or (p_status_group = 'pending' and m.status = 'pending')
        or (p_status_group = 'approved' and m.status in ('approved', 'active'))
        or (p_status_group = 'inactive' and m.status = 'inactive')
      )
  ), '[]'::jsonb);
end;
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
  return jsonb_build_object(
    'members_pending', v_members_pending,
    'members_approved', v_members_approved,
    'members_all', v_members_all,
    'approvals_pending', v_approvals_pending,
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

create or replace function public.admin_submit_change_request(
  p_token text,
  p_feature text,
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_title text,
  p_payload jsonb,
  p_previous jsonb
)
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
  if v_admin.role = 'superadmin' then
    raise exception 'Superadmins apply changes directly; no approval queue needed';
  end if;
  insert into public.admin_change_requests (
    feature, action, resource_type, resource_id, title, payload, previous, requested_by
  ) values (
    coalesce(nullif(trim(p_feature), ''), 'unknown'),
    coalesce(nullif(trim(p_action), ''), 'update'),
    coalesce(nullif(trim(p_resource_type), ''), p_feature),
    p_resource_id,
    coalesce(nullif(trim(p_title), ''), p_action || ' ' || p_feature),
    coalesce(p_payload, '{}'::jsonb),
    coalesce(p_previous, '{}'::jsonb),
    v_admin.id
  ) returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_list_change_requests(
  p_token text,
  p_feature text default null,
  p_status text default 'pending'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_review boolean;
begin
  v_admin := public._require_admin(p_token);
  v_review := v_admin.role = 'superadmin'
    or coalesce((v_admin.permissions -> 'approvals' ->> 'view')::boolean, false)
    or coalesce((v_admin.permissions -> 'approvals' ->> 'edit')::boolean, false);
  if not v_review then
    raise exception 'You do not have permission to view approval requests';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
    from (
      select
        r.*,
        coalesce(req.username, req.email, '') as requested_by_name,
        req.email as requested_by_email,
        coalesce(rev.username, rev.email, '') as reviewed_by_name,
        rev.email as reviewed_by_email
      from public.admin_change_requests r
      left join public.admins req on req.id = r.requested_by
      left join public.admins rev on rev.id = r.reviewed_by
      where (p_status is null or p_status = 'all' or r.status = p_status)
        and (p_feature is null or p_feature = '' or p_feature = 'all' or r.feature = p_feature)
      order by r.created_at desc
      limit 500
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public._apply_change_request(p_req public.admin_change_requests)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d jsonb := coalesce(p_req.payload, '{}'::jsonb);
begin
  if p_req.action = 'delete' then
    if p_req.resource_type = 'church_members' then
      delete from public.church_members where id = p_req.resource_id;
    elsif p_req.resource_type = 'program_registrations' then
      delete from public.program_registrations where id = p_req.resource_id;
    elsif p_req.resource_type = 'volunteer_applications' then
      delete from public.volunteer_applications where id = p_req.resource_id;
    elsif p_req.resource_type = 'church_branches' then
      delete from public.church_branches where id = p_req.resource_id;
    elsif p_req.resource_type = 'church_roles' then
      delete from public.church_roles where id = p_req.resource_id;
    elsif p_req.resource_type = 'church_programs' then
      delete from public.church_programs where id = p_req.resource_id;
    elsif p_req.resource_type = 'announcements' then
      delete from public.announcements where id = p_req.resource_id;
    elsif p_req.resource_type = 'contact_messages' then
      delete from public.contact_messages where id = p_req.resource_id;
    else
      raise exception 'Unsupported delete type: %', p_req.resource_type;
    end if;
    return;
  end if;

  if p_req.action = 'update' and p_req.resource_type = 'church_members' then
    update public.church_members set
      full_name = coalesce(nullif(trim(d->>'full_name'), ''), full_name),
      email = coalesce(nullif(lower(trim(d->>'email')), ''), email),
      phone = coalesce(d->>'phone', phone),
      gender = coalesce(d->>'gender', gender),
      date_of_birth = case when d ? 'date_of_birth' then nullif(d->>'date_of_birth', '')::date else date_of_birth end,
      address = coalesce(d->>'address', address),
      city = coalesce(d->>'city', city),
      state = coalesce(d->>'state', state),
      country = coalesce(d->>'country', country),
      role_id = coalesce(nullif(d->>'role_id', '')::uuid, role_id),
      branch_id = coalesce(nullif(d->>'branch_id', '')::uuid, branch_id),
      ministry = coalesce(d->>'ministry', ministry),
      baptism_status = coalesce(d->>'baptism_status', baptism_status),
      marital_status = coalesce(d->>'marital_status', marital_status),
      occupation = coalesce(d->>'occupation', occupation),
      emergency_contact_name = coalesce(d->>'emergency_contact_name', emergency_contact_name),
      emergency_contact_phone = coalesce(d->>'emergency_contact_phone', emergency_contact_phone),
      notes = coalesce(d->>'notes', notes),
      form_data = coalesce(d->'form_data', form_data),
      status = coalesce(nullif(d->>'status', ''), status),
      updated_at = now()
    where id = p_req.resource_id;
    return;
  end if;

  if p_req.action = 'update' and p_req.resource_type = 'program_registrations' then
    update public.program_registrations set
      full_name = coalesce(nullif(trim(d->>'full_name'), ''), full_name),
      email = coalesce(d->>'email', email),
      phone = coalesce(d->>'phone', phone),
      branch_id = coalesce(nullif(d->>'branch_id', '')::uuid, branch_id),
      status = coalesce(nullif(d->>'status', ''), status),
      form_data = coalesce(d->'form_data', form_data),
      updated_at = now()
    where id = p_req.resource_id;
    return;
  end if;

  if p_req.action = 'update' and p_req.resource_type = 'volunteer_applications' then
    update public.volunteer_applications set
      full_name = coalesce(nullif(trim(d->>'full_name'), ''), full_name),
      email = coalesce(d->>'email', email),
      phone = coalesce(d->>'phone', phone),
      role_interest = coalesce(d->>'role_interest', role_interest),
      status = coalesce(nullif(d->>'status', ''), status),
      review_notes = coalesce(d->>'review_notes', review_notes),
      updated_at = now()
    where id = p_req.resource_id;
    return;
  end if;

  if p_req.action = 'update' and p_req.resource_type = 'church_branches' then
    update public.church_branches set
      name = coalesce(nullif(trim(d->>'name'), ''), name),
      city = coalesce(d->>'city', city),
      state = coalesce(d->>'state', state),
      country = coalesce(d->>'country', country),
      region = coalesce(d->>'region', region),
      is_international = coalesce((d->>'is_international')::boolean, is_international),
      description = coalesce(d->>'description', description),
      updated_at = now()
    where id = p_req.resource_id;
    return;
  end if;

  if p_req.action = 'update' and p_req.resource_type = 'church_roles' then
    update public.church_roles set
      name = coalesce(nullif(trim(d->>'name'), ''), name),
      description = coalesce(d->>'description', description)
    where id = p_req.resource_id;
    return;
  end if;

  raise exception 'Unsupported change: % %', p_req.action, p_req.resource_type;
end;
$$;

create or replace function public.admin_review_change_request(
  p_token text,
  p_id uuid,
  p_decision text,
  p_note text default ''
)
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
  if not (v_admin.role = 'superadmin' or coalesce((v_admin.permissions -> 'approvals' ->> 'edit')::boolean, false)) then
    raise exception 'You do not have permission to review approval requests';
  end if;
  select * into v_row from public.admin_change_requests where id = p_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_row.status <> 'pending' then raise exception 'This request has already been reviewed'; end if;

  if p_decision = 'approved' then
    perform public._apply_change_request(v_row);
  elsif p_decision not in ('rejected', 'cancelled') then
    raise exception 'Decision must be approved or rejected';
  end if;

  update public.admin_change_requests
  set status = p_decision,
      review_note = coalesce(p_note, ''),
      reviewed_by = v_admin.id,
      reviewed_at = now()
  where id = p_id
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

grant execute on function public.admin_list_church_members(text, uuid, uuid, text) to anon, authenticated;
grant execute on function public.admin_inbox_counts(text) to anon, authenticated;
grant execute on function public.admin_submit_change_request(text, text, text, text, uuid, text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.admin_list_change_requests(text, text, text) to anon, authenticated;
grant execute on function public.admin_review_change_request(text, uuid, text, text) to anon, authenticated;
