-- Fix church_resources admin RPCs: use _require_permission (same as other admin APIs).
-- Previous migrations incorrectly called public._admin_from_token(text), which does not exist.

alter table public.church_resources
  drop constraint if exists church_resources_kind_check;

alter table public.church_resources
  add constraint church_resources_kind_check
  check (kind in ('bible_study', 'daily_manna', 'sunday_sermon', 'choir_ministration'));

alter table public.church_resources
  add column if not exists service_date date,
  add column if not exists youtube_url text not null default '',
  add column if not exists facebook_url text not null default '',
  add column if not exists audiomack_url text not null default '',
  add column if not exists thumbnail_url text not null default '';

create or replace function public.public_list_church_resources(p_kind text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := lower(nullif(trim(p_kind), ''));
begin
  if v_kind is not null and v_kind not in ('bible_study', 'daily_manna', 'sunday_sermon', 'choir_ministration') then
    raise exception 'Invalid resource kind';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by
      coalesce(r.service_date, r.study_date, r.week_of) desc nulls last,
      r.sort_order asc,
      r.created_at desc)
    from public.church_resources r
    where r.published = true
      and (v_kind is null or r.kind = v_kind)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_list_church_resources(p_token text, p_kind text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := lower(nullif(trim(p_kind), ''));
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  if v_kind is not null and v_kind not in ('bible_study', 'daily_manna', 'sunday_sermon', 'choir_ministration') then
    raise exception 'Invalid resource kind';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by
      coalesce(r.service_date, r.study_date, r.week_of) desc nulls last,
      r.sort_order asc,
      r.created_at desc)
    from public.church_resources r
    where v_kind is null or r.kind = v_kind
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_church_resource(p_token text, p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_kind text;
  v_row jsonb;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  v_id := coalesce(p_id, gen_random_uuid());
  v_kind := lower(coalesce(nullif(p_data->>'kind', ''), 'bible_study'));
  if v_kind not in ('bible_study', 'daily_manna', 'sunday_sermon', 'choir_ministration') then
    raise exception 'Invalid resource kind';
  end if;

  insert into public.church_resources (
    id, kind, title, slug, excerpt, content, week_of, study_date, service_date,
    attachment_url, youtube_url, facebook_url, audiomack_url, thumbnail_url,
    published, sort_order, updated_at
  )
  values (
    v_id,
    v_kind,
    coalesce(p_data->>'title', ''),
    coalesce(p_data->>'slug', ''),
    coalesce(p_data->>'excerpt', ''),
    coalesce(p_data->>'content', ''),
    nullif(p_data->>'week_of', '')::date,
    nullif(p_data->>'study_date', '')::date,
    nullif(p_data->>'service_date', '')::date,
    coalesce(p_data->>'attachment_url', ''),
    coalesce(p_data->>'youtube_url', ''),
    coalesce(p_data->>'facebook_url', ''),
    coalesce(p_data->>'audiomack_url', ''),
    coalesce(p_data->>'thumbnail_url', ''),
    coalesce((p_data->>'published')::boolean, true),
    coalesce((p_data->>'sort_order')::integer, 0),
    now()
  )
  on conflict (id) do update set
    kind = excluded.kind,
    title = excluded.title,
    slug = excluded.slug,
    excerpt = excluded.excerpt,
    content = excluded.content,
    week_of = excluded.week_of,
    study_date = excluded.study_date,
    service_date = excluded.service_date,
    attachment_url = excluded.attachment_url,
    youtube_url = excluded.youtube_url,
    facebook_url = excluded.facebook_url,
    audiomack_url = excluded.audiomack_url,
    thumbnail_url = excluded.thumbnail_url,
    published = excluded.published,
    sort_order = excluded.sort_order,
    updated_at = now()
  returning to_jsonb(public.church_resources.*) into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_delete_church_resource(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'blog.posts', 'delete');
  delete from public.church_resources where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.public_list_church_resources(text) to anon, authenticated;
grant execute on function public.admin_list_church_resources(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_church_resource(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_church_resource(text, uuid) to anon, authenticated;
