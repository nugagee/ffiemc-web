-- Homepage Facebook Live: reactions + live comments (watch-party engagement)

create table if not exists public.facebook_live_reactions (
  id uuid primary key default gen_random_uuid(),
  broadcast_key text not null,
  visitor_id text not null,
  reaction text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facebook_live_reactions_reaction_check
    check (reaction in ('like', 'love', 'care', 'wow', 'fire', 'amen')),
  constraint facebook_live_reactions_visitor_unique unique (broadcast_key, visitor_id)
);

create index if not exists facebook_live_reactions_broadcast_idx
  on public.facebook_live_reactions (broadcast_key, reaction);

create table if not exists public.facebook_live_comments (
  id uuid primary key default gen_random_uuid(),
  broadcast_key text not null,
  author_name text not null default '',
  body text not null,
  is_anonymous boolean not null default false,
  status text not null default 'visible'
    check (status in ('visible', 'hidden', 'removed')),
  visitor_id text not null default '',
  session_id text not null default '',
  path text not null default '/',
  user_agent text not null default '',
  device_type text not null default '',
  browser text not null default '',
  os text not null default '',
  language text not null default '',
  timezone text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists facebook_live_comments_broadcast_idx
  on public.facebook_live_comments (broadcast_key, created_at desc)
  where status = 'visible';
create index if not exists facebook_live_comments_visitor_idx
  on public.facebook_live_comments (visitor_id, created_at desc);

alter table public.facebook_live_reactions enable row level security;
alter table public.facebook_live_comments enable row level security;

drop policy if exists facebook_live_comments_public_read on public.facebook_live_comments;
create policy facebook_live_comments_public_read
  on public.facebook_live_comments
  for select
  to anon, authenticated
  using (status = 'visible');

drop policy if exists facebook_live_reactions_public_read on public.facebook_live_reactions;
create policy facebook_live_reactions_public_read
  on public.facebook_live_reactions
  for select
  to anon, authenticated
  using (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.facebook_live_comments;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

-- Engagement snapshot for a broadcast
create or replace function public.public_facebook_live_engagement(
  p_broadcast_key text,
  p_visitor_id text default '',
  p_comment_limit integer default 80
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_key text := left(trim(coalesce(p_broadcast_key, '')), 240);
  v_visitor text := left(trim(coalesce(p_visitor_id, '')), 80);
  v_limit int := greatest(10, least(coalesce(p_comment_limit, 80), 150));
begin
  if v_key = '' then
    raise exception 'broadcast key required';
  end if;

  return jsonb_build_object(
    'broadcast_key', v_key,
    'counts', coalesce((
      select jsonb_object_agg(r.reaction, r.n)
      from (
        select reaction, count(*)::int as n
        from public.facebook_live_reactions
        where broadcast_key = v_key
        group by reaction
      ) r
    ), '{}'::jsonb),
    'mine', coalesce((
      select reaction
      from public.facebook_live_reactions
      where broadcast_key = v_key
        and visitor_id = v_visitor
        and v_visitor <> ''
      limit 1
    ), ''),
    'total_reactions', (
      select count(*)::int from public.facebook_live_reactions where broadcast_key = v_key
    ),
    'comments', coalesce((
      select jsonb_agg(row_to_json(c)::jsonb order by c.created_at asc)
      from (
        select
          id,
          case
            when is_anonymous or nullif(author_name, '') is null then 'Guest'
            else author_name
          end as author_name,
          is_anonymous,
          body,
          created_at
        from public.facebook_live_comments
        where broadcast_key = v_key
          and status = 'visible'
        order by created_at desc
        limit v_limit
      ) c
    ), '[]'::jsonb),
    'comment_count', (
      select count(*)::int
      from public.facebook_live_comments
      where broadcast_key = v_key and status = 'visible'
    )
  );
end;
$$;

create or replace function public.public_react_facebook_live(
  p_broadcast_key text,
  p_visitor_id text,
  p_reaction text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := left(trim(coalesce(p_broadcast_key, '')), 240);
  v_visitor text := left(trim(coalesce(p_visitor_id, '')), 80);
  v_reaction text := lower(trim(coalesce(p_reaction, '')));
  v_mine text := '';
begin
  if v_key = '' then raise exception 'broadcast key required'; end if;
  if v_visitor = '' then raise exception 'visitor required'; end if;

  if v_reaction = '' then
    delete from public.facebook_live_reactions
    where broadcast_key = v_key and visitor_id = v_visitor;
  else
    if v_reaction not in ('like', 'love', 'care', 'wow', 'fire', 'amen') then
      raise exception 'Invalid reaction';
    end if;
    insert into public.facebook_live_reactions (broadcast_key, visitor_id, reaction)
    values (v_key, v_visitor, v_reaction)
    on conflict (broadcast_key, visitor_id)
    do update set reaction = excluded.reaction, updated_at = now();
    v_mine := v_reaction;
  end if;

  return jsonb_build_object(
    'ok', true,
    'mine', v_mine,
    'counts', coalesce((
      select jsonb_object_agg(r.reaction, r.n)
      from (
        select reaction, count(*)::int as n
        from public.facebook_live_reactions
        where broadcast_key = v_key
        group by reaction
      ) r
    ), '{}'::jsonb),
    'total_reactions', (
      select count(*)::int from public.facebook_live_reactions where broadcast_key = v_key
    )
  );
end;
$$;

create or replace function public.public_comment_facebook_live(
  p_broadcast_key text,
  p_body text,
  p_author_name text default '',
  p_is_anonymous boolean default false,
  p_visitor_id text default '',
  p_session_id text default '',
  p_path text default '/',
  p_user_agent text default '',
  p_device_type text default '',
  p_browser text default '',
  p_os text default '',
  p_language text default '',
  p_timezone text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := left(trim(coalesce(p_broadcast_key, '')), 240);
  v_body text := trim(coalesce(p_body, ''));
  v_name text := left(trim(coalesce(p_author_name, '')), 80);
  v_anon boolean := coalesce(p_is_anonymous, false);
  v_visitor text := left(trim(coalesce(p_visitor_id, '')), 80);
  v_row public.facebook_live_comments%rowtype;
begin
  if v_key = '' then raise exception 'broadcast key required'; end if;
  if length(v_body) < 1 then raise exception 'Please write a comment'; end if;
  if length(v_body) > 500 then raise exception 'Comment is too long (max 500 characters)'; end if;
  if v_visitor = '' then raise exception 'visitor required'; end if;

  -- Simple rate limit: one comment per visitor per 4 seconds on this broadcast
  if exists (
    select 1
    from public.facebook_live_comments c
    where c.broadcast_key = v_key
      and c.visitor_id = v_visitor
      and c.created_at > now() - interval '4 seconds'
  ) then
    raise exception 'Please wait a moment before commenting again';
  end if;

  if v_anon or length(v_name) < 1 then
    v_anon := true;
    v_name := '';
  end if;

  insert into public.facebook_live_comments (
    broadcast_key, author_name, body, is_anonymous, status,
    visitor_id, session_id, path, user_agent, device_type, browser, os, language, timezone
  ) values (
    v_key,
    v_name,
    left(v_body, 500),
    v_anon,
    'visible',
    v_visitor,
    left(trim(coalesce(p_session_id, '')), 80),
    left(coalesce(p_path, '/'), 200),
    left(coalesce(p_user_agent, ''), 400),
    left(coalesce(p_device_type, ''), 40),
    left(coalesce(p_browser, ''), 40),
    left(coalesce(p_os, ''), 40),
    left(coalesce(p_language, ''), 40),
    left(coalesce(p_timezone, ''), 80)
  )
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'comment', jsonb_build_object(
      'id', v_row.id,
      'author_name', case when v_row.is_anonymous or v_row.author_name = '' then 'Guest' else v_row.author_name end,
      'is_anonymous', v_row.is_anonymous,
      'body', v_row.body,
      'created_at', v_row.created_at
    )
  );
end;
$$;

-- Extend admin analytics with engagement totals
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
      ),
      'reactions', (
        select count(*)::int from public.facebook_live_reactions r
        where r.updated_at >= v_since
      ),
      'comments', (
        select count(*)::int from public.facebook_live_comments c
        where c.created_at >= v_since and c.status = 'visible'
      )
    ),
    'reaction_breakdown', coalesce((
      select jsonb_object_agg(x.reaction, x.n)
      from (
        select reaction, count(*)::int as n
        from public.facebook_live_reactions
        where updated_at >= v_since
        group by reaction
      ) x
    ), '{}'::jsonb),
    'recent_comments', coalesce((
      select jsonb_agg(row_to_json(c)::jsonb order by c.created_at desc)
      from (
        select
          id,
          broadcast_key,
          case when is_anonymous or author_name = '' then 'Guest' else author_name end as author_name,
          body,
          created_at
        from public.facebook_live_comments
        where created_at >= v_since
          and status = 'visible'
        order by created_at desc
        limit least(v_limit, 80)
      ) c
    ), '[]'::jsonb),
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

create or replace function public.admin_hide_facebook_live_comment(
  p_token text,
  p_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not (
    public._has_perm(v_admin, 'banners', 'edit')
    or public._has_perm(v_admin, 'home.facebookLive', 'edit')
    or public._has_perm(v_admin, 'home.announcements', 'edit')
  ) then
    raise exception 'You do not have permission to moderate live comments';
  end if;

  update public.facebook_live_comments
  set status = 'hidden'
  where id = p_id;

  return found;
end;
$$;

grant execute on function public.public_facebook_live_engagement(text, text, integer) to anon, authenticated;
grant execute on function public.public_react_facebook_live(text, text, text) to anon, authenticated;
grant execute on function public.public_comment_facebook_live(
  text, text, text, boolean, text, text, text, text, text, text, text, text, text
) to anon, authenticated;
grant execute on function public.admin_facebook_live_analytics(text, text, integer) to anon, authenticated;
grant execute on function public.admin_hide_facebook_live_comment(text, uuid) to anon, authenticated;
