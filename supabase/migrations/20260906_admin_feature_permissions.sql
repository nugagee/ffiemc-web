-- Recognize form_dropdowns in admin permissions and keep church_members as a fallback for saving catalogs.

create or replace function public._can_manage_meetings(p_admin public.admins)
returns boolean
language plpgsql stable set search_path = public as $$
begin
  if p_admin.role = 'superadmin' then return true; end if;
  if public._has_perm(p_admin, 'church_meetings', 'view') then return true; end if;
  if public._has_perm(p_admin, 'church_meetings', 'edit') then return true; end if;
  return false;
end;
$$;

create or replace function public.admin_save_form_dropdowns(p_token text, p_catalogs jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_value jsonb;
begin
  v_admin := public._require_admin(p_token);
  if not (
    v_admin.role = 'superadmin'
    or public._has_perm(v_admin, 'form_dropdowns', 'edit')
    or public._has_perm(v_admin, 'church_members', 'edit')
  ) then
    raise exception 'You do not have permission to edit form dropdowns';
  end if;
  select coalesce(value, '{}'::jsonb) into v_value from public.site_settings where key = 'site';
  v_value := jsonb_set(coalesce(v_value, '{}'::jsonb), '{formDropdowns}', coalesce(p_catalogs, '[]'::jsonb), true);
  insert into public.site_settings (key, value, updated_at, updated_by)
  values ('site', v_value, now(), v_admin.id)
  on conflict (key) do update
    set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  return coalesce(p_catalogs, '[]'::jsonb);
end;
$$;

create or replace function public._has_perm(p_admin public.admins, p_feature text, p_action text)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_page text;
  v_section text;
  v_pages jsonb;
  v_sec jsonb;
  v_legacy text;
begin
  if p_admin.role = 'superadmin' then return true; end if;
  if p_feature is null or p_action is null then return false; end if;

  if p_feature in (
    'overview', 'visitors', 'contacts',
    'program_types', 'programs', 'program_registrations', 'church_roles', 'church_members',
    'church_branches', 'member_notifications', 'volunteer_applications', 'banners',
    'approvals', 'church_meetings', 'form_dropdowns'
  ) then
    if p_action = 'view' then
      return coalesce((p_admin.permissions -> p_feature ->> 'view')::boolean, false)
          or coalesce((p_admin.permissions -> p_feature ->> 'edit')::boolean, false)
          or coalesce((p_admin.permissions -> p_feature ->> 'delete')::boolean, false);
    end if;
    return coalesce((p_admin.permissions -> p_feature ->> p_action)::boolean, false);
  end if;

  v_pages := coalesce(p_admin.permissions -> 'pages', '{}'::jsonb);

  if position('.' in p_feature) > 0 then
    v_page := split_part(p_feature, '.', 1);
    v_section := split_part(p_feature, '.', 2);
    v_sec := v_pages -> v_page -> 'sections' -> v_section;
    if p_action = 'view' then
      if coalesce((v_pages -> v_page ->> 'access')::boolean, false)
        or coalesce((v_sec ->> 'edit')::boolean, false)
        or coalesce((v_sec ->> 'delete')::boolean, false) then
        return true;
      end if;
    elsif coalesce((v_sec ->> p_action)::boolean, false) then
      return true;
    end if;

    v_legacy := case p_feature
      when 'home.hero' then 'hero'
      when 'blog.posts' then 'blog'
      when 'events.list' then 'events'
      when 'sermons.list' then 'sermons'
      when 'ministries.list' then 'ministries'
      when 'testimonies.list' then 'testimonies'
      when 'prayer.inbox' then 'prayers'
      when 'contact.church' then 'website'
      when 'home.welcome' then 'website'
      when 'services.times' then 'website'
      else null
    end;
    if v_legacy is not null then
      if p_action = 'view' then
        return coalesce((p_admin.permissions -> v_legacy ->> 'view')::boolean, false)
            or coalesce((p_admin.permissions -> v_legacy ->> 'edit')::boolean, false)
            or coalesce((p_admin.permissions -> v_legacy ->> 'delete')::boolean, false);
      end if;
      return coalesce((p_admin.permissions -> v_legacy ->> p_action)::boolean, false);
    end if;
    return false;
  end if;

  if coalesce((v_pages -> p_feature ->> 'access')::boolean, false) then
    if p_action = 'view' then return true; end if;
    return exists (
      select 1 from jsonb_each(coalesce(v_pages -> p_feature -> 'sections', '{}'::jsonb)) s
      where coalesce((s.value ->> p_action)::boolean, false)
    );
  end if;
  return false;
end;
$$;
