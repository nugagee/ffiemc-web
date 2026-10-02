-- Email quality, registration OTP, and the priority send list.
-- Existing members stay in place and are left unverified (email_verified defaults to false).
-- OTP codes are issued only by service_issue_email_otp (service role / email-otp edge function).

alter table public.church_members
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verified_at timestamptz,
  add column if not exists email_priority boolean not null default false,
  add column if not exists email_priority_source text not null default '';

comment on column public.church_members.email_verified is
  'True only after the address confirms a 6-digit email code. Existing rows stay false.';
comment on column public.church_members.email_priority is
  'Included first when a bulk email is built. New registrations are flagged.';

create index if not exists church_members_email_priority_idx
  on public.church_members (email_priority, created_at desc);

create table if not exists public.email_send_settings (
  id integer primary key default 1 check (id = 1),
  max_recipients integer not null default 60 check (max_recipients between 1 and 500),
  skip_unverified boolean not null default false,
  skip_invalid boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.email_send_settings (id, max_recipients, skip_unverified, skip_invalid)
values (1, 60, false, true)
on conflict (id) do nothing;

comment on table public.email_send_settings is
  'Cap and filters for member announcements and other bulk email. skip_unverified defaults off so existing unverified members still receive mail until an admin turns it on.';

alter table public.email_send_settings enable row level security;
revoke all on table public.email_send_settings from public, anon, authenticated;

create table if not exists public.email_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null,
  payload jsonb not null default '{}'::jsonb,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  send_count integer not null default 1,
  resend_available_at timestamptz not null default now(),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_otp_challenges_email_idx
  on public.email_otp_challenges (email, created_at desc);

alter table public.email_otp_challenges enable row level security;
revoke all on table public.email_otp_challenges from public, anon, authenticated;

-- Mirrors src/lib/emailValidation.js
create or replace function public.validate_public_email(p_email text, p_required boolean default false)
returns jsonb
language plpgsql
immutable
as $$
declare
  v text;
  v_local text;
  v_domain text;
  v_compact text;
  v_letters text;
  v_suggestion text;
begin
  if p_email is null or btrim(p_email) = '' then
    if coalesce(p_required, false) then
      return jsonb_build_object('ok', false, 'message', 'Email is required', 'email', '');
    end if;
    return jsonb_build_object('ok', true, 'message', '', 'email', '');
  end if;
  if p_email ~ '\s' then
    return jsonb_build_object('ok', false, 'message', 'Email cannot contain spaces', 'email', '');
  end if;
  v := lower(btrim(p_email));
  if v ~ '\.@' or v ~ '\.\.' or split_part(v, '@', 1) ~ '^\.' or split_part(v, '@', 1) ~ '\.$' then
    return jsonb_build_object('ok', false, 'message', 'Email cannot have a dot immediately before @ or consecutive dots', 'email', '');
  end if;
  if v !~ '^[a-z0-9._%+-]+@[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$' then
    return jsonb_build_object('ok', false, 'message', 'Enter a valid email address', 'email', '');
  end if;
  v_local := split_part(v, '@', 1);
  v_domain := split_part(v, '@', 2);
  v_suggestion := case v_domain
    when 'gmal.com' then 'gmail.com'
    when 'gmil.com' then 'gmail.com'
    when 'gmial.com' then 'gmail.com'
    when 'gmai.com' then 'gmail.com'
    when 'gmaill.com' then 'gmail.com'
    when 'gamil.com' then 'gmail.com'
    when 'gnail.com' then 'gmail.com'
    when 'gmali.com' then 'gmail.com'
    when 'gmaul.com' then 'gmail.com'
    when 'gmeil.com' then 'gmail.com'
    when 'gmail.con' then 'gmail.com'
    when 'gmail.co' then 'gmail.com'
    when 'gmail.co.com' then 'gmail.com'
    when 'gmail.cm' then 'gmail.com'
    when 'gmail.om' then 'gmail.com'
    when 'gmail.cim' then 'gmail.com'
    when 'gmail.vom' then 'gmail.com'
    when 'gmail.xom' then 'gmail.com'
    when 'gmail.comm' then 'gmail.com'
    when 'gmailcom' then 'gmail.com'
    when '10gmail.com' then 'gmail.com'
    when 'yaho.com' then 'yahoo.com'
    when 'yahooo.com' then 'yahoo.com'
    when 'yahoo.con' then 'yahoo.com'
    when 'yhaoo.com' then 'yahoo.com'
    when 'hotmial.com' then 'hotmail.com'
    when 'hotmal.com' then 'hotmail.com'
    when 'hotmai.com' then 'hotmail.com'
    when 'hotmail.con' then 'hotmail.com'
    when 'outlok.com' then 'outlook.com'
    when 'outloo.com' then 'outlook.com'
    when 'outlook.con' then 'outlook.com'
    else null
  end;
  if v_suggestion is not null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Did you mean @' || v_suggestion || '?',
      'suggestion', v_local || '@' || v_suggestion,
      'email', ''
    );
  end if;
  if v_domain in (
    'example.com', 'example.org', 'example.net', 'test.com',
    'mailinator.com', 'guerrillamail.com', 'localhost'
  ) then
    return jsonb_build_object('ok', false, 'message', 'This looks like a placeholder email address', 'email', '');
  end if;
  v_compact := regexp_replace(v_local, '[._+-]', '', 'g');
  v_letters := regexp_replace(v_local, '[^a-z]', '', 'g');
  if v_compact ~ '^(test|none|fake|noemail|no-email|example|asdf|qwerty|abc|xxx|user|email|name|null|undefined|na)[0-9]*$'
     or length(v_compact) < 4
     or (length(v_letters) >= 3 and v_letters !~ '[aeiou]')
     or v_letters ~ '(asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwer|wert|erty|rtyu|tyui|yuio|uiop|zxcv|xcvb|cvbn|vbnm|asde|sdew)'
  then
    return jsonb_build_object('ok', false, 'message', 'This looks like a placeholder email address', 'email', '');
  end if;
  return jsonb_build_object('ok', true, 'message', '', 'email', v);
