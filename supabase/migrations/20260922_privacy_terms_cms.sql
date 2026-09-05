-- CMS + permissions for Privacy Policy and Terms of Service pages.

create or replace function public._sanitize_permissions(p_permissions jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v jsonb := '{}'::jsonb;
  v_pages jsonb := '{}'::jsonb;
  v_page text;
  v_section text;
  v_feature text;
  v_page_src jsonb;
  v_sec_src jsonb;
  v_feat_src jsonb;
  v_sections jsonb;
  v_access boolean;
  v_edit boolean;
  v_delete boolean;
  v_view boolean;
  v_catalog jsonb := '{
    "home": ["hero","announcements","welcome","stats","eventsPreview","sermonsPreview","blogPreview","ministriesPreview","cta","testimoniesPreview","social"],
    "about": ["hero","mission","values","doctrines","catechism","history","pastor","visit"],
    "services": ["hero","times","programmes","expect","guidelines","cta"],
    "leadership": ["hero","team","youthEscos","departments","values","cta"],
    "ministries": ["hero","network","departments","bibleSchool","list"],
    "events": ["hero","list"],
    "sermons": ["hero","list"],
    "testimonies": ["hero","list"],
    "blog": ["hero","posts"],
    "contact": ["hero","church","hours"],
    "prayer": ["hero","categories","inbox","pastors"],
    "join": ["hero"],
    "donate": ["hero","purposes","accounts"],
    "privacy": ["hero","sections"],
    "terms": ["hero","sections"]
  }'::jsonb;
  v_features text[] := array[
    'overview', 'visitors', 'contacts', 'banners',
    'program_types', 'programs', 'church_branches', 'church_roles', 'member_notifications',
    'program_registrations', 'volunteer_applications', 'church_members', 'form_dropdowns',
    'approvals', 'church_meetings', 'utilities'
  ];
begin
  if p_permissions is null or jsonb_typeof(p_permissions) <> 'object' then
    return jsonb_build_object(
      'overview', jsonb_build_object('view', false),
      'visitors', jsonb_build_object('view', false),
      'contacts', jsonb_build_object('view', false, 'edit', false, 'delete', false),
      'pages', '{}'::jsonb
    );
  end if;

  foreach v_feature in array v_features
  loop
    v_feat_src := coalesce(p_permissions->v_feature, '{}'::jsonb);
    if v_feature in ('overview', 'visitors') then
      v := v || jsonb_build_object(
        v_feature,
        jsonb_build_object(
          'view', coalesce((v_feat_src->>'view')::boolean, false)
        )
      );
    elsif v_feature = 'form_dropdowns' then
      v_edit := coalesce((v_feat_src->>'edit')::boolean, false);
      v_view := coalesce((v_feat_src->>'view')::boolean, false) or v_edit;
      v := v || jsonb_build_object(
        v_feature,
        jsonb_build_object('view', v_view, 'edit', v_edit)
      );
    elsif v_feature = 'approvals' then
      v_edit := coalesce((v_feat_src->>'edit')::boolean, false);
      v_view := coalesce((v_feat_src->>'view')::boolean, false) or v_edit;
      v := v || jsonb_build_object(
        v_feature,
        jsonb_build_object('view', v_view, 'edit', v_edit)
      );
    else
      v_edit := coalesce((v_feat_src->>'edit')::boolean, false);
      v_delete := coalesce((v_feat_src->>'delete')::boolean, false);
      if v_delete then v_edit := true; end if;
      v_view := coalesce((v_feat_src->>'view')::boolean, false) or v_edit or v_delete;
      v := v || jsonb_build_object(
        v_feature,
        jsonb_build_object('view', v_view, 'edit', v_edit, 'delete', v_delete)
      );
    end if;
  end loop;

  for v_page in select jsonb_object_keys(v_catalog)
  loop
    v_page_src := coalesce(p_permissions->'pages'->v_page, '{}'::jsonb);
    v_sections := '{}'::jsonb;
    v_access := coalesce((v_page_src->>'access')::boolean, false);

    for v_section in select jsonb_array_elements_text(v_catalog->v_page)
    loop
      v_sec_src := coalesce(v_page_src->'sections'->v_section, '{}'::jsonb);
      v_edit := coalesce((v_sec_src->>'edit')::boolean, false);
      v_delete := coalesce((v_sec_src->>'delete')::boolean, false);
      if v_delete then v_edit := true; end if;
      if v_edit or v_delete then v_access := true; end if;
      v_sections := v_sections || jsonb_build_object(
        v_section,
        jsonb_build_object('edit', v_edit, 'delete', v_delete)
      );
    end loop;

    -- legacy flat keys
    if v_page = 'home' then
      if coalesce((p_permissions->'hero'->>'edit')::boolean, false) then
        v_sections := jsonb_set(v_sections, '{hero,edit}', 'true'::jsonb);
        v_access := true;
      end if;
      if coalesce((p_permissions->'hero'->>'delete')::boolean, false) then
        v_sections := jsonb_set(v_sections, '{hero,delete}', 'true'::jsonb);
        v_access := true;
      end if;
      if coalesce((p_permissions->'website'->>'edit')::boolean, false) then
        v_sections := jsonb_set(v_sections, '{welcome,edit}', 'true'::jsonb);
        v_access := true;
      end if;
    elsif v_page = 'blog' and coalesce((p_permissions->'blog'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{posts,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'events' and coalesce((p_permissions->'events'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{list,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'sermons' and coalesce((p_permissions->'sermons'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{list,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'ministries' and coalesce((p_permissions->'ministries'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{list,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'testimonies' and coalesce((p_permissions->'testimonies'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{list,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'prayer' and coalesce((p_permissions->'prayers'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{inbox,edit}', 'true'::jsonb);
      v_sections := jsonb_set(v_sections, '{pastors,edit}', 'true'::jsonb);
      v_access := true;
    elsif v_page = 'contact' and coalesce((p_permissions->'website'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{church,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'services' and coalesce((p_permissions->'website'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{times,edit}', 'true'::jsonb);
      v_sections := jsonb_set(v_sections, '{programmes,edit}', 'true'::jsonb);
      v_access := true;
    end if;

    v_pages := v_pages || jsonb_build_object(
      v_page,
      jsonb_build_object('access', v_access, 'sections', v_sections)
    );
  end loop;

  v := v || jsonb_build_object('pages', v_pages);
  return v;
end;
$$;

-- Allow saving the Join Church page CMS section
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

  v_admin := public._require_permission(p_token, p_page || '.' || p_section, 'edit');

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

grant execute on function public._sanitize_permissions(jsonb) to anon, authenticated;
grant execute on function public.admin_update_page_section(text, text, text, jsonb) to anon, authenticated;
