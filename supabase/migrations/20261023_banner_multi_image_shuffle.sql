-- Multi-image flyer galleries with weekly/session shuffle,
-- sticky-always (daily marquee while popup stays on weekly schedule),
-- and daily repeat interval.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.announcements
  add column if not exists images jsonb not null default '[]'::jsonb;

alter table public.announcements
  add column if not exists image_shuffle text not null default 'weekly';

alter table public.announcements
  drop constraint if exists announcements_image_shuffle_check;

alter table public.announcements
  add constraint announcements_image_shuffle_check
  check (image_shuffle in ('none', 'weekly', 'session'));

alter table public.announcements
  add column if not exists sticky_always boolean not null default false;

-- Backfill images from single image column
update public.announcements
set images = jsonb_build_array(image)
where coalesce(trim(image), '') <> ''
  and (images is null or images = '[]'::jsonb);

alter table public.announcements
  drop constraint if exists announcements_repeat_interval_check;

alter table public.announcements
  add constraint announcements_repeat_interval_check
  check (repeat_interval in ('none', 'daily', 'weekly', 'monthly', 'yearly'));

-- ---------------------------------------------------------------------------
-- Match helper: optional placement so sticky_always can show every day
-- while popup still respects weekly/daily windows.
-- ---------------------------------------------------------------------------
drop function if exists public._announcement_matches_now(public.announcements, timestamptz);
drop function if exists public._announcement_matches_now(public.announcements, timestamptz, text);

