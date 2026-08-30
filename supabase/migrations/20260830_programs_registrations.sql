-- Church programs, dynamic registrations, roles & member registry
-- Run in Supabase SQL Editor after schema.sql

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.program_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.church_programs (
  id uuid primary key default gen_random_uuid(),
  type_id uuid references public.program_types(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text not null default '',
  venue text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  admin_email text not null default '',
  form_fields jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  allow_public_registration boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.admins(id) on delete set null
);

create table if not exists public.program_registrations (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.church_programs(id) on delete cascade,
  full_name text not null,
  email text not null default '',
  phone text not null default '',
  form_data jsonb not null default '{}'::jsonb,
  registered_by_admin boolean not null default false,
  admin_id uuid references public.admins(id) on delete set null,
  status text not null default 'registered' check (status in ('registered', 'confirmed', 'cancelled', 'attended')),
  email_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.church_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.church_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null default '',
  phone text not null default '',
  gender text not null default '',
  date_of_birth date,
  address text not null default '',
  city text not null default '',
  state text not null default '',
  country text not null default 'Nigeria',
  role_id uuid references public.church_roles(id) on delete set null,
  ministry text not null default '',
  baptism_status text not null default '',
  marital_status text not null default '',
  occupation text not null default '',
  emergency_contact_name text not null default '',
  emergency_contact_phone text not null default '',
  notes text not null default '',
  form_data jsonb not null default '{}'::jsonb,
  registered_by_admin boolean not null default false,
  admin_id uuid references public.admins(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'active', 'inactive')),
  email_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_programs_slug_idx on public.church_programs (slug);
create index if not exists program_registrations_program_idx on public.program_registrations (program_id, created_at desc);
create index if not exists church_members_role_idx on public.church_members (role_id);
create index if not exists church_members_email_idx on public.church_members (lower(email));

-- ---------------------------------------------------------------------------
-- Seed roles & Youth Convention 2026
-- ---------------------------------------------------------------------------
insert into public.church_roles (name, description, sort_order) values
  ('Pastor', 'Senior pastoral leadership', 1),
  ('Minister', 'Ordained minister', 2),
  ('Deacon', 'Church deacon', 3),
  ('Elder', 'Church elder', 4),
  ('Youth Leader', 'Youth ministry leadership', 5),
  ('Choir Director', 'Music & worship leadership', 6),
  ('Usher', 'Ushering & hospitality', 7),
  ('Worker', 'Church worker / volunteer', 8),
  ('Member', 'Bonafide church member', 9)
on conflict (name) do nothing;

insert into public.program_types (name, description, sort_order) values
  ('Convention', 'Large gatherings and conventions', 1),
  ('Conference', 'Conferences and seminars', 2),
  ('Outreach', 'Evangelism and outreach programs', 3),
  ('Training', 'Training and discipleship programs', 4)
on conflict (name) do nothing;

insert into public.church_programs (
  type_id, title, slug, description, venue,
  starts_at, ends_at, registration_opens_at, registration_closes_at,
  admin_email, form_fields, is_active, allow_public_registration
)
select
  pt.id,
  'Fire-Fire Youth Convention 2026',
  'youth-convention-2026',
  'Join us for the Fire-Fire Youth Convention 2026 — a Spirit-filled gathering for young people to worship, learn, and grow.',
  'Fire-Fire International Evangelical Church, Ibadan',
  '2026-09-09T09:00:00+01:00'::timestamptz,
  '2026-09-12T23:59:00+01:00'::timestamptz,
  now(),
  '2026-09-12T23:59:00+01:00'::timestamptz,
  'info@firefireintl.org',
  '[
    {"name":"full_name","label":"Full Name","type":"text","required":true},
    {"name":"email","label":"Email Address","type":"email","required":true},
    {"name":"phone","label":"Phone Number","type":"tel","required":true},
    {"name":"age","label":"Age","type":"number","required":true},
    {"name":"gender","label":"Gender","type":"select","required":true,"options":["Male","Female"]},
    {"name":"church","label":"Home Church","type":"text","required":false},
    {"name":"tshirt_size","label":"T-Shirt Size","type":"select","required":true,"options":["S","M","L","XL","XXL"]},
    {"name":"emergency_contact","label":"Emergency Contact","type":"text","required":true},
    {"name":"notes","label":"Special needs / comments","type":"textarea","required":false}
  ]'::jsonb,
  true,
  true
