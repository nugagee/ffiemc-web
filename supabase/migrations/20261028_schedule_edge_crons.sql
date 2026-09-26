-- Schedule Daily Growth + Christian News edge functions via pg_cron + pg_net (when available).
-- Secrets live in private table edge_cron_config (not granted to anon).

create table if not exists public.edge_cron_config (
  id integer primary key default 1 check (id = 1),
  project_url text not null default '',
  news_cron_secret text not null default '',
  growth_cron_secret text not null default '',
  news_enabled boolean not null default true,
  growth_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.edge_cron_config enable row level security;
-- No policies for anon/authenticated — service role / security definer only

insert into public.edge_cron_config (id)
values (1)
on conflict (id) do nothing;

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
    news_enabled = coalesce((p_data->>'news_enabled')::boolean, c.news_enabled),
    growth_enabled = coalesce((p_data->>'growth_enabled')::boolean, c.growth_enabled),
    updated_at = now()
  where c.id = 1
  returning jsonb_build_object(
    'id', c.id,
    'project_url', c.project_url,
    'news_enabled', c.news_enabled,
    'growth_enabled', c.growth_enabled,
    'has_news_secret', length(c.news_cron_secret) > 0,
    'has_growth_secret', length(c.growth_cron_secret) > 0,
    'updated_at', c.updated_at
  ) into v_row;
  return coalesce(v_row, '{}'::jsonb);
end;
$$;

grant execute on function public.admin_upsert_edge_cron_config(text, jsonb) to anon, authenticated;

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
    v_secret := v_cfg.news_cron_secret;
    begin
      select net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', v_secret
        ),
        body := '{}'::jsonb
      ) into v_req_id;
      v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'news', 'request_id', v_req_id));
    exception when others then
      v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'news', 'error', SQLERRM));
    end;
  end if;

  if v_kind in ('all', 'growth') and v_cfg.growth_enabled and nullif(trim(v_cfg.growth_cron_secret), '') is not null then
    v_url := rtrim(v_cfg.project_url, '/') || '/functions/v1/spool-daily-growth?secret=' || v_cfg.growth_cron_secret;
    v_secret := v_cfg.growth_cron_secret;
    begin
      select net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', v_secret
        ),
        body := '{}'::jsonb
      ) into v_req_id;
      v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'growth', 'request_id', v_req_id));
    exception when others then
      v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'growth', 'error', SQLERRM));
    end;
  end if;

  return jsonb_build_object('ok', true, 'results', v_results, 'at', now());
end;
$$;

revoke all on function public.invoke_scheduled_edge_crons(text) from public;
grant execute on function public.invoke_scheduled_edge_crons(text) to postgres, service_role;

-- Ensure extensions (no-op if unavailable)
do $$
begin
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'pg_net not available: %', SQLERRM;
end $$;

do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
exception when others then
  raise notice 'pg_cron not available: %', SQLERRM;
end $$;

-- Schedule jobs if pg_cron exists
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in ('ffiemc-fetch-christian-news', 'ffiemc-spool-daily-growth');

    perform cron.schedule(
      'ffiemc-fetch-christian-news',
      '0 */6 * * *',
      $cron$select public.invoke_scheduled_edge_crons('news');$cron$
    );

    -- 05:00 UTC ≈ 06:00 Africa/Lagos
    perform cron.schedule(
      'ffiemc-spool-daily-growth',
      '0 5 * * *',
      $cron$select public.invoke_scheduled_edge_crons('growth');$cron$
    );
  end if;
exception when others then
  raise notice 'Could not schedule cron jobs: %', SQLERRM;
end $$;