end;
$$;

create or replace function public.enforce_public_email()
returns trigger
language plpgsql
as $$
declare
  v jsonb;
  v_email text;
begin
  if tg_op = 'UPDATE'
     and lower(btrim(coalesce(new.email, ''))) = lower(btrim(coalesce(old.email, ''))) then
    return new;
  end if;
  v_email := btrim(coalesce(new.email, ''));
  if v_email = '' then
    new.email := '';
    return new;
  end if;
  v := public.validate_public_email(v_email, true);
  if coalesce((v->>'ok')::boolean, false) is not true then
    raise exception '%', coalesce(v->>'message', 'Enter a valid email address');
  end if;
  new.email := v->>'email';
  return new;
end;
$$;

drop trigger if exists church_members_email_quality on public.church_members;
create trigger church_members_email_quality
  before insert or update of email on public.church_members
  for each row execute function public.enforce_public_email();

drop trigger if exists program_registrations_email_quality on public.program_registrations;
create trigger program_registrations_email_quality
  before insert or update of email on public.program_registrations
  for each row execute function public.enforce_public_email();

drop trigger if exists volunteer_applications_email_quality on public.volunteer_applications;
create trigger volunteer_applications_email_quality
  before insert or update of email on public.volunteer_applications
  for each row execute function public.enforce_public_email();

drop trigger if exists contact_messages_email_quality on public.contact_messages;
create trigger contact_messages_email_quality
  before insert or update of email on public.contact_messages
  for each row execute function public.enforce_public_email();

drop trigger if exists prayer_requests_email_quality on public.prayer_requests;
create trigger prayer_requests_email_quality
  before insert or update of email on public.prayer_requests
  for each row execute function public.enforce_public_email();

drop trigger if exists testimonies_email_quality on public.testimonies;
create trigger testimonies_email_quality
  before insert or update of email on public.testimonies
  for each row execute function public.enforce_public_email();

drop trigger if exists experience_survey_email_quality on public.experience_survey_responses;
create trigger experience_survey_email_quality
  before insert or update of email on public.experience_survey_responses
  for each row execute function public.enforce_public_email();

create or replace function public.member_matches_priority_rules(p_member_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.church_member_roles mr
    join public.church_roles cr on cr.id = mr.role_id
    where mr.member_id = p_member_id
      and lower(btrim(cr.name)) in (
        'media team', 'youth leader', 'minister', 'pastor',
        'choir director', 'choir', 'deacon', 'worker'
      )
  )
  or exists (
    select 1
    from public.church_members m
    left join public.church_roles cr on cr.id = m.role_id
    where m.id = p_member_id
      and (
        lower(btrim(coalesce(cr.name, ''))) in (
          'media team', 'youth leader', 'minister', 'pastor',
          'choir director', 'choir', 'deacon', 'worker'
        )
        or lower(btrim(coalesce(m.ministry, ''))) in (
          'media team', 'youth leader', 'minister', 'pastor',
          'choir director', 'choir', 'choir / worship', 'deacon', 'worker'
        )
        or lower(btrim(coalesce(m.ministry, ''))) like 'choir%'
      )
  );
