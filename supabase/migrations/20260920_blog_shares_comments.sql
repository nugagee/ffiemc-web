-- Blog social shares + reader comments
-- Extends blog_post_events with share tracking and adds moderated comments.

alter table public.blog_post_events
  add column if not exists share_channel text not null default '';

alter table public.blog_post_events
  drop constraint if exists blog_post_events_action_check;
alter table public.blog_post_events
  add constraint blog_post_events_action_check
  check (action in ('view', 'read', 'leave', 'react', 'share'));

alter table public.blog_post_events
  drop constraint if exists blog_post_events_share_channel_check;
alter table public.blog_post_events
  add constraint blog_post_events_share_channel_check
  check (share_channel in ('', 'facebook', 'x', 'whatsapp', 'telegram', 'linkedin', 'email', 'copy', 'native'));

create index if not exists blog_post_events_share_idx
  on public.blog_post_events (action, share_channel, created_at desc)
  where action = 'share';

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
create table if not exists public.blog_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid,
  post_slug text not null default '',
  post_title text not null default '',
  author_name text not null default '',
  author_email text not null default '',
  body text not null default '',
  is_anonymous boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  visitor_id text not null default '',
  session_id text not null default '',
  path text not null default '/',
  user_agent text not null default '',
  device_type text not null default '',
  browser text not null default '',
  os text not null default '',
  language text not null default '',
  timezone text not null default '',
  admin_note text not null default '',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_post_comments_slug_status_idx
  on public.blog_post_comments (post_slug, status, created_at desc);
create index if not exists blog_post_comments_status_idx
  on public.blog_post_comments (status, created_at desc);

alter table public.blog_post_comments enable row level security;

-- ---------------------------------------------------------------------------
-- Track share (extends existing tracker)
-- ---------------------------------------------------------------------------
-- Replace prior overload (no share_channel) before defining the new signature
drop function if exists public.public_track_blog_event(text, text, uuid, text, text, text, text, integer, integer, text, text, text, text, text, text, text);

