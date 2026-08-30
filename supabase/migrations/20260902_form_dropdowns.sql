-- Form dropdown catalogs stored on site_settings.formDropdowns
-- Public read; admins with church_members edit can update.

create or replace function public.public_form_dropdowns()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value -> 'formDropdowns' from public.site_settings where key = 'site'),
    '[]'::jsonb
  );
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
  v_admin := public._require_permission(p_token, 'church_members', 'edit');
  select coalesce(value, '{}'::jsonb) into v_value from public.site_settings where key = 'site';
  v_value := jsonb_set(coalesce(v_value, '{}'::jsonb), '{formDropdowns}', coalesce(p_catalogs, '[]'::jsonb), true);
  insert into public.site_settings (key, value, updated_at, updated_by)
  values ('site', v_value, now(), v_admin.id)
  on conflict (key) do update
    set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  return coalesce(p_catalogs, '[]'::jsonb);
end;
$$;

grant execute on function public.public_form_dropdowns() to anon, authenticated;
grant execute on function public.admin_save_form_dropdowns(text, jsonb) to anon, authenticated;
