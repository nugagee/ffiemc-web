-- Weekly repeat for member announcements.
-- Additive: schedule columns, one occurrence row per local date, and a
-- 5-minute dispatcher. Does not change the Social Media Meeting row.
-- Arm that row with supabase/snippets/social-media-meeting-weekly.sql.
--
-- Why */5 and not "0 17 * * 6":
-- The schedule is generic (any weekday, local time, and timezone). A single
-- Saturday 17:00 UTC cron would never send a Wednesday reminder. Nigeria has
-- no daylight saving, so Saturday 18:00 Africa/Lagos is always 17:00 UTC, and
-- */5 includes that minute. Ticks that are not due return without emailing.
-- The occurrence primary key makes a second tick the same local day a no-op.

alter table public.member_notifications
  add column if not exists repeat_enabled boolean not null default false,
  add column if not exists repeat_interval text not null default '',
  add column if not exists repeat_weekday smallint,
  add column if not exists repeat_time time,
  add column if not exists repeat_timezone text not null default 'Africa/Lagos',
  add column if not exists repeat_last_on date;

alter table public.member_notifications
  drop constraint if exists member_notifications_repeat_chk;
alter table public.member_notifications
  add constraint member_notifications_repeat_chk check (
    repeat_interval in ('', 'weekly')
    and (repeat_weekday is null or repeat_weekday between 0 and 6)
    and (
      not repeat_enabled
      or (
        repeat_interval = 'weekly'
        and repeat_weekday between 0 and 6
        and repeat_time is not null
        and length(btrim(repeat_timezone)) > 0
      )
    )
  );

comment on column public.member_notifications.repeat_weekday is
  '0 = Sunday through 6 = Saturday, matching PostgreSQL extract(dow) and cron.';
comment on column public.member_notifications.repeat_time is
  'Local time in repeat_timezone. Saturday 18:00 Africa/Lagos is 17:00 UTC.';

create index if not exists member_notifications_repeat_due_idx
  on public.member_notifications (repeat_weekday, repeat_time)
  where repeat_enabled;

alter table public.member_notification_deliveries
  add column if not exists occurrence_on date;

create unique index if not exists member_notification_deliveries_occurrence_uidx
  on public.member_notification_deliveries (notification_id, occurrence_on, recipient_id, channel)
  where occurrence_on is not null;

create table if not exists public.member_notification_occurrences (
  notification_id uuid not null references public.member_notifications(id) on delete cascade,
  occurrence_on date not null,
  status text not null default 'claimed'
    check (status in ('claimed', 'sending', 'sent', 'failed', 'skipped')),
  reason text not null default '',
  locked_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (notification_id, occurrence_on)
);

alter table public.member_notification_occurrences enable row level security;
revoke all on table public.member_notification_occurrences from public, anon, authenticated;

comment on table public.member_notification_occurrences is
  'One row per notification per local date. Stops a weekly announcement sending twice in the same week.';

-- Sunday = 0. Due when the local weekday matches and the local clock is at or after the slot.
-- occurrence_on is that local date, including when the slot is not due yet.
create or replace function public._member_notification_due(
  p_timezone text,
  p_weekday integer,
  p_time time,
  p_enabled boolean
)
returns table (due boolean, occurrence_on date)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_local timestamp;
begin
  if not coalesce(p_enabled, false) or p_weekday is null or p_time is null then
    return query select false, null::date;
    return;
  end if;
  v_local := timezone(p_timezone, clock_timestamp());
  return query
  select
    extract(dow from v_local)::integer = p_weekday and v_local::time >= p_time,
    v_local::date;
end;
$$;

revoke all on function public._member_notification_due(text, integer, time, boolean)
  from public, anon, authenticated;