$$;

update public.church_members m
set email_priority = true,
    email_priority_source = 'rule'
where public.member_matches_priority_rules(m.id)
  and m.email_priority = false;

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
  if p_purpose not in ('membership', 'admin_membership') then
    raise exception 'Purpose not allowed';
  end if;
  v_check := public.validate_public_email(p_email, true);
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
    'resend_available_at', v_resend
  );
end;
$$;

revoke all on function public.service_issue_email_otp(text, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.service_issue_email_otp(text, text, jsonb, uuid) to service_role;

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
    email_verified, email_verified_at, email_priority, email_priority_source
  ) values (
    v_person.name_title, v_person.first_name, v_person.last_name, v_person.full_name,
    v_row.email, btrim(coalesce(v_payload->>'phone', '')), btrim(coalesce(v_payload->>'gender', '')), v_dob,
    btrim(coalesce(v_payload->>'address', '')), btrim(coalesce(v_payload->>'city', '')),
    btrim(coalesce(v_payload->>'state', '')), coalesce(nullif(btrim(v_payload->>'country'), ''), 'Nigeria'),
    v_ids[1], btrim(coalesce(v_payload->>'ministry', '')), btrim(coalesce(v_payload->>'baptism_status', '')),
    btrim(coalesce(v_payload->>'marital_status', '')), btrim(coalesce(v_payload->>'occupation', '')),
    btrim(coalesce(v_payload->>'emergency_contact_name', '')),
    btrim(coalesce(v_payload->>'emergency_contact_phone', '')),
    btrim(coalesce(v_payload->>'notes', '')),
    coalesce(v_payload->'form_data', '{}'::jsonb),
    v_branch,
    v_by_admin,
    case when v_by_admin then nullif(v_payload->>'admin_id', '')::uuid else null end,
    case when v_by_admin then 'approved' else 'pending' end,
    true, now(), true, 'registration'
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
    'email_verified', true
  );
end;
$$;

grant execute on function public.validate_public_email(text, boolean) to anon, authenticated, service_role;
grant execute on function public.complete_email_otp(uuid, text) to anon, authenticated;

-- Public registration cannot skip the code. Admins may save without one, and email is optional for them.
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
  v_email text;
  v_check jsonb;
