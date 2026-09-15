-- Aggregated Christian + education news (headlines/summaries + outbound links only)

create table if not exists public.news_sources (
  id text primary key,
  name text not null,
  homepage_url text not null default '',
  feed_url text not null default '',
  scrape_url text not null default '',
  category text not null default 'christian'
    check (category in ('christian', 'education', 'nigeria')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.news_sources(id) on delete cascade,
  source_name text not null default '',
  category text not null default 'christian'
    check (category in ('christian', 'education', 'nigeria')),
  title text not null,
  url text not null,
  url_hash text not null,
  excerpt text not null default '',
  image_url text not null default '',
  author text not null default '',
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  published boolean not null default true,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_articles_url_hash_unique unique (url_hash)
);

create index if not exists news_articles_published_idx
  on public.news_articles (published, hidden, published_at desc nulls last);
create index if not exists news_articles_category_idx
  on public.news_articles (category, published_at desc nulls last);
create index if not exists news_articles_source_idx
  on public.news_articles (source_id, published_at desc nulls last);

alter table public.news_sources enable row level security;
alter table public.news_articles enable row level security;

drop policy if exists news_articles_public_read on public.news_articles;
create policy news_articles_public_read
  on public.news_articles
  for select
  to anon, authenticated
  using (published = true and hidden = false);

drop policy if exists news_sources_public_read on public.news_sources;
create policy news_sources_public_read
  on public.news_sources
  for select
  to anon, authenticated
  using (enabled = true);

insert into public.news_sources (id, name, homepage_url, feed_url, scrape_url, category, enabled)
values
  (
    'ct-nigeria',
    'Christianity Today — Nigeria',
    'https://www.christianitytoday.com/topics/nigeria/',
    '',
    'https://www.christianitytoday.com/topics/nigeria/',
    'nigeria',
    true
  ),
  (
    'ct-feed',
    'Christianity Today',
    'https://www.christianitytoday.com/',
    'https://www.christianitytoday.com/feed/',
    '',
    'christian',
    true
  ),
  (
    'christian-today',
    'Christian Today',
    'https://www.christiantoday.com/',
    'https://www.christiantoday.com/rss.xml',
    '',
    'christian',
    true
  ),
  (
    'punch-education',
    'Punch — Education',
    'https://punchng.com/topics/education/',
    'https://punchng.com/topics/education/feed/',
    'https://punchng.com/topics/education/',
    'education',
    true
  ),
  (
    'guardian-education',
    'Guardian Nigeria — Education',
    'https://guardian.ng/category/news/education/',
    'https://guardian.ng/category/news/education/feed/',
    'https://guardian.ng/category/news/education/',
    'education',
    true
  )
on conflict (id) do update set
  name = excluded.name,
  homepage_url = excluded.homepage_url,
  feed_url = excluded.feed_url,
  scrape_url = excluded.scrape_url,
  category = excluded.category,
  enabled = excluded.enabled;

create or replace function public.public_list_news_articles(
  p_category text default null,
  p_limit integer default 40
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_cat text := lower(nullif(trim(p_category), ''));
  v_limit int := greatest(1, least(coalesce(p_limit, 40), 100));
begin
  if v_cat is not null and v_cat not in ('christian', 'education', 'nigeria', 'all') then
    raise exception 'Invalid news category';
  end if;
  if v_cat = 'all' then
    v_cat := null;
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(n) order by n.published_at desc nulls last, n.fetched_at desc)
    from (
      select
        id, source_id, source_name, category, title, url, excerpt, image_url,
        author, published_at, fetched_at
      from public.news_articles
      where published = true
        and hidden = false
        and (v_cat is null or category = v_cat)
      order by published_at desc nulls last, fetched_at desc
      limit v_limit
    ) n
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_list_news_articles(
  p_token text,
  p_category text default null,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat text := lower(nullif(trim(p_category), ''));
  v_limit int := greatest(1, least(coalesce(p_limit, 100), 300));
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  if v_cat is not null and v_cat not in ('christian', 'education', 'nigeria', 'all') then
    raise exception 'Invalid news category';
  end if;
  if v_cat = 'all' then
    v_cat := null;
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(n) order by n.published_at desc nulls last, n.fetched_at desc)
    from (
      select *
      from public.news_articles
      where v_cat is null or category = v_cat
      order by published_at desc nulls last, fetched_at desc
      limit v_limit
    ) n
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_set_news_article_hidden(
  p_token text,
  p_id uuid,
  p_hidden boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.news_articles%rowtype;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  update public.news_articles
  set hidden = coalesce(p_hidden, true), updated_at = now()
  where id = p_id
  returning * into v_row;
  if not found then
    raise exception 'News article not found';
  end if;
  return to_jsonb(v_row);
end;
$$;

-- Upsert batch used by the edge crawler (service role / security definer)
create or replace function public.upsert_news_articles(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_url text;
  v_hash text;
  v_inserted int := 0;
  v_updated int := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items array required';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_url := left(trim(coalesce(v_item->>'url', '')), 1000);
    if v_url = '' or length(trim(coalesce(v_item->>'title', ''))) < 3 then
      continue;
    end if;
    v_hash := md5(lower(v_url));

    insert into public.news_articles (
      source_id, source_name, category, title, url, url_hash, excerpt, image_url,
      author, published_at, fetched_at, published, hidden, updated_at
    ) values (
      left(coalesce(nullif(v_item->>'source_id', ''), 'unknown'), 80),
      left(coalesce(v_item->>'source_name', ''), 160),
      case
        when lower(coalesce(v_item->>'category', '')) in ('christian', 'education', 'nigeria')
          then lower(v_item->>'category')
        else 'christian'
      end,
      left(trim(v_item->>'title'), 400),
      v_url,
      v_hash,
      left(trim(coalesce(v_item->>'excerpt', '')), 500),
      left(trim(coalesce(v_item->>'image_url', '')), 1000),
      left(trim(coalesce(v_item->>'author', '')), 160),
      nullif(v_item->>'published_at', '')::timestamptz,
      now(),
      true,
      false,
      now()
    )
    on conflict (url_hash) do update set
      title = excluded.title,
      excerpt = case
        when length(excluded.excerpt) > 0 then excluded.excerpt
        else public.news_articles.excerpt
      end,
      image_url = case
        when length(excluded.image_url) > 0 then excluded.image_url
        else public.news_articles.image_url
      end,
      author = case
        when length(excluded.author) > 0 then excluded.author
        else public.news_articles.author
      end,
      published_at = coalesce(excluded.published_at, public.news_articles.published_at),
      source_name = excluded.source_name,
      category = excluded.category,
      fetched_at = now(),
      updated_at = now()
    ;

    if found then
      -- distinguish insert vs update roughly via xmax
      null;
    end if;
    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object('ok', true, 'processed', v_inserted, 'updated_hint', v_updated);
end;
$$;

grant execute on function public.public_list_news_articles(text, integer) to anon, authenticated;
grant execute on function public.admin_list_news_articles(text, text, integer) to anon, authenticated;
grant execute on function public.admin_set_news_article_hidden(text, uuid, boolean) to anon, authenticated;
-- Only the edge function (service role) should upsert headlines
grant execute on function public.upsert_news_articles(jsonb) to service_role;

-- Optional: schedule via pg_cron if extension exists (Supabase Pro). Safe no-op otherwise.
do $$
begin
  create extension if not exists pg_net with schema extensions;
exception
  when others then null;
end $$;

do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
exception
  when others then null;
end $$;