from public.program_types pt
where pt.name = 'Convention'
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  venue = excluded.venue,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  registration_opens_at = excluded.registration_opens_at,
  registration_closes_at = excluded.registration_closes_at,
  form_fields = excluded.form_fields,
  is_active = true,
  allow_public_registration = true;

-- ---------------------------------------------------------------------------
-- Extend permission check for program features
-- ---------------------------------------------------------------------------
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

  if p_feature in (
    'overview', 'visitors', 'contacts',
    'program_types', 'programs', 'program_registrations', 'church_roles', 'church_members'
  ) then
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
    if p_action = 'view' then return true; end if;
    return exists (
      select 1
      from jsonb_each(coalesce(v_pages -> p_feature -> 'sections', '{}'::jsonb)) s
      where coalesce((s.value ->> p_action)::boolean, false)
    );
  end if;

  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: fetch program by slug
-- ---------------------------------------------------------------------------
create or replace function public.public_get_program(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.church_programs%rowtype;
  v_type_name text;
begin
  select * into v_row
  from public.church_programs
  where slug = lower(trim(p_slug))
    and is_active = true
    and allow_public_registration = true;

  if not found then
    raise exception 'Program not found or registration is closed';
  end if;

  if v_row.registration_opens_at is not null and now() < v_row.registration_opens_at then
    raise exception 'Registration has not opened yet';
  end if;
  if v_row.registration_closes_at is not null and now() > v_row.registration_closes_at then
    raise exception 'Registration has closed';
  end if;

  select name into v_type_name from public.program_types where id = v_row.type_id;

  return jsonb_build_object(
    'id', v_row.id,
    'title', v_row.title,
    'slug', v_row.slug,
    'description', v_row.description,
    'venue', v_row.venue,
    'startsAt', v_row.starts_at,
    'endsAt', v_row.ends_at,
    'typeName', coalesce(v_type_name, ''),
    'formFields', coalesce(v_row.form_fields, '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: list active church roles
-- ---------------------------------------------------------------------------
create or replace function public.public_list_church_roles()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'description', description
  ) order by sort_order, name), '[]'::jsonb)
  from public.church_roles
  where is_active = true;
$$;

