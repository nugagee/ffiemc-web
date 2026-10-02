-- Content digests + Bible Study / Sunday service reminder emails for members

create table if not exists public.content_email_settings (
  id integer primary key default 1 check (id = 1),
  digest_enabled boolean not null default true,
  digest_hour integer not null default 7 check (digest_hour >= 0 and digest_hour <= 23),
  digest_subject text not null default 'FFIEMC — What''s new on the website ({{date}})',
  digest_intro text not null default 'Here is a short summary of new content published for you. Tap Read more to open each item on the website.',
  digest_kinds jsonb not null default '["blog_post","daily_manna","daily_growth","bible_study","sunday_sermon","choir_ministration"]'::jsonb,
  bible_study_enabled boolean not null default true,
  bible_study_subject text not null default 'Reminder: Monday Bible Study — come expectant',
  bible_study_body text not null default 'Beloved, this is a gentle reminder that Monday Bible Study holds today. Come ready to learn and grow in the Word. See study notes and details on the website.',
  bible_study_cta_label text not null default 'Open Bible Study',
  bible_study_cta_path text not null default '/sermons?tab=bible-study',
  sunday_enabled boolean not null default true,
  sunday_subject text not null default 'Reminder: Sunday Service — see you in His presence',
  sunday_body text not null default 'Beloved, tomorrow is the Lord''s Day. Join us for Sunday Service as we worship and hear the Word. We look forward to seeing you.',
  sunday_cta_label text not null default 'View Sunday sermons',
  sunday_cta_path text not null default '/sermons?tab=sunday-sermon',
  last_digest_at timestamptz,
  last_bible_study_at timestamptz,
  last_sunday_at timestamptz,
  last_message text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.content_email_settings (id) values (1) on conflict (id) do nothing;
alter table public.content_email_settings enable row level security;

create table if not exists public.reminder_images (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('bible_study', 'sunday_service')),
  url text not null,
  title text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminder_images_kind_active_idx
  on public.reminder_images (kind, active, last_used_at nulls first);

alter table public.reminder_images enable row level security;

create table if not exists public.content_email_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null check (job in ('digest', 'bible_study', 'sunday_service')),
  run_at timestamptz not null default now(),
  run_date date not null default ((timezone('Africa/Lagos', now()))::date),
  items jsonb not null default '[]'::jsonb,
  image_url text not null default '',
  emails_sent integer not null default 0,
  emails_failed integer not null default 0,
  status text not null default 'ok',
  error text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists content_email_runs_job_date_idx
  on public.content_email_runs (job, run_date desc);

alter table public.content_email_runs enable row level security;

-- Recipients (approved/active members with email)
create or replace function public.list_member_email_recipients()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id,
      'email', m.email,
      'full_name', coalesce(nullif(trim(m.full_name), ''), 'Beloved')
    ) order by lower(m.email))
    from public.church_members m
    where m.status in ('approved', 'active')
      and nullif(trim(m.email), '') is not null
      and position('@' in m.email) > 1
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.list_member_email_recipients() from public;
grant execute on function public.list_member_email_recipients() to service_role;

