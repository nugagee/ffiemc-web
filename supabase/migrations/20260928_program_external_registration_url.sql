-- Optional external registration URL: /register/:slug redirects visitors off-site when set.

alter table public.church_programs
  add column if not exists external_registration_url text not null default '';

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
  v_external text;
begin
  select * into v_row
  from public.church_programs
  where slug = lower(trim(p_slug))
    and is_active = true;

  if not found then
    raise exception 'Program not found';
  end if;

  v_external := trim(coalesce(v_row.external_registration_url, ''));

  if not v_row.allow_public_registration and v_external = '' then
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
    'formFields', case
      when v_external <> '' then '[]'::jsonb
      when v_status = 'open' then coalesce(v_row.form_fields, '[]'::jsonb)
      else '[]'::jsonb
    end,
    'pageContent', coalesce(v_row.page_content, '{}'::jsonb),
    'registrationStatus', v_status,
    'registrationOpensAt', v_row.registration_opens_at,
    'registrationClosesAt', v_row.registration_closes_at,
    'allowPublicRegistration', v_row.allow_public_registration,
    'externalRegistrationUrl', v_external
  );
end;
$$;

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
      'external_registration_url', coalesce(p.external_registration_url, ''),
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
  v_external text;
begin
  v_admin := public._require_permission(p_token, 'programs', 'edit');
  v_slug := lower(regexp_replace(trim(coalesce(p_data->>'slug', p_data->>'title', '')), '[^a-z0-9]+', '-', 'gi'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then raise exception 'Slug is required'; end if;

  v_page := coalesce(p_data->'page_content', p_data->'pageContent', '{}'::jsonb);
  if jsonb_typeof(v_page) <> 'object' then
    v_page := '{}'::jsonb;
  end if;

  v_external := trim(coalesce(
    p_data->>'external_registration_url',
    p_data->>'externalRegistrationUrl',
    ''
  ));
  if v_external <> '' and v_external !~* '^https?://' then
    raise exception 'External registration URL must start with http:// or https://';
  end if;

  if p_id is null then
    insert into public.church_programs (
      type_id, title, short_code, slug, description, venue, starts_at, ends_at,
      registration_opens_at, registration_closes_at, admin_email,
      form_fields, page_content, external_registration_url,
      is_active, allow_public_registration, sort_order, created_by
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
      v_external,
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
      external_registration_url = case
        when p_data ? 'external_registration_url' or p_data ? 'externalRegistrationUrl' then v_external
        else external_registration_url
      end,
      is_active = coalesce((p_data->>'is_active')::boolean, is_active),
      allow_public_registration = coalesce((p_data->>'allow_public_registration')::boolean, allow_public_registration),
      sort_order = coalesce((p_data->>'sort_order')::int, sort_order),
      updated_at = now()
    where id = p_id returning * into v_row;
  end if;
  return to_jsonb(v_row);
end; $$;

grant execute on function public.public_get_program(text) to anon, authenticated;
grant execute on function public.admin_list_programs(text) to anon, authenticated;
grant execute on function public.admin_upsert_program(text, uuid, jsonb) to anon, authenticated;
