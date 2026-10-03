-- Scheduled mail stays on the priority list, and bulk/scheduled sends share one
-- daily budget so OTP and other transactional mail keep headroom on the Resend
-- free tier (100 emails/day, reset at midnight UTC).
--
-- Run this whole file in the Supabase SQL editor (project mpdvjaotalklzftktuuv)
-- after 20261101_household_beneficiaries.sql. It is safe to run more than once.
--
-- Before and after, see what is actually scheduled live. The repo schedules are
-- not the same thing as cron.job if someone added a job in the dashboard:
--
--   select jobid, jobname, schedule, command, active
--   from cron.job
--   order by jobname;
--
-- Expected rows (times are UTC):
--   ffiemc-fetch-christian-news   0 */6 * * *    news only, no email
--   ffiemc-spool-daily-growth     0 5 * * *     publish Daily Growth (06:00 UK)
--   ffiemc-content-digest         0 6 * * *     what's-new email (07:00 UK)
--   ffiemc-bible-study-reminder   30 15 * * 1   Monday 16:30 UK
--   ffiemc-sunday-reminder        30 20 * * 6   Saturday 21:30 UK
--
-- Delete any EXTRA row whose command calls invoke_scheduled_edge_crons,
-- spool-daily-growth, or member-content-emails. A second copy of the digest
-- would send the list twice:
--
--   select cron.unschedule(<jobid>);
--
-- This file re-asserts those five named jobs. Recipient limiting does not
-- depend on that; it takes effect as soon as the functions below exist,
-- including for edge functions that are already deployed.
--
-- Same-day retry after a crash that reserved slots but sent nothing
-- (only if you are sure Resend did not already accept the messages):
--
--   delete from public.email_scheduled_claims
--   where send_date = (timezone('UTC', now()))::date
--     and job = 'digest';  -- or bible_study / sunday_service / daily_growth / member_content
--
--   update public.email_daily_budget
--   set scheduled_slots = 0, bulk_slots = 0, updated_at = now()
--   where send_date = (timezone('UTC', now()))::date;

alter table public.email_send_settings
  add column if not exists daily_quota integer not null default 100,
  add column if not exists transactional_reserve integer not null default 40;

alter table public.email_send_settings
  drop constraint if exists email_send_settings_daily_quota_chk;
alter table public.email_send_settings
  add constraint email_send_settings_daily_quota_chk
  check (daily_quota >= 1 and daily_quota <= 100000);

alter table public.email_send_settings
  drop constraint if exists email_send_settings_transactional_reserve_chk;
alter table public.email_send_settings
  add constraint email_send_settings_transactional_reserve_chk
  check (transactional_reserve >= 0 and transactional_reserve <= daily_quota);

comment on column public.email_send_settings.daily_quota is
  'Resend plan limit for the UTC day. Free tier is 100. Raise this only when the plan changes.';
comment on column public.email_send_settings.transactional_reserve is
  'Emails kept back from scheduled and bulk sends so OTP and one-off mail can still go out.';

