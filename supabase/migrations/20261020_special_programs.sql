-- Special church programs (21-day revival, youth convention, …) + media items

create table if not exists public.special_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  cover_url text not null default '',
  starts_on date,
  ends_on date,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.special_program_items (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.special_programs(id) on delete cascade,
  title text not null,
  slug text not null default '',
  excerpt text not null default '',
  content text not null default '',
  content_format text not null default 'video'
    check (content_format in ('video', 'written')),
  item_date date,
  youtube_url text not null default '',
  facebook_url text not null default '',
  audiomack_url text not null default '',
  thumbnail_url text not null default '',
  attachment_url text not null default '',
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists special_programs_published_idx
  on public.special_programs (published, sort_order, starts_on desc nulls last);

create index if not exists special_program_items_program_idx
  on public.special_program_items (program_id, published, item_date desc nulls last, sort_order);

alter table public.special_programs enable row level security;
alter table public.special_program_items enable row level security;

drop policy if exists special_programs_public_read on public.special_programs;
create policy special_programs_public_read on public.special_programs
  for select using (published = true);

drop policy if exists special_program_items_public_read on public.special_program_items;
create policy special_program_items_public_read on public.special_program_items
  for select using (
    published = true
    and exists (
      select 1 from public.special_programs p
      where p.id = program_id and p.published = true
    )
  );

create or replace function public._special_program_slug(p_title text, p_slug text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  v := lower(trim(coalesce(nullif(trim(p_slug), ''), coalesce(p_title, ''))));
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := trim(both '-' from v);
  if v = '' then
    v := 'program';
  end if;
  return left(v, 120);
end;
$$;

-- Public: list published programs (with item counts)
create or replace function public.public_list_special_programs()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.sort_order asc, x.starts_on desc nulls last, x.created_at desc)
    from (
      select
        p.*,
        (
          select count(*)::int
          from public.special_program_items i
          where i.program_id = p.id and i.published = true
        ) as item_count
      from public.special_programs p
      where p.published = true
    ) x
  ), '[]'::jsonb);
end;
$$;

-- Public: list published items for a program (by id or slug)
create or replace function public.public_list_special_program_items(
  p_program_id uuid default null,
  p_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program uuid;
begin
  select p.id into v_program
  from public.special_programs p
  where p.published = true
    and (
      (p_program_id is not null and p.id = p_program_id)
      or (nullif(trim(p_slug), '') is not null and p.slug = lower(trim(p_slug)))
    )
  limit 1;

  if v_program is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(i) order by
      i.item_date desc nulls last,
      i.sort_order asc,
      i.created_at desc)
    from public.special_program_items i
    where i.program_id = v_program
      and i.published = true
  ), '[]'::jsonb);
end;
$$;

