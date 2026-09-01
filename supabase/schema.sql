-- Fire-Fire International Evangelical Church — Supabase schema
-- Run once in the Supabase SQL Editor.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text unique,
  password_hash text not null,
  role text not null check (role in ('superadmin', 'admin')),
  is_active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.admins(id) on delete set null
);

alter table public.admins
  add column if not exists permissions jsonb not null default '{}'::jsonb;

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key default 'site',
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admins(id) on delete set null
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  author text not null default '',
  category text not null default 'General',
  image text not null default '',
  featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts add column if not exists slug text not null default '';
alter table public.blog_posts add column if not exists status text not null default 'draft';
alter table public.blog_posts add column if not exists scheduled_at timestamptz;
alter table public.blog_posts add column if not exists published_at timestamptz;
alter table public.blog_posts add column if not exists tags text not null default '';

update public.blog_posts
set
  status = 'published',
  published_at = coalesce(published_at, created_at)
where published = true and coalesce(status, 'draft') = 'draft';

alter table public.blog_posts drop constraint if exists blog_posts_status_check;
alter table public.blog_posts add constraint blog_posts_status_check
  check (status in ('draft', 'scheduled', 'published'));

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date text not null default '',
  time text not null default '',
  location text not null default '',
  description text not null default '',
  image text not null default '',
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  pastor text not null default '',
  date text not null default '',
  series text not null default '',
  scripture text not null default '',
  description text not null default '',
  "audioUrl" text not null default '',
  "videoUrl" text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  testimony text not null default '',
  image text not null default '',
  "dateJoined" text not null default '',
  featured boolean not null default false,
  sort_order integer not null default 0,
  status text not null default 'published',
  email text not null default '',
  phone text not null default '',
  title text not null default '',
  admin_notes text not null default '',
  consent_public boolean not null default true,
  source text not null default 'admin',
  confirmation_sent boolean not null default false,
  publish_notify_sent boolean not null default false,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testimonies_status_check check (status in ('pending', 'approved', 'published', 'rejected'))
);

create table if not exists public.ministries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  leader text not null default '',
  "meetingTime" text not null default '',
  image text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events add column if not exists sort_order integer not null default 0;
