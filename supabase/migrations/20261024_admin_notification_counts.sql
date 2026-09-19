-- Admin inbox notification counts: prayer unseen + contacts/surveys + mark prayer seen.

alter table public.prayer_requests
  add column if not exists admin_seen boolean not null default false;

update public.prayer_requests
set admin_seen = true
where admin_seen = false
  and status is distinct from 'new';

create index if not exists prayer_requests_admin_seen_idx
  on public.prayer_requests (admin_seen)
  where admin_seen = false;

create or replace function public.admin_mark_prayer_requests_seen(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_permission(p_token, 'prayer.inbox', 'view');
  if v_admin.role = 'pastor' then
    update public.prayer_requests
    set admin_seen = true
    where admin_seen = false
      and assigned_pastor_id = v_admin.id;
  else
    update public.prayer_requests
    set admin_seen = true
    where admin_seen = false;
  end if;
end;
$$;

grant execute on function public.admin_mark_prayer_requests_seen(text) to anon, authenticated;

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
  v_prayer_unseen integer := 0;
  v_contacts_new integer := 0;
  v_surveys_new integer := 0;
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

  if v_admin.role = 'superadmin'
     or coalesce((v_admin.permissions -> 'approvals' ->> 'view')::boolean, false)
     or coalesce((v_admin.permissions -> 'approvals' ->> 'edit')::boolean, false) then
    select count(*) into v_approvals_pending
    from public.admin_change_requests
    where status = 'pending';
  end if;

  select count(*) into v_my_pending
  from public.admin_change_requests
  where status = 'pending' and requested_by = v_admin.id;

  if public._has_perm(v_admin, 'volunteer_applications', 'view') then
    select count(*) into v_vol_unseen
    from public.volunteer_applications
    where admin_seen = false;
  end if;

  if public._has_perm(v_admin, 'program_registrations', 'view') then
    select count(*) into v_prog_total
    from public.program_registrations
    where admin_seen = false;
  end if;

  if public._has_perm(v_admin, 'prayer.inbox', 'view') or v_admin.role = 'pastor' then
    select count(*) into v_prayer_unseen
    from public.prayer_requests r
    where r.admin_seen = false
      and (
        v_admin.role <> 'pastor'
        or r.assigned_pastor_id = v_admin.id
      );
  end if;

  if public._has_perm(v_admin, 'contacts', 'view') then
    select count(*) into v_contacts_new
    from public.contact_messages
    where status = 'new';
  end if;

  if public._has_perm(v_admin, 'experience_surveys', 'view') then
    select count(*) into v_surveys_new
    from public.experience_survey_responses
    where status = 'new';
  end if;

  return jsonb_build_object(
    'members_pending', v_members_pending,
    'members_approved', v_members_approved,
    'members_all', v_members_all,
    'approvals_pending', v_approvals_pending,
    'my_requests_pending', v_my_pending,
    'volunteer_unseen', v_vol_unseen,
    'program_regs_unseen_total', v_prog_total,
    'prayer_unseen', v_prayer_unseen,
    'contacts_new', v_contacts_new,
    'surveys_new', v_surveys_new,
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

grant execute on function public.admin_inbox_counts(text) to anon, authenticated;
