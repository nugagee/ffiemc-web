-- Presence heartbeats + richer analytics (monthly series, custom range, online users)

-- ---------------------------------------------------------------------------
-- Website presence: last ping on page_visits
-- ---------------------------------------------------------------------------
alter table public.page_visits
  add column if not exists last_ping_at timestamptz;

update public.page_visits
set last_ping_at = coalesce(left_at, visited_at)
where last_ping_at is null;

create index if not exists page_visits_last_ping_idx
  on public.page_visits (last_ping_at desc)
  where left_at is null;

-- ---------------------------------------------------------------------------
-- Admin presence on sessions
-- ---------------------------------------------------------------------------
alter table public.admin_sessions
  add column if not exists last_seen_at timestamptz,
  add column if not exists presence_started_at timestamptz,
  add column if not exists last_path text;

update public.admin_sessions
set
  last_seen_at = coalesce(last_seen_at, created_at),
  presence_started_at = coalesce(presence_started_at, created_at)
where last_seen_at is null or presence_started_at is null;

create index if not exists admin_sessions_last_seen_idx
  on public.admin_sessions (last_seen_at desc);

-- ---------------------------------------------------------------------------
-- Start visit: stamp last_ping_at
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
    screen_width, screen_height, last_ping_at
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
    p_screen_height,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ping visit: refresh last_ping_at; finalize clears active presence
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
    last_ping_at = now(),
    left_at = case when p_finalize then now() else left_at end
  where id = p_id
    and visitor_id = trim(p_visitor_id);

  return jsonb_build_object('ok', found);
end;
$$;