begin
  if coalesce(p_by_admin, false) then
    v_admin := public._require_permission(p_admin_token, 'church_members', 'edit');
  else
    raise exception 'Enter the verification code sent to your email to complete registration';
  end if;
  if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 7 then
    raise exception 'Valid phone is required';
  end if;
  if cardinality(v_ids) = 0 and p_role_id is not null then
    v_ids := array[p_role_id];
  end if;
  if cardinality(v_ids) = 0 then raise exception 'Select at least one church role'; end if;

  v_email := lower(btrim(coalesce(p_email, '')));
  if v_email <> '' then
    v_check := public.validate_public_email(v_email, true);
    if coalesce((v_check->>'ok')::boolean, false) is not true then
      raise exception '%', coalesce(v_check->>'message', 'Enter a valid email address');
    end if;
    v_email := v_check->>'email';
  end if;

  select * into v_person from public._compose_person_name(p_name_title, p_first_name, p_last_name, p_full_name);
  if p_branch_id is not null then
    select name into v_branch_name from public.church_branches where id = p_branch_id and is_active = true;
  end if;

  insert into public.church_members (
    name_title, first_name, last_name, full_name, email, phone, gender, date_of_birth, address, city, state, country,
    role_id, ministry, baptism_status, marital_status, occupation,
    emergency_contact_name, emergency_contact_phone, notes, form_data, branch_id,
    registered_by_admin, admin_id, status,
    email_verified, email_verified_at, email_priority, email_priority_source
  ) values (
    v_person.name_title, v_person.first_name, v_person.last_name, v_person.full_name,
    v_email, trim(p_phone), trim(coalesce(p_gender, '')),
    p_date_of_birth, trim(coalesce(p_address, '')), trim(coalesce(p_city, '')),
    trim(coalesce(p_state, '')), coalesce(nullif(trim(p_country), ''), 'Nigeria'),
    v_ids[1], trim(coalesce(p_ministry, '')), trim(coalesce(p_baptism_status, '')),
    trim(coalesce(p_marital_status, '')), trim(coalesce(p_occupation, '')),
    trim(coalesce(p_emergency_contact_name, '')), trim(coalesce(p_emergency_contact_phone, '')),
    trim(coalesce(p_notes, '')), coalesce(p_form_data, '{}'::jsonb), p_branch_id,
    true, v_admin.id, 'approved',
    false, null, true, 'registration'
  ) returning id into v_id;

  v_role_name := public._set_member_roles(v_id, v_ids);

  return jsonb_build_object(
    'id', v_id, 'fullName', v_person.full_name, 'firstName', v_person.first_name,
    'email', v_email,
    'roleName', v_role_name, 'branchName', coalesce(v_branch_name, ''),
    'email_verified', false, 'email_priority', true
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
      'email_sent', m.email_sent,
      'email_verified', m.email_verified,
      'email_verified_at', m.email_verified_at,
      'email_priority', m.email_priority,
      'email_priority_source', m.email_priority_source,
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
    email = case
      when p_data ? 'email' then lower(btrim(coalesce(p_data->>'email', '')))
      else email
    end,
    email_verified = case
      when p_data ? 'email'
        and lower(btrim(coalesce(p_data->>'email', ''))) is distinct from lower(btrim(coalesce(email, '')))
        then false
      else email_verified
    end,
    email_verified_at = case
      when p_data ? 'email'
        and lower(btrim(coalesce(p_data->>'email', ''))) is distinct from lower(btrim(coalesce(email, '')))
        then null
      else email_verified_at
    end,
    email_priority = case
      when p_data ? 'email_priority' then coalesce((p_data->>'email_priority')::boolean, false)
      else email_priority
    end,
    email_priority_source = case
      when p_data ? 'email_priority' and coalesce((p_data->>'email_priority')::boolean, false) then 'manual'
      when p_data ? 'email_priority' then ''
      else email_priority_source
    end,
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

  if not (p_data ? 'email_priority') and public.member_matches_priority_rules(p_id) then
    update public.church_members
    set email_priority = true,
        email_priority_source = case
          when email_priority_source in ('manual', 'registration') then email_priority_source
          else 'rule'
        end
    where id = p_id and email_priority = false
    returning * into v_row;
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
      email = case
        when d ? 'email' then lower(btrim(coalesce(d->>'email', '')))
        else email
      end,
      email_verified = case
        when d ? 'email'
          and lower(btrim(coalesce(d->>'email', ''))) is distinct from lower(btrim(coalesce(email, '')))
          then false
        else email_verified
      end,
      email_verified_at = case
        when d ? 'email'
          and lower(btrim(coalesce(d->>'email', ''))) is distinct from lower(btrim(coalesce(email, '')))
          then null
        else email_verified_at
      end,
      email_priority = case
        when d ? 'email_priority' then coalesce((d->>'email_priority')::boolean, false)
        else email_priority
      end,
      email_priority_source = case
        when d ? 'email_priority' and coalesce((d->>'email_priority')::boolean, false) then 'manual'
        when d ? 'email_priority' then ''
        else email_priority_source
      end,
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
      lower(btrim(r.email)) as email,
      r.phone,
      coalesce(m.email_priority, false) as is_priority,
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
    where nullif(btrim(r.email), '') is not null
  ),
  filtered as (
    select *
    from raw
    where (
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
    order by filtered.email, filtered.is_priority desc, filtered.full_name
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

create or replace function public.admin_preview_notification_recipients(
  p_token text,
  p_filters jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_recipients jsonb;
  v_audience integer;
  v_max integer;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'member_notifications', 'view') then
    raise exception 'You do not have permission to preview recipients';
  end if;
  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  into v_recipients
  from (
    select row_number() over () as ord, q.*
    from public._bulk_email_recipients(coalesce(p_filters, '{}'::jsonb)) q
  ) r;
  select count(*) into v_audience from public._notification_recipients(coalesce(p_filters, '{}'::jsonb));
  select max_recipients into v_max from public.email_send_settings where id = 1;
  return jsonb_build_object(
    'recipients', coalesce(v_recipients, '[]'::jsonb),
    'email_count', coalesce(jsonb_array_length(v_recipients), 0),
    'audience_count', coalesce(v_audience, 0),
    'max_recipients', coalesce(v_max, 60)
  );
end;
$$;

create or replace function public.admin_start_member_notification(p_token text, p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_admin public.admins;
  v_row public.member_notifications%rowtype;
  v_count integer;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'member_notifications', 'edit') then
    raise exception 'You do not have permission to send member notifications';
  end if;

  select * into v_row from public.member_notifications where id = p_id for update;
  if not found then raise exception 'Notification not found'; end if;
  if v_row.status = 'sending' then
    raise exception 'Notification is already sending';
  end if;
  if not v_row.send_email and not v_row.send_sms then
    raise exception 'Select at least one channel (email or SMS)';
  end if;
  if trim(v_row.title) = '' or trim(v_row.body) = '' then
    raise exception 'Title and message body are required';
  end if;

  delete from public.member_notification_deliveries where notification_id = p_id;

  if v_row.send_email then
    insert into public.member_notification_deliveries (
      notification_id, recipient_type, recipient_id, full_name, email, phone, channel, status
    )
    select
      p_id, r.recipient_type, r.recipient_id, coalesce(r.full_name, ''),
      coalesce(r.email, ''), coalesce(r.phone, ''), 'email', 'pending'
    from public._bulk_email_recipients(v_row.audience_filters) r;
  end if;

  if v_row.send_sms then
    insert into public.member_notification_deliveries (
      notification_id, recipient_type, recipient_id, full_name, email, phone, channel, status
    )
    select
      p_id, r.recipient_type, r.recipient_id, coalesce(r.full_name, ''),
      coalesce(r.email, ''), coalesce(r.phone, ''), 'sms', 'pending'
    from public._notification_recipients(v_row.audience_filters) r
    where nullif(btrim(r.phone), '') is not null;
  end if;

  select count(*) into v_count
  from public.member_notification_deliveries
  where notification_id = p_id;
  if coalesce(v_count, 0) = 0 then
    raise exception 'No recipients match the selected audience';
  end if;

  update public.member_notifications
  set status = 'sending', recipient_count = v_count, admin_id = v_admin.id, updated_at = now()
  where id = p_id;

  return jsonb_build_object(
    'notification_id', p_id,
    'recipient_count', v_count,
    'deliveries', (
      select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
      from public.member_notification_deliveries d
      where d.notification_id = p_id and d.status = 'pending'
    )
  );
end;
$$;

create or replace function public.admin_start_meeting_invites(p_token text, p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
  v_row public.church_meetings%rowtype;
  v_count integer;
begin
  v_admin := public._require_admin(p_token);
  if not (v_admin.role = 'superadmin' or public._has_perm(v_admin, 'church_meetings', 'edit')) then
    raise exception 'You do not have permission to send meeting invites';
  end if;

  select * into v_row from public.church_meetings where id = p_id for update;
  if not found then raise exception 'Meeting not found'; end if;
  if v_row.status = 'cancelled' then raise exception 'Cancelled meetings cannot be sent'; end if;
  if trim(v_row.title) = '' then raise exception 'Title is required'; end if;

  delete from public.church_meeting_invites where meeting_id = p_id;

  insert into public.church_meeting_invites (
    meeting_id, recipient_type, recipient_id, full_name, email, status
  )
  select
    p_id,
    coalesce(r.recipient_type, 'member'),
    r.recipient_id,
    coalesce(r.full_name, ''),
    coalesce(r.email, ''),
    'pending'
  from public._bulk_email_recipients(v_row.audience_filters) r
  where nullif(btrim(r.email), '') is not null;

  select count(*) into v_count from public.church_meeting_invites where meeting_id = p_id;
  if coalesce(v_count, 0) = 0 then
    raise exception 'No recipients match the selected audience';
  end if;

  update public.church_meetings
  set recipient_count = v_count, admin_id = v_admin.id, updated_at = now()
  where id = p_id;

  return jsonb_build_object(
    'meeting_id', p_id,
    'recipient_count', v_count,
    'invites', (
      select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
      from public.church_meeting_invites i
      where i.meeting_id = p_id and i.status = 'pending'
    )
  );
end;
$$;

create or replace function public._require_email_admin(p_token text, p_action text)
returns public.admins
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if public._has_perm(v_admin, 'member_notifications', p_action)
     or public._has_perm(v_admin, 'church_members', p_action) then
    return v_admin;
  end if;
  raise exception 'You do not have permission to manage the email priority list';
end;
$$;

revoke all on function public._require_email_admin(text, text) from public, anon, authenticated;

create or replace function public.admin_list_email_priority(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_email_admin(p_token, 'view');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id,
      'full_name', m.full_name,
      'email', m.email,
      'phone', m.phone,
      'ministry', m.ministry,
      'status', m.status,
      'email_verified', m.email_verified,
      'email_priority_source', m.email_priority_source,
      'role_name', coalesce((
        select string_agg(cr.name, ', ' order by cr.name)
        from public.church_member_roles mr
        join public.church_roles cr on cr.id = mr.role_id
        where mr.member_id = m.id
      ), '')
    ) order by m.full_name)
    from public.church_members m
    where m.email_priority = true
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_set_member_email_priority(
  p_token text,
  p_id uuid,
  p_priority boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.church_members%rowtype;
begin
  perform public._require_email_admin(p_token, 'edit');
  update public.church_members
  set email_priority = coalesce(p_priority, false),
      email_priority_source = case when coalesce(p_priority, false) then 'manual' else '' end,
      updated_at = now()
  where id = p_id
  returning * into v_row;
  if not found then raise exception 'Member not found'; end if;
  return jsonb_build_object('id', v_row.id, 'email_priority', v_row.email_priority);
end;
$$;

create or replace function public.admin_resync_email_priority(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_added integer;
begin
  perform public._require_email_admin(p_token, 'edit');
  update public.church_members m
  set email_priority = true,
      email_priority_source = case
        when m.email_priority_source in ('manual', 'registration') then m.email_priority_source
        else 'rule'
      end
  where public.member_matches_priority_rules(m.id)
    and m.email_priority = false;
  get diagnostics v_added = row_count;
  return jsonb_build_object('added', v_added);
end;
$$;

create or replace function public.admin_get_email_send_settings(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.email_send_settings%rowtype;
begin
  perform public._require_email_admin(p_token, 'view');
  select * into v_row from public.email_send_settings where id = 1;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_update_email_send_settings(p_token text, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.email_send_settings%rowtype;
  v_max integer;
begin
  perform public._require_email_admin(p_token, 'edit');
  v_max := coalesce((p_data->>'max_recipients')::integer, 60);
  if v_max < 1 or v_max > 500 then
    raise exception 'Max emails per send must be between 1 and 500';
  end if;
  update public.email_send_settings
  set max_recipients = v_max,
      skip_unverified = coalesce((p_data->>'skip_unverified')::boolean, skip_unverified),
      skip_invalid = coalesce((p_data->>'skip_invalid')::boolean, skip_invalid),
      updated_at = now()
  where id = 1
  returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_preview_email_send(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb;
  v_recipients jsonb;
begin
  perform public._require_email_admin(p_token, 'view');
  select to_jsonb(s) into v_settings from public.email_send_settings s where s.id = 1;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.ord), '[]'::jsonb)
  into v_recipients
  from (
    select row_number() over () as ord, q.*
    from public._bulk_email_recipients('{}'::jsonb) q
  ) r;
  return jsonb_build_object(
    'settings', v_settings,
    'recipients', coalesce(v_recipients, '[]'::jsonb),
    'email_count', coalesce(jsonb_array_length(v_recipients), 0)
  );
end;
$$;

grant execute on function public.submit_church_membership(text, text, text, text, date, text, text, text, text, uuid, text, text, text, text, text, text, text, jsonb, boolean, text, uuid, uuid[], text, text, text) to anon, authenticated;
grant execute on function public.admin_list_church_members(text, uuid, uuid, text) to anon, authenticated;
grant execute on function public.admin_update_church_member(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_preview_notification_recipients(text, jsonb) to anon, authenticated;
grant execute on function public.admin_start_member_notification(text, uuid) to anon, authenticated;
grant execute on function public.admin_start_meeting_invites(text, uuid) to anon, authenticated;
grant execute on function public.admin_list_email_priority(text) to anon, authenticated;
grant execute on function public.admin_set_member_email_priority(text, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_resync_email_priority(text) to anon, authenticated;
grant execute on function public.admin_get_email_send_settings(text) to anon, authenticated;
grant execute on function public.admin_update_email_send_settings(text, jsonb) to anon, authenticated;
grant execute on function public.admin_preview_email_send(text) to anon, authenticated;