-- ---------------------------------------------------------------------------
-- Public: submit program registration
-- ---------------------------------------------------------------------------
create or replace function public.submit_program_registration(
  p_program_slug text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_form_data jsonb default '{}'::jsonb,
  p_by_admin boolean default false,
  p_admin_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program public.church_programs%rowtype;
  v_admin public.admins;
  v_id uuid;
begin
  select * into v_program
  from public.church_programs
  where slug = lower(trim(p_program_slug))
    and is_active = true;

  if not found then
    raise exception 'Program not found';
  end if;

  if not p_by_admin then
    if not v_program.allow_public_registration then
      raise exception 'Public registration is disabled';
    end if;
    if v_program.registration_opens_at is not null and now() < v_program.registration_opens_at then
      raise exception 'Registration has not opened yet';
    end if;
    if v_program.registration_closes_at is not null and now() > v_program.registration_closes_at then
      raise exception 'Registration has closed';
    end if;
  else
    v_admin := public._require_permission(p_admin_token, 'program_registrations', 'edit');
  end if;

  if length(trim(coalesce(p_full_name, ''))) < 2 then
    raise exception 'Full name is required';
  end if;
  if length(trim(coalesce(p_email, ''))) < 5 then
    raise exception 'Valid email is required';
  end if;

  insert into public.program_registrations (
    program_id, full_name, email, phone, form_data,
    registered_by_admin, admin_id, status
  ) values (
    v_program.id,
    trim(p_full_name),
    lower(trim(p_email)),
    trim(coalesce(p_phone, '')),
    coalesce(p_form_data, '{}'::jsonb),
    coalesce(p_by_admin, false),
    case when p_by_admin then v_admin.id else null end,
    'registered'
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'programTitle', v_program.title,
    'adminEmail', v_program.admin_email,
    'fullName', trim(p_full_name),
    'email', lower(trim(p_email)),
    'phone', trim(coalesce(p_phone, ''))
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: submit church membership
-- ---------------------------------------------------------------------------
create or replace function public.submit_church_membership(
  p_full_name text,
  p_email text,
  p_phone text,
  p_gender text default '',
  p_date_of_birth date default null,
  p_address text default '',
  p_city text default '',
  p_state text default '',
  p_country text default 'Nigeria',
  p_role_id uuid default null,
  p_ministry text default '',
  p_baptism_status text default '',
  p_marital_status text default '',
  p_occupation text default '',
  p_emergency_contact_name text default '',
  p_emergency_contact_phone text default '',
  p_notes text default '',
  p_form_data jsonb default '{}'::jsonb,
  p_by_admin boolean default false,
  p_admin_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_id uuid;
  v_role_name text;
begin
  if p_by_admin then
    v_admin := public._require_permission(p_admin_token, 'church_members', 'edit');
  end if;

  if length(trim(coalesce(p_full_name, ''))) < 2 then
    raise exception 'Full name is required';
  end if;
  if length(trim(coalesce(p_email, ''))) < 5 then
    raise exception 'Valid email is required';
  end if;
  if length(trim(coalesce(p_phone, ''))) < 7 then
    raise exception 'Valid phone is required';
  end if;
  if p_role_id is null then
    raise exception 'Church role is required';
  end if;

  select name into v_role_name from public.church_roles where id = p_role_id and is_active = true;
  if v_role_name is null then
    raise exception 'Invalid church role';
  end if;

  insert into public.church_members (
    full_name, email, phone, gender, date_of_birth,
    address, city, state, country, role_id, ministry,
    baptism_status, marital_status, occupation,
    emergency_contact_name, emergency_contact_phone, notes, form_data,
    registered_by_admin, admin_id, status
  ) values (
    trim(p_full_name), lower(trim(p_email)), trim(p_phone),
    trim(coalesce(p_gender, '')), p_date_of_birth,
    trim(coalesce(p_address, '')), trim(coalesce(p_city, '')),
    trim(coalesce(p_state, '')), coalesce(nullif(trim(p_country), ''), 'Nigeria'),
    p_role_id, trim(coalesce(p_ministry, '')),
    trim(coalesce(p_baptism_status, '')), trim(coalesce(p_marital_status, '')),
    trim(coalesce(p_occupation, '')),
    trim(coalesce(p_emergency_contact_name, '')),
    trim(coalesce(p_emergency_contact_phone, '')),
    trim(coalesce(p_notes, '')),
    coalesce(p_form_data, '{}'::jsonb),
    coalesce(p_by_admin, false),
    case when p_by_admin then v_admin.id else null end,
    case when p_by_admin then 'approved' else 'pending' end
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'fullName', trim(p_full_name),
    'email', lower(trim(p_email)),
    'roleName', v_role_name
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin CRUD helpers
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_program_types(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'program_types', 'view');
  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.sort_order, t.name)
    from public.program_types t
  ), '[]'::jsonb);
end; $$;

create or replace function public.admin_upsert_program_type(p_token text, p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.program_types%rowtype;
begin
  perform public._require_permission(p_token, 'program_types', 'edit');
  if p_id is null then
    insert into public.program_types (name, description, sort_order, is_active)
    values (
      trim(p_data->>'name'), coalesce(p_data->>'description', ''),
      coalesce((p_data->>'sort_order')::int, 0),
      coalesce((p_data->>'is_active')::boolean, true)
    ) returning * into v_row;
  else
    update public.program_types set
      name = coalesce(nullif(trim(p_data->>'name'), ''), name),
      description = coalesce(p_data->>'description', description),
      sort_order = coalesce((p_data->>'sort_order')::int, sort_order),
      is_active = coalesce((p_data->>'is_active')::boolean, is_active),
      updated_at = now()
    where id = p_id returning * into v_row;
  end if;
  return to_jsonb(v_row);
end; $$;

create or replace function public.admin_delete_program_type(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'program_types', 'delete');
  delete from public.program_types where id = p_id;
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_list_programs(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'programs', 'view');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'type_id', p.type_id, 'type_name', pt.name,
      'title', p.title, 'slug', p.slug, 'description', p.description,
      'venue', p.venue, 'starts_at', p.starts_at, 'ends_at', p.ends_at,
      'registration_opens_at', p.registration_opens_at,
      'registration_closes_at', p.registration_closes_at,
      'admin_email', p.admin_email, 'form_fields', p.form_fields,
      'is_active', p.is_active, 'allow_public_registration', p.allow_public_registration,
      'registration_count', (select count(*) from public.program_registrations r where r.program_id = p.id),
      'created_at', p.created_at
    ) order by p.sort_order, p.starts_at desc nulls last)
    from public.church_programs p
    left join public.program_types pt on pt.id = p.type_id
  ), '[]'::jsonb);
