-- Christian news on the site is Nigerian Christian news only.
--
-- Safe to run more than once.
-- Apply after 20261107_faith_rss_sources.sql (that migration adds filter_mode).
--
-- Schema:
--   news_sources.filter_mode may now be 'nigeria_christian'
--     none | faith | christian | nigeria_christian
--   nigeria_christian keeps an item only when the title and excerpt are both
--   Nigerian and Christian. The fetcher implements that test. This file only
--   widens the check constraint and updates news_sources rows.
--
-- Data changes (news_sources only):
--   christian-today, christian-daily
--     stay enabled. category christian, filter_mode nigeria_christian,
--     nigeria_route off. A dry run on 6 Oct 2026 kept Nigerian Christian items
--     from both feeds (Christian Today 1 qualified, 1 in the last 7 days;
--     Christian Daily 6 qualified, 1 in the last 7 days). Nigeria hits stay
--     in Faith (christian) instead of being routed to nigeria.
--   ct-feed, christian-post, rns, ewtn-news
--     enabled false. Same filter_mode nigeria_christian and nigeria_route off,
--     so turning one back on cannot publish international Christian news.
--     The same dry run found no Nigerian item in those feeds (probe qualified 0).
--   tribune-religion, dailypost-can, newtelegraph-faith, leadership-religion,
--   morningstar-nigeria, icc, and ct-nigeria are not updated.
--   Does not INSERT, UPDATE, or DELETE news_articles.
--   Does not hide or unhide anything. See supabase/scripts/hide_non_nigerian_faith_news.sql.

alter table public.news_sources
  drop constraint if exists news_sources_filter_mode_check;

alter table public.news_sources
  add constraint news_sources_filter_mode_check
  check (filter_mode in ('none', 'faith', 'christian', 'nigeria_christian'));

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
    'nigeria_christian',
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
    'nigeria_christian',
    'off'
  ),
  (
    'ct-feed',
    'Christianity Today',
    'https://www.christianitytoday.com/',
    'https://www.christianitytoday.com/feed/',
    '',
    'christian',
    false,
    'nigeria_christian',
    'off'
  ),
  (
    'christian-post',
    'The Christian Post',
    'https://www.christianpost.com/',
    'https://www.christianpost.com/rss',
    '',
    'christian',
    false,
    'nigeria_christian',
    'off'
  ),
  (
    'rns',
    'Religion News Service',
    'https://religionnews.com/',
    'https://religionnews.com/feed/',
    '',
    'christian',
    false,
    'nigeria_christian',
    'off'
  ),
  (
    'ewtn-news',
    'EWTN News',
    'https://www.ewtnnews.com/',
    'https://www.ewtnnews.com/rss',
    '',
    'christian',
    false,
    'nigeria_christian',
    'off'
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