create table if not exists public.email_daily_budget (
  send_date date primary key,
  scheduled_slots integer not null default 0 check (scheduled_slots >= 0),
  bulk_slots integer not null default 0 check (bulk_slots >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_scheduled_claims (
  send_date date not null,
  job text not null,
  slots integer not null default 0 check (slots >= 0),
  candidates integer not null default 0 check (candidates >= 0),
  reason text not null default '',
  created_at timestamptz not null default now(),
  primary key (send_date, job)
);

alter table public.email_daily_budget enable row level security;
alter table public.email_scheduled_claims enable row level security;
revoke all on table public.email_daily_budget from public, anon, authenticated;
revoke all on table public.email_scheduled_claims from public, anon, authenticated;

comment on table public.email_daily_budget is
  'UTC-day counter for scheduled and bulk Resend sends. OTP does not write here.';
comment on table public.email_scheduled_claims is
  'One claim per scheduled job per UTC day so a retry or a duplicate cron cannot send that job again.';

create or replace function public._email_quota_numbers()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_max integer := 60;
  v_quota integer := 100;
  v_reserve integer := 40;
  v_day date := (timezone('UTC', now()))::date;
  v_scheduled integer := 0;
  v_bulk integer := 0;
  v_budget integer;
begin
  select s.max_recipients, s.daily_quota, s.transactional_reserve
  into v_max, v_quota, v_reserve
  from public.email_send_settings s
  where s.id = 1;

  v_max := coalesce(v_max, 60);
  v_quota := coalesce(v_quota, 100);
  v_reserve := coalesce(v_reserve, 40);
  v_budget := greatest(v_quota - v_reserve, 0);

  select b.scheduled_slots, b.bulk_slots
  into v_scheduled, v_bulk
  from public.email_daily_budget b
  where b.send_date = v_day;

  v_scheduled := coalesce(v_scheduled, 0);
  v_bulk := coalesce(v_bulk, 0);

  return jsonb_build_object(
    'max_recipients', v_max,
    'daily_quota', v_quota,
    'transactional_reserve', v_reserve,
    'scheduled_daily_budget', v_budget,
    'scheduled_used_today', v_scheduled,
    'bulk_used_today', v_bulk,
    'used_today', v_scheduled + v_bulk,
    'scheduled_remaining_today', greatest(v_budget - v_scheduled - v_bulk, 0),
    'send_date', v_day
  );
end;
$$;

revoke all on function public._email_quota_numbers() from public, anon, authenticated;

-- Approved priority members only, one address per household, same filters as announcements.
create or replace function public._priority_email_candidates()
returns table (
  id uuid,
  email text,
  full_name text,
  first_name text,
  last_name text,
  greeting_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_skip_unverified boolean := false;
  v_skip_invalid boolean := true;
begin
  select coalesce(s.skip_unverified, false), coalesce(s.skip_invalid, true)
  into v_skip_unverified, v_skip_invalid
  from public.email_send_settings s
  where s.id = 1;

  return query
  with raw as (
    select
      m.id,
      coalesce(
        nullif(lower(btrim(m.email)), ''),
        (
          select lower(btrim(p.email))
          from public.member_household_links l
          join public.church_members p on p.id = l.primary_member_id
          where l.beneficiary_member_id = m.id
            and l.status = 'approved'
            and l.use_primary_email
            and nullif(btrim(p.email), '') is not null
          limit 1
        )
      ) as email,
      coalesce(nullif(btrim(m.full_name), ''), 'Beloved') as full_name,
      coalesce(m.first_name, '') as first_name,
      coalesce(m.last_name, '') as last_name,
      coalesce(m.household_role, 'primary') as household_role,
      coalesce(m.email_verified, false) as is_verified
    from public.church_members m
    where m.email_priority = true
      and m.status in ('approved', 'active')
  ),
  filtered as (
    select *
    from raw
    where nullif(raw.email, '') is not null
      and position('@' in raw.email) > 1
      and (not v_skip_unverified or raw.is_verified)
      and (
        not v_skip_invalid
        or coalesce((public.validate_public_email(raw.email, true)->>'ok')::boolean, false)
      )
  ),
  deduped as (
    select distinct on (filtered.email)
      filtered.id,
      filtered.email,
      filtered.full_name,
      filtered.first_name,
      filtered.last_name,
      public._member_greeting_name(filtered.first_name, filtered.full_name) as greeting_name
    from filtered
    order by
      filtered.email,
      case when filtered.household_role = 'beneficiary' then 1 else 0 end,
      filtered.full_name
  )
  select d.id, d.email, d.full_name, d.first_name, d.last_name, d.greeting_name
  from deduped d
  order by d.full_name;
end;
$$;

revoke all on function public._priority_email_candidates() from public, anon, authenticated;

create or replace function public._lock_email_budget_day(p_day date)
returns public.email_daily_budget
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.email_daily_budget%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('ffiemc-email-budget'), hashtext(p_day::text));

  insert into public.email_daily_budget (send_date)
  values (p_day)
  on conflict (send_date) do nothing;

  select *
  into v_row
  from public.email_daily_budget
  where send_date = p_day
  for update;

  delete from public.email_scheduled_claims where send_date < p_day - 14;
  delete from public.email_daily_budget where send_date < p_day - 14;

  return v_row;
end;
$$;

revoke all on function public._lock_email_budget_day(date) from public, anon, authenticated;

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
  v_digest_on boolean := false;
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

  select coalesce(s.digest_enabled, false)
  into v_digest_on
  from public.content_email_settings s
  where s.id = 1;

  -- The what's-new digest already includes Daily Growth, and it runs an hour
  -- later. Sending both would use two waves. While the digest is on, publish
  -- growth on the site but do not email it.
  if v_job = 'daily_growth' and coalesce(v_digest_on, false) then
    insert into public.email_scheduled_claims (send_date, job, slots, candidates, reason)
    values (
      v_day,
      v_job,
      0,
      0,
      'Daily Growth email skipped because the what''s-new digest is on and includes today''s growth items.'
    );
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

create or replace function public.scheduled_email_hold_reason(p_job text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_job text := lower(btrim(coalesce(p_job, '')));
  v_row public.email_scheduled_claims%rowtype;
begin
  if v_job = '' then
    v_job := 'member_content';
  end if;

  select *
  into v_row
  from public.email_scheduled_claims
  where send_date = (timezone('UTC', now()))::date
    and job = v_job;

  if not found then
    return jsonb_build_object('reason', 'No scheduled recipients.', 'slots', 0);
  end if;

  if v_row.slots > 0 then
    return jsonb_build_object(
      'reason', format('Already claimed %s recipient(s) today; not sending again.', v_row.slots),
      'slots', v_row.slots
    );
  end if;

  return jsonb_build_object(
    'reason', coalesce(nullif(btrim(v_row.reason), ''), 'Scheduled send held.'),
    'slots', 0
  );
end;
$$;

revoke all on function public.scheduled_email_hold_reason(text) from public, anon, authenticated;
grant execute on function public.scheduled_email_hold_reason(text) to service_role;

-- Announcements and other multi-recipient sends share the same UTC-day budget.
-- One call is all-or-nothing so a single message is not half-counted.
create or replace function public.claim_bulk_email_slots(p_count integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (timezone('UTC', now()))::date;
  v_budget public.email_daily_budget%rowtype;
  v_numbers jsonb;
  v_room integer;
  v_count integer := coalesce(p_count, 0);
begin
  if v_count < 1 then
    return jsonb_build_object('granted', 0, 'reason', 'Nothing to send');
  end if;
  if v_count > 500 then
    return jsonb_build_object('granted', 0, 'reason', 'Refusing a bulk send larger than 500');
  end if;

  v_budget := public._lock_email_budget_day(v_day);
  v_numbers := public._email_quota_numbers();
  v_room := greatest(
    coalesce((v_numbers->>'scheduled_daily_budget')::integer, 60)
      - coalesce(v_budget.scheduled_slots, 0)
      - coalesce(v_budget.bulk_slots, 0),
    0
  );

  if v_room < v_count then
    return public._email_quota_numbers() || jsonb_build_object(
      'granted', 0,
      'requested', v_count,
      'reason', 'Daily email budget reached. This send was stopped so OTP and other transactional mail can still go out.'
    );
  end if;

  update public.email_daily_budget
  set bulk_slots = bulk_slots + v_count,
      updated_at = now()
  where send_date = v_day;

  return public._email_quota_numbers() || jsonb_build_object(
    'granted', v_count,
    'requested', v_count,
    'reason', 'claimed'
  );
end;
$$;

revoke all on function public.claim_bulk_email_slots(integer) from public, anon, authenticated;
grant execute on function public.claim_bulk_email_slots(integer) to service_role;

drop function if exists public.list_member_email_recipients();

create or replace function public.list_member_email_recipients(p_job text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job text := lower(btrim(coalesce(p_job, '')));
begin
  -- Deployed functions that do not pass p_job share this RPC across digest,
  -- Bible study, and Sunday. Key the claim by UTC hour so a later job the same
  -- day can still use leftover budget, while a retry in the same hour cannot
  -- send the list again.
  if v_job = '' or v_job = 'member_content' then
    v_job := 'member_content_' || to_char(timezone('UTC', now()), 'HH24');
  end if;
  return public.list_scheduled_email_recipients(v_job);
end;
$$;

drop function if exists public.list_daily_growth_digest_recipients();

create or replace function public.list_daily_growth_digest_recipients()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.list_scheduled_email_recipients('daily_growth');
$$;

revoke all on function public.list_member_email_recipients(text) from public, anon, authenticated;
revoke all on function public.list_daily_growth_digest_recipients() from public, anon, authenticated;
grant execute on function public.list_member_email_recipients(text) to service_role;
grant execute on function public.list_daily_growth_digest_recipients() to service_role;

-- Do not move the digest cursor when nobody was emailed. A held run must retry
-- the same content tomorrow instead of marking it as already sent.
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
  v_status text := coalesce(nullif(trim(p_status), ''), 'ok');
  v_sent integer := coalesce(p_sent, 0);
  v_failed integer := coalesce(p_failed, 0);
  v_advance boolean := v_sent > 0 or v_status = 'skipped';
  v_message text;
begin
  if v_job not in ('digest', 'bible_study', 'sunday_service') then
    raise exception 'Invalid job';
  end if;

  insert into public.content_email_runs (job, items, image_url, emails_sent, emails_failed, status, error)
  values (
    v_job,
    coalesce(p_items, '[]'::jsonb),
    coalesce(p_image_url, ''),
    v_sent,
    v_failed,
    v_status,
    coalesce(p_error, '')
  )
  returning to_jsonb(content_email_runs) into v_row;

  v_message := case
    when v_status = 'held' then coalesce(nullif(trim(p_error), ''), 'Scheduled send held')
    when v_advance and v_job = 'digest' then format('Digest sent %s / failed %s', v_sent, v_failed)
    when v_advance and v_job = 'bible_study' then format('Bible study reminder sent %s / failed %s', v_sent, v_failed)
    when v_advance then format('Sunday reminder sent %s / failed %s', v_sent, v_failed)
    else coalesce(nullif(trim(p_error), ''), format('%s not sent', v_job))
  end;

  if v_job = 'digest' then
    update public.content_email_settings
    set last_digest_at = case when v_advance then now() else last_digest_at end,
        last_message = v_message,
        updated_at = now()
    where id = 1;
  elsif v_job = 'bible_study' then
    update public.content_email_settings
    set last_bible_study_at = case when v_advance then now() else last_bible_study_at end,
        last_message = v_message,
        updated_at = now()
    where id = 1;
  else
    update public.content_email_settings
    set last_sunday_at = case when v_advance then now() else last_sunday_at end,
        last_message = v_message,
        updated_at = now()
    where id = 1;
  end if;

  return v_row;
end;
$$;

create or replace function public.admin_get_email_send_settings(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.email_send_settings%rowtype;
begin
  perform public._require_email_admin(p_token, 'view');
  select * into v_row from public.email_send_settings where id = 1;
  return coalesce(to_jsonb(v_row), '{}'::jsonb) || public._email_quota_numbers();
end;
$$;

create or replace function public.admin_update_email_send_settings(p_token text, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.email_send_settings%rowtype;
  v_max integer;
  v_quota integer;
  v_reserve integer;
begin
  perform public._require_email_admin(p_token, 'edit');
  select * into v_row from public.email_send_settings where id = 1;
  if not found then
    raise exception 'Email send settings are missing';
  end if;

  v_max := coalesce((p_data->>'max_recipients')::integer, v_row.max_recipients);
  v_quota := coalesce((p_data->>'daily_quota')::integer, v_row.daily_quota);
  v_reserve := coalesce((p_data->>'transactional_reserve')::integer, v_row.transactional_reserve);

  if v_max < 1 or v_max > 500 then
    raise exception 'Max emails per send must be between 1 and 500';
  end if;
  if v_quota < 1 or v_quota > 100000 then
    raise exception 'Daily quota must be between 1 and 100000';
  end if;
  if v_reserve < 0 or v_reserve > v_quota then
    raise exception 'The OTP hold-back must be between 0 and the daily quota';
  end if;

  update public.email_send_settings
  set max_recipients = v_max,
      daily_quota = v_quota,
      transactional_reserve = v_reserve,
      skip_unverified = coalesce((p_data->>'skip_unverified')::boolean, skip_unverified),
      skip_invalid = coalesce((p_data->>'skip_invalid')::boolean, skip_invalid),
      updated_at = now()
  where id = 1
  returning * into v_row;

  return to_jsonb(v_row) || public._email_quota_numbers();
end;
$$;

create or replace function public.admin_preview_scheduled_recipients(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_numbers jsonb;
  v_max integer;
begin
  perform public._require_email_admin(p_token, 'view');
  v_numbers := public._email_quota_numbers();
  v_max := coalesce((v_numbers->>'max_recipients')::integer, 60);

  select coalesce(jsonb_agg(to_jsonb(c) order by c.full_name), '[]'::jsonb)
  into v_rows
  from (
    select q.*
    from public._priority_email_candidates() q
    order by q.full_name
    limit v_max
  ) c;

  return v_numbers || jsonb_build_object(
    'recipients', coalesce(v_rows, '[]'::jsonb),
    'email_count', coalesce(jsonb_array_length(v_rows), 0),
    'reserves_quota', false
  );
end;
$$;

revoke all on function public.admin_preview_scheduled_recipients(text) from public;
grant execute on function public.admin_preview_scheduled_recipients(text) to anon, authenticated;

-- Re-assert the known schedules so a second apply does not leave duplicate names.
-- Unknown extra jobs are left in place; remove those with cron.unschedule (see header).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule(jobid)
      from cron.job
      where jobname in (
        'ffiemc-fetch-christian-news',
        'ffiemc-spool-daily-growth',
        'ffiemc-content-digest',
        'ffiemc-bible-study-reminder',
        'ffiemc-sunday-reminder'
      );
    exception when others then
      raise notice 'Could not unschedule existing FFIEMC crons: %', SQLERRM;
    end;

    perform cron.schedule(
      'ffiemc-fetch-christian-news',
      '0 */6 * * *',
      $cron$select public.invoke_scheduled_edge_crons('news');$cron$
    );
    perform cron.schedule(
      'ffiemc-spool-daily-growth',
      '0 5 * * *',
      $cron$select public.invoke_scheduled_edge_crons('growth');$cron$
    );
    perform cron.schedule(
      'ffiemc-content-digest',
      '0 6 * * *',
      $cron$select public.invoke_scheduled_edge_crons('digest');$cron$
    );
    perform cron.schedule(
      'ffiemc-bible-study-reminder',
      '30 15 * * 1',
      $cron$select public.invoke_scheduled_edge_crons('bible_study');$cron$
    );
    perform cron.schedule(
      'ffiemc-sunday-reminder',
      '30 20 * * 6',
      $cron$select public.invoke_scheduled_edge_crons('sunday_service');$cron$
    );
  else
    raise notice 'pg_cron is not installed; scheduled jobs were not changed';
  end if;
exception when others then
  raise notice 'Could not refresh cron jobs: %', SQLERRM;
end $$;

notify pgrst, 'reload schema';