end; $$;

create or replace function public.admin_upsert_program(p_token text, p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_admin public.admins; v_row public.church_programs%rowtype; v_slug text;
begin
  v_admin := public._require_permission(p_token, 'programs', 'edit');
  v_slug := lower(regexp_replace(trim(coalesce(p_data->>'slug', p_data->>'title', '')), '[^a-z0-9]+', '-', 'gi'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then raise exception 'Slug is required'; end if;

  if p_id is null then
    insert into public.church_programs (
      type_id, title, slug, description, venue, starts_at, ends_at,
      registration_opens_at, registration_closes_at, admin_email,
      form_fields, is_active, allow_public_registration, sort_order, created_by
    ) values (
      nullif(p_data->>'type_id', '')::uuid,
      trim(p_data->>'title'), v_slug,
      coalesce(p_data->>'description', ''), coalesce(p_data->>'venue', ''),
      nullif(p_data->>'starts_at', '')::timestamptz,
      nullif(p_data->>'ends_at', '')::timestamptz,
      nullif(p_data->>'registration_opens_at', '')::timestamptz,
      nullif(p_data->>'registration_closes_at', '')::timestamptz,
      coalesce(p_data->>'admin_email', ''),
      coalesce(p_data->'form_fields', '[]'::jsonb),
      coalesce((p_data->>'is_active')::boolean, true),
      coalesce((p_data->>'allow_public_registration')::boolean, true),
      coalesce((p_data->>'sort_order')::int, 0),
      v_admin.id
    ) returning * into v_row;
  else
    update public.church_programs set
      type_id = coalesce(nullif(p_data->>'type_id', '')::uuid, type_id),
      title = coalesce(nullif(trim(p_data->>'title'), ''), title),
      slug = case when p_data ? 'slug' then v_slug else slug end,
      description = coalesce(p_data->>'description', description),
      venue = coalesce(p_data->>'venue', venue),
      starts_at = case when p_data ? 'starts_at' then nullif(p_data->>'starts_at', '')::timestamptz else starts_at end,
      ends_at = case when p_data ? 'ends_at' then nullif(p_data->>'ends_at', '')::timestamptz else ends_at end,
      registration_opens_at = case when p_data ? 'registration_opens_at' then nullif(p_data->>'registration_opens_at', '')::timestamptz else registration_opens_at end,
      registration_closes_at = case when p_data ? 'registration_closes_at' then nullif(p_data->>'registration_closes_at', '')::timestamptz else registration_closes_at end,
      admin_email = coalesce(p_data->>'admin_email', admin_email),
      form_fields = coalesce(p_data->'form_fields', form_fields),
      is_active = coalesce((p_data->>'is_active')::boolean, is_active),
      allow_public_registration = coalesce((p_data->>'allow_public_registration')::boolean, allow_public_registration),
      sort_order = coalesce((p_data->>'sort_order')::int, sort_order),
      updated_at = now()
    where id = p_id returning * into v_row;
  end if;
  return to_jsonb(v_row);
end; $$;

create or replace function public.admin_delete_program(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'programs', 'delete');
  delete from public.church_programs where id = p_id;
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_list_program_registrations(p_token text, p_program_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'program_registrations', 'view');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'program_id', r.program_id, 'program_title', p.title, 'program_slug', p.slug,
      'full_name', r.full_name, 'email', r.email, 'phone', r.phone,
      'form_data', r.form_data, 'status', r.status,
      'registered_by_admin', r.registered_by_admin,
      'email_sent', r.email_sent, 'created_at', r.created_at
    ) order by r.created_at desc)
    from public.program_registrations r
    join public.church_programs p on p.id = r.program_id
    where p_program_id is null or r.program_id = p_program_id
  ), '[]'::jsonb);
