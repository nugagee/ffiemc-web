-- Harden nested page section writes (pastoral team, departments, etc.)
-- Run in Supabase SQL Editor if schema was already applied.

create or replace function public.admin_update_page_section(
  p_token text,
  p_page text,
  p_section text,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_value jsonb;
  v_allowed text[] := array[
    'home','about','services','leadership','ministries','events',
    'sermons','blog','testimonies','contact','prayer','donate'
  ];
begin
  if p_page is null or p_section is null or not (p_page = any (v_allowed)) then
    raise exception 'Unknown page';
  end if;
  if p_section !~ '^[a-zA-Z0-9_]+$' then
    raise exception 'Unknown section';
  end if;

  v_admin := public._require_permission(p_token, p_page || '.' || p_section, 'edit');

  select value into v_value from public.site_settings where key = 'site';
  v_value := coalesce(v_value, '{}'::jsonb);
  -- Ensure nested pages.{page}.{section} exists (jsonb_set needs parents step-by-step)
  v_value := jsonb_set(v_value, '{pages}', coalesce(v_value->'pages', '{}'::jsonb), true);
  v_value := jsonb_set(
    v_value,
    array['pages', p_page],
    coalesce(v_value->'pages'->p_page, '{}'::jsonb),
    true
  );
  v_value := jsonb_set(v_value, array['pages', p_page, p_section], coalesce(p_data, '{}'::jsonb), true);

  if p_page = 'home' and p_section = 'welcome' then
    v_value := v_value || jsonb_build_object(
      'welcomeHeadline', coalesce(p_data->>'headline', v_value->>'welcomeHeadline'),
      'welcomeBody', coalesce(p_data->>'body', v_value->>'welcomeBody')
    );
  elsif p_page = 'home' and p_section = 'stats' then
    v_value := jsonb_set(v_value, '{stats}', coalesce(p_data->'items', '[]'::jsonb), true);
  elsif p_page = 'about' and p_section = 'mission' then
    v_value := v_value || jsonb_build_object(
      'motto', coalesce(p_data->>'motto', v_value->>'motto'),
      'mission', coalesce(p_data->>'mission', v_value->>'mission')
    );
  elsif p_page = 'services' and p_section = 'hero' then
    v_value := v_value || jsonb_build_object('servicesIntro', coalesce(p_data->>'intro', v_value->>'servicesIntro'));
  elsif p_page = 'services' and p_section = 'times' then
    v_value := jsonb_set(v_value, '{serviceTimes}', coalesce(p_data->'items', '[]'::jsonb), true);
  elsif p_page = 'services' and p_section = 'programmes' then
    v_value := jsonb_set(v_value, '{programmes}', coalesce(p_data->'items', '[]'::jsonb), true);
  elsif p_page = 'contact' and p_section = 'church' then
    v_value := v_value || jsonb_build_object(
      'name', coalesce(p_data->>'name', v_value->>'name'),
      'pastor', coalesce(p_data->>'pastor', v_value->>'pastor'),
      'logo', coalesce(p_data->>'logo', v_value->>'logo'),
      'location', coalesce(p_data->>'location', v_value->>'location'),
      'phone', coalesce(p_data->>'phone', v_value->>'phone'),
      'email', coalesce(p_data->>'email', v_value->>'email'),
      'notificationEmail', coalesce(p_data->>'notificationEmail', v_value->>'notificationEmail'),
      'socials', jsonb_build_object(
        'facebook', coalesce(p_data->>'facebook', ''),
        'twitter', coalesce(p_data->>'twitter', ''),
        'instagram', coalesce(p_data->>'instagram', ''),
        'tiktok', coalesce(p_data->>'tiktok', ''),
        'youtube', coalesce(p_data->>'youtube', ''),
        'audiomack', coalesce(p_data->>'audiomack', '')
      )
    );
  end if;

  insert into public.site_settings (key, value, updated_at, updated_by)
  values ('site', v_value, now(), v_admin.id)
  on conflict (key) do update
    set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;

  return coalesce(p_data, '{}'::jsonb);
end;
$$;