alter table public.events add column if not exists image text not null default '';
alter table public.sermons add column if not exists sort_order integer not null default 0;
alter table public.testimonies add column if not exists sort_order integer not null default 0;
alter table public.testimonies add column if not exists status text not null default 'published';
alter table public.testimonies add column if not exists email text not null default '';
alter table public.testimonies add column if not exists phone text not null default '';
alter table public.testimonies add column if not exists title text not null default '';
alter table public.testimonies add column if not exists admin_notes text not null default '';
alter table public.testimonies add column if not exists consent_public boolean not null default true;
alter table public.testimonies add column if not exists source text not null default 'admin';
alter table public.testimonies add column if not exists confirmation_sent boolean not null default false;
alter table public.testimonies add column if not exists publish_notify_sent boolean not null default false;
alter table public.testimonies add column if not exists reviewed_at timestamptz;
alter table public.testimonies add column if not exists published_at timestamptz;
alter table public.ministries add column if not exists sort_order integer not null default 0;
alter table public.blog_posts add column if not exists sort_order integer not null default 0;

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  "backgroundImage" text not null default '',
  "ctaText" text not null default 'Learn More',
  "ctaLink" text not null default '/about',
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null default '',
  phone text not null default '',
  category text not null default 'Personal Prayer Request',
  request text not null,
  is_public boolean not null default false,
  status text not null default 'new' check (status in ('new', 'prayed', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  subject text not null default '',
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied')),
  created_at timestamptz not null default now()
);

create table if not exists public.donation_intents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  amount numeric(12,2) not null,
  purpose text not null default 'offering',
  status text not null default 'pending' check (status in ('pending', 'contacted', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists admin_sessions_token_idx on public.admin_sessions (token);
create index if not exists blog_posts_created_at_idx on public.blog_posts (created_at desc);
create index if not exists events_created_at_idx on public.events (created_at desc);
create index if not exists sermons_created_at_idx on public.sermons (created_at desc);
create index if not exists prayer_requests_created_at_idx on public.prayer_requests (created_at desc);
create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);

-- ---------------------------------------------------------------------------
-- Seed admin: email admin@firefireintl.org / password FireFire2025!
-- ---------------------------------------------------------------------------

insert into public.admins (username, email, password_hash, role)
values (
  'admin',
  'admin@firefireintl.org',
  extensions.crypt('FireFire2025!', extensions.gen_salt('bf')),
  'superadmin'
)
on conflict (username) do update
set
  email = excluded.email,
  password_hash = excluded.password_hash,
  role = excluded.role,
  is_active = true;

insert into public.site_settings (key, value) values
(
  'site',
  '{
    "name": "Fire-Fire International Evangelical Church",
    "motto": "Teach one by one another",
    "mission": "We are on a mission to ignite hearts, transform lives, and spread the fire of God''s love.",
    "location": "Fire-Fire Area, Papa Agric, Off Olojuoro Olunde Road, Olomi, Ibadan, Nigeria",
    "phone": "+234 816 267 4805",
    "email": "info@firefireintl.org",
    "pastor": "Pastor S.O. Moronranti",
    "logo": "https://customer-assets.emergentagent.com/job_divine-flame/artifacts/5bkxw8fc_Logo%20png.png",
    "socials": {
      "facebook": "",
      "twitter": "",
      "instagram": "",
      "tiktok": "",
      "youtube": "",
      "audiomack": ""
    },
    "serviceTimes": [
      {"id": 1, "name": "Sitting at the Jesus feet", "time": "8:00 AM - 9:00 AM", "day": "Sunday", "description": "A time of intimate worship and reflection"},
      {"id": 2, "name": "Main Service", "time": "9:00 AM - 12:00 PM", "day": "Sunday", "description": "Our primary worship service"},
      {"id": 3, "name": "Bible Study", "time": "5:00 PM - 7:00 PM", "day": "Monday", "description": "Deep dive into God''s Word"},
      {"id": 4, "name": "Women''s Program", "time": "12:00 PM - 3:00 PM", "day": "Wednesday", "description": "Fellowship and teaching for women"},
      {"id": 5, "name": "Mid-week Service", "time": "6:00 PM - 8:00 PM", "day": "Wednesday", "description": "Bible study and prayer"}
    ]
  }'::jsonb
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.admins enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.site_settings enable row level security;
alter table public.blog_posts enable row level security;
alter table public.events enable row level security;
alter table public.sermons enable row level security;
alter table public.testimonies enable row level security;
alter table public.ministries enable row level security;
alter table public.hero_slides enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.contact_messages enable row level security;
alter table public.donation_intents enable row level security;

drop policy if exists "public_read_settings" on public.site_settings;
create policy "public_read_settings" on public.site_settings for select to anon, authenticated using (true);

drop policy if exists "public_read_blog" on public.blog_posts;
create policy "public_read_blog" on public.blog_posts for select to anon, authenticated using (
  published = true
  or (
    coalesce(status, 'draft') = 'scheduled'
    and scheduled_at is not null
    and scheduled_at <= now()
  )
);

drop policy if exists "public_read_events" on public.events;
create policy "public_read_events" on public.events for select to anon, authenticated using (true);

drop policy if exists "public_read_sermons" on public.sermons;
create policy "public_read_sermons" on public.sermons for select to anon, authenticated using (true);

drop policy if exists "public_read_testimonies" on public.testimonies;
create policy "public_read_testimonies" on public.testimonies
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists "public_read_ministries" on public.ministries;
create policy "public_read_ministries" on public.ministries for select to anon, authenticated using (true);

drop policy if exists "public_read_hero" on public.hero_slides;
create policy "public_read_hero" on public.hero_slides for select to anon, authenticated using (true);

drop policy if exists "public_insert_prayer" on public.prayer_requests;
create policy "public_insert_prayer" on public.prayer_requests for insert to anon, authenticated with check (true);

drop policy if exists "public_insert_contact" on public.contact_messages;
create policy "public_insert_contact" on public.contact_messages for insert to anon, authenticated with check (true);

drop policy if exists "public_insert_donation" on public.donation_intents;
create policy "public_insert_donation" on public.donation_intents for insert to anon, authenticated with check (true);

grant select on public.site_settings to anon, authenticated;
grant select on public.blog_posts to anon, authenticated;
grant select on public.events to anon, authenticated;
grant select on public.sermons to anon, authenticated;
grant select on public.testimonies to anon, authenticated;
grant select on public.ministries to anon, authenticated;
grant select on public.hero_slides to anon, authenticated;
grant insert on public.prayer_requests to anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant insert on public.donation_intents to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Auth helpers & RPCs
-- ---------------------------------------------------------------------------

create or replace function public._require_admin(p_token text)
returns public.admins
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
begin
  select a.* into v_admin
  from public.admin_sessions s
  join public.admins a on a.id = s.admin_id
  where s.token = p_token
    and s.expires_at > now()
    and a.is_active = true;

  if not found then
    raise exception 'Unauthorized';
  end if;

  return v_admin;
end;
$$;

-- Permission keys: dashboard features plus pages.{page}.access and pages.{page}.sections.{section}.
-- Superadmins bypass this map.

create or replace function public._sanitize_permissions(p_permissions jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v jsonb := '{}'::jsonb;
  v_pages jsonb := '{}'::jsonb;
  v_page text;
  v_section text;
  v_src jsonb;
  v_page_src jsonb;
  v_sec_src jsonb;
  v_sections jsonb;
  v_access boolean;
  v_edit boolean;
  v_delete boolean;
  v_catalog jsonb := '{
    "home": ["hero","welcome","stats","eventsPreview","sermonsPreview","ministriesPreview","cta","testimoniesPreview","social"],
    "about": ["hero","mission","values","history","pastor","visit"],
    "services": ["hero","times","programmes"],
    "leadership": ["hero","team","departments","values","cta"],
    "ministries": ["hero","list"],
    "events": ["hero","list"],
    "sermons": ["hero","list"],
    "testimonies": ["hero","list"],
    "blog": ["hero","posts"],
    "contact": ["hero","church","hours"],
    "prayer": ["hero","inbox"],
    "donate": ["hero","purposes"]
  }'::jsonb;
begin
  if p_permissions is null or jsonb_typeof(p_permissions) <> 'object' then
    return '{"overview":{"view":false},"visitors":{"view":false},"contacts":{"view":false,"edit":false,"delete":false},"pages":{}}'::jsonb;
  end if;

  v := jsonb_build_object(
    'overview', jsonb_build_object(
      'view', coalesce((p_permissions->'overview'->>'view')::boolean, false)
    ),
    'visitors', jsonb_build_object(
      'view', coalesce((p_permissions->'visitors'->>'view')::boolean, false)
    ),
    'contacts', jsonb_build_object(
      'view', coalesce((p_permissions->'contacts'->>'view')::boolean, false)
            or coalesce((p_permissions->'contacts'->>'edit')::boolean, false)
            or coalesce((p_permissions->'contacts'->>'delete')::boolean, false),
      'edit', coalesce((p_permissions->'contacts'->>'edit')::boolean, false),
      'delete', coalesce((p_permissions->'contacts'->>'delete')::boolean, false)
    )
  );

  for v_page in select jsonb_object_keys(v_catalog)
  loop
    v_page_src := coalesce(p_permissions->'pages'->v_page, '{}'::jsonb);
    v_sections := '{}'::jsonb;
    v_access := coalesce((v_page_src->>'access')::boolean, false);

    for v_section in select jsonb_array_elements_text(v_catalog->v_page)
    loop
      v_sec_src := coalesce(v_page_src->'sections'->v_section, '{}'::jsonb);
      v_edit := coalesce((v_sec_src->>'edit')::boolean, false);
      v_delete := coalesce((v_sec_src->>'delete')::boolean, false);
      if v_delete then v_edit := true; end if;
      if v_edit or v_delete then v_access := true; end if;
      v_sections := v_sections || jsonb_build_object(
        v_section,
        jsonb_build_object('edit', v_edit, 'delete', v_delete)
      );
    end loop;

    -- migrate legacy flat keys
    if v_page = 'home' then
      if coalesce((p_permissions->'hero'->>'edit')::boolean, false) then
        v_sections := jsonb_set(v_sections, '{hero,edit}', 'true'::jsonb);
        v_access := true;
      end if;
      if coalesce((p_permissions->'hero'->>'delete')::boolean, false) then
        v_sections := jsonb_set(v_sections, '{hero,delete}', 'true'::jsonb);
        v_access := true;
      end if;
      if coalesce((p_permissions->'website'->>'edit')::boolean, false) then
        v_sections := jsonb_set(v_sections, '{welcome,edit}', 'true'::jsonb);
        v_access := true;
      end if;
    elsif v_page = 'blog' and coalesce((p_permissions->'blog'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{posts,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'events' and coalesce((p_permissions->'events'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{list,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'sermons' and coalesce((p_permissions->'sermons'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{list,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'ministries' and coalesce((p_permissions->'ministries'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{list,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'testimonies' and coalesce((p_permissions->'testimonies'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{list,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'prayer' and coalesce((p_permissions->'prayers'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{inbox,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'contact' and coalesce((p_permissions->'website'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{church,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'services' and coalesce((p_permissions->'website'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{times,edit}', 'true'::jsonb);
      v_sections := jsonb_set(v_sections, '{programmes,edit}', 'true'::jsonb);
      v_access := true;
    end if;

    v_pages := v_pages || jsonb_build_object(
      v_page,
      jsonb_build_object('access', v_access, 'sections', v_sections)
    );
  end loop;

  v := v || jsonb_build_object('pages', v_pages);
  return v;
end;
$$;

create or replace function public._has_perm(p_admin public.admins, p_feature text, p_action text)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_page text;
  v_section text;
  v_pages jsonb;
  v_sec jsonb;
  v_legacy text;
begin
  if p_admin.role = 'superadmin' then
    return true;
  end if;
  if p_feature is null or p_action is null then
    return false;
  end if;

  if p_feature in ('overview', 'visitors', 'contacts') then
    if p_action = 'view' then
      return coalesce((p_admin.permissions -> p_feature ->> 'view')::boolean, false)
          or coalesce((p_admin.permissions -> p_feature ->> 'edit')::boolean, false)
          or coalesce((p_admin.permissions -> p_feature ->> 'delete')::boolean, false);
    end if;
    return coalesce((p_admin.permissions -> p_feature ->> p_action)::boolean, false);
  end if;

  v_pages := coalesce(p_admin.permissions -> 'pages', '{}'::jsonb);

  if position('.' in p_feature) > 0 then
    v_page := split_part(p_feature, '.', 1);
    v_section := split_part(p_feature, '.', 2);
    v_sec := v_pages -> v_page -> 'sections' -> v_section;
    if p_action = 'view' then
      if coalesce((v_pages -> v_page ->> 'access')::boolean, false)
        or coalesce((v_sec ->> 'edit')::boolean, false)
        or coalesce((v_sec ->> 'delete')::boolean, false) then
        return true;
      end if;
    else
      if coalesce((v_sec ->> p_action)::boolean, false) then
        return true;
      end if;
    end if;

    v_legacy := case p_feature
      when 'home.hero' then 'hero'
      when 'blog.posts' then 'blog'
      when 'events.list' then 'events'
      when 'sermons.list' then 'sermons'
      when 'ministries.list' then 'ministries'
      when 'testimonies.list' then 'testimonies'
      when 'prayer.inbox' then 'prayers'
      when 'contact.church' then 'website'
      when 'home.welcome' then 'website'
      when 'services.times' then 'website'
      else null
    end;
    if v_legacy is not null then
      if p_action = 'view' then
        return coalesce((p_admin.permissions -> v_legacy ->> 'view')::boolean, false)
            or coalesce((p_admin.permissions -> v_legacy ->> 'edit')::boolean, false)
            or coalesce((p_admin.permissions -> v_legacy ->> 'delete')::boolean, false);
      end if;
      return coalesce((p_admin.permissions -> v_legacy ->> p_action)::boolean, false);
    end if;
    return false;
  end if;

  if coalesce((v_pages -> p_feature ->> 'access')::boolean, false) then
    return p_action = 'view' or exists (
      select 1
      from jsonb_each(coalesce(v_pages -> p_feature -> 'sections', '{}'::jsonb)) kv
      where coalesce((kv.value ->> p_action)::boolean, false)
    );
  end if;

  if exists (
    select 1
    from jsonb_each(coalesce(v_pages -> p_feature -> 'sections', '{}'::jsonb)) kv
    where coalesce((kv.value ->> 'edit')::boolean, false)
       or coalesce((kv.value ->> 'delete')::boolean, false)
  ) then
    return p_action = 'view';
  end if;

  return coalesce((p_admin.permissions -> p_feature ->> p_action)::boolean, false)
      or (p_action = 'view' and (
        coalesce((p_admin.permissions -> p_feature ->> 'view')::boolean, false)
        or coalesce((p_admin.permissions -> p_feature ->> 'edit')::boolean, false)
      ));
end;
$$;

create or replace function public._feature_for_collection(p_collection text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text;
begin
  v := case p_collection
    when 'blog' then 'blog.posts'
    when 'events' then 'events.list'
    when 'sermons' then 'sermons.list'
    when 'testimonies' then 'testimonies.list'
    when 'ministries' then 'ministries.list'
    when 'hero-slides' then 'home.hero'
    when 'prayer-requests' then 'prayer.inbox'
    when 'contact' then 'contacts'
    else null
  end;
  if v is null then
    raise exception 'Unknown collection';
  end if;
  return v;
end;
$$;

create or replace function public._require_permission(p_token text, p_feature text, p_action text)
returns public.admins
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, p_feature, p_action) then
    raise exception 'You do not have permission to % %', p_action, p_feature;
  end if;
  return v_admin;
end;
$$;

create or replace function public.admin_login(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_token text;
begin
  select * into v_admin
  from public.admins
  where (
      lower(coalesce(email, '')) = lower(trim(p_email))
      or lower(username) = lower(trim(p_email))
    )
    and is_active = true;

  if not found or v_admin.password_hash <> extensions.crypt(p_password, v_admin.password_hash) then
    raise exception 'Invalid credentials';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.admin_sessions (admin_id, token, expires_at)
  values (v_admin.id, v_token, now() + interval '7 days');

  return jsonb_build_object(
    'token', v_token,
    'admin', jsonb_build_object(
      'id', v_admin.id,
      'username', v_admin.username,
      'email', v_admin.email,
      'role', v_admin.role,
      'name', coalesce(v_admin.username, v_admin.email),
      'permissions', coalesce(v_admin.permissions, '{}'::jsonb)
    )
  );
end;
$$;

create or replace function public.admin_me(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  return jsonb_build_object(
    'id', v_admin.id,
    'username', v_admin.username,
    'email', v_admin.email,
    'role', v_admin.role,
    'name', coalesce(v_admin.username, v_admin.email),
    'permissions', coalesce(v_admin.permissions, '{}'::jsonb)
  );
end;
$$;

create or replace function public.admin_logout(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from public.admin_sessions where token = p_token;
  return jsonb_build_object('ok', true);
end;
$$;

-- Generic content CRUD
create or replace function public.admin_list_collection(p_token text, p_collection text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._require_permission(
    p_token,
    public._feature_for_collection(p_collection),
    'view'
  );

  if p_collection = 'blog' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order asc, t.created_at desc) from public.blog_posts t), '[]'::jsonb);
  elsif p_collection = 'events' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order asc, t.created_at desc) from public.events t), '[]'::jsonb);
  elsif p_collection = 'sermons' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order asc, t.created_at desc) from public.sermons t), '[]'::jsonb);
  elsif p_collection = 'testimonies' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order asc, t.created_at desc) from public.testimonies t), '[]'::jsonb);
  elsif p_collection = 'ministries' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order asc, t.created_at desc) from public.ministries t), '[]'::jsonb);
  elsif p_collection = 'hero-slides' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t."order" asc, t.created_at desc) from public.hero_slides t), '[]'::jsonb);
  elsif p_collection = 'prayer-requests' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from public.prayer_requests t), '[]'::jsonb);
  elsif p_collection = 'contact' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from public.contact_messages t), '[]'::jsonb);
  else
    raise exception 'Unknown collection';
  end if;
end;
$$;

create or replace function public.admin_upsert_item(
  p_token text,
  p_collection text,
  p_id uuid,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_row jsonb;
  v_status text;
  v_scheduled timestamptz;
  v_published boolean;
  v_published_at timestamptz;
  v_slug text;
begin
  perform public._require_permission(
    p_token,
    public._feature_for_collection(p_collection),
    'edit'
  );
  v_id := coalesce(p_id, gen_random_uuid());

  if p_collection = 'blog' then
    if p_data ? 'status' then
      v_status := coalesce(nullif(p_data->>'status', ''), 'draft');
    else
      v_status := case when coalesce((p_data->>'published')::boolean, true) then 'published' else 'draft' end;
    end if;
    if v_status not in ('draft', 'scheduled', 'published') then
      v_status := 'draft';
    end if;
    v_scheduled := nullif(p_data->>'scheduled_at', '')::timestamptz;
    v_slug := coalesce(p_data->>'slug', '');
    if v_status = 'published' then
      v_published := true;
      v_scheduled := null;
      v_published_at := coalesce(nullif(p_data->>'published_at', '')::timestamptz, now());
    elsif v_status = 'scheduled' then
      if v_scheduled is not null and v_scheduled <= now() then
        v_status := 'published';
        v_published := true;
        v_published_at := v_scheduled;
        v_scheduled := null;
      else
        v_published := false;
        v_published_at := null;
      end if;
    else
      v_published := false;
      v_scheduled := null;
      v_published_at := null;
    end if;

    insert into public.blog_posts (
      id, title, excerpt, content, author, category, image, featured, published,
      slug, status, scheduled_at, published_at, tags, updated_at
    )
    values (
      v_id,
      coalesce(p_data->>'title', ''),
      coalesce(p_data->>'excerpt', ''),
      coalesce(p_data->>'content', ''),
      coalesce(p_data->>'author', ''),
      coalesce(p_data->>'category', 'General'),
      coalesce(p_data->>'image', ''),
      coalesce((p_data->>'featured')::boolean, false),
      v_published,
      v_slug,
      v_status,
      v_scheduled,
      v_published_at,
      coalesce(p_data->>'tags', ''),
      now()
    )
    on conflict (id) do update set
      title = excluded.title,
      excerpt = excluded.excerpt,
      content = excluded.content,
      author = excluded.author,
      category = excluded.category,
      image = excluded.image,
      featured = excluded.featured,
      published = excluded.published,
      slug = excluded.slug,
      status = excluded.status,
      scheduled_at = excluded.scheduled_at,
      published_at = excluded.published_at,
      tags = excluded.tags,
      updated_at = now()
    returning to_jsonb(public.blog_posts.*) into v_row;

  elsif p_collection = 'events' then
    insert into public.events (id, title, date, time, location, description, image, featured, sort_order, updated_at)
    values (
      v_id,
      coalesce(p_data->>'title', ''),
      coalesce(p_data->>'date', ''),
      coalesce(p_data->>'time', ''),
      coalesce(p_data->>'location', ''),
      coalesce(p_data->>'description', ''),
      coalesce(p_data->>'image', ''),
      coalesce((p_data->>'featured')::boolean, false),
      coalesce(
        (p_data->>'sort_order')::integer,
        (select coalesce(max(sort_order), -1) + 1 from public.events),
        0
      ),
      now()
    )
    on conflict (id) do update set
      title = excluded.title, date = excluded.date, time = excluded.time,
      location = excluded.location, description = excluded.description,
      image = excluded.image,
      featured = excluded.featured,
      sort_order = case when p_data ? 'sort_order' then excluded.sort_order else public.events.sort_order end,
      updated_at = now()
    returning to_jsonb(public.events.*) into v_row;

  elsif p_collection = 'sermons' then
    insert into public.sermons (id, title, pastor, date, series, scripture, description, "audioUrl", "videoUrl", sort_order, updated_at)
    values (
      v_id,
      coalesce(p_data->>'title', ''),
      coalesce(p_data->>'pastor', ''),
      coalesce(p_data->>'date', ''),
      coalesce(p_data->>'series', ''),
      coalesce(p_data->>'scripture', ''),
      coalesce(p_data->>'description', ''),
      coalesce(p_data->>'audioUrl', ''),
      coalesce(p_data->>'videoUrl', ''),
      coalesce(
        (p_data->>'sort_order')::integer,
        (select coalesce(max(sort_order), -1) + 1 from public.sermons),
        0
      ),
      now()
    )
    on conflict (id) do update set
      title = excluded.title, pastor = excluded.pastor, date = excluded.date,
      series = excluded.series, scripture = excluded.scripture,
      description = excluded.description, "audioUrl" = excluded."audioUrl",
      "videoUrl" = excluded."videoUrl",
      sort_order = case when p_data ? 'sort_order' then excluded.sort_order else public.sermons.sort_order end,
      updated_at = now()
    returning to_jsonb(public.sermons.*) into v_row;

  elsif p_collection = 'testimonies' then
    insert into public.testimonies (
      id, name, role, testimony, image, "dateJoined", featured, sort_order,
      status, email, phone, title, admin_notes, source, published_at, updated_at
    )
    values (
      v_id,
      coalesce(p_data->>'name', ''),
      coalesce(p_data->>'role', ''),
      coalesce(p_data->>'testimony', ''),
      coalesce(p_data->>'image', ''),
      coalesce(p_data->>'dateJoined', ''),
      coalesce((p_data->>'featured')::boolean, false),
      coalesce(
        (p_data->>'sort_order')::integer,
        (select coalesce(max(sort_order), -1) + 1 from public.testimonies),
        0
      ),
      coalesce(nullif(p_data->>'status', ''), 'published'),
      coalesce(p_data->>'email', ''),
      coalesce(p_data->>'phone', ''),
      coalesce(p_data->>'title', ''),
      coalesce(p_data->>'admin_notes', ''),
      coalesce(nullif(p_data->>'source', ''), 'admin'),
      case when coalesce(nullif(p_data->>'status', ''), 'published') = 'published' then now() else null end,
      now()
    )
    on conflict (id) do update set
      name = excluded.name, role = excluded.role, testimony = excluded.testimony,
      image = excluded.image, "dateJoined" = excluded."dateJoined",
      featured = excluded.featured,
      email = excluded.email, phone = excluded.phone, title = excluded.title,
      admin_notes = excluded.admin_notes,
      status = case when p_data ? 'status' then excluded.status else public.testimonies.status end,
      sort_order = case when p_data ? 'sort_order' then excluded.sort_order else public.testimonies.sort_order end,
      published_at = case
        when p_data ? 'status' and excluded.status = 'published'
          then coalesce(public.testimonies.published_at, now())
        when p_data ? 'status' and excluded.status <> 'published' then null
        else public.testimonies.published_at
      end,
      updated_at = now()
    returning to_jsonb(public.testimonies.*) into v_row;

  elsif p_collection = 'ministries' then
    insert into public.ministries (id, name, description, leader, "meetingTime", image, sort_order, updated_at)
    values (
      v_id,
      coalesce(p_data->>'name', ''),
      coalesce(p_data->>'description', ''),
      coalesce(p_data->>'leader', ''),
      coalesce(p_data->>'meetingTime', ''),
      coalesce(p_data->>'image', ''),
      coalesce(
        (p_data->>'sort_order')::integer,
        (select coalesce(max(sort_order), -1) + 1 from public.ministries),
        0
      ),
      now()
    )
    on conflict (id) do update set
      name = excluded.name, description = excluded.description, leader = excluded.leader,
      "meetingTime" = excluded."meetingTime", image = excluded.image,
      sort_order = case when p_data ? 'sort_order' then excluded.sort_order else public.ministries.sort_order end,
      updated_at = now()
    returning to_jsonb(public.ministries.*) into v_row;

  elsif p_collection = 'hero-slides' then
    insert into public.hero_slides (id, title, subtitle, description, "backgroundImage", "ctaText", "ctaLink", "order", updated_at)
    values (
      v_id,
      coalesce(p_data->>'title', ''),
      coalesce(p_data->>'subtitle', ''),
      coalesce(p_data->>'description', ''),
      coalesce(p_data->>'backgroundImage', ''),
      coalesce(p_data->>'ctaText', 'Learn More'),
      coalesce(p_data->>'ctaLink', '/about'),
      coalesce(
        (p_data->>'order')::integer,
        (select coalesce(max("order"), -1) + 1 from public.hero_slides),
        0
      ),
      now()
    )
    on conflict (id) do update set
      title = excluded.title, subtitle = excluded.subtitle, description = excluded.description,
      "backgroundImage" = excluded."backgroundImage", "ctaText" = excluded."ctaText",
      "ctaLink" = excluded."ctaLink",
      "order" = case when p_data ? 'order' then excluded."order" else public.hero_slides."order" end,
      updated_at = now()
    returning to_jsonb(public.hero_slides.*) into v_row;

  else
    raise exception 'Unknown collection';
  end if;

  return v_row;
end;
$$;

create or replace function public.admin_reorder_collection(
  p_token text,
  p_collection text,
  p_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_i integer;
begin
  perform public._require_permission(
    p_token,
    public._feature_for_collection(p_collection),
    'edit'
  );

  if p_ids is null or array_length(p_ids, 1) is null then
    return jsonb_build_object('ok', true, 'count', 0);
  end if;

  for v_i in 1 .. array_length(p_ids, 1) loop
    if p_collection = 'events' then
      update public.events set sort_order = v_i - 1, updated_at = now() where id = p_ids[v_i];
    elsif p_collection = 'sermons' then
      update public.sermons set sort_order = v_i - 1, updated_at = now() where id = p_ids[v_i];
    elsif p_collection = 'testimonies' then
      update public.testimonies set sort_order = v_i - 1, updated_at = now() where id = p_ids[v_i];
    elsif p_collection = 'ministries' then
      update public.ministries set sort_order = v_i - 1, updated_at = now() where id = p_ids[v_i];
    elsif p_collection = 'blog' then
      update public.blog_posts set sort_order = v_i - 1, updated_at = now() where id = p_ids[v_i];
    elsif p_collection = 'hero-slides' then
      update public.hero_slides set "order" = v_i - 1, updated_at = now() where id = p_ids[v_i];
    else
      raise exception 'Reorder not supported for this collection';
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'count', array_length(p_ids, 1));
end;
$$;

create or replace function public.admin_delete_item(p_token text, p_collection text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._require_permission(
    p_token,
    public._feature_for_collection(p_collection),
    'delete'
  );

  if p_collection = 'blog' then delete from public.blog_posts where id = p_id;
  elsif p_collection = 'events' then delete from public.events where id = p_id;
  elsif p_collection = 'sermons' then delete from public.sermons where id = p_id;
  elsif p_collection = 'testimonies' then delete from public.testimonies where id = p_id;
  elsif p_collection = 'ministries' then delete from public.ministries where id = p_id;
  elsif p_collection = 'hero-slides' then delete from public.hero_slides where id = p_id;
  elsif p_collection = 'prayer-requests' then delete from public.prayer_requests where id = p_id;
  elsif p_collection = 'contact' then delete from public.contact_messages where id = p_id;
  else raise exception 'Unknown collection';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_update_prayer_status(p_token text, p_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._require_permission(p_token, 'prayer.inbox', 'edit');
  update public.prayer_requests set status = coalesce(p_status, 'prayed') where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_get_settings(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_value jsonb;
begin
  perform public._require_admin(p_token);
  select value into v_value from public.site_settings where key = 'site';
  return coalesce(v_value, '{}'::jsonb);
end;
$$;

create or replace function public.admin_update_settings(p_token text, p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_permission(p_token, 'contact.church', 'edit');
  insert into public.site_settings (key, value, updated_at, updated_by)
  values ('site', p_value, now(), v_admin.id)
  on conflict (key) do update
    set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  return p_value;
end;
$$;

create or replace function public.submit_contact(
  p_name text,
  p_email text,
  p_phone text default '',
  p_subject text default '',
  p_message text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if length(trim(p_name)) < 2 or length(trim(p_email)) < 5 or length(trim(p_message)) < 2 then
    raise exception 'Please complete the form';
  end if;

  insert into public.contact_messages (name, email, phone, subject, message)
  values (trim(p_name), trim(p_email), coalesce(trim(p_phone), ''), coalesce(trim(p_subject), ''), trim(p_message))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.submit_testimony(
  p_name text,
  p_email text,
  p_phone text default '',
  p_role text default '',
  p_date_joined text default '',
  p_title text default '',
  p_testimony text default '',
  p_consent_public boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if length(trim(p_name)) < 2 then
    raise exception 'Please enter your name';
  end if;
  if length(trim(p_email)) < 5 or position('@' in p_email) = 0 then
    raise exception 'Please enter a valid email';
  end if;
  if length(trim(p_testimony)) < 20 then
    raise exception 'Please share a bit more of your testimony (at least 20 characters)';
  end if;
  if not coalesce(p_consent_public, false) then
    raise exception 'Please confirm you consent to share your testimony';
  end if;

  insert into public.testimonies (
    name, email, phone, role, "dateJoined", title, testimony,
    status, source, consent_public, featured, sort_order
  )
  values (
    trim(p_name),
    trim(p_email),
    coalesce(trim(p_phone), ''),
    coalesce(nullif(trim(p_role), ''), 'Church Member'),
    coalesce(trim(p_date_joined), ''),
    coalesce(trim(p_title), ''),
    trim(p_testimony),
    'pending',
    'form',
    true,
    false,
    (select coalesce(max(sort_order), -1) + 1 from public.testimonies)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.mark_testimony_confirmation_sent(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.testimonies
  set confirmation_sent = true, updated_at = now()
  where id = p_id;
end;
$$;

create or replace function public.admin_review_testimony(
  p_token text,
  p_id uuid,
  p_action text,
  p_data jsonb default '{}'::jsonb,
  p_notify_user boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.testimonies%rowtype;
  v_action text := lower(trim(coalesce(p_action, '')));
begin
  perform public._require_permission(p_token, 'testimonies.list', 'edit');

  select * into v_row from public.testimonies where id = p_id;
  if not found then
    raise exception 'Testimony not found';
  end if;

  if p_data is not null and p_data <> '{}'::jsonb then
    update public.testimonies set
      name = coalesce(nullif(p_data->>'name', ''), name),
      role = coalesce(p_data->>'role', role),
      testimony = coalesce(nullif(p_data->>'testimony', ''), testimony),
      image = coalesce(p_data->>'image', image),
      "dateJoined" = coalesce(p_data->>'dateJoined', "dateJoined"),
      title = coalesce(p_data->>'title', title),
      email = coalesce(p_data->>'email', email),
      phone = coalesce(p_data->>'phone', phone),
      admin_notes = coalesce(p_data->>'admin_notes', admin_notes),
      featured = case
        when p_data ? 'featured' then coalesce((p_data->>'featured')::boolean, false)
        else featured
      end,
      updated_at = now()
    where id = p_id
    returning * into v_row;
  end if;

  if v_action = 'save' then
    return to_jsonb(v_row);
  elsif v_action = 'reject' then
    update public.testimonies set
      status = 'rejected',
      reviewed_at = now(),
      updated_at = now()
    where id = p_id
    returning * into v_row;
    return to_jsonb(v_row);
  elsif v_action in ('publish', 'approve') then
    update public.testimonies set
      status = 'published',
      featured = case
        when p_data ? 'featured' then coalesce((p_data->>'featured')::boolean, featured)
        else featured
      end,
      reviewed_at = coalesce(reviewed_at, now()),
      published_at = coalesce(published_at, now()),
      publish_notify_sent = case
        when coalesce(p_notify_user, false) then true
        else publish_notify_sent
      end,
      updated_at = now()
    where id = p_id
    returning * into v_row;
    return to_jsonb(v_row) || jsonb_build_object('notify_user', coalesce(p_notify_user, false));
  elsif v_action = 'unpublish' then
    update public.testimonies set
      status = 'pending',
      published_at = null,
      updated_at = now()
    where id = p_id
    returning * into v_row;
    return to_jsonb(v_row);
  else
    raise exception 'Unknown action. Use save, publish, reject, or unpublish';
  end if;
end;
$$;

create or replace function public.submit_prayer(
  p_name text,
  p_email text default '',
  p_phone text default '',
  p_category text default 'Personal Prayer Request',
  p_request text default '',
  p_is_public boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if length(trim(p_name)) < 2 or length(trim(p_request)) < 2 then
    raise exception 'Please complete the prayer request';
  end if;

  insert into public.prayer_requests (name, email, phone, category, request, is_public)
  values (
    trim(p_name),
    coalesce(trim(p_email), ''),
    coalesce(trim(p_phone), ''),
    coalesce(nullif(trim(p_category), ''), 'Personal Prayer Request'),
    trim(p_request),
    coalesce(p_is_public, false)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.submit_donation_intent(
  p_name text,
  p_email text,
  p_amount numeric,
  p_purpose text default 'offering'
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if length(trim(p_name)) < 2 or length(trim(p_email)) < 5 or p_amount is null or p_amount < 1 then
    raise exception 'Please complete the donation form';
  end if;

  insert into public.donation_intents (name, email, amount, purpose)
  values (trim(p_name), trim(p_email), p_amount, coalesce(nullif(trim(p_purpose), ''), 'offering'))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.admin_login(text, text) to anon, authenticated;
grant execute on function public.admin_me(text) to anon, authenticated;
grant execute on function public.admin_logout(text) to anon, authenticated;
grant execute on function public.admin_list_collection(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_item(text, text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_reorder_collection(text, text, uuid[]) to anon, authenticated;
grant execute on function public.admin_delete_item(text, text, uuid) to anon, authenticated;
grant execute on function public.admin_update_prayer_status(text, uuid, text) to anon, authenticated;
grant execute on function public.admin_get_settings(text) to anon, authenticated;
grant execute on function public.admin_update_settings(text, jsonb) to anon, authenticated;
grant execute on function public.submit_contact(text, text, text, text, text) to anon, authenticated;
grant execute on function public.submit_testimony(text, text, text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.mark_testimony_confirmation_sent(uuid) to anon, authenticated;
grant execute on function public.admin_review_testimony(text, uuid, text, jsonb, boolean) to anon, authenticated;
grant execute on function public.submit_prayer(text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.submit_donation_intent(text, text, numeric, text) to anon, authenticated;

revoke all on function public._require_admin(text) from public, anon, authenticated;
revoke all on function public._require_permission(text, text, text) from public, anon, authenticated;
revoke all on function public._has_perm(public.admins, text, text) from public, anon, authenticated;
revoke all on function public._feature_for_collection(text) from public, anon, authenticated;
revoke all on function public._sanitize_permissions(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Analytics, visitor tracking, admin users, contact status / emails
-- Re-run this file safely: tables use IF NOT EXISTS, functions are replaced.
-- ---------------------------------------------------------------------------

create table if not exists public.page_visits (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text,
  user_agent text,
  visitor_id text,
  session_id text,
  visited_at timestamptz not null default now()
);

create index if not exists page_visits_visited_at_idx on public.page_visits (visited_at desc);
create index if not exists page_visits_path_idx on public.page_visits (path);

alter table public.page_visits enable row level security;

drop policy if exists "public_insert_visits" on public.page_visits;
create policy "public_insert_visits"
  on public.page_visits for insert
  to anon, authenticated
  with check (true);

grant insert on public.page_visits to anon, authenticated;

alter table public.contact_messages
  add column if not exists email_sent boolean not null default false;

update public.site_settings
set value = coalesce(value, '{}'::jsonb)
  || jsonb_build_object(
    'notificationEmail', coalesce(value->>'notificationEmail', 'adenugaolajideadewale@gmail.com'),
    'welcomeHeadline', coalesce(value->>'welcomeHeadline', 'Teaching One by One Another'),
    'welcomeBody', coalesce(
      value->>'welcomeBody',
      'At Fire-Fire International Evangelical Church, we believe in the transformative power of personal discipleship. Every member is both a student and a teacher in God''s kingdom.'
    ),
    'stats', coalesce(value->'stats', '[
      {"value": "15+", "label": "Years Serving"},
      {"value": "500+", "label": "Members Reached"},
      {"value": "12", "label": "Ministries"},
      {"value": "4", "label": "Weekly Services"}
    ]'::jsonb),
    'servicesIntro', coalesce(
      value->>'servicesIntro',
      'Join our church family for inspiring worship, biblical teaching, and meaningful fellowship. Every service is designed to draw you closer to God and build lasting relationships.'
    ),
    'programmes', coalesce(value->'programmes', '[
      {"title": "Holy Ghost Fire Conference", "description": "Annual conference focused on receiving the baptism of the Holy Spirit", "frequency": "Annually"},
      {"title": "Revival Services", "description": "Special revival meetings for spiritual renewal and awakening", "frequency": "Quarterly"},
      {"title": "Prayer & Fasting", "description": "Corporate prayer and fasting sessions for breakthrough", "frequency": "Monthly"},
      {"title": "Youth Services", "description": "Dynamic services designed specifically for young people", "frequency": "Weekly"}
    ]'::jsonb)
  )
where key = 'site';

drop function if exists public.admin_create(text, text, text, text, text);

create or replace function public.admin_create(
  p_token text,
  p_username text,
  p_password text,
  p_email text,
  p_role text default 'admin',
  p_permissions jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor public.admins;
  v_new public.admins;
  v_perms jsonb;
begin
  v_actor := public._require_admin(p_token);
  if v_actor.role <> 'superadmin' then
    raise exception 'Only a superadmin can create admins';
  end if;
  if p_role not in ('admin', 'superadmin') then
    raise exception 'Invalid role';
  end if;
  if length(trim(p_username)) < 3 then
    raise exception 'Username must be at least 3 characters';
  end if;
  if length(p_password) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;

  v_perms := case
    when p_role = 'superadmin' then '{}'::jsonb
    else public._sanitize_permissions(p_permissions)
  end;

  insert into public.admins (username, email, password_hash, role, permissions, created_by)
  values (
    trim(p_username),
    nullif(trim(p_email), ''),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_role,
    v_perms,
    v_actor.id
  )
  returning * into v_new;

  return jsonb_build_object(
    'id', v_new.id,
    'username', v_new.username,
    'email', v_new.email,
    'role', v_new.role,
    'is_active', v_new.is_active,
    'permissions', v_new.permissions,
    'created_at', v_new.created_at
  );
end;
$$;

create or replace function public.admin_list(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor public.admins;
begin
  v_actor := public._require_admin(p_token);
  if v_actor.role <> 'superadmin' then
    raise exception 'Only a superadmin can list admins';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id,
      'username', a.username,
      'email', a.email,
      'role', a.role,
      'is_active', a.is_active,
      'permissions', coalesce(a.permissions, '{}'::jsonb),
      'created_at', a.created_at
    ) order by a.created_at)
    from public.admins a
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_update_permissions(
  p_token text,
  p_admin_id uuid,
  p_permissions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor public.admins;
  v_target public.admins;
begin
  v_actor := public._require_admin(p_token);
  if v_actor.role <> 'superadmin' then
    raise exception 'Only a superadmin can change permissions';
  end if;

  select * into v_target from public.admins where id = p_admin_id;
  if not found then
    raise exception 'Admin not found';
  end if;
  if v_target.role = 'superadmin' then
    raise exception 'Superadmin access cannot be limited with permissions';
  end if;

  update public.admins
  set permissions = public._sanitize_permissions(p_permissions)
  where id = p_admin_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_set_active(p_token text, p_admin_id uuid, p_is_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor public.admins;
begin
  v_actor := public._require_admin(p_token);
  if v_actor.role <> 'superadmin' then
    raise exception 'Only a superadmin can change admin access';
  end if;
  if v_actor.id = p_admin_id then
    raise exception 'You cannot deactivate your own account';
  end if;
  update public.admins set is_active = p_is_active where id = p_admin_id;
  if p_is_active is false then
    delete from public.admin_sessions where admin_id = p_admin_id;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_set_password(
  p_token text,
  p_admin_id uuid,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor public.admins;
begin
  v_actor := public._require_admin(p_token);

  if v_actor.role <> 'superadmin' and v_actor.id <> p_admin_id then
    raise exception 'Only a superadmin can change another admin''s password';
  end if;

  if length(p_password) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;

  if not exists (select 1 from public.admins where id = p_admin_id) then
    raise exception 'Admin not found';
  end if;

  update public.admins
  set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
  where id = p_admin_id;

  -- Force re-login for the target account, but keep the actor's current session
  delete from public.admin_sessions
  where admin_id = p_admin_id
    and token <> p_token;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_update_contact(
  p_token text,
  p_id uuid,
  p_status text,
  p_email_sent boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._require_permission(p_token, 'contacts', 'edit');
  if p_status is not null and p_status not in ('new', 'read', 'replied') then
    raise exception 'Invalid status';
  end if;
  update public.contact_messages
  set
    status = coalesce(p_status, status),
    email_sent = coalesce(p_email_sent, email_sent)
  where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_visit_stats(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_total bigint;
  v_unique bigint;
  v_contacts bigint;
  v_unread bigint;
begin
  perform public._require_permission(p_token, 'overview', 'view');
  select count(*) into v_total from public.page_visits;
  select count(distinct visitor_id) into v_unique from public.page_visits where visitor_id is not null;
  select count(*) into v_contacts from public.contact_messages;
  select count(*) into v_unread from public.contact_messages where status = 'new';

  return jsonb_build_object(
    'totalVisits', v_total,
    'uniqueVisitors', v_unique,
    'contacts', v_contacts,
    'unreadContacts', v_unread,
    'last14Days', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'count', d.count) order by d.day)
      from (
        select to_char(visited_at at time zone 'utc', 'YYYY-MM-DD') as day, count(*) as count
        from public.page_visits
        where visited_at >= now() - interval '14 days'
        group by 1
      ) d
    ), '[]'::jsonb),
    'topPages', coalesce((
      select jsonb_agg(jsonb_build_object('path', p.path, 'count', p.count) order by p.count desc)
      from (
        select path, count(*) as count
        from public.page_visits
        group by path
        order by count(*) desc
        limit 8
      ) p
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_list_visits(p_token text, p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._require_permission(p_token, 'visitors', 'view');
  return coalesce((
    select jsonb_agg(to_jsonb(v) order by v.visited_at desc)
    from (
      select id, path, referrer, user_agent, visitor_id, session_id, visited_at
      from public.page_visits
      order by visited_at desc
      limit greatest(1, least(coalesce(p_limit, 100), 500))
    ) v
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_update_page_section(
  p_token text,
  p_page text,
  p_section text,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_value jsonb;
  v_allowed text[] := array[
    'home','about','services','leadership','ministries','events',
    'sermons','blog','testimonies','contact','prayer','donate'
  ];
begin
  if p_page is null or p_section is null or not (p_page = any (v_allowed)) then
    raise exception 'Unknown page';
  end if;
  if p_section !~ '^[a-zA-Z0-9_]+$' then
    raise exception 'Unknown section';
  end if;

  v_admin := public._require_permission(p_token, p_page || '.' || p_section, 'edit');

  select value into v_value from public.site_settings where key = 'site';
  v_value := coalesce(v_value, '{}'::jsonb);
  -- Ensure nested pages.{page}.{section} exists (jsonb_set needs parents step-by-step)
  v_value := jsonb_set(v_value, '{pages}', coalesce(v_value->'pages', '{}'::jsonb), true);
  v_value := jsonb_set(
    v_value,
    array['pages', p_page],
    coalesce(v_value->'pages'->p_page, '{}'::jsonb),
    true
  );
  v_value := jsonb_set(v_value, array['pages', p_page, p_section], coalesce(p_data, '{}'::jsonb), true);

  if p_page = 'home' and p_section = 'welcome' then
    v_value := v_value || jsonb_build_object(
      'welcomeHeadline', coalesce(p_data->>'headline', v_value->>'welcomeHeadline'),
      'welcomeBody', coalesce(p_data->>'body', v_value->>'welcomeBody')
    );
  elsif p_page = 'home' and p_section = 'stats' then
    v_value := jsonb_set(v_value, '{stats}', coalesce(p_data->'items', '[]'::jsonb), true);
  elsif p_page = 'about' and p_section = 'mission' then
    v_value := v_value || jsonb_build_object(
      'motto', coalesce(p_data->>'motto', v_value->>'motto'),
      'mission', coalesce(p_data->>'mission', v_value->>'mission')
    );
  elsif p_page = 'services' and p_section = 'hero' then
    v_value := v_value || jsonb_build_object('servicesIntro', coalesce(p_data->>'intro', v_value->>'servicesIntro'));
  elsif p_page = 'services' and p_section = 'times' then
    v_value := jsonb_set(v_value, '{serviceTimes}', coalesce(p_data->'items', '[]'::jsonb), true);
  elsif p_page = 'services' and p_section = 'programmes' then
    v_value := jsonb_set(v_value, '{programmes}', coalesce(p_data->'items', '[]'::jsonb), true);
  elsif p_page = 'contact' and p_section = 'church' then
    v_value := v_value || jsonb_build_object(
      'name', coalesce(p_data->>'name', v_value->>'name'),
      'pastor', coalesce(p_data->>'pastor', v_value->>'pastor'),
      'logo', coalesce(p_data->>'logo', v_value->>'logo'),
      'location', coalesce(p_data->>'location', v_value->>'location'),
      'phone', coalesce(p_data->>'phone', v_value->>'phone'),
      'email', coalesce(p_data->>'email', v_value->>'email'),
      'notificationEmail', coalesce(p_data->>'notificationEmail', v_value->>'notificationEmail'),
      'socials', jsonb_build_object(
        'facebook', coalesce(p_data->>'facebook', ''),
        'twitter', coalesce(p_data->>'twitter', ''),
        'instagram', coalesce(p_data->>'instagram', ''),
        'tiktok', coalesce(p_data->>'tiktok', ''),
        'youtube', coalesce(p_data->>'youtube', ''),
        'audiomack', coalesce(p_data->>'audiomack', '')
      )
    );
  end if;

  insert into public.site_settings (key, value, updated_at, updated_by)
  values ('site', v_value, now(), v_admin.id)
  on conflict (key) do update
    set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;

  return coalesce(p_data, '{}'::jsonb);
end;
$$;

create or replace function public.mark_contact_emailed(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.contact_messages set email_sent = true where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_create(text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_list(text) to anon, authenticated;
grant execute on function public.admin_set_active(text, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_set_password(text, uuid, text) to anon, authenticated;
grant execute on function public.admin_update_permissions(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_update_page_section(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_update_contact(text, uuid, text, boolean) to anon, authenticated;
grant execute on function public.admin_visit_stats(text) to anon, authenticated;
grant execute on function public.admin_list_visits(text, integer) to anon, authenticated;
grant execute on function public.mark_contact_emailed(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Media library (featured images and reusable uploads)
-- ---------------------------------------------------------------------------

create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.media_library enable row level security;
drop policy if exists "public_read_media_library" on public.media_library;
create policy "public_read_media_library" on public.media_library
  for select to anon, authenticated using (true);

insert into public.media_library (url, name)
select distinct image, coalesce(nullif(title, ''), 'Image')
from public.blog_posts
where coalesce(image, '') <> ''
on conflict (url) do nothing;

create or replace function public.admin_list_media(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.created_at desc)
    from (
      select id, url, name, created_at from public.media_library
      union
      select gen_random_uuid(), image, coalesce(nullif(title, ''), 'Image'), created_at
      from public.blog_posts
      where coalesce(image, '') <> ''
        and image not in (select url from public.media_library)
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_add_media(p_token text, p_url text, p_name text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.media_library;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  if length(trim(p_url)) < 8 then
    raise exception 'Image URL is required';
  end if;
  insert into public.media_library (url, name)
  values (trim(p_url), coalesce(nullif(trim(p_name), ''), 'Image'))
  on conflict (url) do update set name = excluded.name
  returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

grant execute on function public.admin_list_media(text) to anon, authenticated;
grant execute on function public.admin_add_media(text, text, text) to anon, authenticated;

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'media',
    'media',
    true,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml']
  )
  on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit;

  drop policy if exists "media_public_read" on storage.objects;
  create policy "media_public_read"
    on storage.objects for select
    using (bucket_id = 'media');

  drop policy if exists "media_public_insert" on storage.objects;
  create policy "media_public_insert"
    on storage.objects for insert
    with check (bucket_id = 'media');
exception when others then
  raise notice 'Media storage bucket could not be created automatically. Create a public bucket named media in Storage if file uploads fail.';
end $$;
