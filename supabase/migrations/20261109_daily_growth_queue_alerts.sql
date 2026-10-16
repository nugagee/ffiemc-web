-- Daily Growth low-queue alerts: one row per category per Lagos day.
-- Additive and idempotent. Does not update or delete existing content.
-- Apply before deploying the updated spool-daily-growth function.
-- The edge function inserts a row before emailing admins, and deletes that
-- row only if send-email fails, so the same category is not alerted twice
-- on the same day.

create table if not exists public.daily_growth_queue_alerts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('trait', 'prophecy', 'fact', 'riddle')),
  alert_on date not null,
  queued_count integer not null default 0,
  detail text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.daily_growth_queue_alerts is
  'Dedupes Daily Growth low-queue admin emails: one row per category per day.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_growth_queue_alerts_category_day_key'
      and conrelid = 'public.daily_growth_queue_alerts'::regclass
  ) then
    alter table public.daily_growth_queue_alerts
      add constraint daily_growth_queue_alerts_category_day_key unique (category, alert_on);
  end if;
end $$;

alter table public.daily_growth_queue_alerts enable row level security;

revoke all on table public.daily_growth_queue_alerts from public, anon, authenticated;
grant select, insert, delete on table public.daily_growth_queue_alerts to service_role;
