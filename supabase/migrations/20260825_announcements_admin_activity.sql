-- Site announcement popups + superadmin admin activity audit log

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body text not null default '',
  image text not null default '',
  link_url text not null default '',
  link_text text not null default 'Learn more',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  show_once boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_active_window_idx
  on public.announcements (is_active, starts_at, ends_at);

alter table public.announcements enable row level security;

drop policy if exists "public_read_active_announcements" on public.announcements;
create policy "public_read_active_announcements" on public.announcements
  for select to anon, authenticated
  using (
    is_active = true
    and starts_at <= now()
    and (ends_at is null or ends_at >= now())
  );

grant select on public.announcements to anon, authenticated;

create or replace function public.public_list_active_announcements()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return coalesce((
    select jsonb_agg(to_jsonb(a) order by a.sort_order asc, a.created_at desc)
    from public.announcements a
    where a.is_active = true
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at >= now())
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.public_list_active_announcements() to anon, authenticated;

create or replace function public.admin_list_announcements(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not (
    public._has_perm(v_admin, 'home.announcements', 'view')
    or public._has_perm(v_admin, 'home.hero', 'edit')
    or public._has_perm(v_admin, 'home', 'view')
  ) then
    raise exception 'You do not have permission to view announcements';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(a) order by a.sort_order asc, a.created_at desc)
    from public.announcements a
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_announcement(
  p_token text,
  p_id uuid,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_row public.announcements%rowtype;
  v_ends timestamptz;
begin
  v_admin := public._require_admin(p_token);
  if not (
    public._has_perm(v_admin, 'home.announcements', 'edit')
    or public._has_perm(v_admin, 'home.hero', 'edit')
  ) then
    raise exception 'You do not have permission to edit announcements';
  end if;

  v_ends := nullif(trim(coalesce(p_data->>'ends_at', '')), '')::timestamptz;

  insert into public.announcements (
    id, title, body, image, link_url, link_text,
    starts_at, ends_at, is_active, show_once, sort_order, updated_at
  )
  values (
    v_id,
    coalesce(p_data->>'title', ''),
    coalesce(p_data->>'body', ''),
    coalesce(p_data->>'image', ''),
    coalesce(p_data->>'link_url', p_data->>'linkUrl', ''),
    coalesce(nullif(p_data->>'link_text', ''), nullif(p_data->>'linkText', ''), 'Learn more'),
    coalesce(nullif(p_data->>'starts_at', '')::timestamptz, now()),
    v_ends,
    coalesce((p_data->>'is_active')::boolean, (p_data->>'isActive')::boolean, true),
    coalesce((p_data->>'show_once')::boolean, (p_data->>'showOnce')::boolean, true),
    coalesce(
      (p_data->>'sort_order')::integer,
      (select coalesce(max(sort_order), -1) + 1 from public.announcements),
      0
    ),
    now()
  )
  on conflict (id) do update set
    title = excluded.title,
    body = excluded.body,
    image = excluded.image,
    link_url = excluded.link_url,
    link_text = excluded.link_text,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    is_active = excluded.is_active,
    show_once = excluded.show_once,
    sort_order = case
      when p_data ? 'sort_order' then excluded.sort_order
      else public.announcements.sort_order
    end,
    updated_at = now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_delete_announcement(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not (
    public._has_perm(v_admin, 'home.announcements', 'delete')
    or public._has_perm(v_admin, 'home.hero', 'edit')
  ) then
    raise exception 'You do not have permission to delete announcements';
  end if;
  delete from public.announcements where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_list_announcements(text) to anon, authenticated;
grant execute on function public.admin_upsert_announcement(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_announcement(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin activity audit (superadmin only to read)
-- ---------------------------------------------------------------------------

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  path text not null default '',
  action text not null default 'navigate',
  meta jsonb not null default '{}'::jsonb,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_log_created_idx
  on public.admin_activity_log (created_at desc);

create index if not exists admin_activity_log_admin_idx
  on public.admin_activity_log (admin_id, created_at desc);

alter table public.admin_activity_log enable row level security;
-- No public policies: only security-definer RPCs

create or replace function public.admin_log_activity(
  p_token text,
  p_path text,
  p_action text default 'navigate',
  p_meta jsonb default '{}'::jsonb,
  p_user_agent text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_id uuid;
begin
  v_admin := public._require_admin(p_token);

  insert into public.admin_activity_log (admin_id, path, action, meta, user_agent)
  values (
    v_admin.id,
    coalesce(nullif(trim(p_path), ''), '/admin'),
    coalesce(nullif(trim(p_action), ''), 'navigate'),
    coalesce(p_meta, '{}'::jsonb),
    coalesce(p_user_agent, '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.admin_log_activity(text, text, text, jsonb, text) to anon, authenticated;

create or replace function public.admin_list_activity(
  p_token text,
  p_limit integer default 200,
  p_admin_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_limit integer := greatest(1, least(coalesce(p_limit, 200), 1000));
begin
  v_admin := public._require_admin(p_token);
  if v_admin.role <> 'superadmin' then
    raise exception 'Only superadmins can view the activity log';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
    from (
      select
        l.id,
        l.admin_id,
        l.path,
        l.action,
        l.meta,
        l.user_agent,
        l.created_at,
        a.username,
        a.email,
        a.role,
        a.full_name
      from public.admin_activity_log l
      join public.admins a on a.id = l.admin_id
      where (p_admin_id is null or l.admin_id = p_admin_id)
      order by l.created_at desc
      limit v_limit
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_list_activity(text, integer, uuid) to anon, authenticated;
