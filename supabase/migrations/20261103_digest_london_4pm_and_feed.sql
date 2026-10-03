-- What's-new digest at 16:00 Europe/London, without Daily Growth.
-- Daily Growth emails again on its existing cron. A public send log feeds
-- https://ffiem.org/feeds/content-emails.json
--
-- Run this whole file in the Supabase SQL editor after
-- 20261102_scheduled_email_priority_quota.sql. Safe to run more than once.
-- It does not drop data and only replaces the digest cron by name.
--
-- Check live jobs before and after:
--
--   select jobid, jobname, schedule, command, active
--   from cron.job
--   order by jobname;
--
-- ffiemc-content-digest should be: 0 15,16 * * *
--   select public.invoke_digest_at_london_16();
-- ffiemc-spool-daily-growth stays: 0 5 * * *
--   select public.invoke_scheduled_edge_crons('growth');
--
-- pg_cron is UTC. 16:00 UK is 15:00 UTC during BST and 16:00 UTC during GMT
-- (the switch is 25 Oct 2026). The digest cron fires at both hours. The
-- wrapper sends only when the clock in Europe/London says 16. That hour
-- exists once a day, including on the clock-change Sundays.

-- Drop the PR #5 placeholder that blocked Daily Growth email while the digest
-- was on. Those rows reserved 0 slots, so this does not give budget back.
delete from public.email_scheduled_claims
where job = 'daily_growth'
  and slots = 0
  and reason like 'Daily Growth email skipped because the what''s-new digest%';

alter table public.content_email_settings
  alter column digest_kinds set default
    '["blog_post","daily_manna","bible_study","sunday_sermon","choir_ministration"]'::jsonb;

update public.content_email_settings
set digest_kinds = coalesce((
  select jsonb_agg(to_jsonb(elem))
  from jsonb_array_elements_text(digest_kinds) as elem
  where elem <> 'daily_growth'
), '["blog_post","daily_manna","bible_study","sunday_sermon","choir_ministration"]'::jsonb),
updated_at = now()
where id = 1
  and digest_kinds ? 'daily_growth';

-- Daily Growth is never part of the what's-new digest, even if an old
-- settings row still lists it.
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
    v_kinds := '["blog_post","daily_manna","bible_study","sunday_sermon","choir_ministration"]'::jsonb;
  end if;
  v_kinds := v_kinds - 'daily_growth';

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

  return coalesce(v_items, '[]'::jsonb);
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
  v_kinds jsonb;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  v_kinds := coalesce((
    select jsonb_agg(to_jsonb(elem))
    from jsonb_array_elements_text(coalesce(p_data->'digest_kinds', (
      select s.digest_kinds from public.content_email_settings s where s.id = 1
    ))) as elem
    where elem <> 'daily_growth'
  ), '["blog_post","daily_manna","bible_study","sunday_sermon","choir_ministration"]'::jsonb);

  update public.content_email_settings s
  set
    digest_enabled = coalesce((p_data->>'digest_enabled')::boolean, s.digest_enabled),
    digest_hour = coalesce((p_data->>'digest_hour')::integer, s.digest_hour),
    digest_subject = coalesce(nullif(p_data->>'digest_subject', ''), s.digest_subject),
    digest_intro = coalesce(nullif(p_data->>'digest_intro', ''), s.digest_intro),
    digest_kinds = v_kinds,
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

-- Same recipient rules as 20261102, without the Daily Growth suppression.
create or replace function public.list_scheduled_email_recipients(p_job text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job text := lower(btrim(coalesce(p_job, '')));
  v_day date := (timezone('UTC', now()))::date;
  v_budget public.email_daily_budget%rowtype;
  v_numbers jsonb;
  v_max integer;
  v_room integer;
  v_all jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_grant integer := 0;
  v_reason text := '';
  v_existing public.email_scheduled_claims%rowtype;
begin
  if v_job = '' then
    v_job := 'member_content';
  end if;
  if v_job not in ('daily_growth', 'digest', 'bible_study', 'sunday_service', 'member_content')
     and v_job !~ '^member_content_[0-9]{2}$' then
    raise exception 'Invalid scheduled email job';
  end if;

  v_budget := public._lock_email_budget_day(v_day);
  v_numbers := public._email_quota_numbers();
  v_max := coalesce((v_numbers->>'max_recipients')::integer, 60);

  select *
  into v_existing
  from public.email_scheduled_claims
  where send_date = v_day
    and job = v_job;

  if found then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'email', c.email,
        'full_name', c.full_name,
        'first_name', c.first_name,
        'last_name', c.last_name,
        'greeting_name', c.greeting_name
      )
      order by c.full_name
    ),
    '[]'::jsonb
  )
  into v_all
  from public._priority_email_candidates() c;

  v_count := coalesce(jsonb_array_length(v_all), 0);
  v_room := greatest(
    coalesce((v_numbers->>'scheduled_daily_budget')::integer, 60)
      - coalesce(v_budget.scheduled_slots, 0)
      - coalesce(v_budget.bulk_slots, 0),
    0
  );
  v_grant := least(v_max, v_count, v_room);

  if v_count = 0 then
    v_reason := 'No approved priority addresses to send to.';
  elsif v_grant = 0 then
    v_reason := 'Daily scheduled budget is used. OTP and transactional mail are not affected.';
  else
    v_reason := 'claimed';
  end if;

  insert into public.email_scheduled_claims (send_date, job, slots, candidates, reason)
  values (v_day, v_job, v_grant, v_count, v_reason);

  if v_grant > 0 then
    update public.email_daily_budget
    set scheduled_slots = scheduled_slots + v_grant,
        updated_at = now()
    where send_date = v_day;
  end if;

  if v_grant <= 0 then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(t.elem order by t.ord)
    from jsonb_array_elements(v_all) with ordinality as t(elem, ord)
    where t.ord <= v_grant
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.list_scheduled_email_recipients(text) from public, anon, authenticated;
grant execute on function public.list_scheduled_email_recipients(text) to service_role;

