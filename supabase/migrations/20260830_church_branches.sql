-- Church branches (local & international) — foundation for all registrations
-- Run after 20260830_programs_registrations.sql

-- ---------------------------------------------------------------------------
-- Branches table
-- ---------------------------------------------------------------------------
create table if not exists public.church_branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text not null default '',
  state text not null default '',
  country text not null default 'Nigeria',
  region text not null default 'local' check (region in ('local', 'international')),
  is_international boolean not null default false,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_branches_region_idx on public.church_branches (region, sort_order);

-- ---------------------------------------------------------------------------
-- branch_id on records (nullable for legacy rows)
-- ---------------------------------------------------------------------------
alter table public.program_registrations
  add column if not exists branch_id uuid references public.church_branches(id) on delete set null;

alter table public.church_members
  add column if not exists branch_id uuid references public.church_branches(id) on delete set null;

alter table public.contact_messages
  add column if not exists branch_id uuid references public.church_branches(id) on delete set null;

alter table public.prayer_requests
  add column if not exists branch_id uuid references public.church_branches(id) on delete set null;

alter table public.testimonies
  add column if not exists branch_id uuid references public.church_branches(id) on delete set null;

alter table public.church_programs
  add column if not exists branch_id uuid references public.church_branches(id) on delete set null;

create index if not exists program_registrations_branch_idx on public.program_registrations (branch_id);
create index if not exists church_members_branch_idx on public.church_members (branch_id);

-- ---------------------------------------------------------------------------
-- Seed branches
-- ---------------------------------------------------------------------------
insert into public.church_branches (name, slug, city, state, country, region, is_international, description, sort_order) values
  ('Fire-Fire HQ — Ibadan', 'ibadan-hq', 'Ibadan', 'Oyo', 'Nigeria', 'local', false, 'Headquarters — Fire-Fire Area, Papa Agric, Olomi', 1),
  ('Lagos Branch', 'lagos', 'Lagos', 'Lagos', 'Nigeria', 'local', false, 'Lagos metropolitan branch', 2),
  ('Abuja Branch', 'abuja', 'Abuja', 'FCT', 'Nigeria', 'local', false, 'Federal Capital Territory branch', 3),
  ('Port Harcourt Branch', 'port-harcourt', 'Port Harcourt', 'Rivers', 'Nigeria', 'local', false, 'South-South regional branch', 4),
  ('International Members (Online)', 'international-online', '', '', 'International', 'international', true, 'Diaspora & online fellowship members', 10),
  ('United Kingdom', 'uk', 'London', 'England', 'United Kingdom', 'international', true, 'UK branch & members', 11),
  ('United States', 'usa', '', '', 'United States', 'international', true, 'US branch & members', 12)
on conflict (slug) do update set
  name = excluded.name,
  city = excluded.city,
  state = excluded.state,
  country = excluded.country,
  region = excluded.region,
  is_international = excluded.is_international,
  description = excluded.description,
  is_active = true;

-- ---------------------------------------------------------------------------
-- Permissions: church_branches
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
  if p_admin.role = 'superadmin' then return true; end if;
  if p_feature is null or p_action is null then return false; end if;

  if p_feature in (
    'overview', 'visitors', 'contacts',
    'program_types', 'programs', 'program_registrations', 'church_roles', 'church_members',
    'church_branches'
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
    elsif coalesce((v_sec ->> p_action)::boolean, false) then
      return true;
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
      select 1 from jsonb_each(coalesce(v_pages -> p_feature -> 'sections', '{}'::jsonb)) s
      where coalesce((s.value ->> p_action)::boolean, false)
    );
  end if;
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: list branches
-- ---------------------------------------------------------------------------
create or replace function public.public_list_church_branches()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'slug', slug,
    'city', city, 'state', state, 'country', country,
    'region', region, 'isInternational', is_international,
    'label', case
      when city <> '' then name || ' — ' || city || case when country <> 'Nigeria' then ', ' || country else '' end
      else name || case when country <> '' and country <> 'Nigeria' then ' (' || country || ')' else '' end
    end
  ) order by region, sort_order, name), '[]'::jsonb)
  from public.church_branches
  where is_active = true;
$$;

-- ---------------------------------------------------------------------------
-- Admin branch CRUD
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_church_branches(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'church_branches', 'view');
  return coalesce((
    select jsonb_agg(to_jsonb(b) order by b.region, b.sort_order, b.name)
    from public.church_branches b
  ), '[]'::jsonb);
end; $$;

