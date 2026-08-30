-- Event short codes (FFIEYC), per-program registration nav counts,
-- person title + first/last name on forms, strip Home Church.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.church_programs
  add column if not exists short_code text not null default '';

alter table public.program_registrations
  add column if not exists name_title text not null default '',
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists admin_seen boolean not null default false;

alter table public.church_members
  add column if not exists name_title text not null default '',
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '';

alter table public.volunteer_applications
  add column if not exists name_title text not null default '',
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists admin_seen boolean not null default false;

update public.church_programs
set short_code = 'FFIEYC'
where slug = 'youth-convention-2026' and coalesce(short_code, '') = '';

-- Remove Home Church / full_name from extra form_fields (core fields are collected separately)
update public.church_programs
set form_fields = coalesce((
  select jsonb_agg(elem)
  from jsonb_array_elements(coalesce(form_fields, '[]'::jsonb)) elem
  where lower(coalesce(elem->>'name', '')) not in (
    'church', 'home_church', 'full_name', 'fullname', 'first_name', 'last_name', 'name_title', 'title'
  )
), '[]'::jsonb);

update public.program_registrations
set
  first_name = case
    when coalesce(first_name, '') <> '' then first_name
    else split_part(trim(full_name), ' ', 1)
  end,
  last_name = case
    when coalesce(last_name, '') <> '' then last_name
    when position(' ' in trim(full_name)) > 0
      then trim(substr(trim(full_name), position(' ' in trim(full_name)) + 1))
    else ''
  end
where coalesce(first_name, '') = '' and coalesce(full_name, '') <> '';

update public.church_members
set
  first_name = case
    when coalesce(first_name, '') <> '' then first_name
    else split_part(trim(full_name), ' ', 1)
  end,
  last_name = case
    when coalesce(last_name, '') <> '' then last_name
    when position(' ' in trim(full_name)) > 0
      then trim(substr(trim(full_name), position(' ' in trim(full_name)) + 1))
    else ''
  end
where coalesce(first_name, '') = '' and coalesce(full_name, '') <> '';

update public.volunteer_applications
set
  first_name = case
    when coalesce(first_name, '') <> '' then first_name
    else split_part(trim(full_name), ' ', 1)
  end,
  last_name = case
    when coalesce(last_name, '') <> '' then last_name
    when position(' ' in trim(full_name)) > 0
      then trim(substr(trim(full_name), position(' ' in trim(full_name)) + 1))
    else ''
  end
where coalesce(first_name, '') = '' and coalesce(full_name, '') <> '';

create or replace function public._compose_person_name(
  p_title text,
  p_first text,
  p_last text,
  p_full text default ''
)
returns table (name_title text, first_name text, last_name text, full_name text)
language plpgsql
immutable
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_first text := trim(coalesce(p_first, ''));
  v_last text := trim(coalesce(p_last, ''));
  v_full text := trim(coalesce(p_full, ''));
  v_rest text;
begin
  if v_first = '' and v_full <> '' then
    v_first := split_part(v_full, ' ', 1);
    if position(' ' in v_full) > 0 then
      v_rest := trim(substr(v_full, position(' ' in v_full) + 1));
      v_last := coalesce(nullif(v_last, ''), v_rest);
    end if;
  end if;
  if length(v_first) < 1 then
    raise exception 'First name is required';
  end if;
  return query select
    v_title,
    v_first,
    v_last,
    trim(concat_ws(' ', nullif(v_title, ''), v_first, v_last));
end;
$$;