-- Admin programs
create or replace function public.admin_list_special_programs(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.sort_order asc, x.starts_on desc nulls last, x.created_at desc)
    from (
      select
        p.*,
        (
          select count(*)::int
          from public.special_program_items i
          where i.program_id = p.id
        ) as item_count
      from public.special_programs p
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_special_program(
  p_token text,
  p_id uuid,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text;
  v_row jsonb;
  v_base text;
  v_try text;
  v_n int := 0;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  v_id := coalesce(p_id, gen_random_uuid());
  v_base := public._special_program_slug(p_data->>'title', p_data->>'slug');
  v_try := v_base;

  while exists (
    select 1 from public.special_programs s
    where s.slug = v_try and s.id <> v_id
  ) loop
    v_n := v_n + 1;
    v_try := left(v_base || '-' || v_n::text, 120);
  end loop;
  v_slug := v_try;

  insert into public.special_programs (
    id, title, slug, description, cover_url, starts_on, ends_on, published, sort_order, updated_at
  ) values (
    v_id,
    coalesce(nullif(trim(p_data->>'title'), ''), 'Untitled program'),
    v_slug,
    coalesce(p_data->>'description', ''),
    coalesce(p_data->>'cover_url', ''),
    nullif(p_data->>'starts_on', '')::date,
    nullif(p_data->>'ends_on', '')::date,
    coalesce((p_data->>'published')::boolean, true),
    coalesce((p_data->>'sort_order')::integer, 0),
    now()
  )
  on conflict (id) do update set
    title = excluded.title,
    slug = excluded.slug,
    description = excluded.description,
    cover_url = excluded.cover_url,
    starts_on = excluded.starts_on,
    ends_on = excluded.ends_on,
    published = excluded.published,
    sort_order = excluded.sort_order,
    updated_at = now()
  returning to_jsonb(public.special_programs.*) into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_delete_special_program(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'blog.posts', 'delete');
  delete from public.special_programs where id = p_id;
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;

-- Admin items
create or replace function public.admin_list_special_program_items(p_token text, p_program_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  if p_program_id is null then
    raise exception 'program id required';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(i) order by
      i.item_date desc nulls last,
      i.sort_order asc,
      i.created_at desc)
    from public.special_program_items i
    where i.program_id = p_program_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_special_program_item(
  p_token text,
  p_id uuid,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_program uuid;
  v_format text;
  v_row jsonb;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  v_id := coalesce(p_id, gen_random_uuid());
  v_program := nullif(p_data->>'program_id', '')::uuid;
  if v_program is null then
    raise exception 'program_id required';
  end if;
  if not exists (select 1 from public.special_programs where id = v_program) then
    raise exception 'program not found';
  end if;

  v_format := lower(coalesce(nullif(trim(p_data->>'content_format'), ''), 'video'));
  if v_format not in ('video', 'written') then
    v_format := 'video';
  end if;

  insert into public.special_program_items (
    id, program_id, title, slug, excerpt, content, content_format, item_date,
    youtube_url, facebook_url, audiomack_url, thumbnail_url, attachment_url,
    published, sort_order, updated_at
  ) values (
    v_id,
    v_program,
    coalesce(nullif(trim(p_data->>'title'), ''), 'Untitled'),
    coalesce(p_data->>'slug', ''),
    coalesce(p_data->>'excerpt', ''),
    coalesce(p_data->>'content', ''),
    v_format,
    nullif(p_data->>'item_date', '')::date,
    coalesce(p_data->>'youtube_url', ''),
    coalesce(p_data->>'facebook_url', ''),
    coalesce(p_data->>'audiomack_url', ''),
    coalesce(p_data->>'thumbnail_url', ''),
    coalesce(p_data->>'attachment_url', ''),
    coalesce((p_data->>'published')::boolean, true),
    coalesce((p_data->>'sort_order')::integer, 0),
    now()
  )
  on conflict (id) do update set
    program_id = excluded.program_id,
    title = excluded.title,
    slug = excluded.slug,
    excerpt = excluded.excerpt,
    content = excluded.content,
    content_format = excluded.content_format,
    item_date = excluded.item_date,
    youtube_url = excluded.youtube_url,
    facebook_url = excluded.facebook_url,
    audiomack_url = excluded.audiomack_url,
    thumbnail_url = excluded.thumbnail_url,
    attachment_url = excluded.attachment_url,
    published = excluded.published,
    sort_order = excluded.sort_order,
    updated_at = now()
  returning to_jsonb(public.special_program_items.*) into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_delete_special_program_item(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'blog.posts', 'delete');
  delete from public.special_program_items where id = p_id;
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;

grant execute on function public.public_list_special_programs() to anon, authenticated;
grant execute on function public.public_list_special_program_items(uuid, text) to anon, authenticated;
grant execute on function public.admin_list_special_programs(text) to anon, authenticated;
grant execute on function public.admin_upsert_special_program(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_special_program(text, uuid) to anon, authenticated;
grant execute on function public.admin_list_special_program_items(text, uuid) to anon, authenticated;
grant execute on function public.admin_upsert_special_program_item(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_special_program_item(text, uuid) to anon, authenticated;