create or replace function public.mark_member_notification_delivery(
  p_id uuid,
  p_status text,
  p_error text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('sent', 'failed', 'skipped') then
    raise exception 'Invalid delivery status';
  end if;
  update public.member_notification_deliveries
  set
    status = p_status,
    error_message = left(coalesce(p_error, ''), 500),
    sent_at = case when p_status = 'sent' then now() else sent_at end
  where id = p_id
    and status = 'pending';
  return found;
end;
$$;

revoke all on function public.mark_member_notification_delivery(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.mark_member_notification_delivery(uuid, text, text) to service_role;

create or replace function public.finish_member_notification_occurrence(
  p_notification_id uuid,
  p_occurrence date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sent integer := 0;
  v_failed integer := 0;
  v_total integer := 0;
  v_status text;
begin
  update public.member_notification_deliveries
  set status = 'failed',
      error_message = case when btrim(error_message) = '' then 'Not sent' else error_message end
  where notification_id = p_notification_id
    and occurrence_on = p_occurrence
    and status = 'pending';

  select
    count(*) filter (where channel = 'email' and status = 'sent'),
    count(*) filter (where channel = 'email' and status <> 'sent'),
    count(*)
  into v_sent, v_failed, v_total
  from public.member_notification_deliveries
  where notification_id = p_notification_id
    and occurrence_on = p_occurrence;

  v_status := case
    when v_total = 0 then 'skipped'
    when v_sent = 0 then 'failed'
    else 'sent'
  end;

  update public.member_notifications
  set
    status = case when v_status in ('sent', 'failed') then v_status else status end,
    sent_at = case when v_sent > 0 then now() else sent_at end,
    email_sent = v_sent,
    email_failed = v_failed,
    recipient_count = v_total,
    repeat_last_on = p_occurrence,
    updated_at = now()
  where id = p_notification_id;

  update public.member_notification_occurrences
  set status = v_status, finished_at = now(), locked_at = null
  where notification_id = p_notification_id
    and occurrence_on = p_occurrence;

  return jsonb_build_object(
    'notification_id', p_notification_id,
    'occurrence_on', p_occurrence,
    'status', v_status,
    'email_sent', v_sent,
    'email_failed', v_failed
  );
end;
$$;

revoke all on function public.finish_member_notification_occurrence(uuid, date)
  from public, anon, authenticated;
grant execute on function public.finish_member_notification_occurrence(uuid, date) to service_role;

create or replace function public.release_member_notification_run(
  p_notification_id uuid,
  p_occurrence date
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.member_notification_occurrences o
  set status = 'claimed', locked_at = null
  where o.notification_id = p_notification_id
    and o.occurrence_on = p_occurrence
    and o.status = 'sending'
    and not exists (
      select 1
      from public.member_notification_deliveries d
      where d.notification_id = p_notification_id
        and d.occurrence_on = p_occurrence
        and d.status = 'sent'
    );
  return found;
end;
$$;

revoke all on function public.release_member_notification_run(uuid, date)
  from public, anon, authenticated;
grant execute on function public.release_member_notification_run(uuid, date) to service_role;

create or replace function public.preview_due_member_notifications()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_due boolean;
  v_date date;
  v_count integer;
  v_runs jsonb := '[]'::jsonb;
begin
  for v_row in
    select n.id, n.title, n.subject, n.repeat_timezone, n.repeat_weekday, n.repeat_time, n.audience_filters
    from public.member_notifications n
    where n.repeat_enabled
      and n.repeat_interval = 'weekly'
      and n.send_email
      and n.status is distinct from 'cancelled'
  loop
    begin
      select d.due, d.occurrence_on into v_due, v_date
      from public._member_notification_due(v_row.repeat_timezone, v_row.repeat_weekday, v_row.repeat_time, true) d;
    exception when others then
      continue;
    end;
    if not coalesce(v_due, false) then
      continue;
    end if;
    select count(*) into v_count
    from public._bulk_email_recipients(v_row.audience_filters) r
    where nullif(btrim(r.email), '') is not null;
    v_runs := v_runs || jsonb_build_array(jsonb_build_object(
      'notification_id', v_row.id,
      'title', v_row.title,
      'subject', v_row.subject,
      'occurrence_on', v_date,
      'recipient_count', coalesce(v_count, 0)
    ));
  end loop;
  return v_runs;
end;
$$;

revoke all on function public.preview_due_member_notifications() from public, anon, authenticated;
grant execute on function public.preview_due_member_notifications() to service_role;

create or replace function public.claim_due_member_notification_runs()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_due boolean;
  v_date date;
  v_occ public.member_notification_occurrences%rowtype;
  v_inserted integer := 0;
  v_pending integer := 0;
  v_deliveries jsonb;
  v_runs jsonb := '[]'::jsonb;
begin
  for v_row in
    select n.*, p.title as program_title
    from public.member_notifications n
    left join public.church_programs p on p.id = n.program_id
    where n.repeat_enabled
      and n.repeat_interval = 'weekly'
      and n.send_email
      and n.status is distinct from 'cancelled'
    order by n.id
  loop
    begin
      select d.due, d.occurrence_on into v_due, v_date
      from public._member_notification_due(v_row.repeat_timezone, v_row.repeat_weekday, v_row.repeat_time, true) d;
    exception when others then
      continue;
    end;
    if not coalesce(v_due, false) or v_date is null then
      continue;
    end if;

    insert into public.member_notification_occurrences (notification_id, occurrence_on, status)
    values (v_row.id, v_date, 'claimed')
    on conflict (notification_id, occurrence_on) do nothing;
    get diagnostics v_inserted = row_count;

    select * into v_occ
    from public.member_notification_occurrences
    where notification_id = v_row.id and occurrence_on = v_date
    for update;

    if v_inserted = 0 then
      if v_occ.status in ('sent', 'failed', 'skipped') then
        continue;
      end if;
      if v_occ.status = 'sending' and v_occ.locked_at is not null and v_occ.locked_at > now() - interval '15 minutes' then
        continue;
      end if;
    end if;

    insert into public.member_notification_deliveries (
      notification_id, recipient_type, recipient_id, full_name, email, phone, channel, status, occurrence_on
    )
    select
      v_row.id, r.recipient_type, r.recipient_id, coalesce(r.full_name, ''),
      coalesce(r.email, ''), coalesce(r.phone, ''), 'email', 'pending', v_date
    from public._bulk_email_recipients(v_row.audience_filters) r
    where nullif(btrim(r.email), '') is not null
    on conflict (notification_id, occurrence_on, recipient_id, channel) where occurrence_on is not null
    do nothing;

    select count(*) into v_pending
    from public.member_notification_deliveries d
    where d.notification_id = v_row.id
      and d.occurrence_on = v_date
      and d.channel = 'email'
      and d.status = 'pending';

    if coalesce(v_pending, 0) = 0 then
      if not exists (
        select 1 from public.member_notification_deliveries d
        where d.notification_id = v_row.id
          and d.occurrence_on = v_date
          and d.status = 'sent'
      ) then
        update public.member_notification_occurrences
        set status = 'skipped', reason = 'No email recipients', finished_at = now(), locked_at = null
        where notification_id = v_row.id and occurrence_on = v_date;
      else
        perform public.finish_member_notification_occurrence(v_row.id, v_date);
      end if;
      continue;
    end if;

    update public.member_notification_occurrences
    set status = 'sending', locked_at = now()
    where notification_id = v_row.id and occurrence_on = v_date;

    select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id,
      'email', d.email,
      'full_name', d.full_name,
      'channel', d.channel,
      'status', d.status
    )), '[]'::jsonb)
    into v_deliveries
    from public.member_notification_deliveries d
    where d.notification_id = v_row.id
      and d.occurrence_on = v_date
      and d.channel = 'email'
      and d.status = 'pending';

    v_runs := v_runs || jsonb_build_array(jsonb_build_object(
      'notification_id', v_row.id,
      'occurrence_on', v_date,
      'title', v_row.title,
      'subject', coalesce(nullif(v_row.subject, ''), v_row.title),
      'body', v_row.body,
      'program_title', coalesce(v_row.program_title, ''),
      'header_image_url', coalesce(v_row.header_image_url, ''),
      'deliveries', v_deliveries
    ));
  end loop;

  return v_runs;
end;
$$;

revoke all on function public.claim_due_member_notification_runs() from public, anon, authenticated;
grant execute on function public.claim_due_member_notification_runs() to service_role;

create or replace function public.admin_set_member_notification_repeat(
  p_token text,
  p_id uuid,
  p_enabled boolean,
  p_weekday integer,
  p_time text,
  p_timezone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_row public.member_notifications%rowtype;
  v_tz text := coalesce(nullif(btrim(p_timezone), ''), 'Africa/Lagos');
  v_time time;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'member_notifications', 'edit') then
    raise exception 'You do not have permission to edit member notifications';
  end if;

  select * into v_row from public.member_notifications where id = p_id for update;
  if not found then raise exception 'Notification not found'; end if;

  if coalesce(p_enabled, false) then
    if not v_row.send_email then
      raise exception 'Turn email on before repeating this announcement';
    end if;
    if p_weekday is null or p_weekday < 0 or p_weekday > 6 then
      raise exception 'Choose a day of the week';
    end if;
    begin
      v_time := btrim(coalesce(p_time, ''))::time;
    exception when others then
      raise exception 'Enter a valid time';
    end;
    if not exists (select 1 from pg_timezone_names where name = v_tz) then
      raise exception 'Unknown timezone';
    end if;
  else
    begin
      v_time := nullif(btrim(coalesce(p_time, '')), '')::time;
    exception when others then
      v_time := v_row.repeat_time;
    end;
    if not exists (select 1 from pg_timezone_names where name = v_tz) then
      v_tz := coalesce(nullif(v_row.repeat_timezone, ''), 'Africa/Lagos');
    end if;
  end if;

  update public.member_notifications
  set
    repeat_enabled = coalesce(p_enabled, false),
    repeat_interval = case when coalesce(p_enabled, false) then 'weekly' else coalesce(nullif(repeat_interval, ''), '') end,
    repeat_weekday = coalesce(p_weekday, repeat_weekday),
    repeat_time = coalesce(v_time, repeat_time),
    repeat_timezone = v_tz,
    updated_at = now()
  where id = p_id
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'repeat_enabled', v_row.repeat_enabled,
    'repeat_interval', v_row.repeat_interval,
    'repeat_weekday', v_row.repeat_weekday,
    'repeat_time', v_row.repeat_time,
    'repeat_timezone', v_row.repeat_timezone,
    'repeat_last_on', v_row.repeat_last_on
  );