grant execute on function public.public_start_visit(text, text, text, text, text, text, text, text, text, text, integer, integer) to anon, authenticated;
grant execute on function public.public_ping_visit(uuid, text, integer, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin heartbeat
-- ---------------------------------------------------------------------------
create or replace function public.admin_presence_heartbeat(
  p_token text,
  p_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_session public.admin_sessions%rowtype;
begin
  v_admin := public._require_admin(p_token);

  select * into v_session
  from public.admin_sessions
  where token = p_token
  limit 1;

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  update public.admin_sessions
  set
    last_seen_at = now(),
    presence_started_at = coalesce(presence_started_at, created_at, now()),
    last_path = case
      when p_path is null or length(trim(p_path)) = 0 then last_path
      else left(trim(p_path), 500)
    end
  where id = v_session.id
  returning * into v_session;

  return jsonb_build_object(
    'ok', true,
    'onlineSeconds', greatest(0, floor(extract(epoch from (now() - coalesce(v_session.presence_started_at, v_session.created_at))))::int),
    'role', v_admin.role
  );
end;
$$;

grant execute on function public.admin_presence_heartbeat(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Who is online (website visitors + admins)
-- ---------------------------------------------------------------------------
create or replace function public.admin_online_presence(
  p_token text,
  p_within_seconds integer default 90
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window integer;
  v_cutoff timestamptz;
begin
  perform public._require_permission(p_token, 'overview', 'view');
  v_window := greatest(30, least(coalesce(p_within_seconds, 90), 600));
  v_cutoff := now() - make_interval(secs => v_window);

  return jsonb_build_object(
    'withinSeconds', v_window,
    'asOf', now(),
    'websiteCount', (
      select count(*)::int from (
        select distinct on (coalesce(nullif(visitor_id, ''), id::text))
          visitor_id
        from public.page_visits
        where left_at is null
          and coalesce(last_ping_at, visited_at) >= v_cutoff
          and path not like '/admin%'
        order by coalesce(nullif(visitor_id, ''), id::text), coalesce(last_ping_at, visited_at) desc
      ) x
    ),
    'adminCount', (
      select count(*)::int
      from public.admin_sessions s
      join public.admins a on a.id = s.admin_id
      where a.is_active is distinct from false
        and s.expires_at > now()
        and coalesce(s.last_seen_at, s.created_at) >= v_cutoff
    ),
    'website', coalesce((
      select jsonb_agg(row_to_json(w)::jsonb order by w.last_ping desc)
      from (
        select distinct on (coalesce(nullif(v.visitor_id, ''), v.id::text))
          coalesce(nullif(v.visitor_id, ''), v.id::text) as visitor_id,
          v.path,
          v.device_type,
          v.browser,
          v.os,
          v.language,
          v.timezone,
          v.visited_at as session_started,
          coalesce(v.last_ping_at, v.visited_at) as last_ping,
          greatest(0, floor(extract(epoch from (now() - v.visited_at)))::int) as online_seconds,
          v.duration_seconds,
          'website'::text as kind,
          'visitor'::text as role
        from public.page_visits v
        where v.left_at is null
          and coalesce(v.last_ping_at, v.visited_at) >= v_cutoff
          and v.path not like '/admin%'
        order by coalesce(nullif(v.visitor_id, ''), v.id::text), coalesce(v.last_ping_at, v.visited_at) desc
        limit 100
      ) w
    ), '[]'::jsonb),
    'admins', coalesce((
      select jsonb_agg(row_to_json(a)::jsonb order by a.last_seen desc)
      from (
        select
          ad.id as admin_id,
          coalesce(nullif(ad.full_name, ''), ad.username, ad.email) as name,
          ad.email,
          ad.username,
          ad.role,
          s.last_path as path,
          coalesce(s.presence_started_at, s.created_at) as session_started,
          coalesce(s.last_seen_at, s.created_at) as last_seen,
          greatest(0, floor(extract(epoch from (now() - coalesce(s.presence_started_at, s.created_at))))::int) as online_seconds,
          'admin'::text as kind
        from public.admin_sessions s
        join public.admins ad on ad.id = s.admin_id
        where ad.is_active is distinct from false
          and s.expires_at > now()
          and coalesce(s.last_seen_at, s.created_at) >= v_cutoff
        order by coalesce(s.last_seen_at, s.created_at) desc
        limit 50
      ) a
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_online_presence(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Period helper (calendar month support)
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
    when 'calendar_month' then date_trunc('month', now())
    when '90d' then now() - interval '90 days'
    when 'year' then now() - interval '365 days'
    when '14d' then now() - interval '14 days'
    else now() - interval '7 days'
  end;
$$;

-- ---------------------------------------------------------------------------
-- Extended analytics report (custom from/to + monthly series + OS)
-- ---------------------------------------------------------------------------
drop function if exists public.admin_analytics_report(text, text, integer);

create or replace function public.admin_analytics_report(
  p_token text,
  p_range text default 'week',
  p_top_n integer default 10,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_since timestamptz;
  v_until timestamptz;
  v_top integer;
  v_total bigint;
  v_unique bigint;
  v_sessions bigint;
  v_avg_duration numeric;
  v_prev_since timestamptz;
  v_prev_end timestamptz;
  v_prev_total bigint;
  v_prev_unique bigint;
  v_span interval;
begin
  perform public._require_permission(p_token, 'overview', 'view');

  v_until := coalesce(p_to, now());
  if p_from is not null then
    v_since := p_from;
  else
    v_since := public._analytics_since(p_range);
  end if;
  if v_since > v_until then
    v_since := v_until - interval '7 days';
  end if;

  v_top := greatest(5, least(coalesce(p_top_n, 10), 25));
  v_span := v_until - v_since;
  if v_span < interval '1 hour' then
    v_span := interval '1 day';
  end if;
  v_prev_end := v_since;
  v_prev_since := v_since - v_span;

  select count(*) into v_total
  from public.page_visits where visited_at >= v_since and visited_at <= v_until;

  select count(distinct visitor_id) into v_unique
  from public.page_visits
  where visited_at >= v_since and visited_at <= v_until and visitor_id is not null;

  select count(distinct session_id) into v_sessions
  from public.page_visits
  where visited_at >= v_since and visited_at <= v_until and session_id is not null;

  select coalesce(round(avg(duration_seconds)::numeric, 1), 0) into v_avg_duration
  from public.page_visits
  where visited_at >= v_since and visited_at <= v_until and duration_seconds > 0;

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
    'until', v_until,
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
        where visited_at >= v_since and visited_at <= v_until
        group by 1
      ) d
    ), '[]'::jsonb),
    'monthlySeries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month', m.month,
        'label', m.label,
        'visits', m.visits,
        'unique', m.uniq,
        'sessions', m.sessions
      ) order by m.month)
      from (
        select
          to_char(date_trunc('month', visited_at), 'YYYY-MM') as month,
          to_char(date_trunc('month', visited_at), 'Mon YYYY') as label,
          count(*)::int as visits,
          count(distinct visitor_id)::int as uniq,
          count(distinct session_id)::int as sessions
        from public.page_visits
        where visited_at >= date_trunc('month', now()) - interval '11 months'
        group by 1, 2
      ) m
    ), '[]'::jsonb),
    'hourlySeries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'hour', h.hour,
        'visits', h.visits
      ) order by h.hour)
      from (
        select
          extract(hour from visited_at)::int as hour,
          count(*)::int as visits
        from public.page_visits
        where visited_at >= v_since and visited_at <= v_until
        group by 1
      ) h
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
        where visited_at >= v_since and visited_at <= v_until
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
        where visited_at >= v_since and visited_at <= v_until
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
        where visited_at >= v_since and visited_at <= v_until
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
        where visited_at >= v_since and visited_at <= v_until
        group by 1
        order by count(*) desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'operatingSystems', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.os, 'count', x.c) order by x.c desc)
      from (
        select coalesce(nullif(os, ''), 'Unknown') as os, count(*)::int as c
        from public.page_visits
        where visited_at >= v_since and visited_at <= v_until
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
        where visited_at >= v_since and visited_at <= v_until
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
        where visited_at >= v_since and visited_at <= v_until
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

grant execute on function public.admin_analytics_report(text, text, integer, timestamptz, timestamptz) to anon, authenticated;

-- NOTE: Do NOT keep a 3-arg overload — PostgREST/Postgres cannot choose between
-- admin_analytics_report(text,text,integer) and the 5-arg version with defaults.
-- Clients must always call the 5-arg form (pass null for p_from / p_to).

create or replace function public.admin_visit_stats(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return public.admin_analytics_report(p_token, '14d', 10, null::timestamptz, null::timestamptz);
end;
$$;

grant execute on function public.admin_visit_stats(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Flat rows for CSV export
-- ---------------------------------------------------------------------------
create or replace function public.admin_analytics_export_rows(
  p_token text,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 5000
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz;
  v_until timestamptz;
begin
  perform public._require_permission(p_token, 'overview', 'view');
  v_until := coalesce(p_to, now());
  v_since := coalesce(p_from, now() - interval '90 days');

  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.visited_at desc)
    from (
      select
        id,
        path,
        visitor_id,
        session_id,
        visited_at,
        left_at,
        duration_seconds,
        device_type,
        browser,
        os,
        language,
        timezone,
        referrer,
        screen_width,
        screen_height
      from public.page_visits
      where visited_at >= v_since and visited_at <= v_until
      order by visited_at desc
      limit greatest(1, least(coalesce(p_limit, 5000), 20000))
    ) r
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_analytics_export_rows(text, timestamptz, timestamptz, integer) to anon, authenticated;
