-- Analytics upgrade: time-on-page, demography fields, report RPCs
-- Run in Supabase → SQL Editor after schema.sql

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.page_visits
  add column if not exists duration_seconds integer not null default 0,
  add column if not exists device_type text,
  add column if not exists browser text,
  add column if not exists os text,
  add column if not exists language text,
  add column if not exists timezone text,
  add column if not exists screen_width integer,
  add column if not exists screen_height integer,
  add column if not exists left_at timestamptz;

create index if not exists page_visits_visitor_id_idx on public.page_visits (visitor_id);
create index if not exists page_visits_session_id_idx on public.page_visits (session_id);
create index if not exists page_visits_visitor_visited_idx on public.page_visits (visitor_id, visited_at desc);

-- ---------------------------------------------------------------------------
-- Public: start a visit (returns id for duration pings)
-- ---------------------------------------------------------------------------
create or replace function public.public_start_visit(
  p_path text,
  p_referrer text default null,
  p_user_agent text default null,
  p_visitor_id text default null,
  p_session_id text default null,
  p_device_type text default null,
  p_browser text default null,
  p_os text default null,
  p_language text default null,
  p_timezone text default null,
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
  if p_path is null or length(trim(p_path)) = 0 then
    raise exception 'path required';
  end if;

  insert into public.page_visits (
    path, referrer, user_agent, visitor_id, session_id,
    device_type, browser, os, language, timezone,
    screen_width, screen_height
  ) values (
    left(trim(p_path), 500),
    nullif(left(trim(coalesce(p_referrer, '')), 1000), ''),
    nullif(left(trim(coalesce(p_user_agent, '')), 1000), ''),
    nullif(left(trim(coalesce(p_visitor_id, '')), 80), ''),
    nullif(left(trim(coalesce(p_session_id, '')), 80), ''),
    nullif(left(trim(coalesce(p_device_type, '')), 40), ''),
    nullif(left(trim(coalesce(p_browser, '')), 60), ''),
    nullif(left(trim(coalesce(p_os, '')), 60), ''),
    nullif(left(trim(coalesce(p_language, '')), 40), ''),
    nullif(left(trim(coalesce(p_timezone, '')), 80), ''),
    p_screen_width,
    p_screen_height
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: update duration (visitor_id must match)
-- ---------------------------------------------------------------------------
create or replace function public.public_ping_visit(
  p_id uuid,
  p_visitor_id text,
  p_duration_seconds integer,
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

  update public.page_visits
  set
    duration_seconds = greatest(duration_seconds, greatest(0, least(coalesce(p_duration_seconds, 0), 86400))),
    left_at = case when p_finalize then now() else left_at end
  where id = p_id
    and visitor_id = trim(p_visitor_id);

  return jsonb_build_object('ok', found);
end;
$$;

grant execute on function public.public_start_visit(text, text, text, text, text, text, text, text, text, text, integer, integer) to anon, authenticated;
grant execute on function public.public_ping_visit(uuid, text, integer, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helper: period start
-- ---------------------------------------------------------------------------
create or replace function public._analytics_since(p_range text)
returns timestamptz
language sql
immutable
as $$
  select case lower(coalesce(p_range, 'week'))
    when 'day' then now() - interval '1 day'
    when 'today' then date_trunc('day', now())
    when 'week' then now() - interval '7 days'
    when 'month' then now() - interval '30 days'
    when '90d' then now() - interval '90 days'
    when '14d' then now() - interval '14 days'
    else now() - interval '7 days'
  end;
$$;

-- ---------------------------------------------------------------------------
-- Admin analytics report (daily / weekly / monthly + top visitors)
-- ---------------------------------------------------------------------------
create or replace function public.admin_analytics_report(
  p_token text,
  p_range text default 'week',
  p_top_n integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_since timestamptz;
  v_top integer;
  v_total bigint;
  v_unique bigint;
  v_sessions bigint;
  v_avg_duration numeric;
  v_prev_since timestamptz;
  v_prev_end timestamptz;
  v_prev_total bigint;
  v_prev_unique bigint;
begin
  perform public._require_permission(p_token, 'overview', 'view');

  v_since := public._analytics_since(p_range);
  v_top := greatest(5, least(coalesce(p_top_n, 10), 25));
  v_prev_end := v_since;
  v_prev_since := v_since - (now() - v_since);

  select count(*) into v_total
  from public.page_visits where visited_at >= v_since;

  select count(distinct visitor_id) into v_unique
  from public.page_visits
  where visited_at >= v_since and visitor_id is not null;

  select count(distinct session_id) into v_sessions
  from public.page_visits
  where visited_at >= v_since and session_id is not null;

  select coalesce(round(avg(duration_seconds)::numeric, 1), 0) into v_avg_duration
  from public.page_visits
  where visited_at >= v_since and duration_seconds > 0;

  select count(*) into v_prev_total
  from public.page_visits
  where visited_at >= v_prev_since and visited_at < v_prev_end;

  select count(distinct visitor_id) into v_prev_unique
  from public.page_visits
  where visited_at >= v_prev_since and visited_at < v_prev_end
    and visitor_id is not null;

  return jsonb_build_object(
    'range', lower(coalesce(p_range, 'week')),
    'since', v_since,
    'totalVisits', v_total,
    'uniqueVisitors', v_unique,
    'sessions', v_sessions,
    'avgDurationSeconds', v_avg_duration,
    'prevTotalVisits', v_prev_total,
    'prevUniqueVisitors', v_prev_unique,
    'series', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'visits', d.visits,
        'unique', d.uniq
      ) order by d.day)
      from (
        select
          to_char(visited_at at time zone 'utc', 'YYYY-MM-DD') as day,
          count(*)::int as visits,
          count(distinct visitor_id)::int as uniq
        from public.page_visits
        where visited_at >= v_since
        group by 1
      ) d
    ), '[]'::jsonb),
    'topPages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'path', p.path,
        'visits', p.visits,
        'avgDuration', p.avg_dur,
        'unique', p.uniq
      ) order by p.visits desc)
      from (
        select
          path,
          count(*)::int as visits,
          count(distinct visitor_id)::int as uniq,
          coalesce(round(avg(nullif(duration_seconds, 0))::numeric, 1), 0) as avg_dur
        from public.page_visits
        where visited_at >= v_since
        group by path
        order by count(*) desc
        limit 10
      ) p
    ), '[]'::jsonb),
    'topVisitors', coalesce((
      select jsonb_agg(jsonb_build_object(
        'visitorId', t.visitor_id,
        'visits', t.visits,
        'pages', t.pages,
        'sessions', t.sessions,
        'totalDuration', t.total_dur,
        'avgDuration', t.avg_dur,
        'lastSeen', t.last_seen,
        'firstSeen', t.first_seen,
        'deviceType', t.device_type,
        'browser', t.browser,
        'os', t.os,
        'language', t.language,
        'timezone', t.timezone,
        'screen', t.screen
      ) order by t.visits desc)
      from (
        select
          visitor_id,
          count(*)::int as visits,
          count(distinct path)::int as pages,
          count(distinct session_id)::int as sessions,
          coalesce(sum(duration_seconds), 0)::int as total_dur,
          coalesce(round(avg(nullif(duration_seconds, 0))::numeric, 1), 0) as avg_dur,
          max(visited_at) as last_seen,
          min(visited_at) as first_seen,
          mode() within group (order by device_type) as device_type,
          mode() within group (order by browser) as browser,
          mode() within group (order by os) as os,
          mode() within group (order by language) as language,
          mode() within group (order by timezone) as timezone,
          max(case when screen_width is not null then screen_width || '×' || screen_height end) as screen
        from public.page_visits
        where visited_at >= v_since
          and visitor_id is not null
        group by visitor_id
        order by count(*) desc
        limit v_top
      ) t
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.device_type, 'count', x.c) order by x.c desc)
      from (
        select coalesce(nullif(device_type, ''), 'Unknown') as device_type, count(*)::int as c
        from public.page_visits
        where visited_at >= v_since
        group by 1
        order by count(*) desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'browsers', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.browser, 'count', x.c) order by x.c desc)
      from (
        select coalesce(nullif(browser, ''), 'Unknown') as browser, count(*)::int as c
        from public.page_visits
        where visited_at >= v_since
        group by 1
        order by count(*) desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'languages', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.language, 'count', x.c) order by x.c desc)
      from (
        select coalesce(nullif(language, ''), 'Unknown') as language, count(*)::int as c
        from public.page_visits
        where visited_at >= v_since
        group by 1
        order by count(*) desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'timezones', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.timezone, 'count', x.c) order by x.c desc)
      from (
        select coalesce(nullif(timezone, ''), 'Unknown') as timezone, count(*)::int as c
        from public.page_visits
        where visited_at >= v_since
        group by 1
        order by count(*) desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'contacts', (select count(*) from public.contact_messages),
    'unreadContacts', (select count(*) from public.contact_messages where status = 'new')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Visitor detail (pages + durations for one visitor)
-- ---------------------------------------------------------------------------
create or replace function public.admin_visitor_detail(
  p_token text,
  p_visitor_id text,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_summary jsonb;
begin
  perform public._require_permission(p_token, 'visitors', 'view');

  if p_visitor_id is null or length(trim(p_visitor_id)) = 0 then
    raise exception 'visitor id required';
  end if;

  select jsonb_build_object(
    'visitorId', trim(p_visitor_id),
    'visits', count(*)::int,
    'pages', count(distinct path)::int,
    'sessions', count(distinct session_id)::int,
    'totalDuration', coalesce(sum(duration_seconds), 0)::int,
    'avgDuration', coalesce(round(avg(nullif(duration_seconds, 0))::numeric, 1), 0),
    'firstSeen', min(visited_at),
    'lastSeen', max(visited_at),
    'deviceType', mode() within group (order by device_type),
    'browser', mode() within group (order by browser),
    'os', mode() within group (order by os),
    'language', mode() within group (order by language),
    'timezone', mode() within group (order by timezone)
  )
  into v_summary
  from public.page_visits
  where visitor_id = trim(p_visitor_id);

  return jsonb_build_object(
    'summary', v_summary,
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id,
        'path', v.path,
        'durationSeconds', v.duration_seconds,
        'visitedAt', v.visited_at,
        'referrer', v.referrer,
        'sessionId', v.session_id,
        'deviceType', v.device_type,
        'browser', v.browser,
        'os', v.os
      ) order by v.visited_at desc)
      from (
        select *
        from public.page_visits
        where visitor_id = trim(p_visitor_id)
        order by visited_at desc
        limit greatest(1, least(coalesce(p_limit, 100), 300))
      ) v
    ), '[]'::jsonb)
  );
end;
$$;

-- Expand list visits with new columns
create or replace function public.admin_list_visits(p_token text, p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._require_permission(p_token, 'visitors', 'view');
  return coalesce((
    select jsonb_agg(to_jsonb(v) order by v.visited_at desc)
    from (
      select
        id, path, referrer, user_agent, visitor_id, session_id, visited_at,
        duration_seconds, device_type, browser, os, language, timezone,
        screen_width, screen_height, left_at
      from public.page_visits
      order by visited_at desc
      limit greatest(1, least(coalesce(p_limit, 100), 500))
    ) v
  ), '[]'::jsonb);
end;
$$;

-- Keep legacy overview stats working; enrich slightly
create or replace function public.admin_visit_stats(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return public.admin_analytics_report(p_token, '14d', 10);
end;
$$;

grant execute on function public.admin_analytics_report(text, text, integer) to anon, authenticated;
grant execute on function public.admin_visitor_detail(text, text, integer) to anon, authenticated;
grant execute on function public.admin_list_visits(text, integer) to anon, authenticated;
grant execute on function public.admin_visit_stats(text) to anon, authenticated;