-- ---------------------------------------------------------------------------
-- Program upsert / list (short_code)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_programs(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not (public._has_perm(v_admin, 'programs', 'view') or public._has_perm(v_admin, 'program_registrations', 'view')) then
    raise exception 'You do not have permission to view programs';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'type_id', p.type_id, 'type_name', pt.name,
      'branch_id', p.branch_id, 'branch_name', b.name,
      'title', p.title, 'short_code', p.short_code, 'slug', p.slug, 'description', p.description,
      'venue', p.venue, 'starts_at', p.starts_at, 'ends_at', p.ends_at,
      'registration_opens_at', p.registration_opens_at,
      'registration_closes_at', p.registration_closes_at,
      'admin_email', p.admin_email, 'form_fields', p.form_fields,
      'page_content', p.page_content,
      'is_active', p.is_active, 'allow_public_registration', p.allow_public_registration,
      'registration_count', (select count(*) from public.program_registrations r where r.program_id = p.id),
      'unseen_count', (select count(*) from public.program_registrations r where r.program_id = p.id and r.admin_seen = false),
      'created_at', p.created_at
    ) order by p.sort_order, p.starts_at desc nulls last)
    from public.church_programs p
    left join public.program_types pt on pt.id = p.type_id
    left join public.church_branches b on b.id = p.branch_id
  ), '[]'::jsonb);
end; $$;

