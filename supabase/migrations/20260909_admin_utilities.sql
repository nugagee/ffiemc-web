-- Admin utility notes/diary (private per admin) and utilities permission key.

create table if not exists public.admin_utility_notes (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'diary')),
  title text not null default '',
  body text not null default '',
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_utility_notes_admin_idx
  on public.admin_utility_notes (admin_id, updated_at desc);

alter table public.admin_utility_notes enable row level security;

create or replace function public._can_use_utilities(p_admin public.admins)
returns boolean
language plpgsql stable set search_path = public as $$
begin
  if p_admin.role = 'superadmin' then return true; end if;
  return public._has_perm(p_admin, 'utilities', 'view')
      or public._has_perm(p_admin, 'utilities', 'edit');
end;
$$;

create or replace function public.admin_list_utility_notes(p_token text, p_kind text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._can_use_utilities(v_admin) then
    raise exception 'You do not have permission to use utilities';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(n) order by n.updated_at desc)
    from public.admin_utility_notes n
    where n.admin_id = v_admin.id
      and (p_kind is null or p_kind = '' or p_kind = 'all' or n.kind = p_kind)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_utility_note(p_token text, p_id uuid, p_data jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_row public.admin_utility_notes%rowtype;
begin
  v_admin := public._require_admin(p_token);
  if not (
    v_admin.role = 'superadmin'
    or public._has_perm(v_admin, 'utilities', 'edit')
  ) then
    raise exception 'You do not have permission to save notes';
  end if;
  insert into public.admin_utility_notes (id, admin_id, kind, title, body, entry_date, updated_at)
  values (
    v_id,
    v_admin.id,
    coalesce(nullif(p_data->>'kind', ''), 'note'),
    coalesce(p_data->>'title', ''),
    coalesce(p_data->>'body', ''),
    coalesce(nullif(p_data->>'entry_date', '')::date, current_date),
    now()
  )
  on conflict (id) do update set
    kind = excluded.kind,
    title = excluded.title,
    body = excluded.body,
    entry_date = excluded.entry_date,
    updated_at = now()
  where public.admin_utility_notes.admin_id = v_admin.id
  returning * into v_row;
  if not found then raise exception 'Note not found'; end if;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_delete_utility_note(p_token text, p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not (
    v_admin.role = 'superadmin'
    or public._has_perm(v_admin, 'utilities', 'delete')
    or public._has_perm(v_admin, 'utilities', 'edit')
  ) then
    raise exception 'You do not have permission to delete notes';
  end if;
  delete from public.admin_utility_notes where id = p_id and admin_id = v_admin.id;
  if not found then raise exception 'Note not found'; end if;
  return jsonb_build_object('ok', true);
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
    'overview', 'visitors', 'contacts',
    'program_types', 'programs', 'program_registrations', 'church_roles', 'church_members',
    'church_branches', 'member_notifications', 'volunteer_applications', 'banners',
    'approvals', 'church_meetings', 'form_dropdowns', 'utilities'
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

grant execute on function public.admin_list_utility_notes(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_utility_note(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_utility_note(text, uuid) to anon, authenticated;
