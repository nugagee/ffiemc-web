-- Live faith RSS sources, per-source filters, and Nigeria routing.
--
-- Safe to run more than once.
--
-- Schema:
--   news_sources.filter_mode  text not null default 'faith'
--     none | faith | christian
--   news_sources.nigeria_route text not null default 'off'
--     off | mention | only
--   Existing news_sources rows with a null new column are set to those defaults.
--   Education rows are left on that default. The fetcher still treats education
--   by category, the same way as before.
--
-- Data changes (news_sources only):
--   UPDATE punch-faith SET enabled = false.
--   INSERT or ON CONFLICT UPDATE:
--     christian-today  enabled, feed https://www.christiantoday.com/rss.xml,
--       scrape_url cleared, filter_mode none, nigeria_route mention, category christian.
--     ct-feed          enabled, feed https://www.christianitytoday.com/feed/,
--       scrape_url cleared, filter_mode none, nigeria_route off, category christian.
--     ct-nigeria       enabled, feed https://www.christianitytoday.com/tag/nigeria/feed/,
--       scrape_url cleared, filter_mode none, nigeria_route off, category nigeria.
--     christian-post, rns, ewtn-news
--       category christian, filter_mode none, nigeria_route off.
--     christian-daily
--       category christian, filter_mode none, nigeria_route mention.
--     tribune-religion, dailypost-can, newtelegraph-faith, leadership-religion
--       category nigeria, filter_mode christian, nigeria_route off.
--     morningstar-nigeria
--       category nigeria, filter_mode none, nigeria_route off.
--     icc
--       category nigeria, filter_mode christian, nigeria_route only
--       (Nigeria wording is kept as nigeria; every other item is dropped).
--   Does not INSERT, UPDATE, or DELETE news_articles.
--   Does not unhide hidden rows. upsert_news_articles still leaves hidden as it is
--   when the same url_hash is fetched again.
--
-- Also replaces news_normalise_title so it drops the same stopwords as
-- normaliseTitle() in fetch-christian-news/newsParse.ts (a, an, the, in, on,
-- at, of, for, to, and, or, by, with, from).

alter table public.news_sources
  add column if not exists filter_mode text;

alter table public.news_sources
  add column if not exists nigeria_route text;

update public.news_sources
set filter_mode = 'faith'
where filter_mode is null;

update public.news_sources
set nigeria_route = 'off'
where nigeria_route is null;

alter table public.news_sources
  alter column filter_mode set default 'faith';

alter table public.news_sources
  alter column nigeria_route set default 'off';

alter table public.news_sources
  alter column filter_mode set not null;

alter table public.news_sources
  alter column nigeria_route set not null;

alter table public.news_sources
  drop constraint if exists news_sources_filter_mode_check;

alter table public.news_sources
  add constraint news_sources_filter_mode_check
  check (filter_mode in ('none', 'faith', 'christian'));

alter table public.news_sources
  drop constraint if exists news_sources_nigeria_route_check;

alter table public.news_sources
  add constraint news_sources_nigeria_route_check
  check (nigeria_route in ('off', 'mention', 'only'));

insert into public.news_sources (
  id, name, homepage_url, feed_url, scrape_url, category, enabled, filter_mode, nigeria_route
)
values
  (
    'christian-today',
    'Christian Today',
    'https://www.christiantoday.com/',
    'https://www.christiantoday.com/rss.xml',
    '',
    'christian',
    true,
    'none',
    'mention'
  ),
  (
    'ct-feed',
    'Christianity Today',
    'https://www.christianitytoday.com/',
    'https://www.christianitytoday.com/feed/',
    '',
    'christian',
    true,
    'none',
    'off'
  ),
  (
    'ct-nigeria',
    'Christianity Today — Nigeria',
    'https://www.christianitytoday.com/tag/nigeria/',
    'https://www.christianitytoday.com/tag/nigeria/feed/',
    '',
    'nigeria',
    true,
    'none',
    'off'
  ),
  (
    'christian-post',
    'The Christian Post',
    'https://www.christianpost.com/',
    'https://www.christianpost.com/rss',
    '',
    'christian',
    true,
    'none',
    'off'
  ),
  (
    'rns',
    'Religion News Service',
    'https://religionnews.com/',
    'https://religionnews.com/feed/',
    '',
    'christian',
    true,
    'none',
    'off'
  ),
  (
    'ewtn-news',
    'EWTN News',
    'https://www.ewtnnews.com/',
    'https://www.ewtnnews.com/rss',
    '',
    'christian',
    true,
    'none',
    'off'
  ),
  (
    'christian-daily',
    'Christian Daily International',
    'https://www.christiandaily.com/',
    'https://www.christiandaily.com/rss.xml',
    '',
    'christian',
    true,
    'none',
    'mention'
  ),
  (
    'tribune-religion',
    'Nigerian Tribune — Religion',
    'https://tribuneonlineng.com/category/religion/',
    'https://tribuneonlineng.com/category/religion/feed/',
    '',
    'nigeria',
    true,
    'christian',
    'off'
  ),
  (
    'morningstar-nigeria',
    'Morning Star News — Nigeria',
    'https://morningstarnews.org/tag/nigeria/',
    'https://morningstarnews.org/tag/nigeria/feed/',
    '',
    'nigeria',
    true,
    'none',
    'off'
  ),
  (
    'dailypost-can',
    'Daily Post — CAN',
    'https://dailypost.ng/tag/can/',
    'https://dailypost.ng/tag/can/feed/',
    '',
    'nigeria',
    true,
    'christian',
    'off'
  ),
  (
    'newtelegraph-faith',
    'New Telegraph — Faith',
    'https://newtelegraphng.com/category/faith/',
    'https://newtelegraphng.com/category/faith/feed/',
    '',
    'nigeria',
    true,
    'christian',
    'off'
  ),
  (
    'leadership-religion',
    'Leadership — Religion',
    'https://leadership.ng/religion/',
    'https://leadership.ng/religion/feed/',
    '',
    'nigeria',
    true,
    'christian',
    'off'
  ),
  (
    'icc',
    'International Christian Concern',
    'https://www.persecution.org/',
    'https://www.persecution.org/feed/',
    '',
    'nigeria',
    true,
    'christian',
    'only'
  )
on conflict (id) do update set
  name = excluded.name,
  homepage_url = excluded.homepage_url,
  feed_url = excluded.feed_url,
  scrape_url = excluded.scrape_url,
  category = excluded.category,
  enabled = excluded.enabled,
  filter_mode = excluded.filter_mode,
  nigeria_route = excluded.nigeria_route;

update public.news_sources
set enabled = false
where id = 'punch-faith';

-- Same stopword list as TITLE_STOPWORDS / normaliseTitle in newsParse.ts.
create or replace function public.news_normalise_title(p_title text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text;
  v_word text;
  v_out text := '';
begin
  v := trim(regexp_replace(lower(coalesce(p_title, '')), '[^a-z0-9]+', ' ', 'g'));
  if v = '' then
    return '';
  end if;
  foreach v_word in array regexp_split_to_array(v, ' +') loop
    if v_word = '' then
      continue;
    end if;
    if v_word in (
      'a', 'an', 'the', 'in', 'on', 'at', 'of', 'for', 'to', 'and', 'or', 'by', 'with', 'from'
    ) then
      continue;
    end if;
    v_out := case when v_out = '' then v_word else v_out || ' ' || v_word end;
  end loop;
  return v_out;
end;
$$;

revoke all on function public.news_normalise_title(text) from public, anon, authenticated;
