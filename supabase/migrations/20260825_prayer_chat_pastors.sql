-- Prayer chat threads, pastor role, assignment, and replies

-- Allow pastor role on admins
alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins
  add constraint admins_role_check check (role in ('superadmin', 'admin', 'pastor'));

alter table public.admins
  add column if not exists full_name text not null default '',
  add column if not exists phone text not null default '';

-- Prayer request workflow fields
alter table public.prayer_requests
  add column if not exists assigned_pastor_id uuid references public.admins(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists assigned_by uuid references public.admins(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.prayer_requests drop constraint if exists prayer_requests_status_check;
alter table public.prayer_requests
  add constraint prayer_requests_status_check
  check (status in ('new', 'assigned', 'in_progress', 'prayed', 'closed', 'archived'));

create index if not exists prayer_requests_assigned_pastor_idx
  on public.prayer_requests (assigned_pastor_id)
  where assigned_pastor_id is not null;

create index if not exists prayer_requests_status_idx on public.prayer_requests (status);

-- Chat messages
create table if not exists public.prayer_messages (
  id uuid primary key default gen_random_uuid(),
  prayer_request_id uuid not null references public.prayer_requests(id) on delete cascade,
  sender_type text not null check (sender_type in ('visitor', 'admin', 'pastor', 'system')),
  sender_admin_id uuid references public.admins(id) on delete set null,
  body text not null,
  emailed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists prayer_messages_request_idx
  on public.prayer_messages (prayer_request_id, created_at asc);

alter table public.prayer_messages enable row level security;

-- Backfill initial visitor message from existing requests
insert into public.prayer_messages (prayer_request_id, sender_type, body, created_at)
select r.id, 'visitor', r.request, r.created_at
from public.prayer_requests r
where not exists (
  select 1 from public.prayer_messages m where m.prayer_request_id = r.id
);

-- Pastor-scoped permission: pastors may only use prayer inbox (view/edit)
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
  if p_admin.role = 'superadmin' then
    return true;
  end if;

  -- Pastors: locked to prayer request inbox only
  if p_admin.role = 'pastor' then
    if p_feature = 'prayer.inbox' and p_action in ('view', 'edit') then
      return true;
    end if;
    if p_feature = 'prayer' and p_action = 'view' then
      return true;
    end if;
    return false;
  end if;

  if p_feature is null or p_action is null then
    return false;
  end if;

  if p_feature in ('overview', 'visitors', 'contacts') then
    if p_action = 'view' then
      return coalesce((p_admin.permissions -> p_feature ->> 'view')::boolean, false)
          or coalesce((p_admin.permissions -> p_feature ->> 'edit')::boolean, false)
          or coalesce((p_admin.permissions -> p_feature ->> 'delete')::boolean, false);
    end if;
    return coalesce((p_admin.permissions -> p_feature ->> p_action)::boolean, false);
  end if;

  -- Managing pastors requires prayer.pastors permission (or superadmin)
  if p_feature = 'prayer.pastors' then
    return coalesce((p_admin.permissions -> 'pages' -> 'prayer' -> 'sections' -> 'pastors' ->> p_action)::boolean, false)
        or coalesce((p_admin.permissions -> 'pages' -> 'prayer' -> 'sections' -> 'pastors' ->> 'edit')::boolean, false) and p_action = 'view'
        or coalesce((p_admin.permissions -> 'prayers' ->> p_action)::boolean, false);
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
    else
      if coalesce((v_sec ->> p_action)::boolean, false) then
        return true;
      end if;
    end if;

    v_legacy := case p_feature
      when 'home.hero' then 'hero'
      when 'blog.posts' then 'blog'
      when 'events.list' then 'events'
      when 'sermons.list' then 'sermons'
      when 'ministries.list' then 'ministries'
      when 'testimonies.list' then 'testimonies'
      when 'prayer.inbox' then 'prayers'
      when 'prayer.pastors' then 'prayers'
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
    return p_action = 'view' or exists (
      select 1
      from jsonb_each(coalesce(v_pages -> p_feature -> 'sections', '{}'::jsonb)) kv
      where coalesce((kv.value ->> p_action)::boolean, false)
    );
  end if;

  if exists (
    select 1
    from jsonb_each(coalesce(v_pages -> p_feature -> 'sections', '{}'::jsonb)) kv
    where coalesce((kv.value ->> 'edit')::boolean, false)
       or coalesce((kv.value ->> 'delete')::boolean, false)
  ) then
    return p_action = 'view';
  end if;

  return coalesce((p_admin.permissions -> p_feature ->> p_action)::boolean, false)
      or (p_action = 'view' and (
        coalesce((p_admin.permissions -> p_feature ->> 'view')::boolean, false)
        or coalesce((p_admin.permissions -> p_feature ->> 'edit')::boolean, false)
      ));
end;
$$;

-- Require email + phone; seed first chat message
create or replace function public.submit_prayer(
  p_name text,
  p_email text default '',
  p_phone text default '',
  p_category text default 'Personal Prayer Request',
  p_request text default '',
  p_is_public boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if length(trim(p_name)) < 2 then
    raise exception 'Please enter your name';
  end if;
  if length(trim(p_email)) < 5 or position('@' in p_email) = 0 then
    raise exception 'Please enter a valid email';
  end if;
  if length(trim(p_phone)) < 7 then
    raise exception 'Please enter a phone number';
  end if;
  if length(trim(p_request)) < 2 then
    raise exception 'Please share your prayer request';
  end if;

  insert into public.prayer_requests (name, email, phone, category, request, is_public, status)
  values (
    trim(p_name),
    trim(p_email),
    trim(p_phone),
    coalesce(nullif(trim(p_category), ''), 'Personal Prayer Request'),
    trim(p_request),
    coalesce(p_is_public, false),
    'new'
  )
  returning id into v_id;

  insert into public.prayer_messages (prayer_request_id, sender_type, body)
  values (v_id, 'visitor', trim(p_request));

  return v_id;
end;
$$;

-- List prayer requests (pastors only see assigned)
create or replace function public.admin_list_prayer_requests(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_permission(p_token, 'prayer.inbox', 'view');

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
    from (
      select
        r.*,
        a.username as pastor_username,
        a.full_name as pastor_name,
        a.email as pastor_email
      from public.prayer_requests r
      left join public.admins a on a.id = r.assigned_pastor_id
      where (
        v_admin.role <> 'pastor'
        or r.assigned_pastor_id = v_admin.id
      )
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_list_prayer_requests(text) to anon, authenticated;

create or replace function public.admin_list_prayer_messages(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_req public.prayer_requests%rowtype;
begin
  v_admin := public._require_permission(p_token, 'prayer.inbox', 'view');

  select * into v_req from public.prayer_requests where id = p_id;
  if not found then
    raise exception 'Prayer request not found';
  end if;
  if v_admin.role = 'pastor' and v_req.assigned_pastor_id is distinct from v_admin.id then
    raise exception 'You do not have access to this prayer request';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(m) || jsonb_build_object(
      'sender_name',
      case
        when m.sender_type = 'visitor' then v_req.name
        when m.sender_admin_id is not null then coalesce(nullif(ad.full_name, ''), ad.username)
        else initcap(m.sender_type)
      end
    ) order by m.created_at asc)
    from public.prayer_messages m
    left join public.admins ad on ad.id = m.sender_admin_id
    where m.prayer_request_id = p_id
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_list_prayer_messages(text, uuid) to anon, authenticated;

create or replace function public.admin_assign_prayer(
  p_token text,
  p_id uuid,
  p_pastor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_pastor public.admins%rowtype;
  v_req public.prayer_requests%rowtype;
begin
  v_admin := public._require_permission(p_token, 'prayer.inbox', 'edit');
  if v_admin.role = 'pastor' then
    raise exception 'Pastors cannot reassign prayer requests';
  end if;

  select * into v_pastor from public.admins
  where id = p_pastor_id and role = 'pastor' and is_active = true;
  if not found then
    raise exception 'Pastor not found or inactive';
  end if;

  update public.prayer_requests set
    assigned_pastor_id = v_pastor.id,
    assigned_at = now(),
    assigned_by = v_admin.id,
    status = case when status in ('prayed', 'closed', 'archived') then status else 'assigned' end,
    updated_at = now()
  where id = p_id
  returning * into v_req;

  if not found then
    raise exception 'Prayer request not found';
  end if;

  insert into public.prayer_messages (prayer_request_id, sender_type, sender_admin_id, body)
  values (
    p_id,
    'system',
    v_admin.id,
    'Assigned to Pastor ' || coalesce(nullif(v_pastor.full_name, ''), v_pastor.username)
  );

  return to_jsonb(v_req) || jsonb_build_object(
    'pastor_username', v_pastor.username,
    'pastor_name', coalesce(nullif(v_pastor.full_name, ''), v_pastor.username),
    'pastor_email', v_pastor.email
  );
end;
$$;

grant execute on function public.admin_assign_prayer(text, uuid, uuid) to anon, authenticated;

create or replace function public.admin_reply_prayer(
  p_token text,
  p_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_req public.prayer_requests%rowtype;
  v_msg public.prayer_messages%rowtype;
  v_sender text;
begin
  v_admin := public._require_permission(p_token, 'prayer.inbox', 'edit');

  select * into v_req from public.prayer_requests where id = p_id;
  if not found then
    raise exception 'Prayer request not found';
  end if;
  if v_admin.role = 'pastor' and v_req.assigned_pastor_id is distinct from v_admin.id then
    raise exception 'You do not have access to this prayer request';
  end if;
  if length(trim(p_body)) < 1 then
    raise exception 'Please enter a reply';
  end if;

  v_sender := case when v_admin.role = 'pastor' then 'pastor' else 'admin' end;

  insert into public.prayer_messages (prayer_request_id, sender_type, sender_admin_id, body)
  values (p_id, v_sender, v_admin.id, trim(p_body))
  returning * into v_msg;

  update public.prayer_requests set
    status = case
      when status in ('prayed', 'closed', 'archived') then status
      else 'in_progress'
    end,
    updated_at = now()
  where id = p_id
  returning * into v_req;

  return to_jsonb(v_msg) || jsonb_build_object(
    'visitor_name', v_req.name,
    'visitor_email', v_req.email,
    'visitor_phone', v_req.phone,
    'sender_name', coalesce(nullif(v_admin.full_name, ''), v_admin.username),
    'category', v_req.category
  );
end;
$$;

grant execute on function public.admin_reply_prayer(text, uuid, text) to anon, authenticated;

create or replace function public.mark_prayer_message_emailed(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.prayer_messages set emailed = true where id = p_id;
end;
$$;

grant execute on function public.mark_prayer_message_emailed(uuid) to anon, authenticated;

-- Override status update to allow assigned/in_progress/etc and pastor access
create or replace function public.admin_update_prayer_status(p_token text, p_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_req public.prayer_requests%rowtype;
  v_status text := coalesce(nullif(trim(p_status), ''), 'prayed');
begin
  v_admin := public._require_permission(p_token, 'prayer.inbox', 'edit');

  select * into v_req from public.prayer_requests where id = p_id;
  if not found then
    raise exception 'Prayer request not found';
  end if;
  if v_admin.role = 'pastor' and v_req.assigned_pastor_id is distinct from v_admin.id then
    raise exception 'You do not have access to this prayer request';
  end if;
  if v_status not in ('new', 'assigned', 'in_progress', 'prayed', 'closed', 'archived') then
    raise exception 'Invalid status';
  end if;

  update public.prayer_requests set
    status = v_status,
    updated_at = now()
  where id = p_id
  returning * into v_req;

  insert into public.prayer_messages (prayer_request_id, sender_type, sender_admin_id, body)
  values (
    p_id,
    'system',
    v_admin.id,
    'Status updated to ' || v_status
  );

  return to_jsonb(v_req);
end;
$$;

-- List / create pastors
create or replace function public.admin_list_pastors(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not (
    public._has_perm(v_admin, 'prayer.pastors', 'view')
    or public._has_perm(v_admin, 'prayer.inbox', 'edit')
  ) then
    raise exception 'You do not have permission to view pastors';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id,
      'username', a.username,
      'email', a.email,
      'full_name', a.full_name,
      'phone', a.phone,
      'is_active', a.is_active,
      'role', a.role,
      'created_at', a.created_at,
      'open_requests', (
        select count(*)::int from public.prayer_requests r
        where r.assigned_pastor_id = a.id
          and r.status in ('new', 'assigned', 'in_progress')
      )
    ) order by a.created_at desc)
    from public.admins a
    where a.role = 'pastor'
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_list_pastors(text) to anon, authenticated;

create or replace function public.admin_create_pastor(
  p_token text,
  p_username text,
  p_password text,
  p_email text,
  p_full_name text default '',
  p_phone text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor public.admins;
  v_id uuid;
  v_perms jsonb := '{
    "overview":{"view":false},
    "visitors":{"view":false},
    "contacts":{"view":false,"edit":false,"delete":false},
    "pages":{
      "prayer":{
        "access":true,
        "sections":{
          "inbox":{"edit":true,"delete":false},
          "pastors":{"edit":false,"delete":false}
        }
      }
    }
  }'::jsonb;
begin
  v_actor := public._require_permission(p_token, 'prayer.pastors', 'edit');

  if length(trim(p_username)) < 2 then
    raise exception 'Username is required';
  end if;
  if length(trim(p_password)) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;
  if length(trim(p_email)) < 5 or position('@' in p_email) = 0 then
    raise exception 'A valid email is required';
  end if;

  insert into public.admins (
    username, email, password_hash, role, permissions, full_name, phone, created_by
  )
  values (
    trim(p_username),
    trim(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    'pastor',
    v_perms,
    coalesce(trim(p_full_name), ''),
    coalesce(trim(p_phone), ''),
    v_actor.id
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'username', trim(p_username),
    'email', trim(p_email),
    'full_name', coalesce(trim(p_full_name), ''),
    'phone', coalesce(trim(p_phone), ''),
    'role', 'pastor',
    'is_active', true,
    'temp_password', p_password
  );
end;
$$;

grant execute on function public.admin_create_pastor(text, text, text, text, text, text) to anon, authenticated;

-- Change catalog for prayer page sections (pastors)
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
  v_src jsonb;
  v_page_src jsonb;
  v_sec_src jsonb;
  v_sections jsonb;
  v_access boolean;
  v_edit boolean;
  v_delete boolean;
  v_catalog jsonb := '{
    "home": ["hero","announcements","welcome","stats","eventsPreview","sermonsPreview","ministriesPreview","cta","testimoniesPreview","social"],
    "about": ["hero","mission","values","history","pastor","visit"],
    "services": ["hero","times","programmes"],
    "leadership": ["hero","team","departments","values","cta"],
    "ministries": ["hero","list"],
    "events": ["hero","list"],
    "sermons": ["hero","list"],
    "testimonies": ["hero","list"],
    "blog": ["hero","posts"],
    "contact": ["hero","church","hours"],
    "prayer": ["hero","categories","inbox","pastors"],
    "donate": ["hero","purposes"]
  }'::jsonb;
begin
  if p_permissions is null or jsonb_typeof(p_permissions) <> 'object' then
    return '{"overview":{"view":false},"visitors":{"view":false},"contacts":{"view":false,"edit":false,"delete":false},"pages":{}}'::jsonb;
  end if;

  v := jsonb_build_object(
    'overview', jsonb_build_object(
      'view', coalesce((p_permissions->'overview'->>'view')::boolean, false)
    ),
    'visitors', jsonb_build_object(
      'view', coalesce((p_permissions->'visitors'->>'view')::boolean, false)
    ),
    'contacts', jsonb_build_object(
      'view', coalesce((p_permissions->'contacts'->>'view')::boolean, false)
            or coalesce((p_permissions->'contacts'->>'edit')::boolean, false)
            or coalesce((p_permissions->'contacts'->>'delete')::boolean, false),
      'edit', coalesce((p_permissions->'contacts'->>'edit')::boolean, false),
      'delete', coalesce((p_permissions->'contacts'->>'delete')::boolean, false)
    )
  );

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
      if v_edit or v_delete then
        v_access := true;
      end if;
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
