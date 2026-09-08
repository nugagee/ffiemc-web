-- Fire Buddy permission key + keep permission catalog in sync for admin create/edit.

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
    "home": ["hero","announcements","monthWelcome","welcome","stats","eventsPreview","sermonsPreview","blogPreview","ministriesPreview","cta","testimoniesPreview","social"],
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
    'approvals', 'church_meetings', 'utilities', 'fire_buddy'
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

-- Gate Fire Buddy RPCs on fire_buddy permission (fall back to utilities for older grants)
create or replace function public._can_use_fire_buddy(p_admin public.admins)
returns boolean
language plpgsql
stable
set search_path = public
as $$
begin
  if p_admin.role = 'superadmin' then return true; end if;
  return public._has_perm(p_admin, 'fire_buddy', 'view')
      or public._has_perm(p_admin, 'fire_buddy', 'edit')
      or public._has_perm(p_admin, 'utilities', 'view')
      or public._has_perm(p_admin, 'utilities', 'edit');
end;
$$;

create or replace function public.admin_ai_quota(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_limit public.admin_ai_limits%rowtype;
  v_tokens int := 0;
  v_requests int := 0;
  v_token_cap int := 200000;
  v_req_cap int := 200;
  v_enabled boolean := true;
begin
  v_admin := public._require_admin(p_token);
  if not public._can_use_fire_buddy(v_admin) then
    raise exception 'You do not have permission to use Fire Buddy';
  end if;

  select * into v_limit from public.admin_ai_limits where admin_id = v_admin.id;
  if found then
    v_token_cap := v_limit.monthly_token_limit;
    v_req_cap := v_limit.monthly_request_limit;
    v_enabled := v_limit.enabled;
  end if;

  select
    coalesce(sum(total_tokens), 0)::int,
    coalesce(count(*), 0)::int
  into v_tokens, v_requests
  from public.admin_ai_usage
  where admin_id = v_admin.id
    and created_at >= public._ai_month_start()
    and request_ok = true;

  return jsonb_build_object(
    'admin_id', v_admin.id,
    'admin_name', coalesce(v_admin.name, v_admin.email),
    'enabled', v_enabled,
    'month_start', public._ai_month_start(),
    'tokens_used', v_tokens,
    'requests_used', v_requests,
    'token_limit', v_token_cap,
    'request_limit', v_req_cap,
    'tokens_remaining', greatest(v_token_cap - v_tokens, 0),
    'requests_remaining', greatest(v_req_cap - v_requests, 0),
    'limit_reached',
      (not v_enabled)
      or (v_token_cap > 0 and v_tokens >= v_token_cap)
      or (v_req_cap > 0 and v_requests >= v_req_cap),
    'limit_reason', case
      when not v_enabled then 'disabled'
      when v_token_cap > 0 and v_tokens >= v_token_cap then 'tokens'
      when v_req_cap > 0 and v_requests >= v_req_cap then 'requests'
      else null
    end
  );
end;
$$;

create or replace function public.admin_ai_reserve_turn(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quota jsonb;
begin
  v_quota := public.admin_ai_quota(p_token);
  if coalesce((v_quota->>'limit_reached')::boolean, false) then
    return jsonb_build_object(
      'ok', false,
      'quota', v_quota,
      'message', case v_quota->>'limit_reason'
        when 'disabled' then 'Your Fire Buddy access has been paused by a superadmin. Please contact leadership if you need it re-enabled.'
        when 'tokens' then 'You have reached your monthly Fire Buddy token limit. Fire Buddy is resting until next month — or ask a superadmin to raise your allowance.'
        when 'requests' then 'You have reached your monthly Fire Buddy request limit. Take a break until next month, or ask a superadmin to increase your quota.'
        else 'Your Fire Buddy usage limit has been reached for this month.'
      end
    );
  end if;
  return jsonb_build_object('ok', true, 'quota', v_quota);
end;
$$;

create or replace function public.admin_ai_log_turn(
  p_token text,
  p_conversation_id uuid,
  p_model text,
  p_prompt_tokens integer,
  p_completion_tokens integer,
  p_user_preview text,
  p_assistant_content text,
  p_user_content text,
  p_request_ok boolean default true,
  p_error_message text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
  v_conv uuid;
  v_usage_id uuid;
  v_prompt int := greatest(coalesce(p_prompt_tokens, 0), 0);
  v_completion int := greatest(coalesce(p_completion_tokens, 0), 0);
begin
  v_admin := public._require_admin(p_token);
  if not public._can_use_fire_buddy(v_admin) then
    raise exception 'You do not have permission to use Fire Buddy';
  end if;

  v_conv := p_conversation_id;
  if v_conv is null then
    insert into public.admin_ai_conversations (admin_id, title)
    values (
      v_admin.id,
      left(coalesce(nullif(trim(p_user_preview), ''), 'New chat'), 80)
    )
    returning id into v_conv;
  else
    update public.admin_ai_conversations
    set updated_at = now(),
        title = case
          when title in ('', 'New chat') then left(coalesce(nullif(trim(p_user_preview), ''), title), 80)
          else title
        end
    where id = v_conv and admin_id = v_admin.id;
  end if;

  if coalesce(p_user_content, '') <> '' then
    insert into public.admin_ai_messages (conversation_id, admin_id, role, content)
    values (v_conv, v_admin.id, 'user', p_user_content);
  end if;
  if coalesce(p_assistant_content, '') <> '' then
    insert into public.admin_ai_messages (conversation_id, admin_id, role, content)
    values (v_conv, v_admin.id, 'assistant', p_assistant_content);
  end if;

  insert into public.admin_ai_usage (
    admin_id, conversation_id, model, prompt_tokens, completion_tokens, total_tokens,
    request_ok, error_message, user_message_preview
  )
  values (
    v_admin.id, v_conv, coalesce(p_model, ''),
    v_prompt, v_completion, v_prompt + v_completion,
    coalesce(p_request_ok, true), coalesce(p_error_message, ''),
    left(coalesce(p_user_preview, ''), 240)
  )
  returning id into v_usage_id;

  return jsonb_build_object(
    'ok', true,
    'conversation_id', v_conv,
    'usage_id', v_usage_id,
    'quota', public.admin_ai_quota(p_token)
  );
end;
$$;

create or replace function public.admin_ai_list_conversations(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._can_use_fire_buddy(v_admin) then
    raise exception 'You do not have permission to use Fire Buddy';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(c) order by c.updated_at desc)
    from public.admin_ai_conversations c
    where c.admin_id = v_admin.id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_ai_list_messages(p_token text, p_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._can_use_fire_buddy(v_admin) then
    raise exception 'You do not have permission to use Fire Buddy';
  end if;
  if not exists (
    select 1 from public.admin_ai_conversations c
    where c.id = p_conversation_id and (c.admin_id = v_admin.id or v_admin.role = 'superadmin')
  ) then
    raise exception 'Conversation not found';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(m) order by m.created_at asc)
    from public.admin_ai_messages m
    where m.conversation_id = p_conversation_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_ai_usage_analytics(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.admins;
begin
  v_actor := public._require_admin(p_token);
  if v_actor.role <> 'superadmin' then
    raise exception 'Only a superadmin can view Fire Buddy analytics';
  end if;

  return jsonb_build_object(
    'month_start', public._ai_month_start(),
    'totals', (
      select jsonb_build_object(
        'tokens', coalesce(sum(total_tokens), 0),
        'requests', coalesce(count(*), 0),
        'admins', coalesce(count(distinct admin_id), 0)
      )
      from public.admin_ai_usage
      where created_at >= public._ai_month_start()
        and request_ok = true
    ),
    'by_admin', coalesce((
      select jsonb_agg(row_to_json(t) order by t.tokens_used desc)
      from (
        select
          a.id as admin_id,
          coalesce(a.name, a.email) as admin_name,
          a.email,
          coalesce(l.monthly_token_limit, 200000) as token_limit,
          coalesce(l.monthly_request_limit, 200) as request_limit,
          coalesce(l.enabled, true) as enabled,
          coalesce(sum(u.total_tokens) filter (where u.created_at >= public._ai_month_start() and u.request_ok), 0)::int as tokens_used,
          coalesce(count(u.id) filter (where u.created_at >= public._ai_month_start() and u.request_ok), 0)::int as requests_used,
          max(u.created_at) as last_used_at
        from public.admins a
        left join public.admin_ai_limits l on l.admin_id = a.id
        left join public.admin_ai_usage u on u.admin_id = a.id
        where a.is_active = true
        group by a.id, a.name, a.email, l.monthly_token_limit, l.monthly_request_limit, l.enabled
      ) t
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(row_to_json(r) order by r.created_at desc)
      from (
        select
          u.id, u.admin_id, coalesce(a.name, a.email) as admin_name,
          u.model, u.total_tokens, u.prompt_tokens, u.completion_tokens,
          u.request_ok, u.user_message_preview, u.created_at
        from public.admin_ai_usage u
        join public.admins a on a.id = u.admin_id
        order by u.created_at desc
        limit 80
      ) r
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public._sanitize_permissions(jsonb) to anon, authenticated;
grant execute on function public._can_use_fire_buddy(public.admins) to anon, authenticated;
grant execute on function public.admin_ai_quota(text) to anon, authenticated;
grant execute on function public.admin_ai_reserve_turn(text) to anon, authenticated;
grant execute on function public.admin_ai_log_turn(text, uuid, text, integer, integer, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.admin_ai_list_conversations(text) to anon, authenticated;
grant execute on function public.admin_ai_list_messages(text, uuid) to anon, authenticated;
grant execute on function public.admin_ai_usage_analytics(text) to anon, authenticated;

-- Ensure flat dashboard features (including fire_buddy) resolve correctly in _has_perm
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
    'approvals', 'church_meetings', 'form_dropdowns', 'utilities', 'fire_buddy'
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
