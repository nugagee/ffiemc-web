-- Daily Growth image, evening pre-pick, public answer hiding, and media bucket lockdown.
-- Repo only. Do not apply until the owner reviews. Does not change existing item rows
-- except the status check, which adds 'scheduled' and keeps draft/queued/published/archived.
--
-- Order when going live: this file, then deploy edge functions
-- spool-daily-growth and media-upload, then confirm the new cron job.

-- ---------------------------------------------------------------------------
-- Status: scheduled (hidden until the morning spool publishes it)
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'daily_growth_items'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%queued%'
      and pg_get_constraintdef(c.oid) ilike '%published%'
  loop
    execute format('alter table public.daily_growth_items drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.daily_growth_items
  drop constraint if exists daily_growth_items_status_check;

alter table public.daily_growth_items
  add constraint daily_growth_items_status_check
  check (status in ('draft', 'queued', 'scheduled', 'published', 'archived'));

create index if not exists daily_growth_items_scheduled_idx
  on public.daily_growth_items (category, published_on)
  where status = 'scheduled';

-- One reserved row per category per day. Published rows are not constrained:
-- existing published history is left untouched.
create unique index if not exists daily_growth_items_one_scheduled_per_cat_day
  on public.daily_growth_items (category, published_on)
  where status = 'scheduled';

-- Direct table reads were returning answer to anyone with the anon key.
revoke all on table public.daily_growth_items from public, anon, authenticated;
drop policy if exists "public_read_published_daily_growth" on public.daily_growth_items;

comment on column public.daily_growth_items.answer is
  'Riddle answer. Not returned by the public list for today or the future. Past days include it. Today is revealed only by public_reveal_daily_growth_answer. Never emailed.';

-- ---------------------------------------------------------------------------
-- Per-date email image
-- ---------------------------------------------------------------------------

create table if not exists public.daily_growth_images (
  image_date date primary key,
  image_url text not null default '',
  storage_path text not null default '',
  uploaded_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daily_growth_images enable row level security;
revoke all on table public.daily_growth_images from public, anon, authenticated;

comment on table public.daily_growth_images is
  'One image per date for the Daily Growth email. The morning send still goes out when the row is missing or the file fails to load.';
comment on column public.daily_growth_images.uploaded_by is
  'admins.id from the admin session that last set the image. Requires blog.posts edit.';

-- ---------------------------------------------------------------------------
-- Public list hides today's answer. Reveal is a separate call.
-- ---------------------------------------------------------------------------

create or replace function public.public_list_daily_growth(p_category text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat text := nullif(lower(trim(coalesce(p_category, ''))), '');
  v_today date := public._daily_growth_today();
begin
  if v_cat is not null and v_cat not in ('trait', 'prophecy', 'fact', 'riddle') then
    raise exception 'Invalid category';
  end if;
  return coalesce((
    select jsonb_agg(
      (to_jsonb(i) - 'answer') || jsonb_build_object(
        'answer', case
          when i.category = 'riddle' and i.published_on < v_today then coalesce(i.answer, '')
          else ''
        end,
        'answer_available', (
          i.category = 'riddle'
          and i.published_on is not null
          and i.published_on <= v_today
          and length(trim(coalesce(i.answer, ''))) > 0
        )
      )
      order by i.published_on desc nulls last, i.created_at desc
    )
    from public.daily_growth_items i
    where i.status = 'published'
      and (v_cat is null or i.category = v_cat)
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.public_list_daily_growth(text) to anon, authenticated;

create or replace function public.public_reveal_daily_growth_answer(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_answer text;
begin
  if p_id is null then
    raise exception 'Answer is not available';
  end if;
  select i.answer into v_answer
  from public.daily_growth_items i
  where i.id = p_id
    and i.status = 'published'
    and i.category = 'riddle'
    and i.published_on is not null
    and i.published_on <= public._daily_growth_today()
    and length(trim(coalesce(i.answer, ''))) > 0;
  if not found then
    raise exception 'Answer is not available';
  end if;
  return jsonb_build_object('id', p_id, 'answer', v_answer);
end;
$$;

revoke all on function public.public_reveal_daily_growth_answer(uuid) from public;
grant execute on function public.public_reveal_daily_growth_answer(uuid) to anon, authenticated;

comment on function public.public_reveal_daily_growth_answer(uuid) is
  'Returns a published riddle answer on or before today (Lagos). Scheduled, future, and unpublished rows stay hidden.';

-- ---------------------------------------------------------------------------
-- Admin list / upsert accept scheduled. Permission stays blog.posts.
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_daily_growth(
  p_token text,
  p_category text default null,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat text := nullif(lower(trim(coalesce(p_category, ''))), '');
  v_status text := nullif(lower(trim(coalesce(p_status, ''))), '');
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  if v_cat is not null and v_cat not in ('trait', 'prophecy', 'fact', 'riddle') then
    raise exception 'Invalid category';
  end if;
  if v_status is not null and v_status not in ('draft', 'queued', 'scheduled', 'published', 'archived') then
    raise exception 'Invalid status';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(i) order by
      case i.status
        when 'scheduled' then 0
        when 'queued' then 1
        when 'draft' then 2
        when 'published' then 3
        else 4
      end,
      i.published_on desc nulls last,
      i.created_at desc)
    from public.daily_growth_items i
    where (v_cat is null or i.category = v_cat)
      and (v_status is null or i.status = v_status)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_daily_growth(p_token text, p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_cat text;
  v_status text;
  v_row jsonb;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  v_id := coalesce(p_id, gen_random_uuid());
  v_cat := lower(coalesce(nullif(trim(p_data->>'category'), ''), 'fact'));
  if v_cat not in ('trait', 'prophecy', 'fact', 'riddle') then
    raise exception 'Invalid category';
  end if;
  v_status := lower(coalesce(nullif(trim(p_data->>'status'), ''), 'draft'));
  if v_status not in ('draft', 'queued', 'scheduled', 'published', 'archived') then
    raise exception 'Invalid status';
  end if;

  insert into public.daily_growth_items (
    id, category, title, body, scripture_ref, answer, status, published_on, sort_order, updated_at
  )
  values (
    v_id,
    v_cat,
    coalesce(p_data->>'title', ''),
    coalesce(p_data->>'body', ''),
    coalesce(p_data->>'scripture_ref', ''),
    coalesce(p_data->>'answer', ''),
    v_status,
    case
      when v_status = 'published' then coalesce(nullif(p_data->>'published_on', '')::date, public._daily_growth_today())
      when v_status = 'scheduled' then coalesce(nullif(p_data->>'published_on', '')::date, public._daily_growth_today() + 1)
      else nullif(p_data->>'published_on', '')::date
    end,
    coalesce((p_data->>'sort_order')::integer, 0),
    now()
  )
  on conflict (id) do update set
    category = excluded.category,
    title = excluded.title,
    body = excluded.body,
    scripture_ref = excluded.scripture_ref,
    answer = excluded.answer,
    status = excluded.status,
    published_on = excluded.published_on,
    sort_order = excluded.sort_order,
    updated_at = now()
  returning to_jsonb(public.daily_growth_items.*) into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_get_daily_growth_image(p_token text, p_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  if p_date is null then
    raise exception 'Image date is required';
  end if;
  select to_jsonb(i) into v_row
  from public.daily_growth_images i
  where i.image_date = p_date;
  return v_row;
end;
$$;

create or replace function public.admin_upsert_daily_growth_image(
  p_token text,
  p_date date,
  p_url text,
  p_path text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_url text := trim(coalesce(p_url, ''));
  v_path text := trim(coalesce(p_path, ''));
  v_row jsonb;
begin
  v_admin := public._require_permission(p_token, 'blog.posts', 'edit');
  if p_date is null then
    raise exception 'Image date is required';
  end if;
  if v_url !~* '^https://' or length(v_url) > 2000 or position(' ' in v_url) > 0 then
    raise exception 'Image URL must be an https URL';
  end if;
  if v_url ~* '\.svg($|\?)' or v_url ~* '\.html?($|\?)' or v_url ~* '\.xhtml($|\?)' then
    raise exception 'SVG and HTML images are not allowed';
  end if;
  if v_path !~ '^daily-growth/[0-9]{4}-[0-9]{2}-[0-9]{2}/[A-Za-z0-9._-]+$'
     or v_path not like 'daily-growth/' || to_char(p_date, 'YYYY-MM-DD') || '/%'
     or position('..' in v_path) > 0 then
    raise exception 'Invalid image path';
  end if;

  insert into public.daily_growth_images (
    image_date, image_url, storage_path, uploaded_by, updated_at
  )
  values (p_date, v_url, v_path, v_admin.id, now())
  on conflict (image_date) do update set
    image_url = excluded.image_url,
    storage_path = excluded.storage_path,
    uploaded_by = excluded.uploaded_by,
    updated_at = now()
  returning to_jsonb(public.daily_growth_images.*) into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_delete_daily_growth_image(p_token text, p_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text := '';
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  if p_date is null then
    raise exception 'Image date is required';
  end if;
  select i.storage_path into v_path
  from public.daily_growth_images i
  where i.image_date = p_date;
  delete from public.daily_growth_images where image_date = p_date;
  return jsonb_build_object('ok', true, 'storage_path', coalesce(v_path, ''));
end;
$$;

grant execute on function public.admin_get_daily_growth_image(text, date) to anon, authenticated;
grant execute on function public.admin_upsert_daily_growth_image(text, date, text, text) to anon, authenticated;
grant execute on function public.admin_delete_daily_growth_image(text, date) to anon, authenticated;

-- Token check used by the media-upload edge function (service role only).
create or replace function public.admin_authorize_media_upload(p_token text, p_purpose text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_purpose text := lower(trim(coalesce(p_purpose, '')));
begin
  if v_purpose not in ('image', 'document', 'daily_growth') then
    raise exception 'Invalid upload purpose';
  end if;
  if v_purpose = 'daily_growth' then
    v_admin := public._require_permission(p_token, 'blog.posts', 'edit');
  else
    v_admin := public._require_admin(p_token);
  end if;
  return jsonb_build_object('ok', true, 'admin_id', v_admin.id, 'purpose', v_purpose);
end;
$$;

revoke all on function public.admin_authorize_media_upload(text, text) from public, anon, authenticated;
grant execute on function public.admin_authorize_media_upload(text, text) to service_role;

comment on function public.admin_authorize_media_upload(text, text) is
  'Validates an admin_login session token. daily_growth requires blog.posts edit. image and document require any active admin. Not granted to anon.';

-- ---------------------------------------------------------------------------
-- Morning spool: publish pre-picked rows, else the oldest queued row.
-- Pre-picked rows are included in the returned items so the edge function emails them.
-- ---------------------------------------------------------------------------

create or replace function public.spool_daily_growth(p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.daily_growth_settings%rowtype;
  v_today date := public._daily_growth_today();
  v_cat text;
  v_item public.daily_growth_items%rowtype;
  v_existing_json jsonb;
  v_picked jsonb := '[]'::jsonb;
  v_existing uuid;
  v_run_id uuid;
  v_cats text[];
  v_from_scheduled integer := 0;
begin
  select * into v_settings from public.daily_growth_settings where id = 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Settings missing');
  end if;

  if not v_settings.enabled and not p_force then
    update public.daily_growth_settings
    set last_run_at = now(), last_run_status = 'skipped', last_run_message = 'Spool disabled', updated_at = now()
    where id = 1;
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'disabled', 'run_date', v_today);
  end if;

  select id into v_existing from public.daily_growth_runs where run_date = v_today;
  if found and not p_force then
    return jsonb_build_object(
      'ok', true,
      'skipped', true,
      'reason', 'already_ran',
      'run_date', v_today,
      'run_id', v_existing,
      'email_enabled', v_settings.email_enabled
    );
  end if;

  select coalesce(
    array(select jsonb_array_elements_text(v_settings.categories_enabled)),
    array['trait','prophecy','fact','riddle']
  ) into v_cats;

  foreach v_cat in array v_cats
  loop
    if v_cat not in ('trait', 'prophecy', 'fact', 'riddle') then
      continue;
    end if;

    if exists (
      select 1 from public.daily_growth_items
      where status = 'published' and category = v_cat and published_on = v_today
    ) and not p_force then
      continue;
    end if;

    if exists (
      select 1 from public.daily_growth_items
      where status = 'published' and category = v_cat and published_on = v_today
    ) and p_force then
      select to_jsonb(i) into v_existing_json
      from public.daily_growth_items i
      where i.status = 'published' and i.category = v_cat and i.published_on = v_today
      order by i.updated_at desc
      limit 1;
      if v_existing_json is not null then
        v_picked := v_picked || jsonb_build_array(v_existing_json);
      end if;
      continue;
    end if;

    select * into v_item
    from public.daily_growth_items
    where status = 'scheduled' and category = v_cat and published_on = v_today
    order by sort_order asc, created_at asc
    limit 1
    for update skip locked;

    if not found then
      select * into v_item
      from public.daily_growth_items
      where status = 'queued' and category = v_cat
      order by sort_order asc, created_at asc
      limit 1
      for update skip locked;
    end if;

    if not found then
      continue;
    end if;

    if v_item.status = 'scheduled' then
      v_from_scheduled := v_from_scheduled + 1;
    end if;

    update public.daily_growth_items
    set status = 'published', published_on = v_today, updated_at = now()
    where id = v_item.id
    returning * into v_item;

    v_picked := v_picked || jsonb_build_array(to_jsonb(v_item));
  end loop;

  insert into public.daily_growth_runs (run_date, items, status, error)
  values (
    v_today,
    v_picked,
    case when jsonb_array_length(v_picked) > 0 then 'ok' else 'empty' end,
    case when jsonb_array_length(v_picked) > 0 then '' else 'No queued or scheduled items for enabled categories' end
  )
  on conflict (run_date) do update set
    items = excluded.items,
    status = excluded.status,
    error = excluded.error
  returning id into v_run_id;

  update public.daily_growth_settings
  set
    last_run_at = now(),
    last_run_status = case when jsonb_array_length(v_picked) > 0 then 'ok' else 'empty' end,
    last_run_message = format(
      'Published %s item(s) for %s (%s pre-picked)',
      jsonb_array_length(v_picked),
      v_today,
      v_from_scheduled
    ),
    updated_at = now()
  where id = 1;

  return jsonb_build_object(
    'ok', true,
    'run_date', v_today,
    'run_id', v_run_id,
    'items', v_picked,
    'count', jsonb_array_length(v_picked),
    'pre_picked', v_from_scheduled,
    'email_enabled', v_settings.email_enabled,
    'subject_template', v_settings.email_subject_template
  );
end;
$$;

-- Evening job: date the next Lagos day's items as scheduled. Does not publish or email.
create or replace function public.schedule_next_daily_growth()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.daily_growth_settings%rowtype;
  v_day date := public._daily_growth_today() + 1;
  v_cat text;
  v_item public.daily_growth_items%rowtype;
  v_kept_json jsonb;
  v_cats text[];
  v_scheduled jsonb := '[]'::jsonb;
  v_missing jsonb := '[]'::jsonb;
  v_kept jsonb := '[]'::jsonb;
begin
  select * into v_settings from public.daily_growth_settings where id = 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Settings missing');
  end if;

  if not v_settings.enabled then
    return jsonb_build_object(
      'ok', true,
      'skipped', true,
      'reason', 'disabled',
      'run_date', v_day,
      'scheduled', '[]'::jsonb,
      'missing', '[]'::jsonb
    );
  end if;

  select coalesce(
    array(select jsonb_array_elements_text(v_settings.categories_enabled)),
    array['trait','prophecy','fact','riddle']
  ) into v_cats;

  foreach v_cat in array v_cats
  loop
    if v_cat not in ('trait', 'prophecy', 'fact', 'riddle') then
      continue;
    end if;

    if exists (
      select 1 from public.daily_growth_items
      where category = v_cat
        and published_on = v_day
        and status in ('scheduled', 'published')
    ) then
      select to_jsonb(i) - 'answer' into v_kept_json
      from public.daily_growth_items i
      where i.category = v_cat
        and i.published_on = v_day
        and i.status in ('scheduled', 'published')
      order by case i.status when 'scheduled' then 0 else 1 end, i.created_at asc
      limit 1;
      if v_kept_json is not null then
        v_kept := v_kept || jsonb_build_array(v_kept_json);
      end if;
      continue;
    end if;

    select * into v_item
    from public.daily_growth_items
    where status = 'queued' and category = v_cat
    order by sort_order asc, created_at asc
    limit 1
    for update skip locked;

    if not found then
      v_missing := v_missing || jsonb_build_array(v_cat);
      continue;
    end if;

    update public.daily_growth_items
    set status = 'scheduled', published_on = v_day, updated_at = now()
    where id = v_item.id
    returning * into v_item;

    v_scheduled := v_scheduled || jsonb_build_array(to_jsonb(v_item) - 'answer');
  end loop;

  return jsonb_build_object(
    'ok', true,
    'run_date', v_day,
    'scheduled', v_scheduled,
    'already', v_kept,
    'missing', v_missing,
    'count', jsonb_array_length(v_scheduled) + jsonb_array_length(v_kept)
  );
end;
$$;

revoke all on function public.schedule_next_daily_growth() from public, anon, authenticated;
grant execute on function public.schedule_next_daily_growth() to service_role;

comment on function public.schedule_next_daily_growth() is
  'Moves the oldest queued item in each enabled category to scheduled for tomorrow (Lagos). Does not publish or email. Categories with no queue are returned in missing so the edge function can seed them.';

-- Designer / service-role read of tomorrow's hidden items. Answer is omitted.
create or replace function public.designer_list_scheduled_daily_growth(p_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := coalesce(p_date, public._daily_growth_today() + 1);
begin
  return jsonb_build_object(
    'date', v_day,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'category', i.category,
        'title', i.title,
        'body', i.body,
        'scripture_ref', i.scripture_ref,
        'published_on', i.published_on,
        'status', i.status
      ) order by
        case i.category when 'trait' then 1 when 'prophecy' then 2 when 'fact' then 3 else 4 end)
      from public.daily_growth_items i
      where i.status = 'scheduled' and i.published_on = v_day
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.designer_list_scheduled_daily_growth(date) from public, anon, authenticated;
grant execute on function public.designer_list_scheduled_daily_growth(date) to service_role;

comment on function public.designer_list_scheduled_daily_growth(date) is
  'Service-role only. Tomorrow''s scheduled Daily Growth items without the riddle answer. Answers stay on admin_list_daily_growth.';

-- ---------------------------------------------------------------------------
-- 20:00 UTC cron. Does not change the 06:00 Europe/London morning job.
-- ---------------------------------------------------------------------------

create or replace function public.invoke_growth_schedule_next()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg public.edge_cron_config%rowtype;
  v_url text;
  v_req_id bigint;
begin
  select * into v_cfg from public.edge_cron_config where id = 1;
  if not found or nullif(trim(v_cfg.project_url), '') is null then
    return jsonb_build_object('ok', false, 'error', 'edge_cron_config.project_url not set');
  end if;
  if not v_cfg.growth_enabled or nullif(trim(v_cfg.growth_cron_secret), '') is null then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'disabled');
  end if;

  v_url := rtrim(v_cfg.project_url, '/')
    || '/functions/v1/spool-daily-growth?schedule_next=1&secret='
    || v_cfg.growth_cron_secret;
  begin
    select net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_cfg.growth_cron_secret
      ),
      body := '{}'::jsonb
    ) into v_req_id;
    return jsonb_build_object('ok', true, 'kind', 'growth_schedule', 'request_id', v_req_id, 'at', now());
  exception when others then
    return jsonb_build_object('ok', false, 'kind', 'growth_schedule', 'error', SQLERRM);
  end;
end;
$$;

revoke all on function public.invoke_growth_schedule_next() from public, anon, authenticated;
grant execute on function public.invoke_growth_schedule_next() to postgres, service_role;

do $$
declare
  v_ids bigint[];
  v_id bigint;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is not installed; ffiemc-schedule-daily-growth was not created';
    return;
  end if;

  select coalesce(array_agg(jobid), array[]::bigint[])
  into v_ids
  from cron.job
  where jobname = 'ffiemc-schedule-daily-growth';

  if v_ids is not null then
    foreach v_id in array v_ids loop
      perform cron.unschedule(v_id);
    end loop;
  end if;

  -- 20:00 UTC = 21:00 Africa/Lagos, year round. Picks the next Lagos day.
  perform cron.schedule(
    'ffiemc-schedule-daily-growth',
    '0 20 * * *',
    $cron$select public.invoke_growth_schedule_next();$cron$
  );
exception when others then
  raise notice 'Could not schedule ffiemc-schedule-daily-growth: %', SQLERRM;
end $$;

-- ---------------------------------------------------------------------------
-- Media bucket: public read only. No anon/authenticated write.
-- Images used by the site and announcement emails, plus PDF/Word/text
-- documents and contribution receipts. SVG and HTML are no longer accepted.
-- ---------------------------------------------------------------------------

update storage.buckets
set
  file_size_limit = greatest(coalesce(file_size_limit, 0), 26214400),
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
where id = 'media';

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and (
        policyname ilike '%media%'
        or coalesce(qual, '') ilike '%''media''%'
        or coalesce(with_check, '') ilike '%''media''%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;

  drop policy if exists "media_public_insert" on storage.objects;
  drop policy if exists "media_public_update" on storage.objects;
  drop policy if exists "media_public_delete" on storage.objects;

  drop policy if exists "media_public_read" on storage.objects;
  create policy "media_public_read"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'media');
exception when others then
  raise exception 'Could not lock media storage policies: %', SQLERRM;
end $$;

notify pgrst, 'reload schema';