-- Collect newly published content since last digest (or last 24h)
create or replace function public.collect_content_digest_items(p_since timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz := coalesce(
    p_since,
    (select last_digest_at from public.content_email_settings where id = 1),
    now() - interval '24 hours'
  );
  v_kinds jsonb;
  v_items jsonb := '[]'::jsonb;
begin
  select digest_kinds into v_kinds from public.content_email_settings where id = 1;
  if v_kinds is null then
    v_kinds := '["blog_post","daily_manna","daily_growth","bible_study","sunday_sermon","choir_ministration"]'::jsonb;
  end if;

  if v_kinds ? 'blog_post' then
    v_items := v_items || coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', 'blog_post',
        'kind_label', 'Article',
        'title', b.title,
        'summary', left(coalesce(nullif(trim(b.excerpt), ''), regexp_replace(coalesce(b.content, ''), '<[^>]+>', '', 'g')), 180),
        'url', case when nullif(trim(b.slug), '') is not null then '/blog/' || trim(b.slug) else '/blog/' || b.id::text end,
        'published_at', coalesce(b.published_at, b.created_at)
      ) order by coalesce(b.published_at, b.created_at) desc)
      from public.blog_posts b
      where (
          b.published = true or b.status = 'published'
          or (b.status = 'scheduled' and b.scheduled_at is not null and b.scheduled_at <= now())
        )
        and coalesce(b.published_at, b.created_at) > v_since
    ), '[]'::jsonb);
  end if;

  if v_kinds ? 'daily_manna' or v_kinds ? 'bible_study' or v_kinds ? 'sunday_sermon' or v_kinds ? 'choir_ministration' then
    v_items := v_items || coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', r.kind,
        'kind_label', case
          when r.kind = 'daily_manna' then 'Daily Manna'
          when r.kind = 'bible_study' then 'Monday Bible Study'
          when r.kind = 'sunday_sermon' then 'Sunday Sermon'
          when r.kind = 'choir_ministration' then 'Choir'
          else initcap(replace(r.kind, '_', ' '))
        end,
        'title', r.title,
        'summary', left(coalesce(nullif(trim(r.excerpt), ''), regexp_replace(coalesce(r.content, ''), '<[^>]+>', '', 'g')), 180),
        'url', case
          when r.kind = 'daily_manna' then '/blog?tab=daily-manna'
          when r.kind = 'bible_study' and coalesce(r.content_format, '') = 'video' then '/sermons?tab=bible-study&cat=video'
          when r.kind = 'bible_study' then '/sermons?tab=bible-study&cat=written'
          when r.kind = 'sunday_sermon' then '/sermons?tab=sunday-sermon'
          when r.kind = 'choir_ministration' then '/sermons?tab=choir'
          else '/blog'
        end,
        'published_at', coalesce(r.service_date::timestamptz, r.study_date::timestamptz, r.week_of::timestamptz, r.updated_at, r.created_at)
      ) order by coalesce(r.updated_at, r.created_at) desc)
      from public.church_resources r
      where r.published = true
        and r.kind in ('daily_manna', 'bible_study', 'sunday_sermon', 'choir_ministration')
        and (v_kinds ? r.kind)
        and coalesce(r.updated_at, r.created_at) > v_since
    ), '[]'::jsonb);
  end if;

  if v_kinds ? 'daily_growth' then
    v_items := v_items || coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', 'daily_growth',
        'kind_label', case g.category
          when 'trait' then 'Character Trait'
          when 'prophecy' then 'Prophecy'
          when 'fact' then 'Bible Fact'
          when 'riddle' then 'Bible Riddle'
          else 'Daily Growth'
        end,
        'title', g.title,
        'summary', left(regexp_replace(coalesce(g.body, ''), '<[^>]+>', '', 'g'), 180),
        'url', '/blog?tab=daily-growth',
        'published_at', coalesce(g.published_on::timestamptz, g.updated_at, g.created_at)
      ) order by coalesce(g.published_on::timestamptz, g.updated_at) desc)
      from public.daily_growth_items g
      where g.status = 'published'
        and coalesce(g.updated_at, g.created_at) > v_since
    ), '[]'::jsonb);
  end if;

  return coalesce(v_items, '[]'::jsonb);
end;
$$;

revoke all on function public.collect_content_digest_items(timestamptz) from public;
grant execute on function public.collect_content_digest_items(timestamptz) to service_role;

