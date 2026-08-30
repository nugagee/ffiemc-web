-- Reset / ensure default superadmin credentials
-- Run once in Supabase → SQL Editor if /login shows "Invalid credentials".
--
-- Login: admin@firefireintl.org  (or username: admin)
-- Password: FireFire2025!

create extension if not exists pgcrypto with schema extensions;

insert into public.admins (username, email, password_hash, role, is_active)
values (
  'admin',
  'admin@firefireintl.org',
  extensions.crypt('FireFire2025!', extensions.gen_salt('bf')),
  'superadmin',
  true
)
on conflict (username) do update
set
  email = excluded.email,
  password_hash = excluded.password_hash,
  role = 'superadmin',
  is_active = true;

-- If the row exists under a different username but same email, force-reset by email too
update public.admins
set
  password_hash = extensions.crypt('FireFire2025!', extensions.gen_salt('bf')),
  role = 'superadmin',
  is_active = true,
  email = 'admin@firefireintl.org'
where lower(email) = 'admin@firefireintl.org'
   or lower(username) = 'admin';