end; $$;

create or replace function public.admin_update_program_registration(p_token text, p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.program_registrations%rowtype;
begin
  perform public._require_permission(p_token, 'program_registrations', 'edit');
  update public.program_registrations set
    full_name = coalesce(nullif(trim(p_data->>'full_name'), ''), full_name),
    email = coalesce(nullif(lower(trim(p_data->>'email')), ''), email),
    phone = coalesce(p_data->>'phone', phone),
    form_data = coalesce(p_data->'form_data', form_data),
    status = coalesce(nullif(p_data->>'status', ''), status),
    updated_at = now()
  where id = p_id returning * into v_row;
  if not found then raise exception 'Registration not found'; end if;
  return to_jsonb(v_row);
end; $$;

create or replace function public.admin_delete_program_registration(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'program_registrations', 'delete');
  delete from public.program_registrations where id = p_id;
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.mark_program_registration_emailed(p_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  update public.program_registrations set email_sent = true where id = p_id;
  select jsonb_build_object('ok', true);
$$;

create or replace function public.admin_list_church_roles(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'church_roles', 'view');
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.sort_order, r.name) from public.church_roles r
  ), '[]'::jsonb);
end; $$;

create or replace function public.admin_upsert_church_role(p_token text, p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.church_roles%rowtype;
begin
  perform public._require_permission(p_token, 'church_roles', 'edit');
  if p_id is null then
    insert into public.church_roles (name, description, sort_order, is_active)
    values (trim(p_data->>'name'), coalesce(p_data->>'description', ''), coalesce((p_data->>'sort_order')::int, 0), coalesce((p_data->>'is_active')::boolean, true))
    returning * into v_row;
  else
    update public.church_roles set
      name = coalesce(nullif(trim(p_data->>'name'), ''), name),
      description = coalesce(p_data->>'description', description),
      sort_order = coalesce((p_data->>'sort_order')::int, sort_order),
      is_active = coalesce((p_data->>'is_active')::boolean, is_active)
    where id = p_id returning * into v_row;
  end if;
  return to_jsonb(v_row);
end; $$;

create or replace function public.admin_delete_church_role(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'church_roles', 'delete');
  delete from public.church_roles where id = p_id;
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_list_church_members(p_token text, p_role_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'church_members', 'view');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'full_name', m.full_name, 'email', m.email, 'phone', m.phone,
      'gender', m.gender, 'date_of_birth', m.date_of_birth,
      'address', m.address, 'city', m.city, 'state', m.state, 'country', m.country,
      'role_id', m.role_id, 'role_name', r.name, 'ministry', m.ministry,
      'baptism_status', m.baptism_status, 'marital_status', m.marital_status,
      'occupation', m.occupation,
      'emergency_contact_name', m.emergency_contact_name,
      'emergency_contact_phone', m.emergency_contact_phone,
      'notes', m.notes, 'form_data', m.form_data,
      'status', m.status, 'registered_by_admin', m.registered_by_admin,
      'email_sent', m.email_sent, 'created_at', m.created_at
    ) order by m.created_at desc)
    from public.church_members m
    left join public.church_roles r on r.id = m.role_id
    where p_role_id is null or m.role_id = p_role_id
  ), '[]'::jsonb);
