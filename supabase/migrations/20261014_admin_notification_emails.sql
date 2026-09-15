-- Primary admin notification inbox: adenugaolajideadewale@gmail.com
-- Add secondaryNotificationEmails support + point media volunteer alerts away from info@

update public.site_settings
set value = jsonb_set(
  jsonb_set(
    coalesce(value, '{}'::jsonb),
    '{notificationEmail}',
    to_jsonb('adenugaolajideadewale@gmail.com'::text),
    true
  ),
  '{secondaryNotificationEmails}',
  coalesce(value->'secondaryNotificationEmails', '""'::jsonb),
  true
),
updated_at = now()
where key = 'site';

update public.site_settings
set value = jsonb_set(
  value,
  '{pages,contact,church,notificationEmail}',
  to_jsonb('adenugaolajideadewale@gmail.com'::text),
  true
),
updated_at = now()
where key = 'site'
  and value ? 'pages';

update public.site_settings
set value = jsonb_set(
  value,
  '{pages,contact,church,secondaryNotificationEmails}',
  coalesce(value->'secondaryNotificationEmails', '""'::jsonb),
  true
),
updated_at = now()
where key = 'site'
  and value ? 'pages';

update public.volunteer_teams
set admin_email = 'adenugaolajideadewale@gmail.com',
    updated_at = now()
where slug = 'media-department';

-- Preserve latest page-section logic; add secondaryNotificationEmails sync for contact.church
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
    'sermons','blog','testimonies','contact','prayer','join','donate','privacy','terms'
  ];
begin
  if p_page is null or p_section is null or not (p_page = any (v_allowed)) then
    raise exception 'Unknown page';
  end if;
  if p_section !~ '^[a-zA-Z0-9_]+$' then
    raise exception 'Unknown section';
  end if;

  if p_page = 'home' and p_section in ('monthWelcome', 'facebookLive') then
    v_admin := public._require_admin(p_token);
    if not (
      public._has_perm(v_admin, 'home.' || p_section, 'edit')
      or public._has_perm(v_admin, 'banners', 'edit')
      or public._has_perm(v_admin, 'home.announcements', 'edit')
    ) then
      raise exception 'You do not have permission to edit home.%', p_section;
    end if;
  else
    v_admin := public._require_permission(p_token, p_page || '.' || p_section, 'edit');
  end if;

  select value into v_value from public.site_settings where key = 'site';
  v_value := coalesce(v_value, '{}'::jsonb);
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
      'secondaryNotificationEmails', coalesce(
        p_data->>'secondaryNotificationEmails',
        v_value->>'secondaryNotificationEmails'
      ),
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

  insert into public.site_settings (key, value, updated_at)
  values ('site', v_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();

  return jsonb_build_object('ok', true, 'page', p_page, 'section', p_section);
end;
$$;

grant execute on function public.admin_update_page_section(text, text, text, jsonb) to anon, authenticated;
