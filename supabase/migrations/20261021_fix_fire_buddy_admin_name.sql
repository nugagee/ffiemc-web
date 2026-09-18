-- Fix Fire Buddy RPCs: admins has full_name/username, not name

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
    'admin_name', coalesce(nullif(trim(v_admin.full_name), ''), nullif(trim(v_admin.username), ''), v_admin.email),
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

create or replace function public.admin_ai_usage_analytics(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if v_admin.role <> 'superadmin' then
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
          coalesce(nullif(trim(a.full_name), ''), nullif(trim(a.username), ''), a.email) as admin_name,
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
        group by a.id, a.full_name, a.username, a.email, l.monthly_token_limit, l.monthly_request_limit, l.enabled
      ) t
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(row_to_json(r) order by r.created_at desc)
      from (
        select
          u.id, u.admin_id,
          coalesce(nullif(trim(a.full_name), ''), nullif(trim(a.username), ''), a.email) as admin_name,
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