create or replace function public.public_track_blog_event(
  p_slug text,
  p_action text,
  p_post_id uuid default null,
  p_title text default '',
  p_visitor_id text default '',
  p_session_id text default '',
  p_reaction text default '',
  p_duration integer default 0,
  p_scroll integer default 0,
  p_path text default '/',
  p_user_agent text default '',
  p_device_type text default '',
  p_browser text default '',
  p_os text default '',
  p_language text default '',
  p_timezone text default '',
  p_share_channel text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := lower(trim(coalesce(p_action, '')));
  v_reaction text := lower(trim(coalesce(p_reaction, '')));
  v_share text := lower(trim(coalesce(p_share_channel, '')));
  v_slug text := left(trim(coalesce(p_slug, '')), 120);
  v_visitor text := left(trim(coalesce(p_visitor_id, '')), 80);
  v_session text := left(trim(coalesce(p_session_id, '')), 80);
  v_duration int := greatest(0, least(coalesce(p_duration, 0), 86400));
  v_scroll int := greatest(0, least(coalesce(p_scroll, 0), 100));
  v_existing uuid;
  v_row public.blog_post_events%rowtype;
begin
  if v_slug = '' then
    raise exception 'Post slug is required';
  end if;
  if v_action not in ('view', 'read', 'leave', 'react', 'share') then
    raise exception 'Invalid action';
  end if;
  if v_reaction not in ('', 'amen', 'fire', 'heart', 'clap', 'inspired') then
    v_reaction := '';
  end if;
  if v_share not in ('', 'facebook', 'x', 'whatsapp', 'telegram', 'linkedin', 'email', 'copy', 'native') then
    v_share := '';
  end if;

  if v_action = 'share' then
    if v_share = '' then
      raise exception 'Share channel is required';
    end if;
    insert into public.blog_post_events (
      post_id, post_slug, post_title, visitor_id, session_id, action, share_channel,
      path, user_agent, device_type, browser, os, language, timezone
    ) values (
      p_post_id, v_slug, left(coalesce(p_title, ''), 240), v_visitor, v_session, 'share', v_share,
      left(coalesce(p_path, '/'), 240), left(coalesce(p_user_agent, ''), 400),
      left(coalesce(p_device_type, ''), 40), left(coalesce(p_browser, ''), 40),
      left(coalesce(p_os, ''), 40), left(coalesce(p_language, ''), 40),
      left(coalesce(p_timezone, ''), 80)
    ) returning * into v_row;
    return to_jsonb(v_row);
  end if;

  if v_action = 'react' then
    if v_visitor = '' then
      raise exception 'Visitor is required to react';
    end if;
    select id into v_existing
    from public.blog_post_events
    where action = 'react' and visitor_id = v_visitor and post_slug = v_slug
    limit 1;
    if v_existing is not null then
      if v_reaction = '' then
        delete from public.blog_post_events where id = v_existing;
        return jsonb_build_object('ok', true, 'cleared', true);
      end if;
      update public.blog_post_events set
        reaction = v_reaction,
        post_title = coalesce(nullif(trim(p_title), ''), post_title),
        post_id = coalesce(p_post_id, post_id),
        updated_at = now()
      where id = v_existing
      returning * into v_row;
      return to_jsonb(v_row);
    end if;
    if v_reaction = '' then
      return jsonb_build_object('ok', true, 'cleared', true);
    end if;
    insert into public.blog_post_events (
      post_id, post_slug, post_title, visitor_id, session_id, action, reaction,
      path, user_agent, device_type, browser, os, language, timezone
    ) values (
      p_post_id, v_slug, left(coalesce(p_title, ''), 240), v_visitor, v_session, 'react', v_reaction,
      left(coalesce(p_path, '/'), 240), left(coalesce(p_user_agent, ''), 400),
      left(coalesce(p_device_type, ''), 40), left(coalesce(p_browser, ''), 40),
      left(coalesce(p_os, ''), 40), left(coalesce(p_language, ''), 40),
      left(coalesce(p_timezone, ''), 80)
    ) returning * into v_row;
    return to_jsonb(v_row);
  end if;

  if v_action in ('read', 'leave') then
    select id into v_existing
    from public.blog_post_events
    where action = 'read'
      and visitor_id = v_visitor
      and session_id = v_session
      and post_slug = v_slug
    limit 1;
    if v_existing is not null then
      update public.blog_post_events set
        duration_seconds = greatest(duration_seconds, v_duration),
        scroll_percent = greatest(scroll_percent, v_scroll),
        post_title = coalesce(nullif(trim(p_title), ''), post_title),
        updated_at = now()
      where id = v_existing
      returning * into v_row;
      return to_jsonb(v_row);
    end if;
    insert into public.blog_post_events (
      post_id, post_slug, post_title, visitor_id, session_id, action,
      duration_seconds, scroll_percent, path, user_agent, device_type, browser, os, language, timezone
    ) values (
      p_post_id, v_slug, left(coalesce(p_title, ''), 240), v_visitor, v_session, 'read',
      v_duration, v_scroll, left(coalesce(p_path, '/'), 240),
      left(coalesce(p_user_agent, ''), 400), left(coalesce(p_device_type, ''), 40),
      left(coalesce(p_browser, ''), 40), left(coalesce(p_os, ''), 40),
      left(coalesce(p_language, ''), 40), left(coalesce(p_timezone, ''), 80)
    ) returning * into v_row;
    return to_jsonb(v_row);
  end if;

  insert into public.blog_post_events (
    post_id, post_slug, post_title, visitor_id, session_id, action,
    path, user_agent, device_type, browser, os, language, timezone
  ) values (
    p_post_id, v_slug, left(coalesce(p_title, ''), 240), v_visitor, v_session, 'view',
    left(coalesce(p_path, '/'), 240), left(coalesce(p_user_agent, ''), 400),
    left(coalesce(p_device_type, ''), 40), left(coalesce(p_browser, ''), 40),
    left(coalesce(p_os, ''), 40), left(coalesce(p_language, ''), 40),
    left(coalesce(p_timezone, ''), 80)
  ) returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

-- ---------------------------------------------------------------------------
-- Public comments
-- ---------------------------------------------------------------------------
create or replace function public.public_list_blog_comments(p_slug text, p_limit integer default 100)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((
    select jsonb_agg(row_to_json(c) order by c.created_at asc)
    from (
      select
        id,
        case when is_anonymous then 'Anonymous' else nullif(author_name, '') end as author_name,
        is_anonymous,
        body,
        created_at
      from public.blog_post_comments
      where post_slug = trim(p_slug)
        and status = 'approved'
      order by created_at asc
      limit greatest(1, least(coalesce(p_limit, 100), 200))
    ) c
  ), '[]'::jsonb);
$$;

create or replace function public.public_submit_blog_comment(
  p_slug text,
  p_body text,
  p_post_id uuid default null,
  p_title text default '',
  p_author_name text default '',
  p_author_email text default '',
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
  v_slug text := left(trim(coalesce(p_slug, '')), 120);
  v_body text := trim(coalesce(p_body, ''));
  v_name text := left(trim(coalesce(p_author_name, '')), 120);
  v_email text := left(lower(trim(coalesce(p_author_email, ''))), 160);
  v_anon boolean := coalesce(p_is_anonymous, false);
  v_row public.blog_post_comments%rowtype;
begin
  if v_slug = '' then raise exception 'Post slug is required'; end if;
  if length(v_body) < 3 then raise exception 'Please write a longer comment'; end if;
  if length(v_body) > 2000 then raise exception 'Comment is too long (max 2000 characters)'; end if;
  if not v_anon and length(v_name) < 2 then
    raise exception 'Please enter your name, or choose to comment anonymously';
  end if;
  if v_anon then
    v_name := '';
    v_email := '';
  end if;

  insert into public.blog_post_comments (
    post_id, post_slug, post_title, author_name, author_email, body, is_anonymous, status,
    visitor_id, session_id, path, user_agent, device_type, browser, os, language, timezone
  ) values (
    p_post_id, v_slug, left(coalesce(p_title, ''), 240),
    v_name, v_email, left(v_body, 2000), v_anon, 'pending',
    left(trim(coalesce(p_visitor_id, '')), 80),
    left(trim(coalesce(p_session_id, '')), 80),
    left(coalesce(p_path, '/'), 240),
    left(coalesce(p_user_agent, ''), 400),
    left(coalesce(p_device_type, ''), 40),
    left(coalesce(p_browser, ''), 40),
    left(coalesce(p_os, ''), 40),
    left(coalesce(p_language, ''), 40),
    left(coalesce(p_timezone, ''), 80)
  ) returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'status', v_row.status,
    'message', 'Thank you. Your comment was submitted and will appear after review.'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: extended analytics + comment moderation
-- ---------------------------------------------------------------------------
create or replace function public.admin_blog_analytics(
  p_token text,
  p_slug text default null,
  p_limit integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(20, least(coalesce(p_limit, 300), 800));
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  return jsonb_build_object(
    'posts', coalesce((
      select jsonb_agg(row_to_json(t) order by t.views desc, t.title)
      from (
        select
          coalesce(nullif(e.post_slug, ''), 'unknown') as slug,
          coalesce(nullif(max(e.post_title), ''), e.post_slug) as title,
          count(*) filter (where e.action = 'view') as views,
          count(distinct e.visitor_id) filter (where e.visitor_id <> '') as unique_visitors,
          coalesce(round(avg(r.max_duration))::int, 0) as avg_seconds,
          coalesce(round(avg(r.max_scroll))::int, 0) as avg_scroll,
          count(*) filter (where e.action = 'react') as reactions,
          count(*) filter (where e.action = 'share') as shares,
          count(*) filter (where e.action = 'react' and e.reaction = 'amen') as amen,
          count(*) filter (where e.action = 'react' and e.reaction = 'fire') as fire,
          count(*) filter (where e.action = 'react' and e.reaction = 'heart') as heart,
          count(*) filter (where e.action = 'react' and e.reaction = 'clap') as clap,
          count(*) filter (where e.action = 'react' and e.reaction = 'inspired') as inspired,
          count(*) filter (where e.action = 'share' and e.share_channel = 'facebook') as share_facebook,
          count(*) filter (where e.action = 'share' and e.share_channel = 'x') as share_x,
          count(*) filter (where e.action = 'share' and e.share_channel = 'whatsapp') as share_whatsapp,
          count(*) filter (where e.action = 'share' and e.share_channel = 'telegram') as share_telegram,
          count(*) filter (where e.action = 'share' and e.share_channel = 'linkedin') as share_linkedin,
          count(*) filter (where e.action = 'share' and e.share_channel = 'email') as share_email,
          count(*) filter (where e.action = 'share' and e.share_channel = 'copy') as share_copy,
          count(*) filter (where e.action = 'share' and e.share_channel = 'native') as share_native,
          count(*) filter (where e.action in ('read', 'leave') and e.scroll_percent >= 80) as completed,
          (
            select count(*)::int from public.blog_post_comments c
            where c.post_slug = e.post_slug
          ) as comments_total,
          (
            select count(*)::int from public.blog_post_comments c
            where c.post_slug = e.post_slug and c.status = 'pending'
          ) as comments_pending,
          (
            select count(*)::int from public.blog_post_comments c
            where c.post_slug = e.post_slug and c.status = 'approved'
          ) as comments_approved
        from public.blog_post_events e
        left join lateral (
          select
            max(duration_seconds) as max_duration,
            max(scroll_percent) as max_scroll
          from public.blog_post_events r
          where r.post_slug = e.post_slug
            and r.action in ('read', 'leave')
            and r.visitor_id <> ''
        ) r on true
        group by e.post_slug
      ) t
    ), '[]'::jsonb),
    'shares', coalesce((
      select jsonb_agg(row_to_json(s) order by s.created_at desc)
      from (
        select
          id, post_slug, post_title, visitor_id, share_channel, device_type, browser, os,
          path, created_at
        from public.blog_post_events
        where action = 'share'
          and (p_slug is null or p_slug = '' or post_slug = p_slug)
        order by created_at desc
        limit v_limit
      ) s
    ), '[]'::jsonb),
    'share_totals', coalesce((
      select jsonb_object_agg(share_channel, cnt)
      from (
        select share_channel, count(*)::int as cnt
        from public.blog_post_events
        where action = 'share'
          and share_channel <> ''
          and (p_slug is null or p_slug = '' or post_slug = p_slug)
        group by share_channel
      ) x
    ), '{}'::jsonb),
    'events', coalesce((
      select jsonb_agg(row_to_json(e) order by e.created_at desc)
      from (
        select
          id, post_slug, post_title, visitor_id, session_id, action, reaction, share_channel,
          duration_seconds, scroll_percent, device_type, browser, os, language,
          timezone, path, created_at, updated_at
        from public.blog_post_events
        where (p_slug is null or p_slug = '' or post_slug = p_slug)
          and action in ('view', 'leave', 'react', 'read', 'share')
        order by created_at desc
        limit v_limit
      ) e
    ), '[]'::jsonb),
    'visitors', coalesce((
      select jsonb_agg(row_to_json(v) order by v.last_seen desc)
      from (
        select
          visitor_id,
          max(post_title) filter (where post_title <> '') as last_title,
          count(*) filter (where action = 'view') as views,
          count(*) filter (where action = 'share') as shares,
          max(duration_seconds) as max_seconds,
          max(scroll_percent) as max_scroll,
          string_agg(distinct reaction, ', ') filter (where action = 'react' and reaction <> '') as reactions,
          string_agg(distinct share_channel, ', ') filter (where action = 'share' and share_channel <> '') as share_channels,
          max(device_type) as device_type,
          max(browser) as browser,
          max(os) as os,
          max(created_at) as last_seen
        from public.blog_post_events
        where visitor_id <> ''
          and (p_slug is null or p_slug = '' or post_slug = p_slug)
        group by visitor_id
        order by max(created_at) desc
        limit 80
      ) v
    ), '[]'::jsonb),
    'comment_counts', jsonb_build_object(
      'pending', (select count(*)::int from public.blog_post_comments where status = 'pending'
        and (p_slug is null or p_slug = '' or post_slug = p_slug)),
      'approved', (select count(*)::int from public.blog_post_comments where status = 'approved'
        and (p_slug is null or p_slug = '' or post_slug = p_slug)),
      'rejected', (select count(*)::int from public.blog_post_comments where status = 'rejected'
        and (p_slug is null or p_slug = '' or post_slug = p_slug)),
      'total', (select count(*)::int from public.blog_post_comments
        where (p_slug is null or p_slug = '' or post_slug = p_slug))
    )
  );
end;
$$;

create or replace function public.admin_list_blog_comments(
  p_token text,
  p_status text default null,
  p_slug text default null,
  p_limit integer default 200
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(20, least(coalesce(p_limit, 200), 500));
  v_status text := lower(trim(coalesce(p_status, '')));
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  if v_status not in ('', 'pending', 'approved', 'rejected') then
    v_status := '';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(c) order by c.created_at desc)
    from (
      select *
      from public.blog_post_comments
      where (v_status = '' or status = v_status)
        and (p_slug is null or p_slug = '' or post_slug = p_slug)
      order by created_at desc
      limit v_limit
    ) c
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_moderate_blog_comment(
  p_token text,
  p_id uuid,
  p_status text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := lower(trim(coalesce(p_status, '')));
  v_row public.blog_post_comments%rowtype;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  if v_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Invalid status';
  end if;
  update public.blog_post_comments set
    status = v_status,
    admin_note = left(coalesce(p_note, ''), 500),
    reviewed_at = now(),
    updated_at = now()
  where id = p_id
  returning * into v_row;
  if not found then raise exception 'Comment not found'; end if;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_delete_blog_comment(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'blog.posts', 'delete');
  delete from public.blog_post_comments where id = p_id;
  if not found then raise exception 'Comment not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Drop old overload without share_channel if present, then grant new signature
grant execute on function public.public_track_blog_event(text, text, uuid, text, text, text, text, integer, integer, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.public_list_blog_comments(text, integer) to anon, authenticated;
grant execute on function public.public_submit_blog_comment(text, text, uuid, text, text, text, boolean, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_blog_analytics(text, text, integer) to anon, authenticated;
grant execute on function public.admin_list_blog_comments(text, text, text, integer) to anon, authenticated;
grant execute on function public.admin_moderate_blog_comment(text, uuid, text, text) to anon, authenticated;
grant execute on function public.admin_delete_blog_comment(text, uuid) to anon, authenticated;
