-- Keep a single admin_list_church_members signature so PostgREST
-- does not fail with "could not choose the best candidate function".

drop function if exists public.admin_list_church_members(text, uuid);
drop function if exists public.admin_list_church_members(text, uuid, uuid);

notify pgrst, 'reload schema';
