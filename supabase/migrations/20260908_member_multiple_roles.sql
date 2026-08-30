-- Members can hold more than one church role.

create table if not exists public.church_member_roles (
  member_id uuid not null references public.church_members(id) on delete cascade,
  role_id uuid not null references public.church_roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, role_id)
);

create index if not exists church_member_roles_role_idx on public.church_member_roles (role_id);

alter table public.church_member_roles enable row level security;

insert into public.church_member_roles (member_id, role_id)
select m.id, m.role_id
from public.church_members m
where m.role_id is not null
on conflict do nothing;

create or replace function public._parse_role_ids(p_data jsonb, p_fallback uuid default null)
returns uuid[]
language plpgsql
stable
set search_path = public
as $$
declare
  v_ids uuid[] := '{}';
begin
  if p_data is not null and p_data ? 'role_ids' and jsonb_typeof(p_data->'role_ids') = 'array' then
    select coalesce(array_agg(distinct x::uuid), '{}')
    into v_ids
    from jsonb_array_elements_text(p_data->'role_ids') t(x)
    where nullif(trim(x), '') is not null;
  elsif p_data is not null and nullif(trim(p_data->>'role_id'), '') is not null then
    v_ids := array[(p_data->>'role_id')::uuid];
  elsif p_fallback is not null then
    v_ids := array[p_fallback];
  end if;
  return coalesce(v_ids, '{}');
end;
$$;

create or replace function public._set_member_roles(p_member_id uuid, p_role_ids uuid[])
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_names text;
begin
  select coalesce(array_agg(distinct r.id), '{}')
  into v_ids
  from public.church_roles r
  where r.is_active = true
    and r.id = any(coalesce(p_role_ids, '{}'));

  if cardinality(v_ids) = 0 then
    raise exception 'Select at least one church role';
  end if;

  delete from public.church_member_roles where member_id = p_member_id;
  insert into public.church_member_roles (member_id, role_id)
  select p_member_id, unnest(v_ids);

  update public.church_members
  set role_id = v_ids[1], updated_at = now()
  where id = p_member_id;

  select string_agg(r.name, ', ' order by r.name)
  into v_names
  from public.church_roles r
  where r.id = any(v_ids);

  return coalesce(v_names, '');
end;
$$;

