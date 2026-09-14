-- Import social media team roster from registered church members (Media / Social Media)
-- and media-department volunteer applications.

create or replace function public.admin_sync_media_team_members(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
  v_skipped integer := 0;
  v_total_candidates integer := 0;
  r record;
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'edit');

  for r in
    with members as (
      select distinct on (lower(trim(c.full_name)))
        trim(c.full_name) as full_name,
        coalesce(trim(c.email), '') as email,
        coalesce(trim(c.phone), '') as phone,
        coalesce(nullif(trim(c.ministry), ''), 'Media') as role_label,
        'Imported from church members'::text as notes
      from public.church_members c
      where coalesce(trim(c.full_name), '') <> ''
        and c.status in ('pending', 'approved', 'active')
        and (
          c.ministry ~* '(^|[^a-z])media([^a-z]|$)|social\s*media'
          or coalesce(c.form_data::text, '') ~* 'social\s*media|media\s*team|media\s*department'
          or exists (
            select 1
            from public.church_member_roles mr
            join public.church_roles cr on cr.id = mr.role_id
            where mr.member_id = c.id
              and cr.name ~* 'media|social'
          )
          or exists (
            select 1
            from public.church_roles cr
            where cr.id = c.role_id
              and cr.name ~* 'media|social'
          )
        )
      order by lower(trim(c.full_name)), c.created_at desc
    ),
    volunteers as (
      select distinct on (lower(trim(va.full_name)))
        trim(va.full_name) as full_name,
        coalesce(trim(va.email), '') as email,
        coalesce(trim(va.phone), '') as phone,
        coalesce(nullif(trim(va.role_interest), ''), 'Media team') as role_label,
        'Imported from media volunteer applications'::text as notes
      from public.volunteer_applications va
      join public.volunteer_teams vt on vt.id = va.team_id
      where vt.slug = 'media-department'
        and va.status in ('approved', 'pending', 'waitlist')
        and coalesce(trim(va.full_name), '') <> ''
      order by lower(trim(va.full_name)), va.created_at desc
    ),
    candidates as (
      select * from members
      union
      select * from volunteers
    )
    select *
    from candidates
    order by full_name
  loop
    v_total_candidates := v_total_candidates + 1;

    if exists (
      select 1
      from public.social_media_team_members m
      where lower(trim(m.full_name)) = lower(trim(r.full_name))
         or (
           nullif(trim(r.email), '') is not null
           and lower(trim(m.email)) = lower(trim(r.email))
         )
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.social_media_team_members (
      full_name, email, phone, role_label, is_active, sort_order, notes
    ) values (
      r.full_name,
      r.email,
      r.phone,
      r.role_label,
      true,
      v_inserted,
      r.notes
    );
    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object(
    'inserted', v_inserted,
    'skipped', v_skipped,
    'candidates', v_total_candidates,
    'members', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.sort_order asc, m.full_name asc)
      from public.social_media_team_members m
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_sync_media_team_members(text) to anon, authenticated;
