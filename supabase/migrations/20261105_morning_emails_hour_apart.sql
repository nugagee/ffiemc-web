-- Morning scheduled emails, one hour apart, year-round in Europe/London.
--
-- Daily Growth: 06:00 Europe/London every day.
-- What's New digest: 07:00 Europe/London every day (07:00 Africa/Lagos during
-- BST, 08:00 Africa/Lagos during GMT). Daily Growth stays out of the digest.
--
-- Run this whole file in the Supabase SQL editor after
-- 20261103_digest_london_4pm_and_feed.sql. Safe to run more than once.
-- It does not DELETE or UPDATE existing rows, and it does not touch
-- email_send_settings, budgets, or claims.
--
-- pg_cron is UTC. 06:00 UK is 05:00 UTC during BST and 06:00 UTC during GMT.
-- 07:00 UK is 06:00 UTC during BST and 07:00 UTC during GMT. Each cron fires
-- at both hours. The wrapper calls the edge function only when the clock in
-- Europe/London is the wanted hour. That hour exists once a day, including
-- on the clock-change Sundays (the skipped and repeated hour is 01:00).
-- A non-matching hour returns before any HTTP call, so it does not claim a
-- budget slot. The digest still skips, without a budget slot, when nothing
-- other than Daily Growth is new — that check stays in member-content-emails,
-- before list_member_email_recipients.
--
-- admin_update_content_email_settings from 20261103 already drops
-- daily_growth out of digest_kinds on save. This file does not replace that
-- function and does not rewrite content_email_settings.
--
-- Check live jobs before and after:
--
--   select jobid, jobname, schedule, command, active
--   from cron.job
--   order by jobname;
--
-- ffiemc-spool-daily-growth should be: 0 5,6 * * *
--   select public.invoke_growth_at_london_6();
-- ffiemc-content-digest should be: 0 6,7 * * *
--   select public.invoke_digest_at_london_7();
-- Leave these alone:
--   ffiemc-fetch-christian-news   0 */6 * * *
--   ffiemc-bible-study-reminder   30 15 * * 1
--   ffiemc-sunday-reminder        30 20 * * 6
--
-- invoke_digest_at_london_16 is dropped after the digest job no longer calls it.

-- Fires from cron at 05:00 and 06:00 UTC. Sends only at 06:00 Europe/London.
create or replace function public.invoke_growth_at_london_6()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local timestamp;
begin
  v_local := timezone('Europe/London', now());
  if extract(hour from v_local)::int <> 6 then
    return jsonb_build_object(
      'ok', true,
      'skipped', true,
      'reason', 'not_6_london',
      'london_time', to_char(v_local, 'YYYY-MM-DD HH24:MI:SS')
    );
  end if;
  return public.invoke_scheduled_edge_crons('growth');
end;
$$;

revoke all on function public.invoke_growth_at_london_6() from public, anon, authenticated;
grant execute on function public.invoke_growth_at_london_6() to postgres, service_role;

-- Fires from cron at 06:00 and 07:00 UTC. Sends only at 07:00 Europe/London.
create or replace function public.invoke_digest_at_london_7()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local timestamp;
begin
  v_local := timezone('Europe/London', now());
  if extract(hour from v_local)::int <> 7 then
    return jsonb_build_object(
      'ok', true,
      'skipped', true,
      'reason', 'not_7_london',
      'london_time', to_char(v_local, 'YYYY-MM-DD HH24:MI:SS')
    );
  end if;
  return public.invoke_scheduled_edge_crons('digest');
end;
$$;

revoke all on function public.invoke_digest_at_london_7() from public, anon, authenticated;
grant execute on function public.invoke_digest_at_london_7() to postgres, service_role;

do $$
declare
  v_ids bigint[];
  v_id bigint;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    drop function if exists public.invoke_digest_at_london_16();
    raise notice 'pg_cron is not installed; morning email schedules were not changed';
    return;
  end if;

  -- Unschedule every row with these names, and any leftover caller of the
  -- 16:00 guard, so a second apply cannot leave a duplicate send.
  select coalesce(array_agg(jobid), array[]::bigint[])
  into v_ids
  from cron.job
  where jobname in ('ffiemc-spool-daily-growth', 'ffiemc-content-digest')
     or position('invoke_digest_at_london_16' in command) > 0;

  if v_ids is not null then
    foreach v_id in array v_ids loop
      perform cron.unschedule(v_id);
    end loop;
  end if;

  perform cron.schedule(
    'ffiemc-spool-daily-growth',
    '0 5,6 * * *',
    $cron$select public.invoke_growth_at_london_6();$cron$
  );

  perform cron.schedule(
    'ffiemc-content-digest',
    '0 6,7 * * *',
    $cron$select public.invoke_digest_at_london_7();$cron$
  );

  drop function if exists public.invoke_digest_at_london_16();
exception when others then
  raise notice 'Could not reschedule morning email crons: %', SQLERRM;
end $$;

notify pgrst, 'reload schema';