create or replace function public.admin_upsert_church_branch(p_token text, p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.church_branches%rowtype; v_slug text;
begin
  perform public._require_permission(p_token, 'church_branches', 'edit');
  v_slug := lower(regexp_replace(trim(coalesce(p_data->>'slug', p_data->>'name', '')), '[^a-z0-9]+', '-', 'gi'));
  v_slug := trim(both '-' from v_slug);
  if p_id is null then
    insert into public.church_branches (
      name, slug, city, state, country, region, is_international, description, sort_order, is_active
    ) values (
      trim(p_data->>'name'), v_slug,
      coalesce(p_data->>'city', ''), coalesce(p_data->>'state', ''),
      coalesce(nullif(p_data->>'country', ''), 'Nigeria'),
      coalesce(nullif(p_data->>'region', ''), 'local'),
      coalesce((p_data->>'is_international')::boolean, p_data->>'region' = 'international'),
      coalesce(p_data->>'description', ''),
      coalesce((p_data->>'sort_order')::int, 0),
      coalesce((p_data->>'is_active')::boolean, true)
    ) returning * into v_row;
  else
    update public.church_branches set
      name = coalesce(nullif(trim(p_data->>'name'), ''), name),
      slug = case when p_data ? 'slug' or p_data ? 'name' then v_slug else slug end,
      city = coalesce(p_data->>'city', city),
      state = coalesce(p_data->>'state', state),
      country = coalesce(p_data->>'country', country),
      region = coalesce(nullif(p_data->>'region', ''), region),
      is_international = coalesce((p_data->>'is_international')::boolean, is_international),
      description = coalesce(p_data->>'description', description),
      sort_order = coalesce((p_data->>'sort_order')::int, sort_order),
      is_active = coalesce((p_data->>'is_active')::boolean, is_active),
      updated_at = now()
    where id = p_id returning * into v_row;
  end if;
  return to_jsonb(v_row);
end; $$;

create or replace function public.admin_delete_church_branch(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'church_branches', 'delete');
  delete from public.church_branches where id = p_id;
  return jsonb_build_object('ok', true);
end; $$;

-- ---------------------------------------------------------------------------
-- Update submit_contact
-- ---------------------------------------------------------------------------
create or replace function public.submit_contact(
  p_name text, p_email text, p_phone text default '',
  p_subject text default '', p_message text default '',
  p_branch_id uuid default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if length(trim(p_name)) < 2 or length(trim(p_email)) < 5 or length(trim(p_message)) < 2 then
    raise exception 'Please complete the form';
  end if;
  insert into public.contact_messages (name, email, phone, subject, message, branch_id)
  values (trim(p_name), trim(p_email), coalesce(trim(p_phone), ''), coalesce(trim(p_subject), ''), trim(p_message), p_branch_id)
  returning id into v_id;
  return v_id;
end; $$;

-- ---------------------------------------------------------------------------
-- Update submit_prayer (signature from migration if extended)
-- ---------------------------------------------------------------------------
create or replace function public.submit_prayer(
  p_name text, p_email text, p_phone text default '',
  p_category text default 'Personal Prayer Request',
  p_request text default '', p_is_public boolean default false,
  p_branch_id uuid default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if length(trim(p_name)) < 2 then raise exception 'Please enter your name'; end if;
  if length(trim(p_email)) < 5 then raise exception 'Please enter a valid email'; end if;
  if length(trim(coalesce(p_phone, ''))) < 7 then raise exception 'Please enter a valid phone number'; end if;
  if length(trim(p_request)) < 2 then raise exception 'Please enter your prayer request'; end if;

  insert into public.prayer_requests (name, email, phone, category, request, is_public, branch_id)
  values (trim(p_name), trim(p_email), trim(p_phone), coalesce(trim(p_category), 'Personal Prayer Request'), trim(p_request), coalesce(p_is_public, false), p_branch_id)
  returning id into v_id;
  return v_id;
end; $$;

-- ---------------------------------------------------------------------------
-- Update submit_testimony
-- ---------------------------------------------------------------------------
create or replace function public.submit_testimony(
  p_name text, p_email text, p_phone text default '', p_role text default '',
  p_date_joined text default '', p_title text default '', p_testimony text default '',
  p_consent_public boolean default true, p_branch_id uuid default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if length(trim(p_name)) < 2 then raise exception 'Please enter your name'; end if;
  if length(trim(p_email)) < 5 or position('@' in p_email) = 0 then raise exception 'Please enter a valid email'; end if;
  if length(trim(p_testimony)) < 20 then raise exception 'Please share a bit more of your testimony (at least 20 characters)'; end if;
  if not coalesce(p_consent_public, false) then raise exception 'Please confirm you consent to share your testimony'; end if;

  insert into public.testimonies (
    name, email, phone, role, "dateJoined", title, testimony,
    status, source, consent_public, featured, sort_order, branch_id
  ) values (
    trim(p_name), trim(p_email), coalesce(trim(p_phone), ''),
    coalesce(nullif(trim(p_role), ''), 'Church Member'),
    coalesce(trim(p_date_joined), ''), coalesce(trim(p_title), ''), trim(p_testimony),
    'pending', 'form', true, false, 0, p_branch_id
  ) returning id into v_id;
  return v_id;
end; $$;

-- ---------------------------------------------------------------------------
-- Update program registration
-- ---------------------------------------------------------------------------
create or replace function public.submit_program_registration(
  p_program_slug text, p_full_name text, p_email text, p_phone text,
  p_form_data jsonb default '{}'::jsonb, p_by_admin boolean default false,
  p_admin_token text default null, p_branch_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_program public.church_programs%rowtype;
  v_admin public.admins;
  v_id uuid;
  v_branch_name text;
begin
  select * into v_program from public.church_programs
  where slug = lower(trim(p_program_slug)) and is_active = true;
  if not found then raise exception 'Program not found'; end if;

  if not p_by_admin then
    if not v_program.allow_public_registration then raise exception 'Public registration is disabled'; end if;
    if v_program.registration_opens_at is not null and now() < v_program.registration_opens_at then
      raise exception 'Registration has not opened yet';
    end if;
    if v_program.registration_closes_at is not null and now() > v_program.registration_closes_at then
      raise exception 'Registration has closed';
    end if;
  else
    v_admin := public._require_permission(p_admin_token, 'program_registrations', 'edit');
  end if;

  if p_branch_id is null then raise exception 'Please select your church branch'; end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 then raise exception 'Full name is required'; end if;
  if length(trim(coalesce(p_email, ''))) < 5 then raise exception 'Valid email is required'; end if;

  select name into v_branch_name from public.church_branches where id = p_branch_id and is_active = true;

  insert into public.program_registrations (
    program_id, full_name, email, phone, form_data, branch_id,
    registered_by_admin, admin_id, status
  ) values (
    v_program.id, trim(p_full_name), lower(trim(p_email)), trim(coalesce(p_phone, '')),
    coalesce(p_form_data, '{}'::jsonb), p_branch_id,
    coalesce(p_by_admin, false), case when p_by_admin then v_admin.id else null end, 'registered'
  ) returning id into v_id;

  return jsonb_build_object(
    'id', v_id, 'programTitle', v_program.title, 'adminEmail', v_program.admin_email,
    'fullName', trim(p_full_name), 'email', lower(trim(p_email)),
    'phone', trim(coalesce(p_phone, '')), 'branchName', coalesce(v_branch_name, '')
  );
end; $$;

-- ---------------------------------------------------------------------------
-- Update church membership
-- ---------------------------------------------------------------------------
create or replace function public.submit_church_membership(
  p_full_name text, p_email text, p_phone text,
  p_gender text default '', p_date_of_birth date default null,
  p_address text default '', p_city text default '', p_state text default '',
  p_country text default 'Nigeria', p_role_id uuid default null,
  p_ministry text default '', p_baptism_status text default '', p_marital_status text default '',
  p_occupation text default '', p_emergency_contact_name text default '',
  p_emergency_contact_phone text default '', p_notes text default '',
  p_form_data jsonb default '{}'::jsonb, p_by_admin boolean default false,
  p_admin_token text default null, p_branch_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_admin public.admins; v_id uuid; v_role_name text; v_branch_name text;
begin
  if p_by_admin then
    v_admin := public._require_permission(p_admin_token, 'church_members', 'edit');
  end if;
  if p_branch_id is null then raise exception 'Please select your church branch'; end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 then raise exception 'Full name is required'; end if;
  if length(trim(coalesce(p_email, ''))) < 5 then raise exception 'Valid email is required'; end if;
  if length(trim(coalesce(p_phone, ''))) < 7 then raise exception 'Valid phone is required'; end if;
  if p_role_id is null then raise exception 'Church role is required'; end if;

  select name into v_role_name from public.church_roles where id = p_role_id and is_active = true;
  if v_role_name is null then raise exception 'Invalid church role'; end if;
  select name into v_branch_name from public.church_branches where id = p_branch_id and is_active = true;

  insert into public.church_members (
    full_name, email, phone, gender, date_of_birth, address, city, state, country,
    role_id, ministry, baptism_status, marital_status, occupation,
    emergency_contact_name, emergency_contact_phone, notes, form_data, branch_id,
    registered_by_admin, admin_id, status
  ) values (
    trim(p_full_name), lower(trim(p_email)), trim(p_phone), trim(coalesce(p_gender, '')),
    p_date_of_birth, trim(coalesce(p_address, '')), trim(coalesce(p_city, '')),
    trim(coalesce(p_state, '')), coalesce(nullif(trim(p_country), ''), 'Nigeria'),
    p_role_id, trim(coalesce(p_ministry, '')), trim(coalesce(p_baptism_status, '')),
    trim(coalesce(p_marital_status, '')), trim(coalesce(p_occupation, '')),
    trim(coalesce(p_emergency_contact_name, '')), trim(coalesce(p_emergency_contact_phone, '')),
    trim(coalesce(p_notes, '')), coalesce(p_form_data, '{}'::jsonb), p_branch_id,
    coalesce(p_by_admin, false), case when p_by_admin then v_admin.id else null end,
    case when p_by_admin then 'approved' else 'pending' end
  ) returning id into v_id;

  return jsonb_build_object(
    'id', v_id, 'fullName', trim(p_full_name), 'email', lower(trim(p_email)),
    'roleName', v_role_name, 'branchName', coalesce(v_branch_name, '')
  );
end; $$;

-- ---------------------------------------------------------------------------
-- Update admin list queries (include branch)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_program_registrations(p_token text, p_program_id uuid default null, p_branch_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'program_registrations', 'view');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'program_id', r.program_id, 'program_title', p.title, 'program_slug', p.slug,
      'full_name', r.full_name, 'email', r.email, 'phone', r.phone,
      'branch_id', r.branch_id, 'branch_name', b.name, 'branch_region', b.region,
      'form_data', r.form_data, 'status', r.status,
      'registered_by_admin', r.registered_by_admin,
      'email_sent', r.email_sent, 'created_at', r.created_at
    ) order by r.created_at desc)
    from public.program_registrations r
    join public.church_programs p on p.id = r.program_id
    left join public.church_branches b on b.id = r.branch_id
    where (p_program_id is null or r.program_id = p_program_id)
      and (p_branch_id is null or r.branch_id = p_branch_id)
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
    branch_id = coalesce(nullif(p_data->>'branch_id', '')::uuid, branch_id),
    form_data = coalesce(p_data->'form_data', form_data),
    status = coalesce(nullif(p_data->>'status', ''), status),
    updated_at = now()
  where id = p_id returning * into v_row;
  if not found then raise exception 'Registration not found'; end if;
  return to_jsonb(v_row);
end; $$;

create or replace function public.admin_list_church_members(p_token text, p_role_id uuid default null, p_branch_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'church_members', 'view');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'full_name', m.full_name, 'email', m.email, 'phone', m.phone,
      'gender', m.gender, 'date_of_birth', m.date_of_birth,
      'address', m.address, 'city', m.city, 'state', m.state, 'country', m.country,
      'role_id', m.role_id, 'role_name', r.name,
      'branch_id', m.branch_id, 'branch_name', b.name, 'branch_region', b.region,
      'ministry', m.ministry, 'baptism_status', m.baptism_status,
      'marital_status', m.marital_status, 'occupation', m.occupation,
      'emergency_contact_name', m.emergency_contact_name,
      'emergency_contact_phone', m.emergency_contact_phone,
      'notes', m.notes, 'form_data', m.form_data,
      'status', m.status, 'registered_by_admin', m.registered_by_admin,
      'email_sent', m.email_sent, 'created_at', m.created_at
    ) order by m.created_at desc)
    from public.church_members m
    left join public.church_roles r on r.id = m.role_id
    left join public.church_branches b on b.id = m.branch_id
    where (p_role_id is null or m.role_id = p_role_id)
      and (p_branch_id is null or m.branch_id = p_branch_id)
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
    branch_id = coalesce(nullif(p_data->>'branch_id', '')::uuid, branch_id),
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

create or replace function public.admin_list_programs(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'programs', 'view');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'type_id', p.type_id, 'type_name', pt.name,
      'branch_id', p.branch_id, 'branch_name', b.name,
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
    left join public.church_branches b on b.id = p.branch_id
  ), '[]'::jsonb);
end; $$;

grant execute on function public.public_list_church_branches() to anon, authenticated;
grant execute on function public.admin_list_church_branches(text) to anon, authenticated;
grant execute on function public.admin_upsert_church_branch(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_church_branch(text, uuid) to anon, authenticated;
grant execute on function public.submit_contact(text, text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.submit_prayer(text, text, text, text, text, boolean, uuid) to anon, authenticated;
grant execute on function public.submit_testimony(text, text, text, text, text, text, text, boolean, uuid) to anon, authenticated;
grant execute on function public.submit_program_registration(text, text, text, text, jsonb, boolean, text, uuid) to anon, authenticated;
grant execute on function public.submit_church_membership(text, text, text, text, date, text, text, text, text, uuid, text, text, text, text, text, text, text, jsonb, boolean, text, uuid) to anon, authenticated;
grant execute on function public.admin_list_program_registrations(text, uuid, uuid) to anon, authenticated;
grant execute on function public.admin_list_church_members(text, uuid, uuid) to anon, authenticated;
