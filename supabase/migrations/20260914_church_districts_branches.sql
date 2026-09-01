-- Church districts + branch types + Fire-Fire branch network seed
-- Run after 20260830_church_branches.sql

-- ---------------------------------------------------------------------------
-- Districts
-- ---------------------------------------------------------------------------
create table if not exists public.church_districts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Branch extensions
-- ---------------------------------------------------------------------------
alter table public.church_branches
  add column if not exists branch_type text not null default 'assembly'
    check (branch_type in ('headquarters', 'assembly', 'campus'));

alter table public.church_branches
  add column if not exists district_id uuid references public.church_districts(id) on delete set null;

create index if not exists church_branches_district_idx on public.church_branches (district_id, sort_order);
create index if not exists church_branches_type_idx on public.church_branches (branch_type, sort_order);

-- ---------------------------------------------------------------------------
-- Seed districts (fixed UUIDs)
-- ---------------------------------------------------------------------------
insert into public.church_districts (id, name, slug, description, sort_order) values
  ('d1000001-0000-4000-8000-000000000001', 'Ayegun District', 'ayegun-district', 'Assemblies and fellowships under the Ayegun district oversight.', 1),
  ('d1000001-0000-4000-8000-000000000002', 'Oke Ogbere District', 'oke-ogbere-district', 'Branches united under the Oke Ogbere district.', 2),
  ('d1000001-0000-4000-8000-000000000003', 'Fatusi District', 'fatusi-district', 'Fellowships gathered under the Fatusi district.', 3),
  ('d1000001-0000-4000-8000-000000000004', 'Academy District', 'academy-district', 'Academy area assemblies and outreach points.', 4)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- Deactivate legacy placeholder branches
update public.church_branches
set is_active = false, updated_at = now()
where slug in ('ibadan-hq', 'lagos', 'abuja', 'port-harcourt', 'uk', 'usa');