-- Weekly-ish shuffle: least recently used active image for kind
create or replace function public.pick_reminder_image(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := lower(trim(p_kind));
  v_row public.reminder_images%rowtype;
begin
  if v_kind not in ('bible_study', 'sunday_service') then
    raise exception 'Invalid reminder image kind';
  end if;

  select * into v_row
  from public.reminder_images
  where kind = v_kind and active = true and nullif(trim(url), '') is not null
  order by last_used_at nulls first, sort_order asc, created_at asc
  limit 1
  for update skip locked;

  if not found then
    return '{}'::jsonb;
  end if;

  update public.reminder_images
  set last_used_at = now(), updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.pick_reminder_image(text) from public;
grant execute on function public.pick_reminder_image(text) to service_role;

create or replace function public.admin_get_content_email_settings(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  return coalesce((select to_jsonb(s) from public.content_email_settings s where s.id = 1), '{}'::jsonb);
end;
$$;

create or replace function public.admin_update_content_email_settings(p_token text, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  update public.content_email_settings s
  set
    digest_enabled = coalesce((p_data->>'digest_enabled')::boolean, s.digest_enabled),
    digest_hour = coalesce((p_data->>'digest_hour')::integer, s.digest_hour),
    digest_subject = coalesce(nullif(p_data->>'digest_subject', ''), s.digest_subject),
    digest_intro = coalesce(nullif(p_data->>'digest_intro', ''), s.digest_intro),
    digest_kinds = coalesce(p_data->'digest_kinds', s.digest_kinds),
    bible_study_enabled = coalesce((p_data->>'bible_study_enabled')::boolean, s.bible_study_enabled),
    bible_study_subject = coalesce(nullif(p_data->>'bible_study_subject', ''), s.bible_study_subject),
    bible_study_body = coalesce(nullif(p_data->>'bible_study_body', ''), s.bible_study_body),
    bible_study_cta_label = coalesce(nullif(p_data->>'bible_study_cta_label', ''), s.bible_study_cta_label),
    bible_study_cta_path = coalesce(nullif(p_data->>'bible_study_cta_path', ''), s.bible_study_cta_path),
    sunday_enabled = coalesce((p_data->>'sunday_enabled')::boolean, s.sunday_enabled),
    sunday_subject = coalesce(nullif(p_data->>'sunday_subject', ''), s.sunday_subject),
    sunday_body = coalesce(nullif(p_data->>'sunday_body', ''), s.sunday_body),
    sunday_cta_label = coalesce(nullif(p_data->>'sunday_cta_label', ''), s.sunday_cta_label),
    sunday_cta_path = coalesce(nullif(p_data->>'sunday_cta_path', ''), s.sunday_cta_path),
    updated_at = now()
  where s.id = 1
  returning to_jsonb(s.*) into v_row;
  return v_row;
end;
$$;

create or replace function public.admin_list_reminder_images(p_token text, p_kind text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := nullif(lower(trim(coalesce(p_kind, ''))), '');
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  if v_kind is not null and v_kind not in ('bible_study', 'sunday_service') then
    raise exception 'Invalid kind';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(i) order by i.kind, i.sort_order, i.created_at desc)
    from public.reminder_images i
    where v_kind is null or i.kind = v_kind
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_reminder_image(p_token text, p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_kind text;
  v_row jsonb;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  v_id := coalesce(p_id, gen_random_uuid());
  v_kind := lower(coalesce(nullif(trim(p_data->>'kind'), ''), 'bible_study'));
  if v_kind not in ('bible_study', 'sunday_service') then
    raise exception 'Invalid kind';
  end if;
  insert into public.reminder_images (id, kind, url, title, active, sort_order, updated_at)
  values (
    v_id,
    v_kind,
    coalesce(p_data->>'url', ''),
    coalesce(p_data->>'title', ''),
    coalesce((p_data->>'active')::boolean, true),
    coalesce((p_data->>'sort_order')::integer, 0),
    now()
  )
  on conflict (id) do update set
    kind = excluded.kind,
    url = excluded.url,
    title = excluded.title,
    active = excluded.active,
    sort_order = excluded.sort_order,
    updated_at = now()
  returning to_jsonb(reminder_images) into v_row;
  return v_row;
end;
$$;

create or replace function public.admin_delete_reminder_image(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'blog.posts', 'delete');
  delete from public.reminder_images where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_list_content_email_runs(p_token text, p_limit integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 60));
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.run_at desc)
    from (
      select * from public.content_email_runs order by run_at desc limit v_limit
    ) r
  ), '[]'::jsonb);
end;
$$;