end; $$;

create or replace function public.admin_update_church_member(p_token text, p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.church_members%rowtype;
begin
  perform public._require_permission(p_token, 'church_members', 'edit');
  update public.church_members set
    full_name = coalesce(nullif(trim(p_data->>'full_name'), ''), full_name),
    email = coalesce(nullif(lower(trim(p_data->>'email')), ''), email),
    phone = coalesce(p_data->>'phone', phone),
    gender = coalesce(p_data->>'gender', gender),
    date_of_birth = case when p_data ? 'date_of_birth' then nullif(p_data->>'date_of_birth', '')::date else date_of_birth end,
    address = coalesce(p_data->>'address', address),
    city = coalesce(p_data->>'city', city),
    state = coalesce(p_data->>'state', state),
    country = coalesce(p_data->>'country', country),
    role_id = coalesce(nullif(p_data->>'role_id', '')::uuid, role_id),
    ministry = coalesce(p_data->>'ministry', ministry),
    baptism_status = coalesce(p_data->>'baptism_status', baptism_status),
    marital_status = coalesce(p_data->>'marital_status', marital_status),
    occupation = coalesce(p_data->>'occupation', occupation),
    emergency_contact_name = coalesce(p_data->>'emergency_contact_name', emergency_contact_name),
    emergency_contact_phone = coalesce(p_data->>'emergency_contact_phone', emergency_contact_phone),
    notes = coalesce(p_data->>'notes', notes),
    status = coalesce(nullif(p_data->>'status', ''), status),
    updated_at = now()
  where id = p_id returning * into v_row;
  if not found then raise exception 'Member not found'; end if;
  return to_jsonb(v_row);
end; $$;

create or replace function public.admin_delete_church_member(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'church_members', 'delete');
  delete from public.church_members where id = p_id;
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.mark_church_member_emailed(p_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  update public.church_members set email_sent = true where id = p_id;
  select jsonb_build_object('ok', true);
$$;

-- Grants
grant execute on function public.public_get_program(text) to anon, authenticated;
grant execute on function public.public_list_church_roles() to anon, authenticated;
grant execute on function public.submit_program_registration(text, text, text, text, jsonb, boolean, text) to anon, authenticated;
grant execute on function public.submit_church_membership(text, text, text, text, date, text, text, text, text, uuid, text, text, text, text, text, text, text, jsonb, boolean, text) to anon, authenticated;
grant execute on function public.mark_program_registration_emailed(uuid) to anon, authenticated;
grant execute on function public.mark_church_member_emailed(uuid) to anon, authenticated;

grant execute on function public.admin_list_program_types(text) to anon, authenticated;
grant execute on function public.admin_upsert_program_type(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_program_type(text, uuid) to anon, authenticated;
grant execute on function public.admin_list_programs(text) to anon, authenticated;
grant execute on function public.admin_upsert_program(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_program(text, uuid) to anon, authenticated;
grant execute on function public.admin_list_program_registrations(text, uuid) to anon, authenticated;
grant execute on function public.admin_update_program_registration(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_program_registration(text, uuid) to anon, authenticated;
grant execute on function public.admin_list_church_roles(text) to anon, authenticated;
grant execute on function public.admin_upsert_church_role(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_church_role(text, uuid) to anon, authenticated;
grant execute on function public.admin_list_church_members(text, uuid) to anon, authenticated;
grant execute on function public.admin_update_church_member(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_church_member(text, uuid) to anon, authenticated;
