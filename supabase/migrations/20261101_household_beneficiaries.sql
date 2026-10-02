-- Household / beneficiary links and duplicate-contact checks.
-- Run after 20261029_convention_categories.sql and 20261031_email_validation_otp_priority.sql.
-- Recipient selection keeps convention category/team filters, then applies the priority cap
-- and one email per household address.
-- Existing shared emails stay in place. A new save that copies someone else's
-- email or phone is rejected unless the admin confirms a shared address or a household link.
-- Verified primary emails are unique. Beneficiaries may share the primary address.

alter table public.church_members
  add column if not exists phone_normalized text not null default '',
  add column if not exists household_role text not null default 'primary';

alter table public.church_members
  drop constraint if exists church_members_household_role_chk;
alter table public.church_members
  add constraint church_members_household_role_chk
  check (household_role in ('primary', 'beneficiary'));

alter table public.volunteer_applications
  add column if not exists form_data jsonb not null default '{}'::jsonb;

alter table public.admin_activity_log
  alter column admin_id drop not null;

create table if not exists public.member_household_links (
  id uuid primary key default gen_random_uuid(),
  primary_member_id uuid not null references public.church_members(id) on delete cascade,
  beneficiary_member_id uuid not null references public.church_members(id) on delete cascade,
  relationship text not null,
  relationship_other text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by text not null default 'self' check (created_by in ('self', 'admin')),
  approved_by uuid references public.admins(id) on delete set null,
  use_primary_email boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (primary_member_id <> beneficiary_member_id)
);

create unique index if not exists member_household_one_open_idx
  on public.member_household_links (beneficiary_member_id)
  where status in ('pending', 'approved');

create index if not exists member_household_primary_idx
  on public.member_household_links (primary_member_id, status);

alter table public.member_household_links enable row level security;
revoke all on table public.member_household_links from public, anon, authenticated;

create unique index if not exists church_members_verified_primary_email_uidx
  on public.church_members (lower(btrim(email)))
  where email_verified
    and btrim(coalesce(email, '')) <> ''
    and household_role = 'primary';

create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when digits = '' then ''
    when digits like '234%' and length(digits) >= 12 then digits
    when digits like '0%' and length(digits) >= 10 then '234' || substr(digits, 2)
    else digits
  end
  from (
    select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as digits
  ) s;
$$;