end;
$$;

grant execute on function public.admin_set_member_notification_repeat(text, uuid, boolean, integer, text, text)
  to anon, authenticated;

-- Header-only news cron, copied from 20261106, plus member_notifications.
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
    v_url := rtrim(v_cfg.project_url, '/') || '/functions/v1/fetch-christian-news';
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
    -- Not part of 'all': a catch-all invoke must not send announcements.
    if v_kind = 'member_notifications' then
      v_url := rtrim(v_cfg.project_url, '/') || '/functions/v1/send-recurring-notifications?secret=' || v_secret;
      begin
        select net.http_post(
          url := v_url,
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
          body := '{}'::jsonb
        ) into v_req_id;
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'member_notifications', 'request_id', v_req_id));
      exception when others then
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'member_notifications', 'error', SQLERRM));
      end;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'results', v_results, 'at', now());
end;
$$;

revoke all on function public.invoke_scheduled_edge_crons(text) from public;
grant execute on function public.invoke_scheduled_edge_crons(text) to postgres, service_role;

do $$
declare
  v_ids bigint[];
  v_id bigint;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is not installed; ffiemc-member-notifications was not created';
    return;
  end if;

  select coalesce(array_agg(jobid), array[]::bigint[])
  into v_ids
  from cron.job
  where jobname = 'ffiemc-member-notifications';

  if v_ids is not null then
    foreach v_id in array v_ids loop
      perform cron.unschedule(v_id);
    end loop;
  end if;

  perform cron.schedule(
    'ffiemc-member-notifications',
    '*/5 * * * *',
    $cron$select public.invoke_scheduled_edge_crons('member_notifications');$cron$
  );
exception when others then
  raise notice 'Could not schedule ffiemc-member-notifications: %', SQLERRM;
end $$;

notify pgrst, 'reload schema';