create or replace function public._announcement_matches_now(
  a public.announcements,
  p_now timestamptz default now(),
  p_placement text default null
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_repeat text := coalesce(a.repeat_interval, 'none');
  v_now_local timestamp;
  v_start_local timestamp;
  v_tod time;
  v_start_tod time;
  v_end_tod time;
  v_start_dom integer;
  v_month_last integer;
  v_for text := lower(nullif(trim(p_placement), ''));
begin
  if not a.is_active then
    return false;
  end if;

  if a.ends_at is not null and a.ends_at < p_now then
    return false;
  end if;

  v_now_local := timezone('Africa/Lagos', p_now);
  v_start_local := timezone('Africa/Lagos', a.starts_at);

  -- Sticky marquee can stay visible every day while the popup uses the schedule
  if v_for = 'sticky' and coalesce(a.sticky_always, false) then
    if v_now_local::date < v_start_local::date then
      return false;
    end if;
    return true;
  end if;

  if a.starts_at > p_now then
    return false;
  end if;

  if v_repeat is null or v_repeat = 'none' then
    return true;
  end if;

  v_tod := v_now_local::time;
  v_start_tod := v_start_local::time;
  v_end_tod := coalesce(a.daily_end_time, '23:59:59'::time);

  if v_now_local::date < v_start_local::date then
    return false;
  end if;

  if v_tod < v_start_tod or v_tod > v_end_tod then
    return false;
  end if;

  if v_repeat = 'daily' then
    return true;
  end if;

  if v_repeat = 'weekly' then
    return extract(dow from v_now_local)::int = extract(dow from v_start_local)::int;
  end if;

  if v_repeat = 'monthly' then
    v_start_dom := extract(day from v_start_local)::int;
    v_month_last := extract(day from (date_trunc('month', v_now_local) + interval '1 month' - interval '1 day'))::int;
    return extract(day from v_now_local)::int = least(v_start_dom, v_month_last);
  end if;

  if v_repeat = 'yearly' then
    return extract(month from v_now_local)::int = extract(month from v_start_local)::int
       and extract(day from v_now_local)::int = extract(day from v_start_local)::int;
  end if;

  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public list passes placement into the matcher
-- ---------------------------------------------------------------------------
create or replace function public.public_list_active_announcements(
  p_path text default '/',
  p_placement text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_path text := coalesce(nullif(trim(p_path), ''), '/');
  v_is_home boolean := v_path in ('/', '/home');
  v_place text := lower(nullif(trim(p_placement), ''));
begin
  if v_place is not null and v_place not in ('popup', 'sticky') then
    v_place := null;
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(a) order by a.sort_order asc, a.created_at desc)
    from public.announcements a
    where public._announcement_matches_now(a, now(), v_place)
      and (
        a.display_scope = 'site'
        or (a.display_scope = 'home' and v_is_home)
      )
      and (
        v_place is null
        or a.placement = 'both'
        or a.placement = v_place
      )
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.public_list_active_announcements(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin upsert: images[], image_shuffle, sticky_always, daily repeat
-- ---------------------------------------------------------------------------
create or replace function public.admin_upsert_announcement(
  p_token text,
  p_id uuid,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_row public.announcements%rowtype;
  v_ends timestamptz;
  v_scope text;
  v_place text;
  v_repeat text;
  v_daily time;
  v_rotate integer;
  v_mode text;
  v_delay integer;
  v_images jsonb;
  v_shuffle text;
  v_primary text;
  v_sticky_always boolean;
begin
  v_admin := public._require_admin(p_token);
  if not (
    public._has_perm(v_admin, 'home.announcements', 'edit')
    or public._has_perm(v_admin, 'home.hero', 'edit')
    or public._has_perm(v_admin, 'banners', 'edit')
  ) then
    raise exception 'You do not have permission to edit announcements';
  end if;

  v_ends := nullif(trim(coalesce(p_data->>'ends_at', '')), '')::timestamptz;
  v_scope := lower(coalesce(nullif(p_data->>'display_scope', ''), nullif(p_data->>'displayScope', ''), 'home'));
  if v_scope not in ('home', 'site') then v_scope := 'home'; end if;

  v_place := lower(coalesce(nullif(p_data->>'placement', ''), 'popup'));
  if v_place not in ('popup', 'sticky', 'both') then v_place := 'popup'; end if;

  v_repeat := lower(coalesce(nullif(p_data->>'repeat_interval', ''), nullif(p_data->>'repeatInterval', ''), 'none'));
  if v_repeat not in ('none', 'daily', 'weekly', 'monthly', 'yearly') then v_repeat := 'none'; end if;

  v_daily := nullif(trim(coalesce(p_data->>'daily_end_time', p_data->>'dailyEndTime', '')), '')::time;
  v_rotate := coalesce((p_data->>'rotate_seconds')::integer, (p_data->>'rotateSeconds')::integer, 12);
  if v_rotate < 4 then v_rotate := 4; end if;
  if v_rotate > 180 then v_rotate := 180; end if;

  v_mode := lower(coalesce(nullif(p_data->>'popup_mode', ''), nullif(p_data->>'popupMode', ''), 'every_visit'));
  if v_mode not in ('every_visit', 'once') then v_mode := 'every_visit'; end if;

  v_delay := coalesce((p_data->>'delay_seconds')::integer, (p_data->>'delaySeconds')::integer, 3);
  if v_delay < 0 then v_delay := 0; end if;
  if v_delay > 30 then v_delay := 30; end if;

  v_shuffle := lower(coalesce(nullif(p_data->>'image_shuffle', ''), nullif(p_data->>'imageShuffle', ''), 'weekly'));
  if v_shuffle not in ('none', 'weekly', 'session') then v_shuffle := 'weekly'; end if;

  v_sticky_always := coalesce(
    (p_data->>'sticky_always')::boolean,
    (p_data->>'stickyAlways')::boolean,
    false
  );

  if jsonb_typeof(p_data->'images') = 'array' then
    select coalesce(jsonb_agg(to_jsonb(trim(x))), '[]'::jsonb)
      into v_images
    from (
      select value as x
      from jsonb_array_elements_text(p_data->'images') as t(value)
      where trim(value) <> ''
    ) s;
  else
    v_images := '[]'::jsonb;
  end if;

  v_primary := coalesce(nullif(trim(p_data->>'image'), ''), '');
  if v_primary = '' and jsonb_array_length(v_images) > 0 then
    v_primary := v_images->>0;
  end if;
  if v_primary <> '' and (v_images is null or v_images = '[]'::jsonb) then
    v_images := jsonb_build_array(v_primary);
  elsif v_primary <> '' and not exists (
    select 1 from jsonb_array_elements_text(coalesce(v_images, '[]'::jsonb)) t(u) where t.u = v_primary
  ) then
    v_images := jsonb_build_array(v_primary) || coalesce(v_images, '[]'::jsonb);
  end if;

  insert into public.announcements (
    id, title, body, image, images, image_shuffle, sticky_always,
    link_url, link_text,
    starts_at, ends_at, is_active, show_once, sort_order,
    display_scope, route_enabled, placement, repeat_interval,
    daily_end_time, rotate_seconds, accent_color, button_color,
    delay_seconds, popup_mode, updated_at
  )
  values (
    v_id,
    coalesce(p_data->>'title', ''),
    coalesce(p_data->>'body', ''),
    v_primary,
    coalesce(v_images, '[]'::jsonb),
    v_shuffle,
    v_sticky_always,
    coalesce(p_data->>'link_url', p_data->>'linkUrl', ''),
    coalesce(nullif(p_data->>'link_text', ''), nullif(p_data->>'linkText', ''), 'Learn more'),
    coalesce(nullif(p_data->>'starts_at', '')::timestamptz, now()),
    v_ends,
    coalesce((p_data->>'is_active')::boolean, (p_data->>'isActive')::boolean, true),
    (v_mode = 'once'),
    coalesce(
      (p_data->>'sort_order')::integer,
      (select coalesce(max(sort_order), -1) + 1 from public.announcements),
      0
    ),
    v_scope,
    coalesce((p_data->>'route_enabled')::boolean, (p_data->>'routeEnabled')::boolean, true),
    v_place,
    v_repeat,
    v_daily,
    v_rotate,
    coalesce(nullif(p_data->>'accent_color', ''), nullif(p_data->>'accentColor', ''), '#b91c1c'),
    coalesce(nullif(p_data->>'button_color', ''), nullif(p_data->>'buttonColor', ''), '#fbbf24'),
    v_delay,
    v_mode,
    now()
  )
  on conflict (id) do update set
    title = excluded.title,
    body = excluded.body,
    image = excluded.image,
    images = excluded.images,
    image_shuffle = excluded.image_shuffle,
    sticky_always = excluded.sticky_always,
    link_url = excluded.link_url,
    link_text = excluded.link_text,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    is_active = excluded.is_active,
    show_once = excluded.show_once,
    sort_order = case
      when p_data ? 'sort_order' then excluded.sort_order
      else public.announcements.sort_order
    end,
    display_scope = excluded.display_scope,
    route_enabled = excluded.route_enabled,
    placement = excluded.placement,
    repeat_interval = excluded.repeat_interval,
    daily_end_time = excluded.daily_end_time,
    rotate_seconds = excluded.rotate_seconds,
    accent_color = excluded.accent_color,
    button_color = excluded.button_color,
    delay_seconds = excluded.delay_seconds,
    popup_mode = excluded.popup_mode,
    updated_at = now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- ---------------------------------------------------------------------------
-- Seed: Sunday Service (Sat 18:00–23:59 popup) + sticky always
-- starts_at = Saturday 19 Sep 2026 18:00 Africa/Lagos (17:00 UTC)
-- ---------------------------------------------------------------------------
insert into public.announcements (
  id, title, body, image, images, image_shuffle, sticky_always,
  link_url, link_text,
  starts_at, ends_at, is_active, show_once, sort_order,
  display_scope, route_enabled, placement, repeat_interval,
  daily_end_time, rotate_seconds, accent_color, button_color,
  delay_seconds, popup_mode
)
values (
  'a1111111-0001-4001-8001-000000000001',
  'Sunday Service Reminder',
  'Join us this Sunday for worship — every Sunday from 9:00 AM. Watch live on Facebook @FireFireMinistry. Ministering: Pastor S.O. Moronranti.',
  '/banners/sunday-service-1.jpg',
  '["/banners/sunday-service-1.jpg","/banners/sunday-service-2.jpg"]'::jsonb,
  'weekly',
  true,
  'https://www.facebook.com/FireFireMinistry',
  'Join us live',
  '2026-09-19 17:00:00+00',
  null,
  true,
  false,
  10,
  'site',
  true,
  'both',
  'weekly',
  '23:59:59',
  12,
  '#b91c1c',
  '#fbbf24',
  3,
  'every_visit'
)
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  image = excluded.image,
  images = excluded.images,
  image_shuffle = excluded.image_shuffle,
  sticky_always = excluded.sticky_always,
  link_url = excluded.link_url,
  link_text = excluded.link_text,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  is_active = excluded.is_active,
  display_scope = excluded.display_scope,
  placement = excluded.placement,
  repeat_interval = excluded.repeat_interval,
  daily_end_time = excluded.daily_end_time,
  rotate_seconds = excluded.rotate_seconds,
  accent_color = excluded.accent_color,
  button_color = excluded.button_color,
  delay_seconds = excluded.delay_seconds,
  popup_mode = excluded.popup_mode,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Seed: Monday Bible Study (Mon 08:00–17:30 popup) + sticky always
-- starts_at = Monday 14 Sep 2026 08:00 Africa/Lagos (07:00 UTC) so sticky is live this week
-- ---------------------------------------------------------------------------
insert into public.announcements (
  id, title, body, image, images, image_shuffle, sticky_always,
  link_url, link_text,
  starts_at, ends_at, is_active, show_once, sort_order,
  display_scope, route_enabled, placement, repeat_interval,
  daily_end_time, rotate_seconds, accent_color, button_color,
  delay_seconds, popup_mode
)
values (
  'a1111111-0002-4002-8002-000000000002',
  'Monday Bible Study',
  'Dive into the Word every Monday — live stream 5:00 PM to 7:00 PM on Facebook @FireFireMinistry. Ministering: Pastor S.O. Moronranti.',
  '/banners/bible-study-1.jpg',
  '["/banners/bible-study-1.jpg","/banners/bible-study-2.jpg"]'::jsonb,
  'weekly',
  true,
  'https://www.facebook.com/FireFireMinistry',
  'Watch live',
  '2026-09-14 07:00:00+00',
  null,
  true,
  false,
  11,
  'site',
  true,
  'both',
  'weekly',
  '17:30:00',
  12,
  '#1e3a8a',
  '#facc15',
  3,
  'every_visit'
)
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  image = excluded.image,
  images = excluded.images,
  image_shuffle = excluded.image_shuffle,
  sticky_always = excluded.sticky_always,
  link_url = excluded.link_url,
  link_text = excluded.link_text,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  is_active = excluded.is_active,
  display_scope = excluded.display_scope,
  placement = excluded.placement,
  repeat_interval = excluded.repeat_interval,
  daily_end_time = excluded.daily_end_time,
  rotate_seconds = excluded.rotate_seconds,
  accent_color = excluded.accent_color,
  button_color = excluded.button_color,
  delay_seconds = excluded.delay_seconds,
  popup_mode = excluded.popup_mode,
  updated_at = now();
