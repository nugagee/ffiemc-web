-- Anonymous testimony publishing: keep real identity for admin audit; redact on public.

alter table public.testimonies
  add column if not exists share_anonymous boolean not null default false;

comment on column public.testimonies.share_anonymous is
  'When true, public site shows Anonymous + avatar; admin keeps full name/contact for audit.';

-- Public must not read raw rows (would leak real names). Use public_list_testimonies instead.
drop policy if exists "public_read_testimonies" on public.testimonies;

create or replace function public.public_list_testimonies()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t.id,
      'name', case when t.share_anonymous then 'Anonymous' else t.name end,
      'role', case
        when t.share_anonymous then coalesce(nullif(trim(t.role), ''), 'Church family')
        else t.role
      end,
      'dateJoined', case when t.share_anonymous then '' else t."dateJoined" end,
      'title', t.title,
      'testimony', t.testimony,
      'image', case when t.share_anonymous then '' else t.image end,
      'featured', t.featured,
      'sort_order', t.sort_order,
      'share_anonymous', t.share_anonymous,
      'status', t.status,
      'published_at', t.published_at,
      'created_at', t.created_at
    ) order by t.sort_order asc, t.created_at desc)
    from public.testimonies t
    where t.status = 'published'
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.public_list_testimonies() to anon, authenticated;

drop function if exists public.submit_testimony(text, text, text, text, text, text, text, boolean);
drop function if exists public.submit_testimony(text, text, text, text, text, text, text, boolean, uuid);

create or replace function public.submit_testimony(
  p_name text,
  p_email text,
  p_phone text default '',
  p_role text default '',
  p_date_joined text default '',
  p_title text default '',
  p_testimony text default '',
  p_consent_public boolean default true,
  p_branch_id uuid default null,
  p_share_anonymous boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
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
  if length(trim(p_testimony)) < 20 then
    raise exception 'Please share a bit more of your testimony (at least 20 characters)';
  end if;
  if not coalesce(p_consent_public, false) then
    raise exception 'Please confirm you consent to share your testimony';
  end if;

  insert into public.testimonies (
    name, email, phone, role, "dateJoined", title, testimony,
    status, source, consent_public, featured, sort_order, branch_id, share_anonymous
  ) values (
    trim(p_name),
    trim(p_email),
    coalesce(trim(p_phone), ''),
    coalesce(nullif(trim(p_role), ''), 'Church Member'),
    coalesce(trim(p_date_joined), ''),
    coalesce(trim(p_title), ''),
    trim(p_testimony),
    'pending',
    'form',
    true,
    false,
    (select coalesce(max(sort_order), -1) + 1 from public.testimonies),
    p_branch_id,
    coalesce(p_share_anonymous, false)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_testimony(
  text, text, text, text, text, text, text, boolean, uuid, boolean
) to anon, authenticated;

create or replace function public.admin_review_testimony(
  p_token text,
  p_id uuid,
  p_action text,
  p_data jsonb default '{}'::jsonb,
  p_notify_user boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.testimonies%rowtype;
  v_action text := lower(trim(coalesce(p_action, '')));
begin
  perform public._require_permission(p_token, 'testimonies.list', 'edit');

  select * into v_row from public.testimonies where id = p_id;
  if not found then
    raise exception 'Testimony not found';
  end if;

  if p_data is not null and p_data <> '{}'::jsonb then
    update public.testimonies set
      name = coalesce(nullif(p_data->>'name', ''), name),
      role = coalesce(p_data->>'role', role),
      testimony = coalesce(nullif(p_data->>'testimony', ''), testimony),
      image = coalesce(p_data->>'image', image),
      "dateJoined" = coalesce(p_data->>'dateJoined', "dateJoined"),
      title = coalesce(p_data->>'title', title),
      email = coalesce(p_data->>'email', email),
      phone = coalesce(p_data->>'phone', phone),
      admin_notes = coalesce(p_data->>'admin_notes', admin_notes),
      featured = case
        when p_data ? 'featured' then coalesce((p_data->>'featured')::boolean, false)
        else featured
      end,
      share_anonymous = case
        when p_data ? 'share_anonymous' then coalesce((p_data->>'share_anonymous')::boolean, false)
        else share_anonymous
      end,
      updated_at = now()
    where id = p_id
    returning * into v_row;
  end if;

  if v_action = 'save' then
    return to_jsonb(v_row);
  elsif v_action = 'reject' then
    update public.testimonies set
      status = 'rejected',
      reviewed_at = now(),
      updated_at = now()
    where id = p_id
    returning * into v_row;
    return to_jsonb(v_row);
  elsif v_action in ('publish', 'approve') then
    update public.testimonies set
      status = 'published',
      featured = case
        when p_data ? 'featured' then coalesce((p_data->>'featured')::boolean, featured)
        else featured
      end,
      share_anonymous = case
        when p_data ? 'share_anonymous' then coalesce((p_data->>'share_anonymous')::boolean, share_anonymous)
        else share_anonymous
      end,
      reviewed_at = coalesce(reviewed_at, now()),
      published_at = coalesce(published_at, now()),
      publish_notify_sent = case
        when coalesce(p_notify_user, false) then true
        else publish_notify_sent
      end,
      updated_at = now()
    where id = p_id
    returning * into v_row;
    return to_jsonb(v_row) || jsonb_build_object('notify_user', coalesce(p_notify_user, false));
  elsif v_action = 'unpublish' then
    update public.testimonies set
      status = 'pending',
      published_at = null,
      updated_at = now()
    where id = p_id
    returning * into v_row;
    return to_jsonb(v_row);
  else
    raise exception 'Unknown action. Use save, publish, reject, or unpublish';
  end if;
end;
$$;

grant execute on function public.admin_review_testimony(text, uuid, text, jsonb, boolean) to anon, authenticated;
