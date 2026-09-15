-- Narrow news sources to faith/church + Punch education only

update public.news_sources
set enabled = false
where id in ('ct-feed', 'christian-today', 'guardian-education');

update public.news_sources
set
  enabled = true,
  name = 'Punch — Education',
  homepage_url = 'https://punchng.com/topics/education/',
  feed_url = 'https://rss.punchng.com/v1/category/education',
  scrape_url = 'https://punchng.com/topics/education/',
  category = 'education'
where id = 'punch-education';

update public.news_sources
set
  enabled = true,
  name = 'Christianity Today — Nigeria',
  scrape_url = 'https://www.christianitytoday.com/topics/nigeria/',
  category = 'nigeria'
where id = 'ct-nigeria';

insert into public.news_sources (id, name, homepage_url, feed_url, scrape_url, category, enabled)
values (
  'punch-faith',
  'Punch — Faith & Church',
  'https://punchng.com/',
  '',
  'https://punchng.com/tags/religion/',
  'christian',
  true
)
on conflict (id) do update set
  name = excluded.name,
  homepage_url = excluded.homepage_url,
  feed_url = excluded.feed_url,
  scrape_url = excluded.scrape_url,
  category = excluded.category,
  enabled = excluded.enabled;

-- Hide previously ingested broad/political items that are not faith or education
update public.news_articles
set hidden = true, updated_at = now()
where source_id in ('ct-feed', 'christian-today', 'guardian-education');

update public.news_articles
set hidden = true, updated_at = now()
where not hidden
  and source_id = 'punch-education'
  and title !~* '(education|school|schools|university|universities|student|students|teacher|teachers|lecturer|asuu|waec|jamb|nelfund|polytechnic|college|curriculum|admission|scholarship|campus|varsity|vc|vice[- ]?chancellor|unilag|lasu|noun)';