create or replace function public.record_content_email_run(
  p_job text,
  p_items jsonb default '[]'::jsonb,
  p_image_url text default '',
  p_sent integer default 0,
  p_failed integer default 0,
  p_status text default 'ok',
  p_error text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_job text := lower(trim(p_job));
begin
  if v_job not in ('digest', 'bible_study', 'sunday_service') then
    raise exception 'Invalid job';
  end if;

  insert into public.content_email_runs (job, items, image_url, emails_sent, emails_failed, status, error)
  values (v_job, coalesce(p_items, '[]'::jsonb), coalesce(p_image_url, ''), coalesce(p_sent, 0), coalesce(p_failed, 0), coalesce(nullif(trim(p_status), ''), 'ok'), coalesce(p_error, ''))
  returning to_jsonb(content_email_runs) into v_row;

  if v_job = 'digest' then
    update public.content_email_settings
    set last_digest_at = now(), last_message = format('Digest sent %s / failed %s', coalesce(p_sent, 0), coalesce(p_failed, 0)), updated_at = now()
    where id = 1;
  elsif v_job = 'bible_study' then
    update public.content_email_settings
    set last_bible_study_at = now(), last_message = format('Bible study reminder sent %s / failed %s', coalesce(p_sent, 0), coalesce(p_failed, 0)), updated_at = now()
    where id = 1;
  else
    update public.content_email_settings
    set last_sunday_at = now(), last_message = format('Sunday reminder sent %s / failed %s', coalesce(p_sent, 0), coalesce(p_failed, 0)), updated_at = now()
    where id = 1;
  end if;

  return v_row;
end;
$$;

create or replace function public.get_content_email_settings_public()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce((select to_jsonb(s) from public.content_email_settings s where s.id = 1), '{}'::jsonb);
$$;

revoke all on function public.get_content_email_settings_public() from public;
grant execute on function public.get_content_email_settings_public() to service_role;
revoke all on function public.record_content_email_run(text, jsonb, text, integer, integer, text, text) from public;
grant execute on function public.record_content_email_run(text, jsonb, text, integer, integer, text, text) to service_role;

grant execute on function public.admin_get_content_email_settings(text) to anon, authenticated;
grant execute on function public.admin_update_content_email_settings(text, jsonb) to anon, authenticated;
grant execute on function public.admin_list_reminder_images(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_reminder_image(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_reminder_image(text, uuid) to anon, authenticated;
grant execute on function public.admin_list_content_email_runs(text, integer) to anon, authenticated;

-- Extend edge_cron_config for member emails secret
alter table public.edge_cron_config
  add column if not exists member_emails_secret text not null default '',
  add column if not exists member_emails_enabled boolean not null default true;

create or replace function public.invoke_scheduled_edge_crons(p_kind text default 'all')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg public.edge_cron_config%rowtype;
  v_kind text := lower(coalesce(nullif(trim(p_kind), ''), 'all'));
  v_url text;
  v_secret text;
  v_req_id bigint;
  v_results jsonb := '[]'::jsonb;
begin
  select * into v_cfg from public.edge_cron_config where id = 1;
  if not found or nullif(trim(v_cfg.project_url), '') is null then
    return jsonb_build_object('ok', false, 'error', 'edge_cron_config.project_url not set');
  end if;

  if v_kind in ('all', 'news') and v_cfg.news_enabled and nullif(trim(v_cfg.news_cron_secret), '') is not null then
    v_url := rtrim(v_cfg.project_url, '/') || '/functions/v1/fetch-christian-news?secret=' || v_cfg.news_cron_secret;
    begin
      select net.http_post(
        url := v_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_cfg.news_cron_secret),
        body := '{}'::jsonb
      ) into v_req_id;
      v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'news', 'request_id', v_req_id));
    exception when others then
      v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'news', 'error', SQLERRM));
    end;
  end if;

  if v_kind in ('all', 'growth') and v_cfg.growth_enabled and nullif(trim(v_cfg.growth_cron_secret), '') is not null then
    v_url := rtrim(v_cfg.project_url, '/') || '/functions/v1/spool-daily-growth?secret=' || v_cfg.growth_cron_secret;
    begin
      select net.http_post(
        url := v_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_cfg.growth_cron_secret),
        body := '{}'::jsonb
      ) into v_req_id;
      v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'growth', 'request_id', v_req_id));
    exception when others then
      v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'growth', 'error', SQLERRM));
    end;
  end if;

  if v_cfg.member_emails_enabled and nullif(trim(coalesce(v_cfg.member_emails_secret, '')), '') is not null then
    v_secret := v_cfg.member_emails_secret;
    if v_kind in ('all', 'digest') then
      v_url := rtrim(v_cfg.project_url, '/') || '/functions/v1/member-content-emails?job=digest&secret=' || v_secret;
      begin
        select net.http_post(
          url := v_url,
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
          body := '{}'::jsonb
        ) into v_req_id;
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'digest', 'request_id', v_req_id));
      exception when others then
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'digest', 'error', SQLERRM));
      end;
    end if;
    if v_kind in ('all', 'bible_study') then
      v_url := rtrim(v_cfg.project_url, '/') || '/functions/v1/member-content-emails?job=bible_study&secret=' || v_secret;
      begin
        select net.http_post(
          url := v_url,
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
          body := '{}'::jsonb
        ) into v_req_id;
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'bible_study', 'request_id', v_req_id));
      exception when others then
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'bible_study', 'error', SQLERRM));
      end;
    end if;
    if v_kind in ('all', 'sunday_service') then
      v_url := rtrim(v_cfg.project_url, '/') || '/functions/v1/member-content-emails?job=sunday_service&secret=' || v_secret;
      begin
        select net.http_post(
          url := v_url,
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
          body := '{}'::jsonb
        ) into v_req_id;
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'sunday_service', 'request_id', v_req_id));
      exception when others then
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'sunday_service', 'error', SQLERRM));
      end;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'results', v_results, 'at', now());
