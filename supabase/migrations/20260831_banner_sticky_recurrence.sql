-- Sticky marquee banners, placement (popup / sticky / both), and recurring schedules
-- Run after 20260830_banners_member_notifications.sql

-- ---------------------------------------------------------------------------
-- New announcement columns
-- ---------------------------------------------------------------------------
alter table public.announcements
  add column if not exists placement text not null default 'popup';

alter table public.announcements
  drop constraint if exists announcements_placement_check;

alter table public.announcements
  add constraint announcements_placement_check
  check (placement in ('popup', 'sticky', 'both'));

alter table public.announcements
  add column if not exists repeat_interval text not null default 'none';

alter table public.announcements
  drop constraint if exists announcements_repeat_interval_check;

alter table public.announcements
  add constraint announcements_repeat_interval_check
  check (repeat_interval in ('none', 'weekly', 'monthly', 'yearly'));

alter table public.announcements
  add column if not exists daily_end_time time;

alter table public.announcements
  add column if not exists rotate_seconds integer not null default 12;

alter table public.announcements
  drop constraint if exists announcements_rotate_seconds_check;

alter table public.announcements
  add constraint announcements_rotate_seconds_check
  check (rotate_seconds >= 4 and rotate_seconds <= 180);

-- Youth Convention: popup + sticky marquee
update public.announcements
set placement = 'both',
    rotate_seconds = 14
where link_url = '/register/youth-convention-2026'
  and (placement is distinct from 'both');

-- ---------------------------------------------------------------------------
-- Live-window helper (Africa/Lagos for church calendar)
-- ---------------------------------------------------------------------------
create or replace function public._announcement_matches_now(
  a public.announcements,
  p_now timestamptz default now()
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
begin
  if not a.is_active then
    return false;
  end if;

  if a.starts_at > p_now then
    return false;
  end if;

  if a.ends_at is not null and a.ends_at < p_now then
    return false;
  end if;

  if v_repeat is null or v_repeat = 'none' then
    return true;
  end if;

  v_now_local := timezone('Africa/Lagos', p_now);
  v_start_local := timezone('Africa/Lagos', a.starts_at);
  v_tod := v_now_local::time;
  v_start_tod := v_start_local::time;
  v_end_tod := coalesce(a.daily_end_time, '23:59:59'::time);

  if v_now_local::date < v_start_local::date then
    return false;
  end if;

  if v_tod < v_start_tod or v_tod > v_end_tod then
    return false;
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
-- Public list: path scope + placement (popup | sticky)
-- ---------------------------------------------------------------------------
drop function if exists public.public_list_active_announcements();
drop function if exists public.public_list_active_announcements(text);
drop function if exists public.public_list_active_announcements(text, text);

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
    where public._announcement_matches_now(a, now())
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
-- Admin upsert includes placement + recurrence
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
begin
  v_admin := public._require_admin(p_token);
  if not (
    public._has_perm(v_admin, 'home.announcements', 'edit')
    or public._has_perm(v_admin, 'home.hero', 'edit')
  ) then
    raise exception 'You do not have permission to edit announcements';
  end if;

  v_ends := nullif(trim(coalesce(p_data->>'ends_at', '')), '')::timestamptz;
  v_scope := lower(coalesce(nullif(p_data->>'display_scope', ''), nullif(p_data->>'displayScope', ''), 'home'));
  if v_scope not in ('home', 'site') then
    v_scope := 'home';
  end if;

  v_place := lower(coalesce(nullif(p_data->>'placement', ''), 'popup'));
  if v_place not in ('popup', 'sticky', 'both') then
    v_place := 'popup';
  end if;

  v_repeat := lower(coalesce(nullif(p_data->>'repeat_interval', ''), nullif(p_data->>'repeatInterval', ''), 'none'));
  if v_repeat not in ('none', 'weekly', 'monthly', 'yearly') then
    v_repeat := 'none';
  end if;

  v_daily := nullif(trim(coalesce(p_data->>'daily_end_time', p_data->>'dailyEndTime', '')), '')::time;
  v_rotate := coalesce((p_data->>'rotate_seconds')::integer, (p_data->>'rotateSeconds')::integer, 12);
  if v_rotate < 4 then v_rotate := 4; end if;
  if v_rotate > 180 then v_rotate := 180; end if;

  insert into public.announcements (
    id, title, body, image, link_url, link_text,
    starts_at, ends_at, is_active, show_once, sort_order,
    display_scope, route_enabled, placement, repeat_interval,
    daily_end_time, rotate_seconds, updated_at
  )
  values (
    v_id,
    coalesce(p_data->>'title', ''),
    coalesce(p_data->>'body', ''),
    coalesce(p_data->>'image', ''),
    coalesce(p_data->>'link_url', p_data->>'linkUrl', ''),
    coalesce(nullif(p_data->>'link_text', ''), nullif(p_data->>'linkText', ''), 'Learn more'),
    coalesce(nullif(p_data->>'starts_at', '')::timestamptz, now()),
    v_ends,
    coalesce((p_data->>'is_active')::boolean, (p_data->>'isActive')::boolean, true),
    coalesce((p_data->>'show_once')::boolean, (p_data->>'showOnce')::boolean, true),
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
    now()
  )
  on conflict (id) do update set
    title = excluded.title,
    body = excluded.body,
    image = excluded.image,
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
    updated_at = now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;
