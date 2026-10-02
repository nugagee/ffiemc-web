-- Prefer first_name (skip titles) for member email greetings

create or replace function public._member_greeting_name(
  p_first_name text,
  p_full_name text
)
returns text
language plpgsql
immutable
as $$
declare
  v text;
  v_parts text[];
  v_skip text[] := array[
    'mr','mrs','ms','miss','dr','prof','pastor','rev','reverend',
    'brother','bro','sister','sis','elder','deacon','deaconess',
    'evangelist','apostle','prophet','prophetess','bishop','chief','hon',
    'engr','engineer','barr','barrister','sir','madam','lady'
  ];
  p text;
begin
  v := nullif(trim(coalesce(p_first_name, '')), '');
  if v is not null then
    v := regexp_replace(split_part(v, ' ', 1), '[^A-Za-z\-]+$', '', 'g');
    if length(v) > 1 then
      return initcap(lower(v));
    end if;
  end if;

  v := nullif(trim(coalesce(p_full_name, '')), '');
  if v is null then
    return 'Beloved';
  end if;

  v_parts := regexp_split_to_array(v, '\s+');
  foreach p in array v_parts
  loop
    p := regexp_replace(p, '[^A-Za-z\-]+', '', 'g');
    if p = '' then
      continue;
    end if;
    if lower(p) = any (v_skip) then
      continue;
    end if;
    if length(p) <= 1 then
      continue;
    end if;
    return initcap(lower(p));
  end loop;

  return 'Beloved';
end;
$$;

create or replace function public.list_daily_growth_digest_recipients()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id,
      'email', m.email,
      'full_name', coalesce(nullif(trim(m.full_name), ''), 'Beloved'),
      'first_name', coalesce(m.first_name, ''),
      'last_name', coalesce(m.last_name, ''),
      'greeting_name', public._member_greeting_name(m.first_name, m.full_name)
    ) order by lower(m.email))
    from public.church_members m
    where m.status in ('approved', 'active')
      and nullif(trim(m.email), '') is not null
      and position('@' in m.email) > 1
  ), '[]'::jsonb);
end;
$$;

create or replace function public.list_member_email_recipients()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id,
      'email', m.email,
      'full_name', coalesce(nullif(trim(m.full_name), ''), 'Beloved'),
      'first_name', coalesce(m.first_name, ''),
      'last_name', coalesce(m.last_name, ''),
      'greeting_name', public._member_greeting_name(m.first_name, m.full_name)
    ) order by lower(m.email))
    from public.church_members m
    where m.status in ('approved', 'active')
      and nullif(trim(m.email), '') is not null
      and position('@' in m.email) > 1
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.list_daily_growth_digest_recipients() from public;
revoke all on function public.list_member_email_recipients() from public;
grant execute on function public.list_daily_growth_digest_recipients() to service_role;
grant execute on function public.list_member_email_recipients() to service_role;