end;
$$;

revoke all on function public.invoke_scheduled_edge_crons(text) from public;
grant execute on function public.invoke_scheduled_edge_crons(text) to postgres, service_role;

create or replace function public.admin_upsert_edge_cron_config(p_token text, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  update public.edge_cron_config c
  set
    project_url = coalesce(nullif(trim(p_data->>'project_url'), ''), c.project_url),
    news_cron_secret = coalesce(nullif(trim(p_data->>'news_cron_secret'), ''), c.news_cron_secret),
    growth_cron_secret = coalesce(nullif(trim(p_data->>'growth_cron_secret'), ''), c.growth_cron_secret),
    member_emails_secret = coalesce(nullif(trim(p_data->>'member_emails_secret'), ''), c.member_emails_secret),
    news_enabled = coalesce((p_data->>'news_enabled')::boolean, c.news_enabled),
    growth_enabled = coalesce((p_data->>'growth_enabled')::boolean, c.growth_enabled),
    member_emails_enabled = coalesce((p_data->>'member_emails_enabled')::boolean, c.member_emails_enabled),
    updated_at = now()
  where c.id = 1
  returning jsonb_build_object(
    'id', c.id,
    'project_url', c.project_url,
    'news_enabled', c.news_enabled,
    'growth_enabled', c.growth_enabled,
    'member_emails_enabled', c.member_emails_enabled,
    'has_news_secret', length(c.news_cron_secret) > 0,
    'has_growth_secret', length(c.growth_cron_secret) > 0,
    'has_member_emails_secret', length(c.member_emails_secret) > 0,
    'updated_at', c.updated_at
  ) into v_row;
  return coalesce(v_row, '{}'::jsonb);
end;
$$;

grant execute on function public.admin_upsert_edge_cron_config(text, jsonb) to anon, authenticated;

-- Schedule (Africa/Lagos): digest 07:00 daily; Bible study Mon 16:30; Sunday Sat 21:30
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule(jobid) from cron.job
      where jobname in (
        'ffiemc-content-digest',
        'ffiemc-bible-study-reminder',
        'ffiemc-sunday-reminder'
      );
    exception when others then null;
    end;

    -- 06:00 UTC = 07:00 WAT
    perform cron.schedule(
      'ffiemc-content-digest',
      '0 6 * * *',
      $cron$select public.invoke_scheduled_edge_crons('digest');$cron$
    );
    -- Mon 15:30 UTC = 16:30 WAT
    perform cron.schedule(
      'ffiemc-bible-study-reminder',
      '30 15 * * 1',
      $cron$select public.invoke_scheduled_edge_crons('bible_study');$cron$
    );
    -- Sat 20:30 UTC = 21:30 WAT
    perform cron.schedule(
      'ffiemc-sunday-reminder',
      '30 20 * * 6',
      $cron$select public.invoke_scheduled_edge_crons('sunday_service');$cron$
    );
  end if;
exception when others then
  raise notice 'Could not schedule member email crons: %', SQLERRM;
end $$;