-- Fires from cron at 15:00 and 16:00 UTC. Sends only at 16:00 Europe/London.
create or replace function public.invoke_digest_at_london_16()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local timestamp;
begin
  v_local := timezone('Europe/London', now());
  if extract(hour from v_local)::int <> 16 then
    return jsonb_build_object(
      'ok', true,
      'skipped', true,
      'reason', 'not_16_london',
      'london_time', to_char(v_local, 'YYYY-MM-DD HH24:MI:SS')
    );
  end if;
  return public.invoke_scheduled_edge_crons('digest');
end;
$$;

revoke all on function public.invoke_digest_at_london_16() from public, anon, authenticated;
grant execute on function public.invoke_digest_at_london_16() to postgres, service_role;

-- Public snapshot of waves Resend accepted. No addresses or counts.
create table if not exists public.content_email_sends (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz not null default now(),
  send_type text not null check (send_type in ('daily-growth', 'whats-new')),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists content_email_sends_sent_at_idx
  on public.content_email_sends (sent_at desc);

alter table public.content_email_sends enable row level security;
revoke all on table public.content_email_sends from public, anon, authenticated;

comment on table public.content_email_sends is
  'Public snapshot of scheduled content emails that Resend accepted. Titles and links only.';

create or replace function public.record_content_email_send(p_type text, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := lower(btrim(coalesce(p_type, '')));
  v_items jsonb;
  v_id uuid;
  v_sent timestamptz := now();
begin
  if v_type not in ('daily-growth', 'whats-new') then
    raise exception 'Invalid content email send type';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'title', left(btrim(coalesce(item->>'title', '')), 300),
    'excerpt', left(regexp_replace(btrim(coalesce(item->>'excerpt', item->>'summary', '')), '<[^>]+>', '', 'g'), 400),
    'category', left(btrim(coalesce(item->>'category', item->>'kind_label', '')), 80),
    'url', case
      when btrim(coalesce(item->>'url', '')) ~ '^https://(www\.)?ffiem\.org(/|$)' then
        regexp_replace(left(btrim(item->>'url'), 500), '^https://www\.ffiem\.org', 'https://ffiem.org')
      when btrim(coalesce(item->>'url', '')) = '/' or btrim(coalesce(item->>'url', '')) ~ '^/[^/]' then
        'https://ffiem.org' || left(btrim(item->>'url'), 500)
      else null
    end
  ) order by ord), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as src(item, ord)
  where nullif(btrim(coalesce(item->>'title', '')), '') is not null
    and (
      btrim(coalesce(item->>'url', '')) ~ '^https://(www\.)?ffiem\.org(/|$)'
      or btrim(coalesce(item->>'url', '')) = '/'
      or btrim(coalesce(item->>'url', '')) ~ '^/[^/]'
    );

  if coalesce(jsonb_array_length(v_items), 0) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_public_items');
  end if;

  insert into public.content_email_sends (sent_at, send_type, items)
  values (v_sent, v_type, v_items)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'sent_at', v_sent, 'type', v_type);
end;
$$;

revoke all on function public.record_content_email_send(text, jsonb) from public, anon, authenticated;
grant execute on function public.record_content_email_send(text, jsonb) to service_role;

create or replace function public.public_content_email_feed(p_days integer default 14)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'sent_at', s.sent_at,
      'type', s.send_type,
      'items', s.items
    )
    order by s.sent_at desc
  ), '[]'::jsonb)
  from public.content_email_sends s
  where s.sent_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 14), 1), 30));
$$;

revoke all on function public.public_content_email_feed(integer) from public;
grant execute on function public.public_content_email_feed(integer) to anon, authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'ffiemc-content-digest';

    perform cron.schedule(
      'ffiemc-content-digest',
      '0 15,16 * * *',
      $cron$select public.invoke_digest_at_london_16();$cron$
    );
  else
    raise notice 'pg_cron is not installed; digest schedule was not changed';
  end if;
exception when others then
  raise notice 'Could not reschedule ffiemc-content-digest: %', SQLERRM;
end $$;

notify pgrst, 'reload schema';
