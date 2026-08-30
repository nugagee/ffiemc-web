-- Banner popup analytics/reactions + media volunteer applications
-- Run after 20260831_banner_sticky_recurrence.sql (and program CMS if used)

alter table public.announcements
  add column if not exists accent_color text not null default '#b91c1c';
alter table public.announcements
  add column if not exists button_color text not null default '#fbbf24';
alter table public.announcements
  add column if not exists delay_seconds integer not null default 3;
alter table public.announcements
  drop constraint if exists announcements_delay_seconds_check;
alter table public.announcements
  add constraint announcements_delay_seconds_check
  check (delay_seconds >= 0 and delay_seconds <= 30);
alter table public.announcements
  add column if not exists popup_mode text not null default 'every_visit';
alter table public.announcements
  drop constraint if exists announcements_popup_mode_check;
alter table public.announcements
  add constraint announcements_popup_mode_check
  check (popup_mode in ('every_visit', 'once'));

-- Default existing banners to every visit unless they were show-once
update public.announcements
set popup_mode = case when show_once then 'once' else 'every_visit' end
where popup_mode is null or popup_mode = 'every_visit';

-- ---------------------------------------------------------------------------
-- Banner activity log
-- ---------------------------------------------------------------------------
create table if not exists public.announcement_events (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  visitor_id text not null default '',
  session_id text not null default '',
  action text not null,
  path text not null default '/',
  user_agent text not null default '',
  device_type text not null default '',
  browser text not null default '',
  os text not null default '',
  language text not null default '',
  timezone text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists announcement_events_banner_idx
  on public.announcement_events (announcement_id, created_at desc);
create index if not exists announcement_events_visitor_idx
  on public.announcement_events (visitor_id, created_at desc);

alter table public.announcement_events enable row level security;

create or replace function public.public_track_announcement_event(
  p_announcement_id uuid,
  p_action text,
  p_visitor_id text default '',
  p_session_id text default '',
  p_path text default '/',
  p_user_agent text default '',
  p_device_type text default '',
  p_browser text default '',
  p_os text default '',
  p_language text default '',
  p_timezone text default '',
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_action text := lower(trim(coalesce(p_action, '')));
begin
  if p_announcement_id is null then
    raise exception 'Banner is required';
  end if;
  if v_action not in (
    'impression', 'view', 'click', 'close', 'hide_forever',
    'react_interested', 'react_like', 'sticky_click', 'sticky_view'
  ) then
    raise exception 'Unknown banner action';
  end if;

  insert into public.announcement_events (
    announcement_id, visitor_id, session_id, action, path, user_agent,
    device_type, browser, os, language, timezone, meta
  ) values (
    p_announcement_id,
    left(coalesce(p_visitor_id, ''), 80),
    left(coalesce(p_session_id, ''), 80),
    v_action,
    left(coalesce(p_path, '/'), 200),
    left(coalesce(p_user_agent, ''), 400),
    left(coalesce(p_device_type, ''), 40),
    left(coalesce(p_browser, ''), 40),
    left(coalesce(p_os, ''), 40),
    left(coalesce(p_language, ''), 40),
    left(coalesce(p_timezone, ''), 80),
    coalesce(p_meta, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.public_track_announcement_event(
  uuid, text, text, text, text, text, text, text, text, text, text, jsonb
) to anon, authenticated;

create or replace function public.admin_announcement_stats(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not (
    public._has_perm(v_admin, 'home.announcements', 'view')
    or public._has_perm(v_admin, 'home.hero', 'edit')
  ) then
    raise exception 'You do not have permission to view banner analytics';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.starts_at desc nulls last)
    from (
      select
        a.id,
        a.title,
        a.placement,
        a.is_active,
        a.starts_at,
        a.ends_at,
        count(e.id) filter (where e.action in ('view', 'impression')) as views,
        count(e.id) filter (where e.action in ('click', 'sticky_click')) as clicks,
        count(e.id) filter (where e.action = 'close') as closes,
        count(e.id) filter (where e.action = 'hide_forever') as hide_forever,
        count(e.id) filter (where e.action in ('react_interested', 'react_like')) as reactions,
        count(distinct e.visitor_id) filter (where e.visitor_id <> '') as unique_visitors
      from public.announcements a
      left join public.announcement_events e on e.announcement_id = a.id
      group by a.id
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_list_announcement_events(
  p_token text,
  p_announcement_id uuid default null,
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_limit integer := greatest(1, least(coalesce(p_limit, 500), 2000));
begin
  v_admin := public._require_admin(p_token);
  if not (
    public._has_perm(v_admin, 'home.announcements', 'view')
    or public._has_perm(v_admin, 'home.hero', 'edit')
  ) then
    raise exception 'You do not have permission to view banner activity';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
    from (
      select
        e.*,
        a.title as banner_title
      from public.announcement_events e
      join public.announcements a on a.id = e.announcement_id
      where p_announcement_id is null or e.announcement_id = p_announcement_id
      order by e.created_at desc
      limit v_limit
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_announcement_stats(text) to anon, authenticated;
grant execute on function public.admin_list_announcement_events(text, uuid, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Recreate upsert with color / delay / popup_mode
-- ---------------------------------------------------------------------------
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
  v_place text;
  v_repeat text;
  v_daily time;
  v_rotate integer;
  v_mode text;
  v_delay integer;
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
  if v_scope not in ('home', 'site') then v_scope := 'home'; end if;

  v_place := lower(coalesce(nullif(p_data->>'placement', ''), 'popup'));
  if v_place not in ('popup', 'sticky', 'both') then v_place := 'popup'; end if;

  v_repeat := lower(coalesce(nullif(p_data->>'repeat_interval', ''), nullif(p_data->>'repeatInterval', ''), 'none'));
  if v_repeat not in ('none', 'weekly', 'monthly', 'yearly') then v_repeat := 'none'; end if;

  v_daily := nullif(trim(coalesce(p_data->>'daily_end_time', p_data->>'dailyEndTime', '')), '')::time;
  v_rotate := coalesce((p_data->>'rotate_seconds')::integer, (p_data->>'rotateSeconds')::integer, 12);
  if v_rotate < 4 then v_rotate := 4; end if;
  if v_rotate > 180 then v_rotate := 180; end if;

  v_mode := lower(coalesce(nullif(p_data->>'popup_mode', ''), nullif(p_data->>'popupMode', ''), 'every_visit'));
  if v_mode not in ('every_visit', 'once') then v_mode := 'every_visit'; end if;

  v_delay := coalesce((p_data->>'delay_seconds')::integer, (p_data->>'delaySeconds')::integer, 3);
  if v_delay < 0 then v_delay := 0; end if;
  if v_delay > 30 then v_delay := 30; end if;

  insert into public.announcements (
    id, title, body, image, link_url, link_text,
    starts_at, ends_at, is_active, show_once, sort_order,
    display_scope, route_enabled, placement, repeat_interval,
    daily_end_time, rotate_seconds, accent_color, button_color,
    delay_seconds, popup_mode, updated_at
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
    (v_mode = 'once'),
    coalesce(
      (p_data->>'sort_order')::integer,
      (select coalesce(max(sort_order), -1) + 1 from public.announcements),
      0
    ),
    v_scope,
    coalesce((p_data->>'route_enabled')::boolean, (p_data->>'routeEnabled')::boolean, true),
    v_place,
    v_repeat,
    v_daily,
    v_rotate,
    coalesce(nullif(p_data->>'accent_color', ''), nullif(p_data->>'accentColor', ''), '#b91c1c'),
    coalesce(nullif(p_data->>'button_color', ''), nullif(p_data->>'buttonColor', ''), '#fbbf24'),
    v_delay,
    v_mode,
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
    placement = excluded.placement,
    repeat_interval = excluded.repeat_interval,
    daily_end_time = excluded.daily_end_time,
    rotate_seconds = excluded.rotate_seconds,
    accent_color = excluded.accent_color,
    button_color = excluded.button_color,
    delay_seconds = excluded.delay_seconds,
    popup_mode = excluded.popup_mode,
    updated_at = now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- Seed volunteer banner (popup + sticky)
insert into public.announcements (
  title, body, image, link_url, link_text,
  starts_at, ends_at, is_active, show_once, sort_order,
  display_scope, route_enabled, placement, repeat_interval,
  accent_color, button_color, delay_seconds, popup_mode, rotate_seconds
)
select
  'Volunteers needed — Media Department',
  'Use your gifts. Build the Kingdom. Join the Fire-Fire media & social media team — editors, writers, and social media handlers. No experience? Training is provided.',
  '/media-volunteers-flyer.png',
  '/volunteer/media-department',
  'Join the team',
  now(),
  null,
  true,
  false,
  1,
  'home',
  true,
  'both',
  'none',
  '#4c1d95',
  '#facc15',
  3,
  'every_visit',
  10
where not exists (
  select 1 from public.announcements a where a.link_url = '/volunteer/media-department'
);

-- ---------------------------------------------------------------------------
-- Volunteer teams & applications
-- ---------------------------------------------------------------------------
create table if not exists public.volunteer_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  heading text not null default '',
  intro text not null default '',
  image text not null default '',
  whatsapp_url text not null default '',
  admin_email text not null default '',
  assigned_admin_id uuid references public.admins(id) on delete set null,
  roles jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.volunteer_teams(id) on delete cascade,
  full_name text not null,
  email text not null default '',
  phone text not null default '',
  branch_id uuid references public.church_branches(id) on delete set null,
  role_interest text not null default '',
  skills text not null default '',
  experience_level text not null default '',
  availability text not null default '',
  notes text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'waitlist')),
  assigned_admin_id uuid references public.admins(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text not null default '',
  email_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.volunteer_application_audit (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.volunteer_applications(id) on delete set null,
  admin_id uuid references public.admins(id) on delete set null,
  action text not null default 'update',
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists volunteer_applications_team_idx on public.volunteer_applications (team_id, created_at desc);
create index if not exists volunteer_applications_status_idx on public.volunteer_applications (status);

alter table public.volunteer_teams enable row level security;
alter table public.volunteer_applications enable row level security;
alter table public.volunteer_application_audit enable row level security;

insert into public.volunteer_teams (
  name, slug, description, heading, intro, image, whatsapp_url, admin_email, roles, is_active
)
select
  'Media Department',
  'media-department',
  'Editors, visual artists, content writers, and social media handlers.',
  'Volunteers needed — Media Department',
  'Use your gifts. Build the Kingdom. Be part of a team that makes an impact through creativity and excellence. No experience? Training and mentorship will be provided.',
  '/media-volunteers-flyer.png',
  'https://chat.whatsapp.com/lxD4IrQz3g19oIQhCSro2H',
  'info@firefireintl.org',
  '["Editor / Visual Artist","Content Writer / Creator","Social Media Handler (Facebook, X, TikTok, Instagram)"]'::jsonb,
  true
where not exists (select 1 from public.volunteer_teams t where t.slug = 'media-department');

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
    'church_branches', 'member_notifications', 'volunteer_applications'
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

create or replace function public.public_get_volunteer_team(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.volunteer_teams%rowtype;
begin
  select * into v_row
  from public.volunteer_teams
  where slug = lower(trim(p_slug)) and is_active = true;
  if not found then
    raise exception 'Volunteer team not found';
  end if;
  return jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'slug', v_row.slug,
    'heading', coalesce(nullif(v_row.heading, ''), v_row.name),
    'intro', coalesce(nullif(v_row.intro, ''), v_row.description),
    'description', v_row.description,
    'image', v_row.image,
    'whatsappUrl', v_row.whatsapp_url,
    'roles', coalesce(v_row.roles, '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_volunteer_application(
  p_team_slug text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_branch_id uuid default null,
  p_role_interest text default '',
  p_skills text default '',
  p_experience_level text default '',
  p_availability text default '',
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.volunteer_teams%rowtype;
  v_id uuid;
  v_branch text := '';
begin
  select * into v_team from public.volunteer_teams
  where slug = lower(trim(p_team_slug)) and is_active = true;
  if not found then raise exception 'Volunteer team not found'; end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 then raise exception 'Full name is required'; end if;
  if length(trim(coalesce(p_email, ''))) < 5 then raise exception 'Valid email is required'; end if;

  if p_branch_id is not null then
    select name into v_branch from public.church_branches where id = p_branch_id;
  end if;

  insert into public.volunteer_applications (
    team_id, full_name, email, phone, branch_id, role_interest, skills,
    experience_level, availability, notes, status, assigned_admin_id
  ) values (
    v_team.id,
    trim(p_full_name),
    lower(trim(p_email)),
    trim(coalesce(p_phone, '')),
    p_branch_id,
    trim(coalesce(p_role_interest, '')),
    trim(coalesce(p_skills, '')),
    trim(coalesce(p_experience_level, '')),
    trim(coalesce(p_availability, '')),
    trim(coalesce(p_notes, '')),
    'pending',
    v_team.assigned_admin_id
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'teamName', v_team.name,
    'adminEmail', v_team.admin_email,
    'branchName', coalesce(v_branch, '')
  );
end;
$$;

create or replace function public.mark_volunteer_application_emailed(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.volunteer_applications set email_sent = true, updated_at = now() where id = p_id;
end;
$$;

create or replace function public.admin_list_volunteer_teams(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'volunteer_applications', 'view') then
    raise exception 'You do not have permission to view volunteer teams';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.name) from public.volunteer_teams t), '[]'::jsonb);
end;
$$;

create or replace function public.admin_list_volunteer_applications(p_token text, p_team_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'volunteer_applications', 'view') then
    raise exception 'You do not have permission to view volunteer applications';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
    from (
      select
        a.*,
        t.name as team_name,
        t.slug as team_slug,
        b.name as branch_name,
        ad.full_name as assigned_admin_name,
        ad.email as assigned_admin_email
      from public.volunteer_applications a
      join public.volunteer_teams t on t.id = a.team_id
      left join public.church_branches b on b.id = a.branch_id
      left join public.admins ad on ad.id = a.assigned_admin_id
      where p_team_id is null or a.team_id = p_team_id
      order by a.created_at desc
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_update_volunteer_application(p_token text, p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_before public.volunteer_applications%rowtype;
  v_row public.volunteer_applications%rowtype;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'volunteer_applications', 'edit') then
    raise exception 'You do not have permission to update volunteer applications';
  end if;
  select * into v_before from public.volunteer_applications where id = p_id;
  if not found then raise exception 'Application not found'; end if;

  update public.volunteer_applications set
    full_name = coalesce(nullif(trim(p_data->>'full_name'), ''), full_name),
    email = coalesce(nullif(lower(trim(p_data->>'email')), ''), email),
    phone = coalesce(p_data->>'phone', phone),
    branch_id = case when p_data ? 'branch_id' then nullif(p_data->>'branch_id', '')::uuid else branch_id end,
    role_interest = coalesce(p_data->>'role_interest', role_interest),
    skills = coalesce(p_data->>'skills', skills),
    experience_level = coalesce(p_data->>'experience_level', experience_level),
    availability = coalesce(p_data->>'availability', availability),
    notes = coalesce(p_data->>'notes', notes),
    status = coalesce(nullif(p_data->>'status', ''), status),
    assigned_admin_id = case when p_data ? 'assigned_admin_id' then nullif(p_data->>'assigned_admin_id', '')::uuid else assigned_admin_id end,
    review_notes = coalesce(p_data->>'review_notes', review_notes),
    reviewed_at = case
      when p_data ? 'status' and nullif(p_data->>'status', '') is not null and p_data->>'status' <> 'pending'
      then now() else reviewed_at end,
    updated_at = now()
  where id = p_id
  returning * into v_row;

  insert into public.volunteer_application_audit (application_id, admin_id, action, changes)
  values (p_id, v_admin.id, 'update', jsonb_build_object('before', to_jsonb(v_before), 'after', to_jsonb(v_row)));

  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_delete_volunteer_application(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'volunteer_applications', 'delete') then
    raise exception 'You do not have permission to delete volunteer applications';
  end if;
  insert into public.volunteer_application_audit (application_id, admin_id, action, changes)
  select p_id, v_admin.id, 'delete', to_jsonb(a)
  from public.volunteer_applications a where a.id = p_id;
  delete from public.volunteer_applications where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_list_volunteer_audit(p_token text, p_application_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'volunteer_applications', 'view') then
    raise exception 'You do not have permission to view volunteer audit logs';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
    from (
      select
        l.*,
        a.email as admin_email,
        a.full_name as admin_name,
        v.full_name as applicant_name
      from public.volunteer_application_audit l
      left join public.admins a on a.id = l.admin_id
      left join public.volunteer_applications v on v.id = l.application_id
      where p_application_id is null or l.application_id = p_application_id
      order by l.created_at desc
      limit 500
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.public_get_volunteer_team(text) to anon, authenticated;
grant execute on function public.submit_volunteer_application(text, text, text, text, uuid, text, text, text, text, text) to anon, authenticated;
grant execute on function public.mark_volunteer_application_emailed(uuid) to anon, authenticated;
grant execute on function public.admin_list_volunteer_teams(text) to anon, authenticated;
grant execute on function public.admin_list_volunteer_applications(text, uuid) to anon, authenticated;
grant execute on function public.admin_update_volunteer_application(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_volunteer_application(text, uuid) to anon, authenticated;
grant execute on function public.admin_list_volunteer_audit(text, uuid) to anon, authenticated;
