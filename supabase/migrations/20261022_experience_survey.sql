-- Experience survey for public visitors + admin tracking/replies.

create table if not exists public.experience_survey_responses (
  id uuid primary key default gen_random_uuid(),
  visitor_key text not null default '',
  name text not null default '',
  email text not null default '',
  audience text not null default 'visitor'
    check (audience in ('visitor', 'member', 'guest')),
  path text not null default '/',
  overall_rating integer not null default 4 check (overall_rating between 1 and 5),
  comfort_scores jsonb not null default '{}'::jsonb,
  average_comfort numeric(3,1),
  improvements text not null default '',
  wished_features text not null default '',
  feedback_text text not null default '',
  status text not null default 'new'
    check (status in ('new', 'read', 'reviewing', 'planned', 'replied', 'closed')),
  admin_response text,
  admin_responded_at timestamptz,
  admin_responded_by uuid references public.admins(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists experience_survey_created_idx
  on public.experience_survey_responses (created_at desc);

create index if not exists experience_survey_status_idx
  on public.experience_survey_responses (status, created_at desc);

create index if not exists experience_survey_visitor_idx
  on public.experience_survey_responses (visitor_key, created_at desc);

alter table public.experience_survey_responses enable row level security;

create or replace function public.set_experience_survey_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_experience_survey_updated_at on public.experience_survey_responses;
create trigger set_experience_survey_updated_at
  before update on public.experience_survey_responses
  for each row execute function public.set_experience_survey_updated_at();

create or replace function public.submit_experience_survey(p_data jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_visitor text;
  v_rating integer;
  v_comfort jsonb;
  v_avg numeric;
  v_improvements text;
  v_wished text;
  v_feedback text;
begin
  v_visitor := left(trim(coalesce(p_data->>'visitor_key', '')), 128);
  if length(v_visitor) < 8 then
    raise exception 'Invalid visitor key';
  end if;

  v_rating := greatest(1, least(5, coalesce((p_data->>'overall_rating')::integer, 4)));
  v_comfort := coalesce(p_data->'comfort_scores', '{}'::jsonb);
  begin
    v_avg := nullif(p_data->>'average_comfort', '')::numeric;
  exception when others then
    v_avg := null;
  end;

  v_improvements := left(trim(coalesce(p_data->>'improvements', '')), 4000);
  v_wished := left(trim(coalesce(p_data->>'wished_features', '')), 4000);
  v_feedback := left(trim(coalesce(p_data->>'feedback_text', '')), 8000);
  if v_feedback = '' then
    v_feedback := concat_ws(
      E'\n\n',
      'Experience survey response',
      'Overall rating: ' || v_rating::text || '/5',
      case when v_improvements <> '' then 'Improvements:' || E'\n' || v_improvements else null end,
      case when v_wished <> '' then 'Requested features:' || E'\n' || v_wished else null end
    );
  end if;

  insert into public.experience_survey_responses (
    visitor_key,
    name,
    email,
    audience,
    path,
    overall_rating,
    comfort_scores,
    average_comfort,
    improvements,
    wished_features,
    feedback_text,
    metadata
  )
  values (
    v_visitor,
    left(trim(coalesce(p_data->>'name', '')), 120),
    left(trim(coalesce(p_data->>'email', '')), 200),
    case
      when lower(coalesce(p_data->>'audience', 'visitor')) in ('visitor', 'member', 'guest')
        then lower(p_data->>'audience')
      else 'visitor'
    end,
    left(coalesce(nullif(trim(p_data->>'path'), ''), '/'), 512),
    v_rating,
    v_comfort,
    v_avg,
    v_improvements,
    v_wished,
    v_feedback,
    coalesce(p_data->'metadata', '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_experience_survey(jsonb) from public;
grant execute on function public.submit_experience_survey(jsonb) to anon, authenticated;

create or replace function public.admin_list_experience_surveys(
  p_token text,
  p_limit integer default 200
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'experience_surveys', 'view');

  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb)
    from (
      select
        s.id,
        s.visitor_key,
        s.name,
        s.email,
        s.audience,
        s.path,
        s.overall_rating,
        s.comfort_scores,
        s.average_comfort,
        s.improvements,
        s.wished_features,
        s.feedback_text,
        s.status,
        s.admin_response,
        s.admin_responded_at,
        s.admin_responded_by,
        a.full_name as admin_responded_by_name,
        s.metadata,
        s.created_at,
        s.updated_at
      from public.experience_survey_responses s
      left join public.admins a on a.id = s.admin_responded_by
      order by s.created_at desc
      limit greatest(least(coalesce(p_limit, 200), 500), 1)
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_update_experience_survey(
  p_token text,
  p_id uuid,
  p_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins%rowtype;
  v_row public.experience_survey_responses%rowtype;
  v_status text;
  v_response text;
begin
  v_admin := public._require_permission(p_token, 'experience_surveys', 'edit');

  select * into v_row
  from public.experience_survey_responses
  where id = p_id;

  if not found then
    raise exception 'Survey response not found';
  end if;

  v_status := coalesce(nullif(trim(p_data->>'status'), ''), v_row.status);
  if v_status not in ('new', 'read', 'reviewing', 'planned', 'replied', 'closed') then
    raise exception 'Invalid status';
  end if;

  v_response := nullif(trim(coalesce(p_data->>'admin_response', v_row.admin_response, '')), '');

  update public.experience_survey_responses
  set
    status = v_status,
    admin_response = v_response,
    admin_responded_at = case
      when v_response is not null and v_response is distinct from v_row.admin_response then now()
      else admin_responded_at
    end,
    admin_responded_by = case
      when v_response is not null and v_response is distinct from v_row.admin_response then v_admin.id
      else admin_responded_by
    end
  where id = p_id
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'admin_response', v_row.admin_response,
    'admin_responded_at', v_row.admin_responded_at,
    'admin_responded_by', v_row.admin_responded_by,
    'updated_at', v_row.updated_at
  );
end;
$$;

create or replace function public.admin_delete_experience_survey(
  p_token text,
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'experience_surveys', 'delete');
  delete from public.experience_survey_responses where id = p_id;
end;
$$;

revoke all on function public.admin_list_experience_surveys(text, integer) from public;
revoke all on function public.admin_update_experience_survey(text, uuid, jsonb) from public;
revoke all on function public.admin_delete_experience_survey(text, uuid) from public;
grant execute on function public.admin_list_experience_surveys(text, integer) to anon, authenticated;
grant execute on function public.admin_update_experience_survey(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_experience_survey(text, uuid) to anon, authenticated;

-- Permission catalog: add experience_surveys feature (based on latest sanitize + _has_perm).
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
    "home": ["hero","announcements","monthWelcome","facebookLive","welcome","stats","eventsPreview","sermonsPreview","blogPreview","ministriesPreview","cta","testimoniesPreview","social"],
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
    'overview', 'visitors', 'contacts', 'experience_surveys', 'banners',
    'program_types', 'programs', 'church_branches', 'church_roles', 'member_notifications',
    'program_registrations', 'volunteer_applications', 'church_members', 'form_dropdowns',
    'approvals', 'church_meetings', 'utilities', 'fire_buddy', 'social_media_contributions'
  ];
begin
  if p_permissions is null or jsonb_typeof(p_permissions) <> 'object' then
    return jsonb_build_object(
      'overview', jsonb_build_object('view', false),
      'visitors', jsonb_build_object('view', false),
      'contacts', jsonb_build_object('view', false, 'edit', false, 'delete', false),
      'experience_surveys', jsonb_build_object('view', false, 'edit', false, 'delete', false),
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
    elsif v_feature in ('form_dropdowns', 'approvals', 'fire_buddy') then
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
      v_sections := jsonb_set(v_sections, '{inbox,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'contact' and coalesce((p_permissions->'website'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{church,edit}', 'true'::jsonb); v_access := true;
    end if;

    v_pages := v_pages || jsonb_build_object(
      v_page,
      jsonb_build_object('access', v_access, 'sections', v_sections)
    );
  end loop;

  return v || jsonb_build_object('pages', v_pages);
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
    'overview', 'visitors', 'contacts', 'experience_surveys',
    'program_types', 'programs', 'program_registrations', 'church_roles', 'church_members',
    'church_branches', 'member_notifications', 'volunteer_applications', 'banners',
    'approvals', 'church_meetings', 'form_dropdowns', 'utilities', 'fire_buddy',
    'social_media_contributions'
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

  return false;
end;
$$;

grant execute on function public._sanitize_permissions(jsonb) to anon, authenticated;
