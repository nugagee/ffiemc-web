-- Age brackets on program forms + admin companion bot (usage limits & analytics)

-- Convert existing "age" number fields on programs to age-bracket selects
do $$
declare
  v_brackets jsonb := '["Under 15","15-20","20-25","25-30","30-35","35-40","40-45","45-50","50-55","55-60","60+"]'::jsonb;
  r record;
  v_fields jsonb;
  v_item jsonb;
  v_out jsonb;
  i int;
begin
  for r in select id, form_fields from public.church_programs loop
    v_fields := coalesce(r.form_fields, '[]'::jsonb);
    if jsonb_typeof(v_fields) <> 'array' then
      continue;
    end if;
    v_out := '[]'::jsonb;
    for i in 0 .. coalesce(jsonb_array_length(v_fields), 0) - 1 loop
      v_item := v_fields -> i;
      if lower(coalesce(v_item->>'name', '')) in ('age', 'age_bracket', 'age_group', 'age_range')
         or lower(coalesce(v_item->>'label', '')) in ('age', 'age bracket', 'age group') then
        v_item := jsonb_set(v_item, '{type}', '"select"');
        v_item := jsonb_set(v_item, '{label}', to_jsonb(coalesce(nullif(v_item->>'label', ''), 'Age')));
        v_item := jsonb_set(v_item, '{options}', v_brackets);
      end if;
      v_out := v_out || jsonb_build_array(v_item);
    end loop;
    update public.church_programs set form_fields = v_out where id = r.id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Companion bot tables
-- ---------------------------------------------------------------------------
create table if not exists public.admin_ai_limits (
  admin_id uuid primary key references public.admins(id) on delete cascade,
  monthly_token_limit integer not null default 200000 check (monthly_token_limit >= 0),
  monthly_request_limit integer not null default 200 check (monthly_request_limit >= 0),
  enabled boolean not null default true,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admins(id) on delete set null
);

create table if not exists public.admin_ai_usage (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  conversation_id uuid,
  model text not null default '',
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  request_ok boolean not null default true,
  error_message text not null default '',
  user_message_preview text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists admin_ai_usage_admin_month_idx
  on public.admin_ai_usage (admin_id, created_at desc);

create table if not exists public.admin_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.admin_ai_conversations(id) on delete cascade,
  admin_id uuid not null references public.admins(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists admin_ai_messages_conv_idx
  on public.admin_ai_messages (conversation_id, created_at);

alter table public.admin_ai_limits enable row level security;
alter table public.admin_ai_usage enable row level security;
alter table public.admin_ai_conversations enable row level security;
alter table public.admin_ai_messages enable row level security;

create or replace function public._ai_month_start()
returns timestamptz
language sql
stable
as $$
  select date_trunc('month', now() at time zone 'utc') at time zone 'utc';
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
  if not (
    v_admin.role = 'superadmin'
    or public._has_perm(v_admin, 'utilities', 'view')
    or public._has_perm(v_admin, 'utilities', 'edit')
  ) then
    raise exception 'You do not have permission to use the companion bot';
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
        when 'disabled' then 'Your companion bot access has been paused by a superadmin. Please contact leadership if you need it re-enabled.'
        when 'tokens' then 'You have reached your monthly AI token limit. Your companion is resting until next month — or ask a superadmin to raise your allowance.'
        when 'requests' then 'You have reached your monthly AI request limit. Take a break from the companion until next month, or ask a superadmin to increase your quota.'
        else 'Your companion bot usage limit has been reached for this month.'
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
  if not (
    v_admin.role = 'superadmin'
    or public._has_perm(v_admin, 'utilities', 'view')
    or public._has_perm(v_admin, 'utilities', 'edit')
  ) then
    raise exception 'You do not have permission to use the companion bot';
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
  if not (
    v_admin.role = 'superadmin'
    or public._has_perm(v_admin, 'utilities', 'view')
    or public._has_perm(v_admin, 'utilities', 'edit')
  ) then
    raise exception 'You do not have permission to use the companion bot';
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
  if not exists (
    select 1 from public.admin_ai_conversations c
    where c.id = p_conversation_id and c.admin_id = v_admin.id
  ) and v_admin.role <> 'superadmin' then
    raise exception 'Conversation not found';
  end if;
  if v_admin.role <> 'superadmin' and not (
    public._has_perm(v_admin, 'utilities', 'view')
    or public._has_perm(v_admin, 'utilities', 'edit')
  ) then
    raise exception 'You do not have permission to use the companion bot';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(m) order by m.created_at asc)
    from public.admin_ai_messages m
    where m.conversation_id = p_conversation_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_ai_set_limit(
  p_token text,
  p_admin_id uuid,
  p_monthly_token_limit integer,
  p_monthly_request_limit integer,
  p_enabled boolean default true,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.admins;
  v_row public.admin_ai_limits%rowtype;
begin
  v_actor := public._require_admin(p_token);
  if v_actor.role <> 'superadmin' and not public._has_perm(v_actor, 'utilities', 'edit') then
    raise exception 'Only superadmins or utilities editors can set AI limits';
  end if;
  if v_actor.role <> 'superadmin' then
    raise exception 'Only a superadmin can set companion bot limits for admins';
  end if;

  insert into public.admin_ai_limits (
    admin_id, monthly_token_limit, monthly_request_limit, enabled, notes, updated_at, updated_by
  )
  values (
    p_admin_id,
    greatest(coalesce(p_monthly_token_limit, 200000), 0),
    greatest(coalesce(p_monthly_request_limit, 200), 0),
    coalesce(p_enabled, true),
    coalesce(p_notes, ''),
    now(),
    v_actor.id
  )
  on conflict (admin_id) do update set
    monthly_token_limit = excluded.monthly_token_limit,
    monthly_request_limit = excluded.monthly_request_limit,
    enabled = excluded.enabled,
    notes = excluded.notes,
    updated_at = now(),
    updated_by = v_actor.id
  returning * into v_row;

  return to_jsonb(v_row);
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
    raise exception 'Only a superadmin can view companion bot analytics';
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

grant execute on function public.admin_ai_quota(text) to anon, authenticated;
grant execute on function public.admin_ai_reserve_turn(text) to anon, authenticated;
grant execute on function public.admin_ai_log_turn(text, uuid, text, integer, integer, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.admin_ai_list_conversations(text) to anon, authenticated;
grant execute on function public.admin_ai_list_messages(text, uuid) to anon, authenticated;
grant execute on function public.admin_ai_set_limit(text, uuid, integer, integer, boolean, text) to anon, authenticated;
grant execute on function public.admin_ai_usage_analytics(text) to anon, authenticated;
