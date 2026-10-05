-- Education RSS sources, headline sort, cross-source dedupe, and header-only news cron auth.
--
-- Safe to run more than once.
--
-- Data changes:
--   INSERT (or ON CONFLICT UPDATE) five news_sources rows:
--     legit-education, tribune-education, pmnews-education,
--     businessday-education, bbc-education. category = education, enabled = true.
--   UPDATE news_sources SET enabled = false WHERE id = 'punch-education'.
--   Does not INSERT, UPDATE, or DELETE news_articles.
--   Does not change punch-faith or ct-nigeria.
--
-- Replaces invoke_scheduled_edge_crons so the news call sends x-cron-secret
-- and does not put NEWS_CRON_SECRET in the function URL. Growth and
-- member-email URLs are unchanged.
--
-- After this migration and the fetch-christian-news redeploy, rotate
-- NEWS_CRON_SECRET (edge function secret and edge_cron_config.news_cron_secret).
-- The old value has appeared in request URLs and logs.

insert into public.news_sources (id, name, homepage_url, feed_url, scrape_url, category, enabled)
values
  (
    'legit-education',
    'Legit.ng — Education',
    'https://www.legit.ng/education',
    'https://www.legit.ng/rss/education.rss',
    '',
    'education',
    true
  ),
  (
    'tribune-education',
    'Nigerian Tribune — Education',
    'https://tribuneonlineng.com/category/education/',
    'https://tribuneonlineng.com/category/education/feed/',
    '',
    'education',
    true
  ),
  (
    'pmnews-education',
    'PM News — Education',
    'https://pmnewsnigeria.com/category/education/',
    'https://pmnewsnigeria.com/category/education/feed/',
    '',
    'education',
    true
  ),
  (
    'businessday-education',
    'BusinessDay — Education',
    'https://businessday.ng/category/education/',
    'https://businessday.ng/category/education/feed/',
    '',
    'education',
    true
  ),
  (
    'bbc-education',
    'BBC — Education',
    'https://www.bbc.co.uk/news/education',
    'https://feeds.bbci.co.uk/news/education/rss.xml',
    '',
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

update public.news_sources
set enabled = false
where id = 'punch-education';

-- Same rules as normaliseTitle / normaliseLink in fetch-christian-news/newsParse.ts.
create or replace function public.news_normalise_title(p_title text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(regexp_replace(lower(coalesce(p_title, '')), '[^a-z0-9]+', ' ', 'g'));
$$;

create or replace function public.news_normalise_link(p_url text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := lower(trim(coalesce(p_url, '')));
  v_base text;
  v_query text;
  v_part text;
  v_key text;
  v_kept text[] := array[]::text[];
begin
  if v = '' then
    return '';
  end if;
  v := split_part(v, '#', 1);
  v_base := split_part(v, '?', 1);
  v_query := case when position('?' in v) > 0 then substr(v, position('?' in v) + 1) else '' end;
  if v_query <> '' then
    foreach v_part in array string_to_array(v_query, '&') loop
      v_key := split_part(v_part, '=', 1);
      if v_key = '' then
        continue;
      end if;
      if v_key like 'utm\_%' escape '\'
         or v_key in (
           'fbclid', 'gclid', 'mc_cid', 'mc_eid',
           'at_medium', 'at_campaign', 'at_source',
           'at_custom1', 'at_custom2', 'at_custom3', 'at_custom4'
         ) then
        continue;
      end if;
      v_kept := array_append(v_kept, v_part);
    end loop;
  end if;
  v_base := regexp_replace(v_base, '^https?://(www\.)?', '');
  v_base := regexp_replace(v_base, '/+$', '');
  if coalesce(array_length(v_kept, 1), 0) > 0 then
    return v_base || '?' || array_to_string(v_kept, '&');
  end if;
  return v_base;
end;
$$;

revoke all on function public.news_normalise_title(text) from public, anon, authenticated;
revoke all on function public.news_normalise_link(text) from public, anon, authenticated;

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
    select jsonb_agg(
      to_jsonb(n)
      order by coalesce(n.published_at, n.created_at) desc, n.fetched_at desc
    )
    from (
      select
        id, source_id, source_name, category, title, url, excerpt, image_url,
        author, published_at, created_at, fetched_at
      from public.news_articles
      where published = true
        and hidden = false
        and (v_cat is null or category = v_cat)
      order by coalesce(published_at, created_at) desc, fetched_at desc
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
    select jsonb_agg(
      to_jsonb(n)
      order by coalesce(n.published_at, n.created_at) desc, n.fetched_at desc
    )
    from (
      select *
      from public.news_articles
      where v_cat is null or category = v_cat
      order by coalesce(published_at, created_at) desc, fetched_at desc
      limit v_limit
    ) n
  ), '[]'::jsonb);
end;
$$;

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
  v_title text;
  v_norm_title text;
  v_norm_link text;
  v_processed int := 0;
  v_skipped int := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items array required';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_url := left(trim(coalesce(v_item->>'url', '')), 1000);
    v_title := left(trim(coalesce(v_item->>'title', '')), 400);
    if v_url = '' or length(v_title) < 3 then
      continue;
    end if;
    v_hash := md5(lower(v_url));
    v_norm_title := public.news_normalise_title(v_title);
    v_norm_link := public.news_normalise_link(v_url);

    -- Same url_hash still updates below. A different link or title from
    -- another source, inside 7 days, is a syndicated duplicate.
    if exists (
      select 1
      from public.news_articles a
      where a.url_hash is distinct from v_hash
        and coalesce(a.published_at, a.created_at) >= now() - interval '7 days'
        and (
          (length(v_norm_title) >= 12 and public.news_normalise_title(a.title) = v_norm_title)
          or (length(v_norm_link) >= 8 and public.news_normalise_link(a.url) = v_norm_link)
        )
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

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
      v_title,
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

    v_processed := v_processed + 1;
  end loop;

  return jsonb_build_object('ok', true, 'processed', v_processed, 'skipped', v_skipped);
end;
$$;

grant execute on function public.public_list_news_articles(text, integer) to anon, authenticated;
grant execute on function public.admin_list_news_articles(text, text, integer) to anon, authenticated;
revoke all on function public.upsert_news_articles(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_news_articles(jsonb) to service_role;

create index if not exists news_articles_public_sort_idx
  on public.news_articles (coalesce(published_at, created_at) desc)
  where published = true and hidden = false;

-- Header-only news cron. Copied from 20261029_member_content_emails.sql
-- except the news URL no longer includes ?secret=.
create or replace function public.invoke_scheduled_edge_crons(p_kind text default 'all')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg public.edge_cron_config%rowtype;
  v_kind text := lower(coalesce(nullif(trim(p_kind), ''), 'all'));
  v_url text;
  v_secret text;
  v_req_id bigint;
  v_results jsonb := '[]'::jsonb;
begin
  select * into v_cfg from public.edge_cron_config where id = 1;
  if not found or nullif(trim(v_cfg.project_url), '') is null then
    return jsonb_build_object('ok', false, 'error', 'edge_cron_config.project_url not set');
  end if;

  if v_kind in ('all', 'news') and v_cfg.news_enabled and nullif(trim(v_cfg.news_cron_secret), '') is not null then
    v_url := rtrim(v_cfg.project_url, '/') || '/functions/v1/fetch-christian-news';
    begin
      select net.http_post(
        url := v_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_cfg.news_cron_secret),
        body := '{}'::jsonb
      ) into v_req_id;
      v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'news', 'request_id', v_req_id));
    exception when others then
      v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'news', 'error', SQLERRM));
    end;
  end if;

  if v_kind in ('all', 'growth') and v_cfg.growth_enabled and nullif(trim(v_cfg.growth_cron_secret), '') is not null then
    v_url := rtrim(v_cfg.project_url, '/') || '/functions/v1/spool-daily-growth?secret=' || v_cfg.growth_cron_secret;
    begin
      select net.http_post(
        url := v_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_cfg.growth_cron_secret),
        body := '{}'::jsonb
      ) into v_req_id;
      v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'growth', 'request_id', v_req_id));
    exception when others then
      v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'growth', 'error', SQLERRM));
    end;
  end if;

  if v_cfg.member_emails_enabled and nullif(trim(coalesce(v_cfg.member_emails_secret, '')), '') is not null then
    v_secret := v_cfg.member_emails_secret;
    if v_kind in ('all', 'digest') then
      v_url := rtrim(v_cfg.project_url, '/') || '/functions/v1/member-content-emails?job=digest&secret=' || v_secret;
      begin
        select net.http_post(
          url := v_url,
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
          body := '{}'::jsonb
        ) into v_req_id;
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'digest', 'request_id', v_req_id));
      exception when others then
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'digest', 'error', SQLERRM));
      end;
    end if;
    if v_kind in ('all', 'bible_study') then
      v_url := rtrim(v_cfg.project_url, '/') || '/functions/v1/member-content-emails?job=bible_study&secret=' || v_secret;
      begin
        select net.http_post(
          url := v_url,
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
          body := '{}'::jsonb
        ) into v_req_id;
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'bible_study', 'request_id', v_req_id));
      exception when others then
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'bible_study', 'error', SQLERRM));
      end;
    end if;
    if v_kind in ('all', 'sunday_service') then
      v_url := rtrim(v_cfg.project_url, '/') || '/functions/v1/member-content-emails?job=sunday_service&secret=' || v_secret;
      begin
        select net.http_post(
          url := v_url,
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
          body := '{}'::jsonb
        ) into v_req_id;
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'sunday_service', 'request_id', v_req_id));
      exception when others then
        v_results := v_results || jsonb_build_array(jsonb_build_object('kind', 'sunday_service', 'error', SQLERRM));
      end;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'results', v_results, 'at', now());
end;
$$;

revoke all on function public.invoke_scheduled_edge_crons(text) from public;
grant execute on function public.invoke_scheduled_edge_crons(text) to postgres, service_role;
