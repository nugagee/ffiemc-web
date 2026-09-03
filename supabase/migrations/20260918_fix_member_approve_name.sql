-- Allow status-only member updates (e.g. Approve) without re-validating first name.
-- Name fields are only rewritten when the payload actually includes them.

create or replace function public.admin_update_church_member(p_token text, p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row public.church_members%rowtype;
  v_ids uuid[];
  v_person record;
  v_has_name boolean;
begin
  perform public._require_permission(p_token, 'church_members', 'edit');

  v_has_name :=
    coalesce(nullif(trim(p_data->>'first_name'), ''), '') <> ''
    or coalesce(nullif(trim(p_data->>'last_name'), ''), '') <> ''
    or coalesce(nullif(trim(p_data->>'full_name'), ''), '') <> '';

  if v_has_name then
    select * into v_person from public._compose_person_name(
      coalesce(p_data->>'name_title', ''),
      coalesce(p_data->>'first_name', ''),
      coalesce(p_data->>'last_name', ''),
      coalesce(p_data->>'full_name', '')
    );
  end if;

  update public.church_members set
    name_title = case when v_has_name then v_person.name_title else name_title end,
    first_name = case when v_has_name then v_person.first_name else first_name end,
    last_name = case when v_has_name then v_person.last_name else last_name end,
    full_name = case when v_has_name then v_person.full_name else full_name end,
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
  v_person record;
  v_has_name boolean;
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
    v_has_name :=
      coalesce(nullif(trim(d->>'first_name'), ''), '') <> ''
      or coalesce(nullif(trim(d->>'last_name'), ''), '') <> ''
      or coalesce(nullif(trim(d->>'full_name'), ''), '') <> '';

    if v_has_name then
      select * into v_person from public._compose_person_name(
        coalesce(d->>'name_title', ''), coalesce(d->>'first_name', ''),
        coalesce(d->>'last_name', ''), coalesce(d->>'full_name', '')
      );
    end if;

    update public.church_members set
      name_title = case when v_has_name then v_person.name_title else name_title end,
      first_name = case when v_has_name then v_person.first_name else first_name end,
      last_name = case when v_has_name then v_person.last_name else last_name end,
      full_name = case when v_has_name then v_person.full_name else full_name end,
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
    v_has_name :=
      coalesce(nullif(trim(d->>'first_name'), ''), '') <> ''
      or coalesce(nullif(trim(d->>'last_name'), ''), '') <> ''
      or coalesce(nullif(trim(d->>'full_name'), ''), '') <> '';

    if v_has_name then
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
    else
      update public.program_registrations set
        email = coalesce(d->>'email', email),
        phone = coalesce(d->>'phone', phone),
        branch_id = coalesce(nullif(d->>'branch_id', '')::uuid, branch_id),
        status = coalesce(nullif(d->>'status', ''), status),
        form_data = coalesce(d->'form_data', form_data),
        updated_at = now()
      where id = p_req.resource_id;
    end if;
    return;
  end if;

  if p_req.action = 'update' and p_req.resource_type = 'volunteer_applications' then
    v_has_name :=
      coalesce(nullif(trim(d->>'first_name'), ''), '') <> ''
      or coalesce(nullif(trim(d->>'last_name'), ''), '') <> ''
      or coalesce(nullif(trim(d->>'full_name'), ''), '') <> '';

    if v_has_name then
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
    else
      update public.volunteer_applications set
        email = coalesce(d->>'email', email),
        phone = coalesce(d->>'phone', phone),
        role_interest = coalesce(d->>'role_interest', role_interest),
        status = coalesce(nullif(d->>'status', ''), status),
        review_notes = coalesce(d->>'review_notes', review_notes),
        updated_at = now()
      where id = p_req.resource_id;
    end if;
    return;
  end if;
end;
$$;

grant execute on function public.admin_update_church_member(text, uuid, jsonb) to anon, authenticated;
