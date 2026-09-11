-- Facebook Live homepage section analytics: on-screen time + per-visitor usage

create table if not exists public.facebook_live_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null default '',
  session_id text not null default '',
  path text not null default '/',
  was_live boolean not null default false,
  duration_seconds integer not null default 0,
  open_facebook_clicks integer not null default 0,
  user_agent text not null default '',
  device_type text not null default '',
  browser text not null default '',
  os text not null default '',
  language text not null default '',
  timezone text not null default '',
  screen_width integer,
  screen_height integer,
  started_at timestamptz not null default now(),
  left_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists facebook_live_sessions_visitor_idx
  on public.facebook_live_sessions (visitor_id, started_at desc);
create index if not exists facebook_live_sessions_started_idx
  on public.facebook_live_sessions (started_at desc);
create index if not exists facebook_live_sessions_was_live_idx
  on public.facebook_live_sessions (was_live, started_at desc);

create table if not exists public.facebook_live_events (
  id uuid primary key default gen_random_uuid(),
  session_id_row uuid references public.facebook_live_sessions(id) on delete set null,
  visitor_id text not null default '',
  session_id text not null default '',
  action text not null,
  was_live boolean not null default false,
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

create index if not exists facebook_live_events_visitor_idx
  on public.facebook_live_events (visitor_id, created_at desc);
create index if not exists facebook_live_events_action_idx
  on public.facebook_live_events (action, created_at desc);
create index if not exists facebook_live_events_created_idx
  on public.facebook_live_events (created_at desc);

alter table public.facebook_live_sessions enable row level security;
alter table public.facebook_live_events enable row level security;

-- Start a section view session when the live block enters the viewport
create or replace function public.public_start_facebook_live_view(
  p_visitor_id text,
  p_session_id text default '',
  p_was_live boolean default false,
  p_path text default '/',
  p_user_agent text default '',
  p_device_type text default '',
  p_browser text default '',
  p_os text default '',
  p_language text default '',
  p_timezone text default '',
  p_screen_width integer default null,
  p_screen_height integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_visitor_id is null or length(trim(p_visitor_id)) = 0 then
    raise exception 'visitor required';
  end if;

  insert into public.facebook_live_sessions (
    visitor_id, session_id, path, was_live,
    user_agent, device_type, browser, os, language, timezone,
    screen_width, screen_height
  ) values (
    left(trim(p_visitor_id), 80),
    left(coalesce(p_session_id, ''), 80),
    left(coalesce(p_path, '/'), 200),
    coalesce(p_was_live, false),
    left(coalesce(p_user_agent, ''), 400),
    left(coalesce(p_device_type, ''), 40),
    left(coalesce(p_browser, ''), 40),
    left(coalesce(p_os, ''), 40),
    left(coalesce(p_language, ''), 40),
    left(coalesce(p_timezone, ''), 80),
    p_screen_width,
    p_screen_height
  )
  returning id into v_id;

  insert into public.facebook_live_events (
    session_id_row, visitor_id, session_id, action, was_live, path,
    user_agent, device_type, browser, os, language, timezone
  ) values (
    v_id,
    left(trim(p_visitor_id), 80),
    left(coalesce(p_session_id, ''), 80),
    'impression',
    coalesce(p_was_live, false),
    left(coalesce(p_path, '/'), 200),
    left(coalesce(p_user_agent, ''), 400),
    left(coalesce(p_device_type, ''), 40),
    left(coalesce(p_browser, ''), 40),
    left(coalesce(p_os, ''), 40),
    left(coalesce(p_language, ''), 40),
    left(coalesce(p_timezone, ''), 80)
  );

  return v_id;
end;
$$;

-- Ping on-screen duration while the section stays visible
create or replace function public.public_ping_facebook_live_view(
  p_id uuid,
  p_visitor_id text,
  p_duration_seconds integer,
  p_was_live boolean default null,
  p_finalize boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null or p_visitor_id is null or length(trim(p_visitor_id)) = 0 then
    return jsonb_build_object('ok', false);
  end if;

  update public.facebook_live_sessions
  set
    duration_seconds = greatest(
      duration_seconds,
      greatest(0, least(coalesce(p_duration_seconds, 0), 86400))
    ),
    was_live = case when p_was_live is null then was_live else p_was_live or was_live end,
    left_at = case when p_finalize then now() else left_at end,
    updated_at = now()
  where id = p_id
    and visitor_id = trim(p_visitor_id);

  return jsonb_build_object('ok', found);
end;
$$;

-- Discrete actions (open Facebook, watch CTA, etc.)
create or replace function public.public_track_facebook_live_event(
  p_action text,
  p_visitor_id text default '',
  p_session_id text default '',
  p_view_id uuid default null,
  p_was_live boolean default false,
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
  if v_action not in (
    'impression', 'open_facebook', 'watch_cta', 'embed_focus', 'page_plugin_click'
  ) then
    raise exception 'Unknown Facebook Live action';
  end if;

  if v_action = 'open_facebook' and p_view_id is not null and coalesce(p_visitor_id, '') <> '' then
    update public.facebook_live_sessions
    set open_facebook_clicks = open_facebook_clicks + 1,
        updated_at = now()
    where id = p_view_id
      and visitor_id = trim(p_visitor_id);
  end if;

  insert into public.facebook_live_events (
    session_id_row, visitor_id, session_id, action, was_live, path,
    user_agent, device_type, browser, os, language, timezone, meta
  ) values (
    p_view_id,
    left(coalesce(p_visitor_id, ''), 80),
    left(coalesce(p_session_id, ''), 80),
    v_action,
    coalesce(p_was_live, false),
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

grant execute on function public.public_start_facebook_live_view(
  text, text, boolean, text, text, text, text, text, text, text, integer, integer
) to anon, authenticated;
grant execute on function public.public_ping_facebook_live_view(
  uuid, text, integer, boolean, boolean
) to anon, authenticated;
grant execute on function public.public_track_facebook_live_event(
  text, text, text, uuid, boolean, text, text, text, text, text, text, text, jsonb
) to anon, authenticated;

-- Admin overview + per-visitor rollup
create or replace function public.admin_facebook_live_analytics(
  p_token text,
  p_range text default 'week',
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_since timestamptz;
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 500));
begin
  v_admin := public._require_admin(p_token);
  if not (
    public._has_perm(v_admin, 'banners', 'view')
    or public._has_perm(v_admin, 'home.facebookLive', 'view')
    or public._has_perm(v_admin, 'home.facebookLive', 'edit')
    or public._has_perm(v_admin, 'home.announcements', 'view')
  ) then
    raise exception 'You do not have permission to view Facebook Live analytics';
  end if;

  v_since := case lower(coalesce(p_range, 'week'))
    when 'all' then timestamptz '1970-01-01'
    else public._analytics_since(p_range)
  end;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'impressions', (
        select count(*)::int from public.facebook_live_events e
        where e.created_at >= v_since and e.action = 'impression'
      ),
      'sessions', (
        select count(*)::int from public.facebook_live_sessions s where s.started_at >= v_since
      ),
      'unique_visitors', (
        select count(distinct nullif(s.visitor_id, ''))::int
        from public.facebook_live_sessions s
        where s.started_at >= v_since and s.visitor_id <> ''
      ),
      'total_onscreen_seconds', coalesce((
        select sum(s.duration_seconds)::bigint
        from public.facebook_live_sessions s
        where s.started_at >= v_since
      ), 0),
      'avg_onscreen_seconds', coalesce((
        select round(avg(s.duration_seconds))::int
        from public.facebook_live_sessions s
        where s.started_at >= v_since and s.duration_seconds > 0
      ), 0),
      'live_sessions', (
        select count(*)::int from public.facebook_live_sessions s
        where s.started_at >= v_since and s.was_live
      ),
      'offline_sessions', (
        select count(*)::int from public.facebook_live_sessions s
        where s.started_at >= v_since and not s.was_live
      ),
      'open_facebook', (
        select count(*)::int from public.facebook_live_events e
        where e.created_at >= v_since and e.action = 'open_facebook'
      ),
      'watch_cta', (
        select count(*)::int from public.facebook_live_events e
        where e.created_at >= v_since and e.action = 'watch_cta'
      )
    ),
    'visitors', coalesce((
      select jsonb_agg(row_to_json(x)::jsonb order by x.last_seen desc)
      from (
        select
          s.visitor_id,
          count(*)::int as sessions,
          count(*) filter (where s.was_live)::int as live_sessions,
          coalesce(sum(s.duration_seconds), 0)::bigint as total_onscreen_seconds,
          coalesce(round(avg(s.duration_seconds) filter (where s.duration_seconds > 0)), 0)::int as avg_onscreen_seconds,
          coalesce(sum(s.open_facebook_clicks), 0)::int as open_facebook_clicks,
          max(s.started_at) as last_seen,
          min(s.started_at) as first_seen,
          (array_agg(s.device_type order by s.started_at desc))[1] as device_type,
          (array_agg(s.browser order by s.started_at desc))[1] as browser,
          (array_agg(s.os order by s.started_at desc))[1] as os,
          (array_agg(s.language order by s.started_at desc))[1] as language,
          (array_agg(s.timezone order by s.started_at desc))[1] as timezone
        from public.facebook_live_sessions s
        where s.started_at >= v_since
          and s.visitor_id <> ''
        group by s.visitor_id
        order by max(s.started_at) desc
        limit v_limit
      ) x
    ), '[]'::jsonb),
    'recent_sessions', coalesce((
      select jsonb_agg(row_to_json(s)::jsonb order by s.started_at desc)
      from (
        select
          id, visitor_id, session_id, path, was_live, duration_seconds,
          open_facebook_clicks, device_type, browser, os, language, timezone,
          started_at, left_at
        from public.facebook_live_sessions
        where started_at >= v_since
        order by started_at desc
        limit least(v_limit, 200)
      ) s
    ), '[]'::jsonb),
    'recent_events', coalesce((
      select jsonb_agg(row_to_json(e)::jsonb order by e.created_at desc)
      from (
        select
          id, visitor_id, action, was_live, path, device_type, browser, os,
          created_at, meta
        from public.facebook_live_events
        where created_at >= v_since
        order by created_at desc
        limit least(v_limit, 200)
      ) e
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_facebook_live_visitor_detail(
  p_token text,
  p_visitor_id text,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 300));
  v_visitor text := trim(coalesce(p_visitor_id, ''));
begin
  v_admin := public._require_admin(p_token);
  if not (
    public._has_perm(v_admin, 'banners', 'view')
    or public._has_perm(v_admin, 'home.facebookLive', 'view')
    or public._has_perm(v_admin, 'home.facebookLive', 'edit')
    or public._has_perm(v_admin, 'home.announcements', 'view')
  ) then
    raise exception 'You do not have permission to view Facebook Live analytics';
  end if;

  if v_visitor = '' then
    raise exception 'visitor required';
  end if;

  return jsonb_build_object(
    'visitor_id', v_visitor,
    'summary', (
      select jsonb_build_object(
        'sessions', count(*)::int,
        'live_sessions', count(*) filter (where was_live)::int,
        'total_onscreen_seconds', coalesce(sum(duration_seconds), 0)::bigint,
        'avg_onscreen_seconds', coalesce(round(avg(duration_seconds) filter (where duration_seconds > 0)), 0)::int,
        'open_facebook_clicks', coalesce(sum(open_facebook_clicks), 0)::int,
        'first_seen', min(started_at),
        'last_seen', max(started_at),
        'device_type', (array_agg(device_type order by started_at desc))[1],
        'browser', (array_agg(browser order by started_at desc))[1],
        'os', (array_agg(os order by started_at desc))[1],
        'language', (array_agg(language order by started_at desc))[1],
        'timezone', (array_agg(timezone order by started_at desc))[1]
      )
      from public.facebook_live_sessions
      where visitor_id = v_visitor
    ),
    'sessions', coalesce((
      select jsonb_agg(row_to_json(s)::jsonb order by s.started_at desc)
      from (
        select
          id, path, was_live, duration_seconds, open_facebook_clicks,
          device_type, browser, os, language, timezone, started_at, left_at
        from public.facebook_live_sessions
        where visitor_id = v_visitor
        order by started_at desc
        limit v_limit
      ) s
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(row_to_json(e)::jsonb order by e.created_at desc)
      from (
        select id, action, was_live, path, device_type, browser, os, created_at, meta
        from public.facebook_live_events
        where visitor_id = v_visitor
        order by created_at desc
        limit v_limit
      ) e
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_facebook_live_analytics(text, text, integer) to anon, authenticated;
grant execute on function public.admin_facebook_live_visitor_detail(text, text, integer) to anon, authenticated;
