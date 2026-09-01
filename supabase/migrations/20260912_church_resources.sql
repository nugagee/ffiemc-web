-- Church resources: Monday Bible Study + Daily Manna

create table if not exists public.church_resources (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('bible_study', 'daily_manna')),
  title text not null default '',
  slug text not null default '',
  excerpt text not null default '',
  content text not null default '',
  week_of date,
  study_date date,
  attachment_url text not null default '',
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_resources_kind_date_idx
  on public.church_resources (kind, week_of desc nulls last, study_date desc nulls last);

alter table public.church_resources enable row level security;

drop policy if exists "public_read_church_resources" on public.church_resources;
create policy "public_read_church_resources" on public.church_resources
  for select to anon, authenticated using (published = true);

grant select on public.church_resources to anon, authenticated;

create or replace function public.public_list_church_resources(p_kind text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := lower(nullif(trim(p_kind), ''));
begin
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by
      case when r.kind = 'bible_study' then r.week_of end desc nulls last,
      case when r.kind = 'daily_manna' then r.study_date end desc nulls last,
      r.sort_order asc,
      r.created_at desc)
    from public.church_resources r
    where r.published = true
      and (v_kind is null or r.kind = v_kind)
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.public_list_church_resources(text) to anon, authenticated;

create or replace function public.admin_list_church_resources(p_token text, p_kind text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_kind text := lower(nullif(trim(p_kind), ''));
begin
  v_admin := public._admin_from_token(p_token);
  if not public._has_perm(v_admin, 'blog.posts', 'view') then
    raise exception 'You do not have permission to view church resources';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by
      case when r.kind = 'bible_study' then r.week_of end desc nulls last,
      case when r.kind = 'daily_manna' then r.study_date end desc nulls last,
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
  v_admin uuid;
  v_id uuid;
  v_kind text;
  v_row jsonb;
begin
  v_admin := public._admin_from_token(p_token);
  if not public._has_perm(v_admin, 'blog.posts', 'edit') then
    raise exception 'You do not have permission to edit church resources';
  end if;
  v_id := coalesce(p_id, gen_random_uuid());
  v_kind := lower(coalesce(nullif(p_data->>'kind', ''), 'bible_study'));
  if v_kind not in ('bible_study', 'daily_manna') then
    raise exception 'Invalid resource kind';
  end if;

  insert into public.church_resources (
    id, kind, title, slug, excerpt, content, week_of, study_date,
    attachment_url, published, sort_order, updated_at
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
    coalesce(p_data->>'attachment_url', ''),
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
    attachment_url = excluded.attachment_url,
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
declare
  v_admin uuid;
begin
  v_admin := public._admin_from_token(p_token);
  if not public._has_perm(v_admin, 'blog.posts', 'delete') then
    raise exception 'You do not have permission to delete church resources';
  end if;
  delete from public.church_resources where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_list_church_resources(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_church_resource(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_church_resource(text, uuid) to anon, authenticated;