create or replace function public._notification_recipients(p_filters jsonb)
returns table (
  recipient_type text,
  recipient_id uuid,
  full_name text,
  email text,
  phone text
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_source text := coalesce(nullif(trim(p_filters->>'source'), ''), 'members');
  v_program_id uuid := nullif(p_filters->>'program_id', '')::uuid;
  v_role_ids uuid[] := '{}';
  v_branch_ids uuid[] := '{}';
  v_statuses text[] := '{}';
  v_role_names text[] := '{}';
  v_branch_regions text[] := '{}';
  v_ministry text := nullif(trim(p_filters->>'ministry'), '');
begin
  if p_filters ? 'role_ids' and jsonb_typeof(p_filters->'role_ids') = 'array' then
    select coalesce(array_agg(x::uuid), '{}')
    into v_role_ids
    from jsonb_array_elements_text(p_filters->'role_ids') t(x)
    where nullif(x, '') is not null;
  end if;

  if p_filters ? 'branch_ids' and jsonb_typeof(p_filters->'branch_ids') = 'array' then
    select coalesce(array_agg(x::uuid), '{}')
    into v_branch_ids
    from jsonb_array_elements_text(p_filters->'branch_ids') t(x)
    where nullif(x, '') is not null;
  end if;

  if p_filters ? 'statuses' and jsonb_typeof(p_filters->'statuses') = 'array' then
    select coalesce(array_agg(x), '{}')
    into v_statuses
    from jsonb_array_elements_text(p_filters->'statuses') t(x)
    where nullif(x, '') is not null;
  end if;

  if p_filters ? 'role_names' and jsonb_typeof(p_filters->'role_names') = 'array' then
    select coalesce(array_agg(x), '{}')
    into v_role_names
    from jsonb_array_elements_text(p_filters->'role_names') t(x)
    where nullif(x, '') is not null;
  end if;

  if p_filters ? 'branch_regions' and jsonb_typeof(p_filters->'branch_regions') = 'array' then
    select coalesce(array_agg(x), '{}')
    into v_branch_regions
    from jsonb_array_elements_text(p_filters->'branch_regions') t(x)
    where nullif(x, '') is not null;
  end if;

  if v_source = 'program_registrants' or v_program_id is not null then
    return query
    select
      'registration'::text,
      pr.id,
      pr.full_name,
      pr.email,
      pr.phone
    from public.program_registrations pr
    left join public.church_branches b on b.id = pr.branch_id
    where pr.status in ('registered', 'confirmed', 'attended')
      and (v_program_id is null or pr.program_id = v_program_id)
      and (cardinality(v_branch_ids) = 0 or pr.branch_id = any(v_branch_ids))
      and (cardinality(v_branch_regions) = 0 or coalesce(b.region, '') = any(v_branch_regions));
    return;
  end if;

  return query
  select
    'member'::text,
    m.id,
    m.full_name,
    m.email,
    m.phone
  from public.church_members m
  left join public.church_branches b on b.id = m.branch_id
  where m.status is distinct from 'inactive'
    and (
      cardinality(v_statuses) = 0
      or m.status = any(v_statuses)
    )
    and (
      cardinality(v_role_ids) = 0
      or exists (
        select 1 from public.church_member_roles mr
        where mr.member_id = m.id and mr.role_id = any(v_role_ids)
      )
      or m.role_id = any(v_role_ids)
    )
    and (cardinality(v_branch_ids) = 0 or m.branch_id = any(v_branch_ids))
    and (
      cardinality(v_role_names) = 0
      or exists (
        select 1
        from public.church_member_roles mr
        join public.church_roles cr on cr.id = mr.role_id
        where mr.member_id = m.id and cr.name = any(v_role_names)
      )
    )
    and (cardinality(v_branch_regions) = 0 or coalesce(b.region, '') = any(v_branch_regions))
    and (v_ministry is null or m.ministry ilike '%' || v_ministry || '%');
end;
$$;

drop function if exists public.submit_church_membership(text, text, text, text, date, text, text, text, text, uuid, text, text, text, text, text, text, text, jsonb, boolean, text, uuid);

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
  p_role_ids uuid[] default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
  v_id uuid;
  v_role_name text;
  v_branch_name text;
  v_ids uuid[] := coalesce(p_role_ids, '{}');
begin
  if p_by_admin then
    v_admin := public._require_permission(p_admin_token, 'church_members', 'edit');
  end if;
  if p_branch_id is null then raise exception 'Please select your church branch'; end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 then raise exception 'Full name is required'; end if;
  if length(trim(coalesce(p_email, ''))) < 5 then raise exception 'Valid email is required'; end if;
  if length(trim(coalesce(p_phone, ''))) < 7 then raise exception 'Valid phone is required'; end if;
  if cardinality(v_ids) = 0 and p_role_id is not null then
    v_ids := array[p_role_id];
  end if;
  if cardinality(v_ids) = 0 then raise exception 'Select at least one church role'; end if;

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
    v_ids[1], trim(coalesce(p_ministry, '')), trim(coalesce(p_baptism_status, '')),
    trim(coalesce(p_marital_status, '')), trim(coalesce(p_occupation, '')),
    trim(coalesce(p_emergency_contact_name, '')), trim(coalesce(p_emergency_contact_phone, '')),
    trim(coalesce(p_notes, '')), coalesce(p_form_data, '{}'::jsonb), p_branch_id,
    coalesce(p_by_admin, false), case when p_by_admin then v_admin.id else null end,
    case when p_by_admin then 'approved' else 'pending' end
  ) returning id into v_id;

  v_role_name := public._set_member_roles(v_id, v_ids);

  return jsonb_build_object(
    'id', v_id, 'fullName', trim(p_full_name), 'email', lower(trim(p_email)),
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
      'id', m.id, 'full_name', m.full_name, 'email', m.email, 'phone', m.phone,
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

create or replace function public._apply_change_request(p_req public.admin_change_requests)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d jsonb := coalesce(p_req.payload, '{}'::jsonb);
  v_ids uuid[];
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
    update public.church_members set
      full_name = coalesce(nullif(trim(d->>'full_name'), ''), full_name),
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
    update public.program_registrations set
      full_name = coalesce(nullif(trim(d->>'full_name'), ''), full_name),
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
    update public.volunteer_applications set
      full_name = coalesce(nullif(trim(d->>'full_name'), ''), full_name),
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

grant execute on function public.submit_church_membership(text, text, text, text, date, text, text, text, text, uuid, text, text, text, text, text, text, text, jsonb, boolean, text, uuid, uuid[]) to anon, authenticated;
grant execute on function public.admin_list_church_members(text, uuid, uuid, text) to anon, authenticated;
grant execute on function public.admin_update_church_member(text, uuid, jsonb) to anon, authenticated;
