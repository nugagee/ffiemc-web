-- Event popup banners (extend announcements) + member notification campaigns
-- Run after 20260830_church_branches.sql
-- Creates public.announcements if 20260825_announcements_admin_activity.sql was not applied.

-- ---------------------------------------------------------------------------
-- Announcements table (safe if already present)
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
grant execute on function public.admin_delete_announcement(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Extend announcements for homepage / site scope + optional routing
-- ---------------------------------------------------------------------------
drop function if exists public.public_list_active_announcements();

alter table public.announcements
  add column if not exists display_scope text not null default 'home'
    check (display_scope in ('home', 'site'));

alter table public.announcements
  add column if not exists route_enabled boolean not null default true;

create or replace function public.public_list_active_announcements(p_path text default '/')
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_path text := coalesce(nullif(trim(p_path), ''), '/');
  v_is_home boolean := v_path in ('/', '/home');
begin
  return coalesce((
    select jsonb_agg(to_jsonb(a) order by a.sort_order asc, a.created_at desc)
    from public.announcements a
    where a.is_active = true
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at >= now())
      and (
        a.display_scope = 'site'
        or (a.display_scope = 'home' and v_is_home)
      )
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.public_list_active_announcements(text) to anon, authenticated;

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
  v_scope text;
begin
  v_admin := public._require_admin(p_token);
  if not (
    public._has_perm(v_admin, 'home.announcements', 'edit')
    or public._has_perm(v_admin, 'home.hero', 'edit')
  ) then
    raise exception 'You do not have permission to edit announcements';
  end if;

  v_ends := nullif(trim(coalesce(p_data->>'ends_at', '')), '')::timestamptz;
  v_scope := lower(coalesce(nullif(p_data->>'display_scope', ''), nullif(p_data->>'displayScope', ''), 'home'));
  if v_scope not in ('home', 'site') then
    v_scope := 'home';
  end if;

  insert into public.announcements (
    id, title, body, image, link_url, link_text,
    starts_at, ends_at, is_active, show_once, sort_order,
    display_scope, route_enabled, updated_at
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
    v_scope,
    coalesce((p_data->>'route_enabled')::boolean, (p_data->>'routeEnabled')::boolean, true),
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
    display_scope = excluded.display_scope,
    route_enabled = excluded.route_enabled,
    updated_at = now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- Seed Youth Convention 2026 homepage popup
insert into public.announcements (
  title, body, image, link_url, link_text,
  starts_at, ends_at, is_active, show_once, sort_order,
  display_scope, route_enabled
)
select
  'FFYC''26 — The Refiner',
  'Fire-Fire Youth Convention 2026 — Wednesday 9th to Saturday 12th September 2026 at Fire-Fire HQ, Ibadan. Day & Night. Register now!',
  '/ffyc-2026-flyer.png',
  '/register/youth-convention-2026',
  'Register now',
  now(),
  '2026-09-13T00:00:00+01:00'::timestamptz,
  true,
  true,
  0,
  'home',
  true
where not exists (
  select 1 from public.announcements a where a.link_url = '/register/youth-convention-2026'
);

-- ---------------------------------------------------------------------------
-- Notification categories (audience presets)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  filters jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.notification_categories (name, slug, description, filters, sort_order) values
  ('All registered members', 'all-members', 'Every member in the registry, including pending applications', '{"statuses":[],"source":"members"}', 1),
  ('All active members', 'all-active-members', 'Approved and active bonafide members (excludes pending)', '{"statuses":["approved","active"],"source":"members"}', 2),
  ('Pending members', 'pending-members', 'New registrations waiting for approval', '{"statuses":["pending"],"source":"members"}', 3),
  ('Program registrants', 'program-registrants', 'People who registered for a specific program', '{"source":"program_registrants"}', 4),
  ('International members', 'international-members', 'Members at international branches', '{"source":"members","branch_regions":["international"]}', 5),
  ('Local members (Nigeria)', 'local-members', 'Members at local Nigerian branches', '{"source":"members","branch_regions":["local"]}', 6),
  ('Pastoral team', 'pastoral-team', 'Pastors, ministers, and elders', '{"source":"members","role_names":["Pastor","Minister","Elder"]}', 7),
  ('Youth leaders', 'youth-leaders', 'Youth ministry leadership', '{"source":"members","role_names":["Youth Leader"]}', 8)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  filters = excluded.filters,
  is_active = true;

-- ---------------------------------------------------------------------------
-- Member notification campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subject text not null default '',
  body text not null default '',
  program_id uuid references public.church_programs(id) on delete set null,
  category_id uuid references public.notification_categories(id) on delete set null,
  audience_filters jsonb not null default '{}'::jsonb,
  send_email boolean not null default true,
  send_sms boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipient_count integer not null default 0,
  email_sent integer not null default 0,
  email_failed integer not null default 0,
  sms_sent integer not null default 0,
  sms_failed integer not null default 0,
  admin_id uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_notifications_status_idx on public.member_notifications (status, created_at desc);

create table if not exists public.member_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.member_notifications(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('member', 'registration')),
  recipient_id uuid not null,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  channel text not null check (channel in ('email', 'sms')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  error_message text not null default '',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists member_notification_deliveries_notification_idx
  on public.member_notification_deliveries (notification_id);

alter table public.notification_categories enable row level security;
alter table public.member_notifications enable row level security;
alter table public.member_notification_deliveries enable row level security;

-- ---------------------------------------------------------------------------
-- Permissions: member_notifications
-- ---------------------------------------------------------------------------
create or replace function public._has_perm(p_admin public.admins, p_feature text, p_action text)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_page text;
  v_section text;
  v_pages jsonb;
  v_sec jsonb;
  v_legacy text;
begin
  if p_admin.role = 'superadmin' then return true; end if;
  if p_feature is null or p_action is null then return false; end if;

  if p_feature in (
    'overview', 'visitors', 'contacts',
    'program_types', 'programs', 'program_registrations', 'church_roles', 'church_members',
    'church_branches', 'member_notifications'
  ) then
    if p_action = 'view' then
      return coalesce((p_admin.permissions -> p_feature ->> 'view')::boolean, false)
          or coalesce((p_admin.permissions -> p_feature ->> 'edit')::boolean, false)
          or coalesce((p_admin.permissions -> p_feature ->> 'delete')::boolean, false);
    end if;
    return coalesce((p_admin.permissions -> p_feature ->> p_action)::boolean, false);
  end if;

  v_pages := coalesce(p_admin.permissions -> 'pages', '{}'::jsonb);

  if position('.' in p_feature) > 0 then
    v_page := split_part(p_feature, '.', 1);
    v_section := split_part(p_feature, '.', 2);
    v_sec := v_pages -> v_page -> 'sections' -> v_section;
    if p_action = 'view' then
      if coalesce((v_pages -> v_page ->> 'access')::boolean, false)
        or coalesce((v_sec ->> 'edit')::boolean, false)
        or coalesce((v_sec ->> 'delete')::boolean, false) then
        return true;
      end if;
    elsif coalesce((v_sec ->> p_action)::boolean, false) then
      return true;
    end if;

    v_legacy := case p_feature
      when 'home.hero' then 'hero'
      when 'blog.posts' then 'blog'
      when 'events.list' then 'events'
      when 'sermons.list' then 'sermons'
      when 'ministries.list' then 'ministries'
      when 'testimonies.list' then 'testimonies'
      when 'prayer.inbox' then 'prayers'
      when 'contact.church' then 'website'
      when 'home.welcome' then 'website'
      when 'services.times' then 'website'
      else null
    end;
    if v_legacy is not null then
      if p_action = 'view' then
        return coalesce((p_admin.permissions -> v_legacy ->> 'view')::boolean, false)
            or coalesce((p_admin.permissions -> v_legacy ->> 'edit')::boolean, false)
            or coalesce((p_admin.permissions -> v_legacy ->> 'delete')::boolean, false);
      end if;
      return coalesce((p_admin.permissions -> v_legacy ->> p_action)::boolean, false);
    end if;
    return false;
  end if;

  if coalesce((v_pages -> p_feature ->> 'access')::boolean, false) then
    if p_action = 'view' then return true; end if;
    return exists (
      select 1 from jsonb_each(coalesce(v_pages -> p_feature -> 'sections', '{}'::jsonb)) s
      where coalesce((s.value ->> p_action)::boolean, false)
    );
  end if;
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Resolve recipients from filters
-- ---------------------------------------------------------------------------
create or replace function public._notification_recipients(p_filters jsonb)
returns table (
  recipient_type text,
  recipient_id uuid,
  full_name text,
  email text,
  phone text
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_source text := coalesce(p_filters->>'source', 'members');
  v_program_id uuid := nullif(p_filters->>'program_id', '')::uuid;
  v_role_ids uuid[] := '{}';
  v_branch_ids uuid[] := '{}';
  v_statuses text[] := '{}';
  v_role_names text[] := '{}';
  v_branch_regions text[] := '{}';
  v_ministry text := nullif(trim(p_filters->>'ministry'), '');
begin
  if p_filters ? 'role_ids' and jsonb_typeof(p_filters->'role_ids') = 'array' then
    select coalesce(array_agg(x::uuid), '{}')
    into v_role_ids
    from jsonb_array_elements_text(p_filters->'role_ids') t(x)
    where nullif(x, '') is not null;
  end if;

  if p_filters ? 'branch_ids' and jsonb_typeof(p_filters->'branch_ids') = 'array' then
    select coalesce(array_agg(x::uuid), '{}')
    into v_branch_ids
    from jsonb_array_elements_text(p_filters->'branch_ids') t(x)
    where nullif(x, '') is not null;
  end if;

  if p_filters ? 'statuses' and jsonb_typeof(p_filters->'statuses') = 'array' then
    select coalesce(array_agg(x), '{}')
    into v_statuses
    from jsonb_array_elements_text(p_filters->'statuses') t(x)
    where nullif(x, '') is not null;
  end if;

  if p_filters ? 'role_names' and jsonb_typeof(p_filters->'role_names') = 'array' then
    select coalesce(array_agg(x), '{}')
    into v_role_names
    from jsonb_array_elements_text(p_filters->'role_names') t(x)
    where nullif(x, '') is not null;
  end if;

  if p_filters ? 'branch_regions' and jsonb_typeof(p_filters->'branch_regions') = 'array' then
    select coalesce(array_agg(x), '{}')
    into v_branch_regions
    from jsonb_array_elements_text(p_filters->'branch_regions') t(x)
    where nullif(x, '') is not null;
  end if;

  if v_source = 'program_registrants' or v_program_id is not null then
    return query
    select
      'registration'::text,
      pr.id,
      pr.full_name,
      pr.email,
      pr.phone
    from public.program_registrations pr
    left join public.church_branches b on b.id = pr.branch_id
    where pr.status in ('registered', 'confirmed', 'attended')
      and (v_program_id is null or pr.program_id = v_program_id)
      and (cardinality(v_branch_ids) = 0 or pr.branch_id = any(v_branch_ids))
      and (cardinality(v_branch_regions) = 0 or coalesce(b.region, '') = any(v_branch_regions));
    return;
  end if;

  return query
  select
    'member'::text,
    m.id,
    m.full_name,
    m.email,
    m.phone
  from public.church_members m
  left join public.church_roles r on r.id = m.role_id
  left join public.church_branches b on b.id = m.branch_id
  where (cardinality(v_statuses) = 0 or m.status = any(v_statuses))
    and (cardinality(v_role_ids) = 0 or m.role_id = any(v_role_ids))
    and (cardinality(v_branch_ids) = 0 or m.branch_id = any(v_branch_ids))
    and (cardinality(v_role_names) = 0 or r.name = any(v_role_names))
    and (cardinality(v_branch_regions) = 0 or b.region = any(v_branch_regions))
    and (v_ministry is null or m.ministry ilike '%' || v_ministry || '%');
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs: categories & notifications
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_notification_categories(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'member_notifications', 'view') then
    raise exception 'You do not have permission to view notification categories';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(c) order by c.sort_order asc, c.name asc)
    from public.notification_categories c
    where c.is_active = true
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_list_member_notifications(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'member_notifications', 'view') then
    raise exception 'You do not have permission to view member notifications';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
    from (
      select
        n.*,
        c.name as category_name,
        p.title as program_title,
        p.slug as program_slug
      from public.member_notifications n
      left join public.notification_categories c on c.id = n.category_id
      left join public.church_programs p on p.id = n.program_id
      order by n.created_at desc
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_preview_notification_recipients(
  p_token text,
  p_filters jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'member_notifications', 'view') then
    raise exception 'You do not have permission to preview recipients';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(r)::jsonb)
    from public._notification_recipients(p_filters) r
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_member_notification(
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
  v_row public.member_notifications%rowtype;
  v_filters jsonb;
  v_category public.notification_categories%rowtype;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'member_notifications', 'edit') then
    raise exception 'You do not have permission to edit member notifications';
  end if;

  v_filters := coalesce(p_data->'audience_filters', p_data->'audienceFilters', '{}'::jsonb);

  if p_data ? 'category_id' and nullif(p_data->>'category_id', '') is not null then
    select * into v_category from public.notification_categories where id = (p_data->>'category_id')::uuid;
    if found then
      v_filters := v_category.filters || v_filters;
    end if;
  end if;

  if p_data ? 'program_id' and nullif(p_data->>'program_id', '') is not null then
    v_filters := v_filters || jsonb_build_object('program_id', p_data->>'program_id', 'source', 'program_registrants');
  end if;

  insert into public.member_notifications (
    id, title, subject, body, program_id, category_id, audience_filters,
    send_email, send_sms, status, scheduled_at, admin_id, updated_at
  )
  values (
    v_id,
    coalesce(p_data->>'title', ''),
    coalesce(nullif(p_data->>'subject', ''), p_data->>'title', ''),
    coalesce(p_data->>'body', ''),
    nullif(p_data->>'program_id', '')::uuid,
    nullif(p_data->>'category_id', '')::uuid,
    v_filters,
    coalesce((p_data->>'send_email')::boolean, (p_data->>'sendEmail')::boolean, true),
    coalesce((p_data->>'send_sms')::boolean, (p_data->>'sendSms')::boolean, false),
    coalesce(nullif(p_data->>'status', ''), 'draft'),
    nullif(p_data->>'scheduled_at', '')::timestamptz,
    v_admin.id,
    now()
  )
  on conflict (id) do update set
    title = excluded.title,
    subject = excluded.subject,
    body = excluded.body,
    program_id = excluded.program_id,
    category_id = excluded.category_id,
    audience_filters = excluded.audience_filters,
    send_email = excluded.send_email,
    send_sms = excluded.send_sms,
    status = case
      when public.member_notifications.status in ('sent', 'sending') then public.member_notifications.status
      else excluded.status
    end,
    scheduled_at = excluded.scheduled_at,
    updated_at = now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_delete_member_notification(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'member_notifications', 'delete') then
    raise exception 'You do not have permission to delete member notifications';
  end if;
  delete from public.member_notifications where id = p_id and status in ('draft', 'cancelled', 'failed');
  if not found then
    raise exception 'Cannot delete a notification that has been sent or is sending';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_start_member_notification(
  p_token text,
  p_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_row public.member_notifications%rowtype;
  v_recipients jsonb;
  v_count integer;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'member_notifications', 'edit') then
    raise exception 'You do not have permission to send member notifications';
  end if;

  select * into v_row from public.member_notifications where id = p_id for update;
  if not found then
    raise exception 'Notification not found';
  end if;
  if v_row.status in ('sent', 'sending') then
    raise exception 'Notification has already been sent or is in progress';
  end if;
  if not v_row.send_email and not v_row.send_sms then
    raise exception 'Select at least one channel (email or SMS)';
  end if;
  if trim(v_row.title) = '' or trim(v_row.body) = '' then
    raise exception 'Title and message body are required';
  end if;

  select coalesce(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb)
  into v_recipients
  from public._notification_recipients(v_row.audience_filters) r;

  v_count := jsonb_array_length(v_recipients);
  if v_count = 0 then
    raise exception 'No recipients match the selected audience';
  end if;

  update public.member_notifications
  set status = 'sending',
      recipient_count = v_count,
      admin_id = v_admin.id,
      updated_at = now()
  where id = p_id;

  delete from public.member_notification_deliveries where notification_id = p_id;

  insert into public.member_notification_deliveries (
    notification_id, recipient_type, recipient_id, full_name, email, phone, channel, status
  )
  select
    p_id,
    (r->>'recipient_type')::text,
    (r->>'recipient_id')::uuid,
    coalesce(r->>'full_name', ''),
    coalesce(r->>'email', ''),
    coalesce(r->>'phone', ''),
    ch.channel,
    'pending'
  from jsonb_array_elements(v_recipients) r
  cross join lateral (
    select unnest(
      array_remove(
        array[
          case when v_row.send_email and nullif(trim(r->>'email'), '') is not null then 'email' end,
          case when v_row.send_sms and nullif(trim(r->>'phone'), '') is not null then 'sms' end
        ],
        null
      )
    ) as channel
  ) ch;

  return jsonb_build_object(
    'notification_id', p_id,
    'recipient_count', v_count,
    'deliveries', (
      select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
      from public.member_notification_deliveries d
      where d.notification_id = p_id and d.status = 'pending'
    )
  );
end;
$$;

create or replace function public.admin_complete_member_notification(
  p_token text,
  p_id uuid,
  p_results jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_row public.member_notifications%rowtype;
  v_result jsonb;
  v_email_sent integer := 0;
  v_email_failed integer := 0;
  v_sms_sent integer := 0;
  v_sms_failed integer := 0;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'member_notifications', 'edit') then
    raise exception 'You do not have permission to complete member notifications';
  end if;

  for v_result in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb))
  loop
    update public.member_notification_deliveries d
    set
      status = coalesce(v_result->>'status', 'failed'),
      error_message = coalesce(v_result->>'error_message', v_result->>'error', ''),
      sent_at = case when coalesce(v_result->>'status', '') = 'sent' then now() else d.sent_at end
    where d.id = (v_result->>'delivery_id')::uuid
      and d.notification_id = p_id;

    if coalesce(v_result->>'channel', '') = 'email' then
      if coalesce(v_result->>'status', '') = 'sent' then
        v_email_sent := v_email_sent + 1;
      else
        v_email_failed := v_email_failed + 1;
      end if;
    elsif coalesce(v_result->>'channel', '') = 'sms' then
      if coalesce(v_result->>'status', '') = 'sent' then
        v_sms_sent := v_sms_sent + 1;
      else
        v_sms_failed := v_sms_failed + 1;
      end if;
    end if;
  end loop;

  update public.member_notifications
  set
    status = case when v_email_failed + v_sms_failed > 0 and v_email_sent + v_sms_sent = 0 then 'failed' else 'sent' end,
    sent_at = now(),
    email_sent = v_email_sent,
    email_failed = v_email_failed,
    sms_sent = v_sms_sent,
    sms_failed = v_sms_failed,
    updated_at = now()
  where id = p_id
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

grant execute on function public.admin_list_notification_categories(text) to anon, authenticated;
grant execute on function public.admin_list_member_notifications(text) to anon, authenticated;
grant execute on function public.admin_preview_notification_recipients(text, jsonb) to anon, authenticated;
grant execute on function public.admin_upsert_member_notification(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_member_notification(text, uuid) to anon, authenticated;
grant execute on function public.admin_start_member_notification(text, uuid) to anon, authenticated;
grant execute on function public.admin_complete_member_notification(text, uuid, jsonb) to anon, authenticated;
