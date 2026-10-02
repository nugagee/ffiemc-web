-- jsonb_build_object is limited to 100 arguments (50 fields).
-- Build the member row from to_jsonb and overlay computed fields.

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
    select jsonb_agg(
      (
        (to_jsonb(m) - 'admin_id')
        || jsonb_build_object(
          'role_name', coalesce((
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
          'branch_name', b.name,
          'branch_region', b.region,
          'registration_categories', to_jsonb(coalesce(m.registration_categories, '{}')),
          'audience_teams', to_jsonb(coalesce(m.audience_teams, '{}')),
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
          )
        )
      )
      order by m.created_at desc
    )
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

grant execute on function public.admin_list_church_members(text, uuid, uuid, text) to anon, authenticated;