-- ---------------------------------------------------------------------------
-- Seed branches (fixed UUIDs)
-- ---------------------------------------------------------------------------
insert into public.church_branches (
  id, name, slug, city, state, country, region, is_international,
  branch_type, district_id, description, sort_order, is_active
) values
  ('b1000001-0000-4000-8000-000000000001', 'Headquarter', 'headquarter', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'headquarters', null, 'Fire-Fire International Evangelical Church headquarters — Fire-Fire Area, Papa Agric, Olomi.', 1, true),
  ('b1000001-0000-4000-8000-000000000002', 'Academy', 'academy', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', 'd1000001-0000-4000-8000-000000000004', 'Academy assembly — Academy District.', 2, true),
  ('b1000001-0000-4000-8000-000000000003', 'Ayegun', 'ayegun', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', 'd1000001-0000-4000-8000-000000000001', 'Ayegun assembly — Ayegun District.', 3, true),
  ('b1000001-0000-4000-8000-000000000004', 'Fadare Ago', 'fadare-ago', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', null, 'Fadare Ago assembly.', 4, true),
  ('b1000001-0000-4000-8000-000000000005', 'Oke Ogbere', 'oke-ogbere', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', 'd1000001-0000-4000-8000-000000000002', 'Oke Ogbere assembly — Oke Ogbere District.', 5, true),
  ('b1000001-0000-4000-8000-000000000006', 'Fatusi', 'fatusi', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', 'd1000001-0000-4000-8000-000000000003', 'Fatusi assembly — Fatusi District.', 6, true),
  ('b1000001-0000-4000-8000-000000000007', 'Muslim', 'muslim', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', null, 'Muslim area assembly.', 7, true),
  ('b1000001-0000-4000-8000-000000000008', 'Olubadan', 'olubadan', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', null, 'Olubadan assembly.', 8, true),
  ('b1000001-0000-4000-8000-000000000009', 'Adegbiji (Obada)', 'adegbiji-obada', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', null, 'Adegbiji (Obada) assembly.', 9, true),
  ('b1000001-0000-4000-8000-000000000010', 'Olomi Yeye', 'olomi-yeye', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', null, 'Olomi Yeye assembly.', 10, true),
  ('b1000001-0000-4000-8000-000000000011', 'Arowojeka', 'arowojeka', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', null, 'Arowojeka assembly.', 11, true),
  ('b1000001-0000-4000-8000-000000000012', 'Alapa', 'alapa', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', null, 'Alapa assembly.', 12, true),
  ('b1000001-0000-4000-8000-000000000013', 'Ibuola', 'ibuola', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', null, 'Ibuola assembly.', 13, true),
  ('b1000001-0000-4000-8000-000000000014', 'Amuloko', 'amuloko', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', null, 'Amuloko assembly.', 14, true),
  ('b1000001-0000-4000-8000-000000000015', 'Olode', 'olode', 'Ibadan', 'Oyo', 'Nigeria', 'local', false,
    'assembly', null, 'Olode assembly.', 15, true),
  ('b1000001-0000-4000-8000-000000000016', 'FFCF OOU Ago Iwoye Campus', 'ffcf-oou-ago-iwoye', 'Ago Iwoye', 'Ogun', 'Nigeria', 'local', false,
    'campus', null, 'Fire-Fire Christian Fellowship — Olabisi Onabanjo University, Ago Iwoye.', 16, true),
  ('b1000001-0000-4000-8000-000000000017', 'FFCF AAUA Akungba Campus', 'ffcf-aaua-akungba', 'Akungba', 'Ondo', 'Nigeria', 'local', false,
    'campus', null, 'Fire-Fire Christian Fellowship — Adekunle Ajasin University, Akungba.', 17, true)
on conflict (slug) do update set
  name = excluded.name,
  city = excluded.city,
  state = excluded.state,
  country = excluded.country,
  region = excluded.region,
  is_international = excluded.is_international,
  branch_type = excluded.branch_type,
  district_id = excluded.district_id,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- Keep international online option active
insert into public.church_branches (name, slug, city, state, country, region, is_international, branch_type, description, sort_order, is_active)
values ('International Members (Online)', 'international-online', '', '', 'International', 'international', true, 'assembly',
  'Diaspora & online fellowship members', 99, true)
on conflict (slug) do update set is_active = true, updated_at = now();

-- ---------------------------------------------------------------------------
-- Seed Youth Convention as featured upcoming event
-- ---------------------------------------------------------------------------
insert into public.events (id, title, date, time, location, description, image, featured, sort_order)
values (
  'e1000001-0000-4000-8000-000000000001',
  'Fire-Fire Youth Convention 2026 — The Refiner',
  '2026-09-09',
  'Day & Night · Wed 9 – Sat 12 Sep',
  'Fire-Fire HQ, Ibadan',
  'Join young people from every branch and campus for FFYC''26 — worship, teaching, and renewal. Register now for the annual youth convention.',
  '/ffyc-2026-flyer.png',
  true,
  0
)
on conflict (id) do update set
  title = excluded.title,
  date = excluded.date,
  time = excluded.time,
  location = excluded.location,
  description = excluded.description,
  image = excluded.image,
  featured = excluded.featured,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Public list branches (with district + type)
-- ---------------------------------------------------------------------------
create or replace function public.public_list_church_branches()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'name', b.name, 'slug', b.slug,
    'city', b.city, 'state', b.state, 'country', b.country,
    'region', b.region, 'isInternational', b.is_international,
    'branchType', b.branch_type,
    'districtId', b.district_id,
    'districtName', d.name,
    'description', b.description,
    'sortOrder', b.sort_order,
    'label', case
      when b.city <> '' then b.name || ' — ' || b.city || case when b.country <> 'Nigeria' then ', ' || b.country else '' end
      else b.name || case when b.country <> '' and b.country <> 'Nigeria' then ' (' || b.country || ')' else '' end
    end
  ) order by b.branch_type, b.sort_order, b.name), '[]'::jsonb)
  from public.church_branches b
  left join public.church_districts d on d.id = b.district_id and d.is_active = true
  where b.is_active = true;
$$;

create or replace function public.public_list_church_districts()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'slug', slug,
    'description', description, 'sortOrder', sort_order
  ) order by sort_order, name), '[]'::jsonb)
  from public.church_districts
  where is_active = true;
$$;

-- ---------------------------------------------------------------------------
-- Admin district CRUD
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_church_districts(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'church_branches', 'view');
  return coalesce((
    select jsonb_agg(to_jsonb(d) order by d.sort_order, d.name)
    from public.church_districts d
  ), '[]'::jsonb);
end; $$;

create or replace function public.admin_upsert_church_district(p_token text, p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.church_districts%rowtype; v_slug text;
begin
  perform public._require_permission(p_token, 'church_branches', 'edit');
  v_slug := lower(regexp_replace(trim(coalesce(p_data->>'slug', p_data->>'name', '')), '[^a-z0-9]+', '-', 'gi'));
  v_slug := trim(both '-' from v_slug);
  if p_id is null then
    insert into public.church_districts (name, slug, description, sort_order, is_active)
    values (
      trim(p_data->>'name'), v_slug,
      coalesce(p_data->>'description', ''),
      coalesce((p_data->>'sort_order')::int, 0),
      coalesce((p_data->>'is_active')::boolean, true)
    ) returning * into v_row;
  else
    update public.church_districts set
      name = coalesce(nullif(trim(p_data->>'name'), ''), name),
      slug = case when p_data ? 'slug' or p_data ? 'name' then v_slug else slug end,
      description = coalesce(p_data->>'description', description),
      sort_order = coalesce((p_data->>'sort_order')::int, sort_order),
      is_active = coalesce((p_data->>'is_active')::boolean, is_active),
      updated_at = now()
    where id = p_id returning * into v_row;
  end if;
  return to_jsonb(v_row);
end; $$;

create or replace function public.admin_delete_church_district(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'church_branches', 'delete');
  update public.church_branches set district_id = null where district_id = p_id;
  delete from public.church_districts where id = p_id;
  return jsonb_build_object('ok', true);
end; $$;

-- ---------------------------------------------------------------------------
-- Admin branch list + upsert (district + type)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_church_branches(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'church_branches', 'view');
  return coalesce((
    select jsonb_agg(
      to_jsonb(b) || jsonb_build_object('district_name', d.name)
      order by b.branch_type, b.sort_order, b.name
    )
    from public.church_branches b
    left join public.church_districts d on d.id = b.district_id
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
      name, slug, city, state, country, region, is_international, description, sort_order, is_active,
      branch_type, district_id
    ) values (
      trim(p_data->>'name'), v_slug,
      coalesce(p_data->>'city', ''), coalesce(p_data->>'state', ''),
      coalesce(nullif(p_data->>'country', ''), 'Nigeria'),
      coalesce(nullif(p_data->>'region', ''), 'local'),
      coalesce((p_data->>'is_international')::boolean, p_data->>'region' = 'international'),
      coalesce(p_data->>'description', ''),
      coalesce((p_data->>'sort_order')::int, 0),
      coalesce((p_data->>'is_active')::boolean, true),
      coalesce(nullif(p_data->>'branch_type', ''), 'assembly'),
      nullif(p_data->>'district_id', '')::uuid
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
      branch_type = coalesce(nullif(p_data->>'branch_type', ''), branch_type),
      district_id = case
        when p_data ? 'district_id' then nullif(p_data->>'district_id', '')::uuid
        else district_id
      end,
      updated_at = now()
    where id = p_id returning * into v_row;
  end if;
  return to_jsonb(v_row);
end; $$;

-- Patch approvals apply for new branch fields
create or replace function public._apply_change_request(p_req public.admin_change_requests)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d jsonb := coalesce(p_req.payload, '{}'::jsonb);
  v_ids uuid[];
  v_person record;
begin
  if p_req.action = 'delete' then
    if p_req.resource_type = 'church_members' then
      delete from public.church_members where id = p_req.resource_id;
    elsif p_req.resource_type = 'program_registrations' then
      delete from public.program_registrations where id = p_req.resource_id;
    elsif p_req.resource_type = 'volunteer_applications' then
      delete from public.volunteer_applications where id = p_req.resource_id;
    elsif p_req.resource_type = 'church_branches' then
      delete from public.church_branches where id = p_req.resource_id;
    elsif p_req.resource_type = 'church_roles' then
      delete from public.church_roles where id = p_req.resource_id;
    elsif p_req.resource_type = 'church_programs' then
      delete from public.church_programs where id = p_req.resource_id;
    elsif p_req.resource_type = 'announcements' then
      delete from public.announcements where id = p_req.resource_id;
    elsif p_req.resource_type = 'contact_messages' then
      delete from public.contact_messages where id = p_req.resource_id;
    else
      raise exception 'Unsupported delete type: %', p_req.resource_type;
    end if;
    return;
  end if;

  if p_req.action = 'update' and p_req.resource_type = 'church_members' then
    select * into v_person from public._compose_person_name(
      coalesce(d->>'name_title', ''), coalesce(d->>'first_name', ''),
      coalesce(d->>'last_name', ''), coalesce(d->>'full_name', '')
    );
    update public.church_members set
      name_title = v_person.name_title, first_name = v_person.first_name,
      last_name = v_person.last_name, full_name = v_person.full_name,
      email = coalesce(nullif(lower(trim(d->>'email')), ''), email),
      phone = coalesce(d->>'phone', phone),
      gender = coalesce(d->>'gender', gender),
      date_of_birth = case when d ? 'date_of_birth' then nullif(d->>'date_of_birth', '')::date else date_of_birth end,
      address = coalesce(d->>'address', address),
      city = coalesce(d->>'city', city),
      state = coalesce(d->>'state', state),
      country = coalesce(d->>'country', country),
      branch_id = coalesce(nullif(d->>'branch_id', '')::uuid, branch_id),
      ministry = coalesce(d->>'ministry', ministry),
      baptism_status = coalesce(d->>'baptism_status', baptism_status),
      marital_status = coalesce(d->>'marital_status', marital_status),
      occupation = coalesce(d->>'occupation', occupation),
      emergency_contact_name = coalesce(d->>'emergency_contact_name', emergency_contact_name),
      emergency_contact_phone = coalesce(d->>'emergency_contact_phone', emergency_contact_phone),
      notes = coalesce(d->>'notes', notes),
      form_data = coalesce(d->'form_data', form_data),
      status = coalesce(nullif(d->>'status', ''), status),
      updated_at = now()
    where id = p_req.resource_id;
    v_ids := public._parse_role_ids(d, null);
    if cardinality(v_ids) > 0 then
      perform public._set_member_roles(p_req.resource_id, v_ids);
    end if;
    return;
  end if;

  if p_req.action = 'update' and p_req.resource_type = 'program_registrations' then
    select * into v_person from public._compose_person_name(
      coalesce(d->>'name_title', ''), coalesce(d->>'first_name', ''),
      coalesce(d->>'last_name', ''), coalesce(d->>'full_name', '')
    );
    update public.program_registrations set
      name_title = v_person.name_title, first_name = v_person.first_name,
      last_name = v_person.last_name, full_name = v_person.full_name,
      email = coalesce(d->>'email', email),
      phone = coalesce(d->>'phone', phone),
      branch_id = coalesce(nullif(d->>'branch_id', '')::uuid, branch_id),
      status = coalesce(nullif(d->>'status', ''), status),
      form_data = coalesce(d->'form_data', form_data),
      updated_at = now()
    where id = p_req.resource_id;
    return;
  end if;

  if p_req.action = 'update' and p_req.resource_type = 'volunteer_applications' then
    select * into v_person from public._compose_person_name(
      coalesce(d->>'name_title', ''), coalesce(d->>'first_name', ''),
      coalesce(d->>'last_name', ''), coalesce(d->>'full_name', '')
    );
    update public.volunteer_applications set
      name_title = v_person.name_title, first_name = v_person.first_name,
      last_name = v_person.last_name, full_name = v_person.full_name,
      email = coalesce(d->>'email', email),
      phone = coalesce(d->>'phone', phone),
      role_interest = coalesce(d->>'role_interest', role_interest),
      status = coalesce(nullif(d->>'status', ''), status),
      review_notes = coalesce(d->>'review_notes', review_notes),
      updated_at = now()
    where id = p_req.resource_id;
    return;
  end if;

  if p_req.action = 'update' and p_req.resource_type = 'church_branches' then
    update public.church_branches set
      name = coalesce(nullif(trim(d->>'name'), ''), name),
      city = coalesce(d->>'city', city),
      state = coalesce(d->>'state', state),
      country = coalesce(d->>'country', country),
      region = coalesce(d->>'region', region),
      is_international = coalesce((d->>'is_international')::boolean, is_international),
      description = coalesce(d->>'description', description),
      branch_type = coalesce(nullif(d->>'branch_type', ''), branch_type),
      district_id = case when d ? 'district_id' then nullif(d->>'district_id', '')::uuid else district_id end,
      updated_at = now()
    where id = p_req.resource_id;
    return;
  end if;

  if p_req.action = 'update' and p_req.resource_type = 'church_roles' then
    update public.church_roles set
      name = coalesce(nullif(trim(d->>'name'), ''), name),
      description = coalesce(d->>'description', description)
    where id = p_req.resource_id;
    return;
  end if;

  raise exception 'Unsupported change: % %', p_req.action, p_req.resource_type;
end;
$$;

grant execute on function public.public_list_church_districts() to anon, authenticated;
grant execute on function public.admin_list_church_districts(text) to anon, authenticated;
grant execute on function public.admin_upsert_church_district(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_church_district(text, uuid) to anon, authenticated;
