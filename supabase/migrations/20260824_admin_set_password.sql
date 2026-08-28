-- Run this in Supabase SQL Editor if schema.sql was already applied earlier.
-- Adds change-password support for admins.

create or replace function public.admin_set_password(
  p_token text,
  p_admin_id uuid,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor public.admins;
begin
  v_actor := public._require_admin(p_token);

  if v_actor.role <> 'superadmin' and v_actor.id <> p_admin_id then
    raise exception 'Only a superadmin can change another admin''s password';
  end if;

  if length(p_password) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;

  if not exists (select 1 from public.admins where id = p_admin_id) then
    raise exception 'Admin not found';
  end if;

  update public.admins
  set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
  where id = p_admin_id;

  delete from public.admin_sessions
  where admin_id = p_admin_id
    and token <> p_token;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_set_password(text, uuid, text) to anon, authenticated;
