-- Reopen Youth Convention registration until admin-set close date (flyer: 9–12 Sept 2026)
-- Also return program details even when the window is closed, so the public page can explain why.

update public.church_programs
set
  venue = 'Fire-Fire Headquarter Agric, Olomi-Olunde Road, Fire-Fire Area, Ibadan',
  starts_at = '2026-09-09T09:00:00+01:00'::timestamptz,
  ends_at = '2026-09-12T23:59:00+01:00'::timestamptz,
  registration_opens_at = least(coalesce(registration_opens_at, now()), now()),
  registration_closes_at = '2026-09-12T23:59:00+01:00'::timestamptz,
  is_active = true,
  allow_public_registration = true,
  updated_at = now()
where slug = 'youth-convention-2026';

create or replace function public.public_get_program(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.church_programs%rowtype;
  v_type_name text;
  v_status text := 'open';
begin
  select * into v_row
  from public.church_programs
  where slug = lower(trim(p_slug))
    and is_active = true;

  if not found then
    raise exception 'Program not found';
  end if;

  if not v_row.allow_public_registration then
    v_status := 'disabled';
  elsif v_row.registration_opens_at is not null and now() < v_row.registration_opens_at then
    v_status := 'not_open';
  elsif v_row.registration_closes_at is not null and now() > v_row.registration_closes_at then
    v_status := 'closed';
  else
    v_status := 'open';
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
    'formFields', case when v_status = 'open' then coalesce(v_row.form_fields, '[]'::jsonb) else '[]'::jsonb end,
    'registrationStatus', v_status,
    'registrationOpensAt', v_row.registration_opens_at,
    'registrationClosesAt', v_row.registration_closes_at,
    'allowPublicRegistration', v_row.allow_public_registration
  );
end;
$$;

grant execute on function public.public_get_program(text) to anon, authenticated;