create or replace function public.mask_person_name(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v text := btrim(coalesce(p_name, ''));
  v_part text;
  v_out text := '';
begin
  if v = '' then
    return 'A member';
  end if;
  foreach v_part in array regexp_split_to_array(v, '\s+')
  loop
    if v_part = '' then
      continue;
    end if;
    v_out := v_out || case when v_out = '' then '' else ' ' end
      || substr(v_part, 1, 1) || repeat('•', greatest(length(v_part) - 1, 3));
  end loop;
  return v_out;
end;
$$;

create or replace function public.mask_email_address(p_email text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_email, '') = '' or position('@' in p_email) = 0 then ''
    else substr(p_email, 1, 1) || '•••@' || split_part(p_email, '@', 2)
  end;
$$;

create or replace function public.mask_phone_number(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when length(public.normalize_phone(p_phone)) < 4 then ''
    else '•••• ' || right(public.normalize_phone(p_phone), 4)
  end;
$$;

update public.church_members
set phone_normalized = public.normalize_phone(phone)
where phone_normalized is distinct from public.normalize_phone(phone);

create or replace function public._log_household_event(
  p_admin uuid,
  p_action text,
  p_meta jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_activity_log (admin_id, path, action, meta)
  values (
    p_admin,
    '/admin/registrations/household',
    coalesce(nullif(btrim(p_action), ''), 'household'),
    coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

revoke all on function public._log_household_event(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.enforce_member_contact_uniqueness()
returns trigger
language plpgsql
as $$
declare
  v_email text := lower(btrim(coalesce(new.email, '')));
  v_phone text := public.normalize_phone(new.phone);
  v_action text := coalesce(new.form_data->>'household_action', '');
  v_count integer;
begin
  new.phone_normalized := v_phone;
  if new.form_data ? 'household_action' then
    new.form_data := new.form_data - 'household_action';
  end if;
  if tg_op = 'UPDATE'
     and v_email = lower(btrim(coalesce(old.email, '')))
     and v_phone = public.normalize_phone(old.phone) then
    return new;
  end if;
  if new.household_role = 'beneficiary' or v_action in ('share', 'beneficiary') then
    return new;
  end if;
  if v_email <> '' then
    select count(*) into v_count
    from public.church_members m
    where m.id is distinct from new.id
      and lower(btrim(m.email)) = v_email
      and btrim(coalesce(m.email, '')) <> '';
    if v_count > 0 then
      raise exception 'This email is already used by % member(s). Link them as a household or confirm the shared address.', v_count;
    end if;
  end if;
  if length(v_phone) >= 10 then
    select count(*) into v_count
    from public.church_members m
    where m.id is distinct from new.id
      and m.phone_normalized = v_phone;
    if v_count > 0 then
      raise exception 'This phone number is already used by % member(s). Link them as a household or confirm the shared number.', v_count;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists church_members_contact_uniqueness on public.church_members;
create trigger church_members_contact_uniqueness
  before insert or update of email, phone, form_data, household_role
  on public.church_members
  for each row execute function public.enforce_member_contact_uniqueness();

create or replace function public.registration_contact_matches_member(p_email text, p_phone text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.church_members m
    where (
      nullif(lower(btrim(coalesce(p_email, ''))), '') is not null
      and lower(btrim(m.email)) = lower(btrim(p_email))
      and btrim(coalesce(m.email, '')) <> ''
    )
    or (
      length(public.normalize_phone(p_phone)) >= 10
      and m.phone_normalized = public.normalize_phone(p_phone)
    )
  );
$$;

create or replace function public.enforce_registration_duplicate()
returns trigger
language plpgsql
as $$
declare
  v_resolution text := coalesce(new.form_data->>'duplicate_resolution', '');
  v_email_same boolean;
  v_phone_same boolean;
begin
  if tg_op = 'UPDATE' then
    v_email_same := lower(btrim(coalesce(new.email, ''))) = lower(btrim(coalesce(old.email, '')));
    v_phone_same := public.normalize_phone(new.phone) = public.normalize_phone(old.phone);
    if v_email_same and v_phone_same then
      return new;
    end if;
  end if;
  if not public.registration_contact_matches_member(new.email, new.phone) then
    return new;
  end if;
  if v_resolution = 'admin_share' then
    return new;
  end if;
  if v_resolution in ('self', 'beneficiary') and exists (
    select 1
    from public.email_otp_challenges c
    where c.id = nullif(new.form_data->>'otp_challenge_id', '')::uuid
      and c.consumed_at is not null
      and c.purpose in ('account_recovery', 'beneficiary_link')
  ) then
    return new;
  end if;
  raise exception 'This email or phone is already registered. Choose That''s me, register as a beneficiary, or use a different contact.';
end;
$$;

drop trigger if exists program_registrations_duplicate_contact on public.program_registrations;
create trigger program_registrations_duplicate_contact
  before insert or update of email, phone, form_data
  on public.program_registrations
  for each row execute function public.enforce_registration_duplicate();

drop trigger if exists volunteer_applications_duplicate_contact on public.volunteer_applications;
create trigger volunteer_applications_duplicate_contact
  before insert or update of email, phone, form_data
  on public.volunteer_applications
  for each row execute function public.enforce_registration_duplicate();

create or replace function public.lookup_registration_duplicate(
  p_email text default '',
  p_phone text default '',
  p_exclude_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_phone text := public.normalize_phone(p_phone);
begin
  if v_email = '' and length(v_phone) < 10 then
    return jsonb_build_object('matches', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'matches',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'masked_name', public.mask_person_name(m.full_name),
        'masked_email', public.mask_email_address(m.email),
        'masked_phone', public.mask_phone_number(m.phone),
        'has_email', nullif(btrim(coalesce(m.email, '')), '') is not null,
        'match_on', case
          when v_email <> '' and lower(btrim(m.email)) = v_email
               and length(v_phone) >= 10 and m.phone_normalized = v_phone then 'both'
          when v_email <> '' and lower(btrim(m.email)) = v_email then 'email'
          else 'phone'
        end
      ) order by m.created_at)
      from (
        select *
        from public.church_members m
        where m.id is distinct from p_exclude_id
          and (
            (v_email <> '' and lower(btrim(m.email)) = v_email and btrim(coalesce(m.email, '')) <> '')
            or (length(v_phone) >= 10 and m.phone_normalized = v_phone)
          )
        order by m.created_at
        limit 3
      ) m
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.lookup_registration_duplicate(text, text, uuid) to anon, authenticated;

create or replace function public._relationship_ok(p_relationship text, p_other text)
returns text
language plpgsql
immutable
as $$
declare
  v text := lower(btrim(coalesce(p_relationship, '')));
begin
  if v = 'ward/dependant' then
    v := 'ward';
  end if;
  if v not in ('child', 'spouse', 'parent', 'sibling', 'ward', 'grandparent', 'relative', 'other') then
    raise exception 'Choose a relationship';
  end if;
  if v = 'other' and btrim(coalesce(p_other, '')) = '' then
    raise exception 'Describe the relationship';
  end if;
  return v;
end;
$$;

-- replaced below
create or replace function public._insert_household_link(
  p_primary uuid,
  p_beneficiary uuid,
  p_relationship text,
  p_other text,
  p_status text,
  p_created_by text,
  p_approved_by uuid,
  p_use_primary boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_rel text;
  v_status text := coalesce(nullif(p_status, ''), 'pending');
begin
  if p_primary = p_beneficiary then
    raise exception 'A member cannot be their own beneficiary';
  end if;
  v_rel := public._relationship_ok(p_relationship, p_other);
  update public.member_household_links
  set status = 'rejected', updated_at = now()
  where beneficiary_member_id = p_beneficiary
    and status in ('pending', 'approved')
    and primary_member_id is distinct from p_primary;

  select id into v_id
  from public.member_household_links
  where beneficiary_member_id = p_beneficiary
    and primary_member_id = p_primary
    and status in ('pending', 'approved')
  limit 1;

  if v_id is null then
    insert into public.member_household_links (
      primary_member_id, beneficiary_member_id, relationship, relationship_other,
      status, created_by, approved_by, use_primary_email
    ) values (
      p_primary, p_beneficiary, v_rel, btrim(coalesce(p_other, '')),
      v_status,
      case when p_created_by = 'admin' then 'admin' else 'self' end,
      case when v_status = 'approved' then p_approved_by else null end,
      coalesce(p_use_primary, true)
    )
    returning id into v_id;
  else
    update public.member_household_links
    set relationship = v_rel,
        relationship_other = btrim(coalesce(p_other, '')),
        status = v_status,
        use_primary_email = coalesce(p_use_primary, use_primary_email),
        approved_by = case when v_status = 'approved' then coalesce(p_approved_by, approved_by) else approved_by end,
        updated_at = now()
    where id = v_id;
  end if;

  if v_status = 'approved' then
    update public.church_members
    set household_role = 'beneficiary', updated_at = now()
    where id = p_beneficiary;
  end if;
  return v_id;
end;
$$;

revoke all on function public._insert_household_link(uuid, uuid, text, text, text, text, uuid, boolean) from public, anon, authenticated;

create or replace function public._complete_household_otp(
  p_row public.email_otp_challenges,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_primary public.church_members%rowtype;
  v_person record;
  v_id uuid;
  v_link uuid;
  v_rel text;
  v_use_primary boolean;
  v_email text;
  v_by_admin boolean;
  v_ids uuid[] := '{}';
  v_branch uuid;
  v_branch_name text := '';
  v_role_name text := '';
  v_dob date;
begin
  select * into v_primary
  from public.church_members
  where id = nullif(p_payload->>'primary_member_id', '')::uuid
    and lower(btrim(email)) = lower(btrim(p_row.email));
  if not found then
    return jsonb_build_object('ok', false, 'message', 'This code does not match the registered account.');
  end if;

  if p_row.purpose = 'account_recovery' then
    update public.church_members
    set email_verified = true,
        email_verified_at = coalesce(email_verified_at, now()),
        updated_at = now()
    where id = v_primary.id;
    update public.email_otp_challenges set consumed_at = now() where id = p_row.id;
    perform public._log_household_event(
      nullif(p_payload->>'admin_id', '')::uuid,
      'household_recovered',
      jsonb_build_object('member_id', v_primary.id, 'email', v_primary.email)
    );
    return jsonb_build_object(
      'ok', true,
      'recovered', true,
      'id', v_primary.id,
      'fullName', v_primary.full_name,
      'email', v_primary.email,
      'message', 'This email is already registered. No second record was created.'
    );
  end if;

  v_rel := public._relationship_ok(p_payload->>'relationship', p_payload->>'relationship_other');
  if coalesce(p_payload->>'context', 'membership') <> 'membership' then
    update public.email_otp_challenges set consumed_at = now() where id = p_row.id;
    perform public._log_household_event(
      nullif(p_payload->>'admin_id', '')::uuid,
      'household_link_approved',
      jsonb_build_object('primary_member_id', v_primary.id, 'context', p_payload->>'context', 'relationship', v_rel)
    );
    return jsonb_build_object(
      'ok', true,
      'approved', true,
      'primary_member_id', v_primary.id,
      'email', v_primary.email,
      'fullName', v_primary.full_name
    );
  end if;
  v_use_primary := coalesce((p_payload->>'use_primary_email')::boolean, true);
  v_by_admin := coalesce((p_payload->>'by_admin')::boolean, false);
  v_email := lower(btrim(coalesce(p_payload->>'applicant_email', '')));
  if v_use_primary or v_email = '' or v_email = lower(btrim(v_primary.email)) then
    v_email := '';
    v_use_primary := true;
  else
    if coalesce((public.validate_public_email(v_email, true)->>'ok')::boolean, false) is not true then
      return jsonb_build_object('ok', false, 'message', coalesce(public.validate_public_email(v_email, true)->>'message', 'Enter a valid email address'));
    end if;
    v_email := public.validate_public_email(v_email, true)->>'email';
  end if;

  if length(regexp_replace(coalesce(p_payload->>'phone', ''), '\D', '', 'g')) < 7 then
    return jsonb_build_object('ok', false, 'message', 'Enter a valid phone number.');
  end if;
  if jsonb_typeof(p_payload->'role_ids') = 'array' then
    select coalesce(array_agg(distinct x::uuid), '{}')
    into v_ids
    from jsonb_array_elements_text(p_payload->'role_ids') t(x)
    where nullif(btrim(x), '') is not null;
  end if;
  if coalesce(cardinality(v_ids), 0) = 0 then
    select id into v_ids[1] from public.church_roles where lower(name) = 'member' and is_active = true limit 1;
  end if;
  if v_ids[1] is null then
    return jsonb_build_object('ok', false, 'message', 'Select at least one church role.');
  end if;

  select * into v_person from public._compose_person_name(
    coalesce(p_payload->>'name_title', ''),
    coalesce(p_payload->>'first_name', ''),
    coalesce(p_payload->>'last_name', ''),
    coalesce(p_payload->>'full_name', '')
  );
  v_branch := nullif(btrim(p_payload->>'branch_id'), '')::uuid;
  if v_branch is not null then
    select name into v_branch_name from public.church_branches where id = v_branch and is_active = true;
  end if;
  if coalesce(p_payload->>'date_of_birth', '') ~ '^\d{4}-\d{2}-\d{2}$' then
    v_dob := (p_payload->>'date_of_birth')::date;
  end if;

  insert into public.church_members (
    name_title, first_name, last_name, full_name, email, phone, gender, date_of_birth,
    address, city, state, country, role_id, ministry, baptism_status, marital_status, occupation,
    emergency_contact_name, emergency_contact_phone, notes, form_data, branch_id,
    registered_by_admin, admin_id, status,
    email_verified, email_verified_at, email_priority, email_priority_source, household_role,
    registration_categories, audience_teams, worker_code, participant_code, worker_position,
    availability, meeting_sept_4, meeting_sept_5, absence_reason, convention_group,
    age_range, whatsapp, attended_before, expectations, medical_need
  ) values (
    v_person.name_title, v_person.first_name, v_person.last_name, v_person.full_name,
    v_email, btrim(coalesce(p_payload->>'phone', '')), btrim(coalesce(p_payload->>'gender', '')), v_dob,
    btrim(coalesce(p_payload->>'address', '')), btrim(coalesce(p_payload->>'city', '')),
    btrim(coalesce(p_payload->>'state', '')), coalesce(nullif(btrim(p_payload->>'country'), ''), 'Nigeria'),
    v_ids[1], coalesce(nullif(btrim(p_payload->>'ministry'), ''), array_to_string(public._json_text_array(p_payload->'audience_teams'), ', ')), btrim(coalesce(p_payload->>'baptism_status', '')),
    btrim(coalesce(p_payload->>'marital_status', '')), btrim(coalesce(p_payload->>'occupation', '')),
    btrim(coalesce(p_payload->>'emergency_contact_name', '')),
    btrim(coalesce(p_payload->>'emergency_contact_phone', '')),
    btrim(coalesce(p_payload->>'notes', '')),
    coalesce(p_payload->'form_data', '{}'::jsonb),
    v_branch,
    v_by_admin,
    case when v_by_admin then nullif(p_payload->>'admin_id', '')::uuid else null end,
    case when v_by_admin then 'approved' else 'pending' end,
    false, null, true, 'registration', 'beneficiary',
    public._json_text_array(p_payload->'registration_categories'),
    public._json_text_array(p_payload->'audience_teams'),
    coalesce(p_payload->>'worker_code', ''),
    coalesce(p_payload->>'participant_code', ''),
    coalesce(p_payload->>'worker_position', ''),
    coalesce(p_payload->>'availability', ''),
    coalesce(p_payload->>'meeting_sept_4', ''),
    coalesce(p_payload->>'meeting_sept_5', ''),
    coalesce(p_payload->>'absence_reason', ''),
    coalesce(p_payload->>'convention_group', ''),
    coalesce(p_payload->>'age_range', ''),
    coalesce(p_payload->>'whatsapp', ''),
    coalesce(p_payload->>'attended_before', ''),
    coalesce(p_payload->>'expectations', ''),
    coalesce(p_payload->>'medical_need', '')
  ) returning id into v_id;

  v_role_name := public._set_member_roles(v_id, v_ids);
  v_link := public._insert_household_link(
    v_primary.id, v_id, v_rel, p_payload->>'relationship_other',
    'approved',
    case when v_by_admin then 'admin' else 'self' end,
    nullif(p_payload->>'admin_id', '')::uuid,
    v_use_primary
  );
  update public.email_otp_challenges set consumed_at = now() where id = p_row.id;
  perform public._log_household_event(
    nullif(p_payload->>'admin_id', '')::uuid,
    'household_link_approved',
    jsonb_build_object('link_id', v_link, 'primary_member_id', v_primary.id, 'beneficiary_member_id', v_id, 'relationship', v_rel)
  );

  return jsonb_build_object(
    'ok', true,
    'beneficiary', true,
    'id', v_id,
    'fullName', v_person.full_name,
    'firstName', v_person.first_name,
    'email', case when v_email <> '' then v_email else v_primary.email end,
    'roleName', coalesce(v_role_name, ''),
    'branchName', coalesce(v_branch_name, ''),
    'status', case when v_by_admin then 'approved' else 'pending' end,
    'byAdmin', v_by_admin,
    'email_verified', false
  );
end;
$$;

revoke all on function public._complete_household_otp(public.email_otp_challenges, jsonb) from public, anon, authenticated;

create or replace function public.service_issue_email_otp(
  p_email text,
  p_purpose text,
  p_payload jsonb default '{}'::jsonb,
  p_challenge_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_check jsonb;
  v_row public.email_otp_challenges%rowtype;
  v_code text;
  v_id uuid;
  v_sent integer;
  v_expires timestamptz;
  v_resend timestamptz;
begin
  if p_purpose not in ('membership', 'admin_membership', 'account_recovery', 'beneficiary_link') then
    raise exception 'Purpose not allowed';
  end if;
  if p_purpose in ('account_recovery', 'beneficiary_link') then
    select lower(btrim(m.email)) into v_email
    from public.church_members m
    where m.id = nullif(p_payload->>'primary_member_id', '')::uuid;
    if coalesce(v_email, '') = '' then
      raise exception 'The existing account has no email. Ask an admin to approve the household link.';
    end if;
    v_check := public.validate_public_email(v_email, true);
  else
    v_check := public.validate_public_email(p_email, true);
  end if;
  if coalesce((v_check->>'ok')::boolean, false) is not true then
    raise exception '%', coalesce(v_check->>'message', 'Enter a valid email address');
  end if;
  v_email := v_check->>'email';
  v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  v_expires := now() + interval '10 minutes';
  v_resend := now() + interval '60 seconds';

  if p_challenge_id is not null then
    select * into v_row
    from public.email_otp_challenges
    where id = p_challenge_id
    for update;
    if not found then
      raise exception 'Verification request was not found. Ask for a new code.';
    end if;
    if v_row.consumed_at is not null then
      raise exception 'This code has already been used. Ask for a new one.';
    end if;
    if v_row.email <> v_email or v_row.purpose <> p_purpose then
      raise exception 'Ask for a new code for this email address.';
    end if;
    if v_row.resend_available_at > now() then
      raise exception 'Please wait % seconds before requesting another code',
        greatest(1, ceil(extract(epoch from (v_row.resend_available_at - now())))::int);
    end if;
    if v_row.send_count >= 5 then
      raise exception 'Too many codes were sent for this address. Try again later.';
    end if;
    update public.email_otp_challenges
    set code_hash = md5(v_code || ':' || id::text),
        payload = coalesce(p_payload, payload),
        expires_at = v_expires,
        attempts = 0,
        send_count = send_count + 1,
        resend_available_at = v_resend
    where id = v_row.id
    returning id into v_id;
  else
    select coalesce(sum(send_count), 0) into v_sent
    from public.email_otp_challenges
    where email = v_email
      and created_at > now() - interval '1 hour';
    if v_sent >= 5 then
      raise exception 'Too many codes were sent to this address. Try again in an hour.';
    end if;
    if exists (
      select 1 from public.email_otp_challenges
      where email = v_email
        and consumed_at is null
        and resend_available_at > now()
    ) then
      raise exception 'Please wait a minute before requesting another code';
    end if;
    insert into public.email_otp_challenges (
      email, purpose, payload, code_hash, expires_at, resend_available_at, send_count
    ) values (
      v_email, p_purpose, coalesce(p_payload, '{}'::jsonb), 'pending', v_expires, v_resend, 1
    ) returning id into v_id;
    update public.email_otp_challenges
    set code_hash = md5(v_code || ':' || v_id::text)
    where id = v_id;
  end if;

  return jsonb_build_object(
    'challenge_id', v_id,
    'code', v_code,
    'expires_at', v_expires,
    'resend_available_at', v_resend,
    'email', v_email
  );
end;
$$;


create or replace function public.complete_email_otp(p_challenge_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.email_otp_challenges%rowtype;
  v_payload jsonb;
  v_code text;
  v_attempts integer;
  v_by_admin boolean;
  v_person record;
  v_ids uuid[] := '{}';
  v_branch uuid;
  v_branch_name text;
  v_id uuid;
  v_role_name text;
  v_dob date;
begin
  select * into v_row
  from public.email_otp_challenges
  where id = p_challenge_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Verification code not found. Request a new code.');
  end if;
  if v_row.consumed_at is not null then
    return jsonb_build_object('ok', false, 'message', 'This code has already been used.');
  end if;
  if v_row.expires_at < now() then
    return jsonb_build_object('ok', false, 'message', 'This code has expired. Request a new one.');
  end if;
  if v_row.attempts >= 5 then
    return jsonb_build_object('ok', false, 'message', 'Too many incorrect attempts. Request a new code.');
  end if;
  v_code := btrim(coalesce(p_code, ''));
  if v_code !~ '^\d{6}$' then
    return jsonb_build_object('ok', false, 'message', 'Enter the 6-digit code from your email.');
  end if;
  if md5(v_code || ':' || v_row.id::text) is distinct from v_row.code_hash then
    update public.email_otp_challenges
    set attempts = attempts + 1
    where id = v_row.id
    returning attempts into v_attempts;
    return jsonb_build_object(
      'ok', false,
      'message', 'That code is incorrect. ' || greatest(0, 5 - v_attempts) || ' attempt(s) left.'
    );
  end if;

  v_payload := coalesce(v_row.payload, '{}'::jsonb);
  if v_row.purpose in ('account_recovery', 'beneficiary_link') then
    return public._complete_household_otp(v_row, v_payload);
  end if;
  if v_row.purpose in ('membership', 'admin_membership') then
    if coalesce(v_payload->'form_data'->>'household_action', '') = 'share' then
      if exists (
        select 1 from public.church_members m
        where lower(btrim(m.email)) = lower(btrim(v_row.email))
          and btrim(coalesce(m.email, '')) <> ''
          and m.email_verified
          and coalesce(m.household_role, 'primary') = 'primary'
      ) then
        return jsonb_build_object('ok', false, 'message', 'A verified primary account already uses this email. Link this person as a beneficiary instead.');
      end if;
    else
      if exists (
        select 1 from public.church_members m
        where lower(btrim(m.email)) = lower(btrim(v_row.email))
          and btrim(coalesce(m.email, '')) <> ''
      ) then
        return jsonb_build_object('ok', false, 'message', 'This email is already registered. Choose That''s me or register as a beneficiary.');
      end if;
      if length(public.normalize_phone(v_payload->>'phone')) >= 10 and exists (
        select 1 from public.church_members m
        where m.phone_normalized = public.normalize_phone(v_payload->>'phone')
      ) then
        return jsonb_build_object('ok', false, 'message', 'This phone number is already registered. Choose That''s me or register as a beneficiary.');
      end if;
    end if;
  end if;
  v_by_admin := v_row.purpose = 'admin_membership'
    and coalesce((v_payload->>'by_admin')::boolean, false);
  if length(regexp_replace(coalesce(v_payload->>'phone', ''), '\D', '', 'g')) < 7 then
    return jsonb_build_object('ok', false, 'message', 'Enter a valid phone number.');
  end if;
  if jsonb_typeof(v_payload->'role_ids') = 'array' then
    select coalesce(array_agg(distinct x::uuid), '{}')
    into v_ids
    from jsonb_array_elements_text(v_payload->'role_ids') t(x)
    where nullif(btrim(x), '') is not null;
  elsif nullif(btrim(v_payload->>'role_id'), '') is not null then
    v_ids := array[(v_payload->>'role_id')::uuid];
  end if;
  if coalesce(cardinality(v_ids), 0) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Select at least one church role.');
  end if;
  v_branch := nullif(btrim(v_payload->>'branch_id'), '')::uuid;
  if not v_by_admin and v_branch is null then
    return jsonb_build_object('ok', false, 'message', 'Select your church branch.');
  end if;
  select * into v_person from public._compose_person_name(
    coalesce(v_payload->>'name_title', ''),
    coalesce(v_payload->>'first_name', ''),
    coalesce(v_payload->>'last_name', ''),
    coalesce(v_payload->>'full_name', '')
  );
  if coalesce(v_payload->>'date_of_birth', '') ~ '^\d{4}-\d{2}-\d{2}$' then
    v_dob := (v_payload->>'date_of_birth')::date;
  end if;
  select name into v_branch_name
  from public.church_branches
  where id = v_branch and is_active = true;

  insert into public.church_members (
    name_title, first_name, last_name, full_name, email, phone, gender, date_of_birth,
    address, city, state, country, role_id, ministry, baptism_status, marital_status, occupation,
    emergency_contact_name, emergency_contact_phone, notes, form_data, branch_id,
    registered_by_admin, admin_id, status,
    email_verified, email_verified_at, email_priority, email_priority_source,
    registration_categories, audience_teams, worker_code, participant_code, worker_position,
    availability, meeting_sept_4, meeting_sept_5, absence_reason, convention_group,
    age_range, whatsapp, attended_before, expectations, medical_need
  ) values (
    v_person.name_title, v_person.first_name, v_person.last_name, v_person.full_name,
    v_row.email, btrim(coalesce(v_payload->>'phone', '')), btrim(coalesce(v_payload->>'gender', '')), v_dob,
    btrim(coalesce(v_payload->>'address', '')), btrim(coalesce(v_payload->>'city', '')),
    btrim(coalesce(v_payload->>'state', '')), coalesce(nullif(btrim(v_payload->>'country'), ''), 'Nigeria'),
    v_ids[1], coalesce(nullif(btrim(v_payload->>'ministry'), ''), array_to_string(public._json_text_array(v_payload->'audience_teams'), ', ')), btrim(coalesce(v_payload->>'baptism_status', '')),
    btrim(coalesce(v_payload->>'marital_status', '')), btrim(coalesce(v_payload->>'occupation', '')),
    btrim(coalesce(v_payload->>'emergency_contact_name', '')),
    btrim(coalesce(v_payload->>'emergency_contact_phone', '')),
    btrim(coalesce(v_payload->>'notes', '')),
    coalesce(v_payload->'form_data', '{}'::jsonb),
    v_branch,
    v_by_admin,
    case when v_by_admin then nullif(v_payload->>'admin_id', '')::uuid else null end,
    case when v_by_admin then 'approved' else 'pending' end,
    true, now(), true, 'registration',
    public._json_text_array(v_payload->'registration_categories'),
    public._json_text_array(v_payload->'audience_teams'),
    coalesce(v_payload->>'worker_code', ''),
    coalesce(v_payload->>'participant_code', ''),
    coalesce(v_payload->>'worker_position', ''),
    coalesce(v_payload->>'availability', ''),
    coalesce(v_payload->>'meeting_sept_4', ''),
    coalesce(v_payload->>'meeting_sept_5', ''),
    coalesce(v_payload->>'absence_reason', ''),
    coalesce(v_payload->>'convention_group', ''),
    coalesce(v_payload->>'age_range', ''),
    coalesce(v_payload->>'whatsapp', ''),
    coalesce(v_payload->>'attended_before', ''),
    coalesce(v_payload->>'expectations', ''),
    coalesce(v_payload->>'medical_need', '')
  ) returning id into v_id;

  v_role_name := public._set_member_roles(v_id, v_ids);
  update public.email_otp_challenges set consumed_at = now() where id = v_row.id;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'fullName', v_person.full_name,
    'firstName', v_person.first_name,
    'email', v_row.email,
    'roleName', coalesce(v_role_name, ''),
    'branchName', coalesce(v_branch_name, ''),
    'email_verified', true,
    'status', case when v_by_admin then 'approved' else 'pending' end,
    'byAdmin', v_by_admin
  );
end;
$$;

grant execute on function public.validate_public_email(text, boolean) to anon, authenticated, service_role;

-- Category and team filters live in _notification_recipients (20261029).
-- This function applies the priority order, daily cap, and one-email-per-household
-- rule to that already filtered audience.
create or replace function public._bulk_email_recipients(p_filters jsonb)
returns table (
  recipient_type text,
  recipient_id uuid,
  full_name text,
  email text,
  phone text,
  email_priority boolean
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_max integer := 60;
  v_skip_unverified boolean := false;
  v_skip_invalid boolean := true;
  v_source text := coalesce(nullif(btrim(p_filters->>'source'), ''), 'members');
  v_program uuid := nullif(p_filters->>'program_id', '')::uuid;
begin
  select s.max_recipients, s.skip_unverified, s.skip_invalid
  into v_max, v_skip_unverified, v_skip_invalid
  from public.email_send_settings s
  where s.id = 1;
  v_max := coalesce(v_max, 60);
  v_skip_unverified := coalesce(v_skip_unverified, false);
  v_skip_invalid := coalesce(v_skip_invalid, true);

  if v_source = 'program_registrants' or v_program is not null then
    return query
    with raw as (
      select r.recipient_type, r.recipient_id, r.full_name, lower(btrim(r.email)) as email, r.phone
      from public._notification_recipients(p_filters) r
      where nullif(btrim(r.email), '') is not null
    ),
    valid as (
      select *
      from raw
      where not v_skip_invalid
         or coalesce((public.validate_public_email(raw.email, true)->>'ok')::boolean, false)
    ),
    deduped as (
      select distinct on (valid.email) valid.*
      from valid
      order by valid.email, valid.full_name
    )
    select d.recipient_type, d.recipient_id, d.full_name, d.email, d.phone, false
    from deduped d
    order by md5(d.email || to_char(current_date, 'YYYYMMDD'))
    limit v_max;
    return;
  end if;

  return query
  with raw as (
    select
      r.recipient_type,
      r.recipient_id,
      r.full_name,
      coalesce(
        nullif(lower(btrim(r.email)), ''),
        (
          select lower(btrim(p.email))
          from public.member_household_links l
          join public.church_members p on p.id = l.primary_member_id
          where l.beneficiary_member_id = m.id
            and l.status = 'approved'
            and l.use_primary_email
            and nullif(btrim(p.email), '') is not null
          limit 1
        )
      ) as email,
      r.phone,
      coalesce(m.email_priority, false) as is_priority,
      coalesce(m.household_role, 'primary') as household_role,
      coalesce(m.email_verified, false) as is_verified,
      (
        exists (
          select 1
          from public.church_member_roles mr
          join public.church_roles cr on cr.id = mr.role_id
          where mr.member_id = m.id
            and lower(cr.name) = 'member'
        )
        or lower(coalesce(role_fallback.name, '')) = 'member'
      ) as is_member
    from public._notification_recipients(p_filters) r
    left join public.church_members m on m.id = r.recipient_id and r.recipient_type = 'member'
    left join public.church_roles role_fallback on role_fallback.id = m.role_id
  ),
  filtered as (
    select *
    from raw
    where nullif(raw.email, '') is not null
    and (
      not v_skip_unverified
      or raw.is_verified
      or raw.recipient_type <> 'member'
    )
    and (
      not v_skip_invalid
      or coalesce((public.validate_public_email(raw.email, true)->>'ok')::boolean, false)
    )
  ),
  deduped as (
    select distinct on (filtered.email) filtered.*
    from filtered
    order by filtered.email, filtered.is_priority desc,
      case when filtered.household_role = 'beneficiary' then 1 else 0 end,
      filtered.full_name
  ),
  ranked as (
    select
      d.*,
      case when d.is_priority then 0 else 1 end as grp,
      row_number() over (
        partition by case when d.is_priority then 0 else 1 end
        order by case
          when d.is_priority then d.full_name
          else md5(d.email || to_char(current_date, 'YYYYMMDD'))
        end
      ) as rn,
      count(*) filter (where d.is_priority) over () as priority_total
    from deduped d
    where d.is_priority or d.is_member
  )
  select ranked.recipient_type, ranked.recipient_id, ranked.full_name, ranked.email, ranked.phone, ranked.is_priority
  from ranked
  where (ranked.grp = 0 and ranked.rn <= v_max)
     or (ranked.grp = 1 and ranked.rn <= greatest(v_max - ranked.priority_total, 0))
  order by ranked.grp, ranked.rn;
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
      'ministry', m.ministry,
      'registration_categories', to_jsonb(coalesce(m.registration_categories, '{}')),
      'audience_teams', to_jsonb(coalesce(m.audience_teams, '{}')),
      'worker_code', m.worker_code,
      'participant_code', m.participant_code,
      'worker_position', m.worker_position,
      'availability', m.availability,
      'meeting_sept_4', m.meeting_sept_4,
      'meeting_sept_5', m.meeting_sept_5,
      'absence_reason', m.absence_reason,
      'convention_group', m.convention_group,
      'age_range', m.age_range,
      'whatsapp', m.whatsapp,
      'attended_before', m.attended_before,
      'expectations', m.expectations,
      'medical_need', m.medical_need,
      'convention_submitted_at', m.convention_submitted_at,
      'baptism_status', m.baptism_status,
      'marital_status', m.marital_status, 'occupation', m.occupation,
      'emergency_contact_name', m.emergency_contact_name,
      'emergency_contact_phone', m.emergency_contact_phone,
      'notes', m.notes, 'form_data', m.form_data,
      'status', m.status, 'registered_by_admin', m.registered_by_admin,
      'email_sent', m.email_sent,
      'email_verified', m.email_verified,
      'email_verified_at', m.email_verified_at,
      'email_priority', m.email_priority,
      'email_priority_source', m.email_priority_source,
      'household_role', m.household_role,
      'household_of', (
        select p.full_name
        from public.member_household_links hl
        join public.church_members p on p.id = hl.primary_member_id
        where hl.beneficiary_member_id = m.id
          and hl.status in ('pending', 'approved')
        order by case hl.status when 'approved' then 0 else 1 end
        limit 1
      ),
      'household_relationship', (
        select hl.relationship
        from public.member_household_links hl
        where hl.beneficiary_member_id = m.id
          and hl.status in ('pending', 'approved')
        order by case hl.status when 'approved' then 0 else 1 end
        limit 1
      ),
      'household_status', (
        select hl.status
        from public.member_household_links hl
        where hl.beneficiary_member_id = m.id
          and hl.status in ('pending', 'approved')
        order by case hl.status when 'approved' then 0 else 1 end
        limit 1
      ),
      'created_at', m.created_at, 'updated_at', m.updated_at
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




create or replace function public.admin_member_household(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'church_members', 'view');
  return jsonb_build_object(
    'as_beneficiary', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'member_id', p.id,
        'full_name', p.full_name,
        'email', p.email,
        'relationship', l.relationship,
        'relationship_other', l.relationship_other,
        'status', l.status,
        'use_primary_email', l.use_primary_email
      ))
      from public.member_household_links l
      join public.church_members p on p.id = l.primary_member_id
      where l.beneficiary_member_id = p_id
        and l.status in ('pending', 'approved')
    ), '[]'::jsonb),
    'beneficiaries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'member_id', b.id,
        'full_name', b.full_name,
        'email', b.email,
        'phone', b.phone,
        'relationship', l.relationship,
        'relationship_other', l.relationship_other,
        'status', l.status,
        'use_primary_email', l.use_primary_email
      ) order by b.full_name)
      from public.member_household_links l
      join public.church_members b on b.id = l.beneficiary_member_id
      where l.primary_member_id = p_id
        and l.status in ('pending', 'approved')
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_set_household_link(
  p_token text,
  p_primary uuid,
  p_beneficiary uuid,
  p_relationship text,
  p_other text default '',
  p_status text default 'approved',
  p_use_primary boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_id uuid;
begin
  v_admin := public._require_permission(p_token, 'church_members', 'edit');
  v_id := public._insert_household_link(
    p_primary, p_beneficiary, p_relationship, p_other,
    coalesce(nullif(p_status, ''), 'approved'),
    'admin', v_admin.id, p_use_primary
  );
  perform public._log_household_event(
    v_admin.id,
    'household_link_created',
    jsonb_build_object(
      'link_id', v_id,
      'primary_member_id', p_primary,
      'beneficiary_member_id', p_beneficiary,
      'status', p_status,
      'relationship', p_relationship
    )
  );
  return jsonb_build_object('id', v_id, 'ok', true);
end;
$$;

create or replace function public.admin_review_household_link(
  p_token text,
  p_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_row public.member_household_links%rowtype;
  v_decision text := lower(btrim(coalesce(p_decision, '')));
begin
  v_admin := public._require_permission(p_token, 'approvals', 'edit');
  if v_decision not in ('approved', 'rejected') then
    raise exception 'Choose approve or reject';
  end if;
  update public.member_household_links
  set status = v_decision,
      approved_by = v_admin.id,
      updated_at = now()
  where id = p_id
  returning * into v_row;
  if not found then
    raise exception 'Household link not found';
  end if;
  if v_decision = 'approved' then
    update public.church_members
    set household_role = 'beneficiary', updated_at = now()
    where id = v_row.beneficiary_member_id;
  else
    update public.church_members
    set household_role = 'primary', updated_at = now()
    where id = v_row.beneficiary_member_id
      and not exists (
        select 1 from public.member_household_links l
        where l.beneficiary_member_id = v_row.beneficiary_member_id
          and l.status = 'approved'
          and l.id <> v_row.id
      );
  end if;
  perform public._log_household_event(
    v_admin.id,
    case when v_decision = 'approved' then 'household_link_approved' else 'household_link_rejected' end,
    jsonb_build_object(
      'link_id', v_row.id,
      'primary_member_id', v_row.primary_member_id,
      'beneficiary_member_id', v_row.beneficiary_member_id
    )
  );
  return jsonb_build_object('id', v_row.id, 'status', v_row.status);
end;
$$;

create or replace function public.admin_remove_household_link(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_row public.member_household_links%rowtype;
begin
  v_admin := public._require_permission(p_token, 'church_members', 'edit');
  update public.member_household_links
  set status = 'rejected', updated_at = now()
  where id = p_id and status in ('pending', 'approved')
  returning * into v_row;
  if not found then
    raise exception 'Household link not found';
  end if;
  update public.church_members
  set household_role = 'primary', updated_at = now()
  where id = v_row.beneficiary_member_id
    and not exists (
      select 1 from public.member_household_links l
      where l.beneficiary_member_id = v_row.beneficiary_member_id
        and l.status = 'approved'
    );
  perform public._log_household_event(
    v_admin.id,
    'household_link_removed',
    jsonb_build_object(
      'link_id', v_row.id,
      'primary_member_id', v_row.primary_member_id,
      'beneficiary_member_id', v_row.beneficiary_member_id
    )
  );
  return jsonb_build_object('id', v_row.id, 'ok', true);
end;
$$;

create or replace function public.admin_list_pending_household_links(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'approvals', 'view');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', l.id,
      'relationship', l.relationship,
      'relationship_other', l.relationship_other,
      'status', l.status,
      'created_by', l.created_by,
      'created_at', l.created_at,
      'primary_id', p.id,
      'primary_name', p.full_name,
      'primary_email', p.email,
      'beneficiary_id', b.id,
      'beneficiary_name', b.full_name,
      'beneficiary_email', b.email,
      'beneficiary_phone', b.phone
    ) order by l.created_at)
    from public.member_household_links l
    join public.church_members p on p.id = l.primary_member_id
    join public.church_members b on b.id = l.beneficiary_member_id
    where l.status = 'pending'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_list_contact_duplicates(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'church_members', 'view');
  return coalesce((
    select jsonb_agg(g.obj order by g.kind, g.size desc, g.label)
    from (
      select 'email'::text as kind, lower(btrim(m.email)) as label, count(*) as size,
        jsonb_build_object(
          'kind', 'email',
          'value', lower(btrim(m.email)),
          'count', count(*),
          'members', jsonb_agg(jsonb_build_object(
            'id', m.id,
            'full_name', m.full_name,
            'email', m.email,
            'phone', m.phone,
            'status', m.status,
            'household_role', m.household_role
          ) order by m.full_name)
        ) as obj
      from public.church_members m
      where btrim(coalesce(m.email, '')) <> ''
      group by lower(btrim(m.email))
      having count(*) > 1
      union all
      select 'phone'::text, m.phone_normalized, count(*),
        jsonb_build_object(
          'kind', 'phone',
          'value', m.phone_normalized,
          'count', count(*),
          'members', jsonb_agg(jsonb_build_object(
            'id', m.id,
            'full_name', m.full_name,
            'email', m.email,
            'phone', m.phone,
            'status', m.status,
            'household_role', m.household_role
          ) order by m.full_name)
        )
      from public.church_members m
      where length(m.phone_normalized) >= 10
      group by m.phone_normalized
      having count(*) > 1
    ) g
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_merge_members(
  p_token text,
  p_primary uuid,
  p_duplicate_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_keep public.church_members%rowtype;
  v_dup public.church_members%rowtype;
  v_id uuid;
  v_merged integer := 0;
begin
  v_admin := public._require_permission(p_token, 'church_members', 'delete');
  select * into v_keep from public.church_members where id = p_primary;
  if not found then
    raise exception 'Choose the member to keep';
  end if;
  foreach v_id in array coalesce(p_duplicate_ids, '{}')
  loop
    if v_id is null or v_id = p_primary then
      continue;
    end if;
    select * into v_dup from public.church_members where id = v_id;
    if not found then
      continue;
    end if;
    update public.member_household_links
    set primary_member_id = p_primary, updated_at = now()
    where primary_member_id = v_id
      and beneficiary_member_id is distinct from p_primary
      and beneficiary_member_id is distinct from v_id;
    update public.member_household_links
    set beneficiary_member_id = p_primary, updated_at = now()
    where beneficiary_member_id = v_id
      and primary_member_id is distinct from p_primary
      and primary_member_id is distinct from v_id;
    delete from public.member_household_links
    where primary_member_id = v_id
       or beneficiary_member_id = v_id
       or primary_member_id = beneficiary_member_id;
    update public.church_members set
      email = case when btrim(coalesce(email, '')) = '' then v_dup.email else email end,
      phone = case when btrim(coalesce(phone, '')) = '' then v_dup.phone else phone end,
      address = case when btrim(coalesce(address, '')) = '' then v_dup.address else address end,
      city = case when btrim(coalesce(city, '')) = '' then v_dup.city else city end,
      state = case when btrim(coalesce(state, '')) = '' then v_dup.state else state end,
      ministry = case when btrim(coalesce(ministry, '')) = '' then v_dup.ministry else ministry end,
      notes = trim(both from concat_ws(E'\n', nullif(notes, ''), nullif('Merged from ' || v_dup.full_name, 'Merged from '))),
      email_priority = email_priority or v_dup.email_priority,
      form_data = coalesce(form_data, '{}'::jsonb) || jsonb_build_object('household_action', 'share'),
      updated_at = now()
    where id = p_primary;
    insert into public.church_member_roles (member_id, role_id)
    select p_primary, mr.role_id
    from public.church_member_roles mr
    where mr.member_id = v_id
    on conflict do nothing;
    delete from public.church_members where id = v_id;
    v_merged := v_merged + 1;
  end loop;
  perform public._log_household_event(
    v_admin.id,
    'household_merged',
    jsonb_build_object('primary_member_id', p_primary, 'merged', v_merged, 'duplicate_ids', to_jsonb(p_duplicate_ids))
  );
  return jsonb_build_object('ok', true, 'merged', v_merged, 'primary_member_id', p_primary);
end;
$$;

create or replace function public.admin_convert_household(
  p_token text,
  p_primary uuid,
  p_links jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_item jsonb;
  v_count integer := 0;
begin
  v_admin := public._require_permission(p_token, 'church_members', 'edit');
  if p_links is null or jsonb_typeof(p_links) <> 'array' then
    raise exception 'Choose a relationship for each other member';
  end if;
  for v_item in select value from jsonb_array_elements(p_links)
  loop
    perform public._insert_household_link(
      p_primary,
      (v_item->>'member_id')::uuid,
      v_item->>'relationship',
      v_item->>'relationship_other',
      'approved',
      'admin',
      v_admin.id,
      coalesce((v_item->>'use_primary_email')::boolean, true)
    );
    v_count := v_count + 1;
  end loop;
  perform public._log_household_event(
    v_admin.id,
    'household_link_created',
    jsonb_build_object('primary_member_id', p_primary, 'converted', v_count, 'source', 'duplicates')
  );
  return jsonb_build_object('ok', true, 'linked', v_count);
end;
$$;

create or replace function public.submit_pending_beneficiary(p_primary uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_primary public.church_members%rowtype;
  v_person record;
  v_id uuid;
  v_link uuid;
  v_ids uuid[] := '{}';
  v_email text := lower(btrim(coalesce(p_payload->>'email', '')));
  v_phone text := public.normalize_phone(p_payload->>'phone');
begin
  select * into v_primary from public.church_members where id = p_primary;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'That account could not be found.');
  end if;
  if btrim(coalesce(v_primary.email, '')) <> '' then
    return jsonb_build_object('ok', false, 'message', 'Ask the account holder to approve this with the code sent to their email.');
  end if;
  if not (
    (v_email <> '' and lower(btrim(v_primary.email)) = v_email)
    or (length(v_phone) >= 10 and v_primary.phone_normalized = v_phone)
  ) then
    return jsonb_build_object('ok', false, 'message', 'The contact details do not match that account.');
  end if;
  if length(regexp_replace(coalesce(p_payload->>'phone', ''), '\D', '', 'g')) < 7 then
    return jsonb_build_object('ok', false, 'message', 'Enter a valid phone number.');
  end if;
  select * into v_person from public._compose_person_name(
    coalesce(p_payload->>'name_title', ''),
    coalesce(p_payload->>'first_name', ''),
    coalesce(p_payload->>'last_name', ''),
    coalesce(p_payload->>'full_name', '')
  );
  select id into v_ids[1] from public.church_roles where lower(name) = 'member' and is_active = true limit 1;
  if v_ids[1] is null then
    return jsonb_build_object('ok', false, 'message', 'Church roles are not ready yet.');
  end if;
  insert into public.church_members (
    name_title, first_name, last_name, full_name, email, phone, status,
    email_priority, email_priority_source, household_role, role_id, form_data
  ) values (
    v_person.name_title, v_person.first_name, v_person.last_name, v_person.full_name,
    '', btrim(coalesce(p_payload->>'phone', '')), 'pending',
    true, 'registration', 'beneficiary', v_ids[1], coalesce(p_payload->'form_data', '{}'::jsonb)
  ) returning id into v_id;
  perform public._set_member_roles(v_id, v_ids);
  v_link := public._insert_household_link(
    v_primary.id, v_id,
    p_payload->>'relationship', p_payload->>'relationship_other',
    'pending', 'self', null, true
  );
  perform public._log_household_event(
    null,
    'household_link_created',
    jsonb_build_object('link_id', v_link, 'primary_member_id', v_primary.id, 'beneficiary_member_id', v_id, 'status', 'pending')
  );
  return jsonb_build_object('ok', true, 'pending', true, 'id', v_id, 'fullName', v_person.full_name);
end;
$$;

drop function if exists public.submit_volunteer_application(text, text, text, text, uuid, text, text, text, text, text, text, text, text);

grant execute on function public.admin_member_household(text, uuid) to anon, authenticated;
grant execute on function public.admin_set_household_link(text, uuid, uuid, text, text, text, boolean) to anon, authenticated;
grant execute on function public.admin_review_household_link(text, uuid, text) to anon, authenticated;
grant execute on function public.admin_remove_household_link(text, uuid) to anon, authenticated;
grant execute on function public.admin_list_pending_household_links(text) to anon, authenticated;
grant execute on function public.admin_list_contact_duplicates(text) to anon, authenticated;
grant execute on function public.admin_merge_members(text, uuid, uuid[]) to anon, authenticated;
grant execute on function public.admin_convert_household(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.submit_pending_beneficiary(uuid, jsonb) to anon, authenticated;

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
  p_last_name text default '',
  p_form_data jsonb default '{}'::jsonb
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
    experience_level, availability, notes, status, assigned_admin_id, admin_seen, form_data
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
    false,
    coalesce(p_form_data, '{}'::jsonb)
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


create or replace function public.admin_list_activity(
  p_token text,
  p_limit integer default 200,
  p_admin_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_limit integer := greatest(1, least(coalesce(p_limit, 200), 1000));
begin
  v_admin := public._require_admin(p_token);
  if v_admin.role <> 'superadmin' then
    raise exception 'Only superadmins can view the activity log';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
    from (
      select
        l.id, l.admin_id, l.path, l.action, l.meta, l.user_agent, l.created_at,
        coalesce(a.username, 'Public') as username,
        a.email, a.role, a.full_name
      from public.admin_activity_log l
      left join public.admins a on a.id = l.admin_id
      where (p_admin_id is null or l.admin_id = p_admin_id)
      order by l.created_at desc
      limit v_limit
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.submit_volunteer_application(text, text, text, text, uuid, text, text, text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_list_activity(text, integer, uuid) to anon, authenticated;
grant execute on function public.service_issue_email_otp(text, text, jsonb, uuid) to service_role;
grant execute on function public.complete_email_otp(uuid, text) to anon, authenticated;
