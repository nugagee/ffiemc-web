-- Fix member announcement recipients.
-- Uninitialized filter arrays were NULL; cardinality(NULL) = 0 is unknown, so the WHERE
-- clause matched nobody — including newly registered (pending) members.
-- Public /join-church sign-ups stay pending until approved; "All registered members" includes them.

insert into public.notification_categories (name, slug, description, filters, sort_order) values
  ('All registered members', 'all-members', 'Every member in the registry, including pending applications', '{"statuses":[],"source":"members"}', 1),
  ('All active members', 'all-active-members', 'Approved and active bonafide members (excludes pending)', '{"statuses":["approved","active"],"source":"members"}', 2),
  ('Pending members', 'pending-members', 'New registrations waiting for approval', '{"statuses":["pending"],"source":"members"}', 3)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  filters = excluded.filters,
  sort_order = excluded.sort_order,
  is_active = true;

update public.notification_categories
set sort_order = 4, is_active = true
where slug = 'program-registrants';

update public.notification_categories
set sort_order = 5, is_active = true
where slug = 'international-members';

update public.notification_categories
set sort_order = 6, is_active = true
where slug = 'local-members';

update public.notification_categories
set sort_order = 7, is_active = true
where slug = 'pastoral-team';

update public.notification_categories
set sort_order = 8, is_active = true
where slug = 'youth-leaders';

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
  left join public.church_roles r on r.id = m.role_id
  left join public.church_branches b on b.id = m.branch_id
  where m.status is distinct from 'inactive'
    and (
      cardinality(v_statuses) = 0
      or m.status = any(v_statuses)
    )
    and (cardinality(v_role_ids) = 0 or m.role_id = any(v_role_ids))
    and (cardinality(v_branch_ids) = 0 or m.branch_id = any(v_branch_ids))
    and (cardinality(v_role_names) = 0 or r.name = any(v_role_names))
    and (cardinality(v_branch_regions) = 0 or coalesce(b.region, '') = any(v_branch_regions))
    and (v_ministry is null or m.ministry ilike '%' || v_ministry || '%');
end;
$$;