create or replace function public.admin_upsert_program(p_token text, p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
  v_row public.church_programs%rowtype;
  v_slug text;
  v_page jsonb;
begin
  v_admin := public._require_permission(p_token, 'programs', 'edit');
  v_slug := lower(regexp_replace(trim(coalesce(p_data->>'slug', p_data->>'title', '')), '[^a-z0-9]+', '-', 'gi'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then raise exception 'Slug is required'; end if;

  v_page := coalesce(p_data->'page_content', p_data->'pageContent', '{}'::jsonb);
  if jsonb_typeof(v_page) <> 'object' then
    v_page := '{}'::jsonb;
  end if;

  if p_id is null then
    insert into public.church_programs (
      type_id, title, short_code, slug, description, venue, starts_at, ends_at,
      registration_opens_at, registration_closes_at, admin_email,
      form_fields, page_content, is_active, allow_public_registration, sort_order, created_by
    ) values (
      nullif(p_data->>'type_id', '')::uuid,
      trim(p_data->>'title'),
      upper(trim(coalesce(p_data->>'short_code', ''))),
      v_slug,
      coalesce(p_data->>'description', ''), coalesce(p_data->>'venue', ''),
      nullif(p_data->>'starts_at', '')::timestamptz,
      nullif(p_data->>'ends_at', '')::timestamptz,
      nullif(p_data->>'registration_opens_at', '')::timestamptz,
      nullif(p_data->>'registration_closes_at', '')::timestamptz,
      coalesce(p_data->>'admin_email', ''),
      coalesce(p_data->'form_fields', '[]'::jsonb),
      v_page,
      coalesce((p_data->>'is_active')::boolean, true),
      coalesce((p_data->>'allow_public_registration')::boolean, true),
      coalesce((p_data->>'sort_order')::int, 0),
      v_admin.id
    ) returning * into v_row;
  else
    update public.church_programs set
      type_id = coalesce(nullif(p_data->>'type_id', '')::uuid, type_id),
      title = coalesce(nullif(trim(p_data->>'title'), ''), title),
      short_code = case when p_data ? 'short_code' then upper(trim(coalesce(p_data->>'short_code', ''))) else short_code end,
      slug = case when p_data ? 'slug' then v_slug else slug end,
      description = coalesce(p_data->>'description', description),
      venue = coalesce(p_data->>'venue', venue),
      starts_at = case when p_data ? 'starts_at' then nullif(p_data->>'starts_at', '')::timestamptz else starts_at end,
      ends_at = case when p_data ? 'ends_at' then nullif(p_data->>'ends_at', '')::timestamptz else ends_at end,
      registration_opens_at = case when p_data ? 'registration_opens_at' then nullif(p_data->>'registration_opens_at', '')::timestamptz else registration_opens_at end,
      registration_closes_at = case when p_data ? 'registration_closes_at' then nullif(p_data->>'registration_closes_at', '')::timestamptz else registration_closes_at end,
      admin_email = coalesce(p_data->>'admin_email', admin_email),
      form_fields = coalesce(p_data->'form_fields', form_fields),
      page_content = case when p_data ? 'page_content' or p_data ? 'pageContent' then v_page else page_content end,
      is_active = coalesce((p_data->>'is_active')::boolean, is_active),
      allow_public_registration = coalesce((p_data->>'allow_public_registration')::boolean, allow_public_registration),
      sort_order = coalesce((p_data->>'sort_order')::int, sort_order),
      updated_at = now()
    where id = p_id returning * into v_row;
  end if;
  return to_jsonb(v_row);
end; $$;

-- ---------------------------------------------------------------------------
-- Registrations
-- ---------------------------------------------------------------------------
drop function if exists public.submit_program_registration(text, text, text, text, jsonb, boolean, text, uuid);

create or replace function public.submit_program_registration(
  p_program_slug text, p_full_name text, p_email text, p_phone text,
  p_form_data jsonb default '{}'::jsonb, p_by_admin boolean default false,
  p_admin_token text default null, p_branch_id uuid default null,
  p_name_title text default '', p_first_name text default '', p_last_name text default ''
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_program public.church_programs%rowtype;
  v_admin public.admins;
  v_id uuid;
  v_branch_name text;
  v_person record;
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
  if length(trim(coalesce(p_email, ''))) < 5 then raise exception 'Valid email is required'; end if;

  select * into v_person from public._compose_person_name(p_name_title, p_first_name, p_last_name, p_full_name);
  select name into v_branch_name from public.church_branches where id = p_branch_id and is_active = true;

  insert into public.program_registrations (
    program_id, name_title, first_name, last_name, full_name, email, phone, form_data, branch_id,
    registered_by_admin, admin_id, status, admin_seen
  ) values (
    v_program.id, v_person.name_title, v_person.first_name, v_person.last_name, v_person.full_name,
    lower(trim(p_email)), trim(coalesce(p_phone, '')),
    coalesce(p_form_data, '{}'::jsonb), p_branch_id,
    coalesce(p_by_admin, false), case when p_by_admin then v_admin.id else null end, 'registered',
    coalesce(p_by_admin, false)
  ) returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'programTitle', v_program.title,
    'shortCode', coalesce(nullif(v_program.short_code, ''), v_program.title),
    'adminEmail', v_program.admin_email,
    'venue', coalesce(v_program.venue, ''),
    'startsAt', v_program.starts_at,
    'endsAt', v_program.ends_at,
    'nameTitle', v_person.name_title,
    'firstName', v_person.first_name,
    'lastName', v_person.last_name,
    'fullName', v_person.full_name,
    'email', lower(trim(p_email)),
    'phone', trim(coalesce(p_phone, '')),
    'branchName', coalesce(v_branch_name, '')
  );
end; $$;

create or replace function public.admin_list_program_registrations(p_token text, p_program_id uuid default null, p_branch_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'program_registrations', 'view');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'program_id', r.program_id, 'program_title', p.title, 'program_slug', p.slug,
      'program_short_code', p.short_code,
      'name_title', r.name_title, 'first_name', r.first_name, 'last_name', r.last_name,
      'full_name', r.full_name, 'email', r.email, 'phone', r.phone,
      'branch_id', r.branch_id, 'branch_name', b.name, 'branch_region', b.region,
      'form_data', r.form_data, 'status', r.status,
      'registered_by_admin', r.registered_by_admin,
      'admin_seen', r.admin_seen,
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
declare
  v_row public.program_registrations%rowtype;
  v_person record;
begin
  perform public._require_permission(p_token, 'program_registrations', 'edit');
  select * into v_person from public._compose_person_name(
    coalesce(p_data->>'name_title', ''),
    coalesce(p_data->>'first_name', ''),
    coalesce(p_data->>'last_name', ''),
    coalesce(p_data->>'full_name', '')
  );
  update public.program_registrations set
    name_title = v_person.name_title,
    first_name = v_person.first_name,
    last_name = v_person.last_name,
    full_name = v_person.full_name,
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

create or replace function public.admin_mark_program_registrations_seen(p_token text, p_program_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'program_registrations', 'view');
  update public.program_registrations
  set admin_seen = true
  where program_id = p_program_id and admin_seen = false;
  return jsonb_build_object('ok', true);
end; $$;

-- ---------------------------------------------------------------------------
-- Membership
-- ---------------------------------------------------------------------------
drop function if exists public.submit_church_membership(text, text, text, text, date, text, text, text, text, uuid, text, text, text, text, text, text, text, jsonb, boolean, text, uuid, uuid[]);

create or replace function public.submit_church_membership(
  p_full_name text, p_email text, p_phone text,
  p_gender text default '', p_date_of_birth date default null,
  p_address text default '', p_city text default '', p_state text default '',
  p_country text default 'Nigeria', p_role_id uuid default null,
  p_ministry text default '', p_baptism_status text default '', p_marital_status text default '',
  p_occupation text default '', p_emergency_contact_name text default '',
  p_emergency_contact_phone text default '', p_notes text default '',
  p_form_data jsonb default '{}'::jsonb, p_by_admin boolean default false,
  p_admin_token text default null, p_branch_id uuid default null,
  p_role_ids uuid[] default null,
  p_name_title text default '', p_first_name text default '', p_last_name text default ''
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
  v_id uuid;
  v_role_name text;
  v_branch_name text;
  v_ids uuid[] := coalesce(p_role_ids, '{}');
  v_person record;
begin
  if p_by_admin then
    v_admin := public._require_permission(p_admin_token, 'church_members', 'edit');
  end if;
  if p_branch_id is null then raise exception 'Please select your church branch'; end if;
  if length(trim(coalesce(p_email, ''))) < 5 then raise exception 'Valid email is required'; end if;
  if length(trim(coalesce(p_phone, ''))) < 7 then raise exception 'Valid phone is required'; end if;
  if cardinality(v_ids) = 0 and p_role_id is not null then
    v_ids := array[p_role_id];
  end if;
  if cardinality(v_ids) = 0 then raise exception 'Select at least one church role'; end if;

  select * into v_person from public._compose_person_name(p_name_title, p_first_name, p_last_name, p_full_name);
  select name into v_branch_name from public.church_branches where id = p_branch_id and is_active = true;

  insert into public.church_members (
    name_title, first_name, last_name, full_name, email, phone, gender, date_of_birth, address, city, state, country,
    role_id, ministry, baptism_status, marital_status, occupation,
    emergency_contact_name, emergency_contact_phone, notes, form_data, branch_id,
    registered_by_admin, admin_id, status
  ) values (
    v_person.name_title, v_person.first_name, v_person.last_name, v_person.full_name,
    lower(trim(p_email)), trim(p_phone), trim(coalesce(p_gender, '')),
    p_date_of_birth, trim(coalesce(p_address, '')), trim(coalesce(p_city, '')),
    trim(coalesce(p_state, '')), coalesce(nullif(trim(p_country), ''), 'Nigeria'),
    v_ids[1], trim(coalesce(p_ministry, '')), trim(coalesce(p_baptism_status, '')),
    trim(coalesce(p_marital_status, '')), trim(coalesce(p_occupation, '')),
    trim(coalesce(p_emergency_contact_name, '')), trim(coalesce(p_emergency_contact_phone, '')),
    trim(coalesce(p_notes, '')), coalesce(p_form_data, '{}'::jsonb), p_branch_id,
    coalesce(p_by_admin, false), case when p_by_admin then v_admin.id else null end,
    case when p_by_admin then 'approved' else 'pending' end
  ) returning id into v_id;

  v_role_name := public._set_member_roles(v_id, v_ids);

  return jsonb_build_object(
    'id', v_id, 'fullName', v_person.full_name, 'firstName', v_person.first_name,
    'email', lower(trim(p_email)),
    'roleName', v_role_name, 'branchName', coalesce(v_branch_name, '')
  );
end;
$$;

create or replace function public.admin_list_church_members(
  p_token text,
  p_role_id uuid default null,
  p_branch_id uuid default null,
  p_status_group text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'church_members', 'view');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id,
      'name_title', m.name_title, 'first_name', m.first_name, 'last_name', m.last_name,
      'full_name', m.full_name, 'email', m.email, 'phone', m.phone,
      'gender', m.gender, 'date_of_birth', m.date_of_birth,
      'address', m.address, 'city', m.city, 'state', m.state, 'country', m.country,
      'role_id', m.role_id, 'role_name', coalesce((
        select string_agg(cr.name, ', ' order by cr.name)
        from public.church_member_roles mr
        join public.church_roles cr on cr.id = mr.role_id
        where mr.member_id = m.id
      ), r.name),
      'role_ids', coalesce((
        select jsonb_agg(mr.role_id)
        from public.church_member_roles mr
        where mr.member_id = m.id
      ), case when m.role_id is not null then jsonb_build_array(m.role_id) else '[]'::jsonb end),
      'branch_id', m.branch_id, 'branch_name', b.name, 'branch_region', b.region,
      'ministry', m.ministry, 'baptism_status', m.baptism_status,
      'marital_status', m.marital_status, 'occupation', m.occupation,
      'emergency_contact_name', m.emergency_contact_name,
      'emergency_contact_phone', m.emergency_contact_phone,
      'notes', m.notes, 'form_data', m.form_data,
      'status', m.status, 'registered_by_admin', m.registered_by_admin,
      'email_sent', m.email_sent, 'created_at', m.created_at, 'updated_at', m.updated_at
    ) order by m.created_at desc)
    from public.church_members m
    left join public.church_roles r on r.id = m.role_id
    left join public.church_branches b on b.id = m.branch_id
    where (
      p_role_id is null
      or m.role_id = p_role_id
      or exists (
        select 1 from public.church_member_roles mr
        where mr.member_id = m.id and mr.role_id = p_role_id
      )
    )
      and (p_branch_id is null or m.branch_id = p_branch_id)
      and (
        p_status_group is null or p_status_group in ('', 'all')
        or (p_status_group = 'pending' and m.status = 'pending')
        or (p_status_group = 'approved' and m.status in ('approved', 'active'))
        or (p_status_group = 'inactive' and m.status = 'inactive')
      )
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_update_church_member(p_token text, p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row public.church_members%rowtype;
  v_ids uuid[];
  v_person record;
begin
  perform public._require_permission(p_token, 'church_members', 'edit');
  select * into v_person from public._compose_person_name(
    coalesce(p_data->>'name_title', ''),
    coalesce(p_data->>'first_name', ''),
    coalesce(p_data->>'last_name', ''),
    coalesce(p_data->>'full_name', '')
  );
  update public.church_members set
    name_title = v_person.name_title,
    first_name = v_person.first_name,
    last_name = v_person.last_name,
    full_name = v_person.full_name,
    email = coalesce(nullif(lower(trim(p_data->>'email')), ''), email),
    phone = coalesce(p_data->>'phone', phone),
    gender = coalesce(p_data->>'gender', gender),
    date_of_birth = case when p_data ? 'date_of_birth' then nullif(p_data->>'date_of_birth', '')::date else date_of_birth end,
    address = coalesce(p_data->>'address', address),
    city = coalesce(p_data->>'city', city),
    state = coalesce(p_data->>'state', state),
    country = coalesce(p_data->>'country', country),
    branch_id = coalesce(nullif(p_data->>'branch_id', '')::uuid, branch_id),
    ministry = coalesce(p_data->>'ministry', ministry),
    baptism_status = coalesce(p_data->>'baptism_status', baptism_status),
    marital_status = coalesce(p_data->>'marital_status', marital_status),
    occupation = coalesce(p_data->>'occupation', occupation),
    emergency_contact_name = coalesce(p_data->>'emergency_contact_name', emergency_contact_name),
    emergency_contact_phone = coalesce(p_data->>'emergency_contact_phone', emergency_contact_phone),
    notes = coalesce(p_data->>'notes', notes),
    form_data = coalesce(p_data->'form_data', form_data),
    status = coalesce(nullif(p_data->>'status', ''), status),
    updated_at = now()
  where id = p_id returning * into v_row;
  if not found then raise exception 'Member not found'; end if;
  v_ids := public._parse_role_ids(p_data, v_row.role_id);
  if cardinality(v_ids) > 0 then
    perform public._set_member_roles(p_id, v_ids);
    select * into v_row from public.church_members where id = p_id;
  end if;
  return to_jsonb(v_row);
end;
$$;

-- ---------------------------------------------------------------------------
-- Volunteers
-- ---------------------------------------------------------------------------
drop function if exists public.submit_volunteer_application(text, text, text, text, uuid, text, text, text, text, text);

create or replace function public.submit_volunteer_application(
  p_team_slug text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_branch_id uuid default null,
  p_role_interest text default '',
  p_skills text default '',
  p_experience_level text default '',
  p_availability text default '',
  p_notes text default '',
  p_name_title text default '',
  p_first_name text default '',
  p_last_name text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.volunteer_teams%rowtype;
  v_id uuid;
  v_branch text := '';
  v_person record;
begin
  select * into v_team from public.volunteer_teams
  where slug = lower(trim(p_team_slug)) and is_active = true;
  if not found then raise exception 'Volunteer team not found'; end if;
  if length(trim(coalesce(p_email, ''))) < 5 then raise exception 'Valid email is required'; end if;

  select * into v_person from public._compose_person_name(p_name_title, p_first_name, p_last_name, p_full_name);

  if p_branch_id is not null then
    select name into v_branch from public.church_branches where id = p_branch_id;
  end if;

  insert into public.volunteer_applications (
    team_id, name_title, first_name, last_name, full_name, email, phone, branch_id, role_interest, skills,
    experience_level, availability, notes, status, assigned_admin_id, admin_seen
  ) values (
    v_team.id,
    v_person.name_title, v_person.first_name, v_person.last_name, v_person.full_name,
    lower(trim(p_email)),
    trim(coalesce(p_phone, '')),
    p_branch_id,
    trim(coalesce(p_role_interest, '')),
    trim(coalesce(p_skills, '')),
    trim(coalesce(p_experience_level, '')),
    trim(coalesce(p_availability, '')),
    trim(coalesce(p_notes, '')),
    'pending',
    v_team.assigned_admin_id,
    false
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'teamName', v_team.name,
    'adminEmail', v_team.admin_email,
    'branchName', coalesce(v_branch, ''),
    'fullName', v_person.full_name,
    'firstName', v_person.first_name
  );
end;
$$;

create or replace function public.admin_update_volunteer_application(p_token text, p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_before public.volunteer_applications%rowtype;
  v_row public.volunteer_applications%rowtype;
  v_person record;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'volunteer_applications', 'edit') then
    raise exception 'You do not have permission to update volunteer applications';
  end if;
  select * into v_before from public.volunteer_applications where id = p_id;
  if not found then raise exception 'Application not found'; end if;

  select * into v_person from public._compose_person_name(
    coalesce(p_data->>'name_title', v_before.name_title),
    coalesce(p_data->>'first_name', v_before.first_name),
    coalesce(p_data->>'last_name', v_before.last_name),
    coalesce(p_data->>'full_name', v_before.full_name)
  );

  update public.volunteer_applications set
    name_title = v_person.name_title,
    first_name = v_person.first_name,
    last_name = v_person.last_name,
    full_name = v_person.full_name,
    email = coalesce(nullif(lower(trim(p_data->>'email')), ''), email),
    phone = coalesce(p_data->>'phone', phone),
    branch_id = case when p_data ? 'branch_id' then nullif(p_data->>'branch_id', '')::uuid else branch_id end,
    role_interest = coalesce(p_data->>'role_interest', role_interest),
    skills = coalesce(p_data->>'skills', skills),
    experience_level = coalesce(p_data->>'experience_level', experience_level),
    availability = coalesce(p_data->>'availability', availability),
    notes = coalesce(p_data->>'notes', notes),
    status = coalesce(nullif(p_data->>'status', ''), status),
    assigned_admin_id = case when p_data ? 'assigned_admin_id' then nullif(p_data->>'assigned_admin_id', '')::uuid else assigned_admin_id end,
    review_notes = coalesce(p_data->>'review_notes', review_notes),
    reviewed_at = case
      when p_data ? 'status' and nullif(p_data->>'status', '') is not null and p_data->>'status' <> 'pending'
      then now() else reviewed_at end,
    updated_at = now()
  where id = p_id
  returning * into v_row;

  insert into public.volunteer_application_audit (application_id, admin_id, action, changes)
  values (p_id, v_admin.id, 'update', jsonb_build_object('before', to_jsonb(v_before), 'after', to_jsonb(v_row)));

  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_mark_volunteer_applications_seen(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_permission(p_token, 'volunteer_applications', 'view');
  update public.volunteer_applications set admin_seen = true where admin_seen = false;
  return jsonb_build_object('ok', true);
end; $$;

-- ---------------------------------------------------------------------------
-- Inbox counts + approvals apply name fields
-- ---------------------------------------------------------------------------
create or replace function public.admin_inbox_counts(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_members_pending integer := 0;
  v_members_approved integer := 0;
  v_members_all integer := 0;
  v_approvals_pending integer := 0;
  v_my_pending integer := 0;
  v_vol_unseen integer := 0;
  v_prog_total integer := 0;
begin
  v_admin := public._require_admin(p_token);
  if public._has_perm(v_admin, 'church_members', 'view') then
    select
      count(*) filter (where status = 'pending'),
      count(*) filter (where status in ('approved', 'active')),
      count(*)
    into v_members_pending, v_members_approved, v_members_all
    from public.church_members;
  end if;
  if v_admin.role = 'superadmin' or coalesce((v_admin.permissions -> 'approvals' ->> 'view')::boolean, false)
     or coalesce((v_admin.permissions -> 'approvals' ->> 'edit')::boolean, false) then
    select count(*) into v_approvals_pending
    from public.admin_change_requests
    where status = 'pending';
  end if;
  select count(*) into v_my_pending
  from public.admin_change_requests
  where status = 'pending' and requested_by = v_admin.id;
  if public._has_perm(v_admin, 'volunteer_applications', 'view') then
    select count(*) into v_vol_unseen from public.volunteer_applications where admin_seen = false;
  end if;
  if public._has_perm(v_admin, 'program_registrations', 'view') then
    select count(*) into v_prog_total from public.program_registrations where admin_seen = false;
  end if;
  return jsonb_build_object(
    'members_pending', v_members_pending,
    'members_approved', v_members_approved,
    'members_all', v_members_all,
    'approvals_pending', v_approvals_pending,
    'my_requests_pending', v_my_pending,
    'volunteer_unseen', v_vol_unseen,
    'program_regs_unseen_total', v_prog_total,
    'program_nav', case when public._has_perm(v_admin, 'program_registrations', 'view')
      or public._has_perm(v_admin, 'programs', 'view') then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'slug', p.slug,
        'short_code', coalesce(nullif(p.short_code, ''), p.title),
        'unseen', (select count(*)::int from public.program_registrations r where r.program_id = p.id and r.admin_seen = false)
      ) order by p.sort_order, p.starts_at desc nulls last)
      from public.church_programs p
    ), '[]'::jsonb) else '[]'::jsonb end,
    'approvals_by_feature', coalesce((
      select jsonb_object_agg(feature, cnt)
      from (
        select feature, count(*)::int as cnt
        from public.admin_change_requests
        where status = 'pending'
        group by feature
      ) s
    ), '{}'::jsonb)
  );
end;
$$;

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

grant execute on function public.submit_program_registration(text, text, text, text, jsonb, boolean, text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.submit_church_membership(text, text, text, text, date, text, text, text, text, uuid, text, text, text, text, text, text, text, jsonb, boolean, text, uuid, uuid[], text, text, text) to anon, authenticated;
grant execute on function public.submit_volunteer_application(text, text, text, text, uuid, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_mark_program_registrations_seen(text, uuid) to anon, authenticated;
grant execute on function public.admin_mark_volunteer_applications_seen(text) to anon, authenticated;
grant execute on function public.admin_inbox_counts(text) to anon, authenticated;
