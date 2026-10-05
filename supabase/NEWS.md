# Christian & education news aggregator

The Blog page includes a **Christian News** tab that shows headlines and short summaries from trusted sources, with the publisher named on each card and a link back to the original article. Full articles are **not** republished.

Only **faith/church** and **education** stories are kept. Broad politics and general news feeds are disabled.

## Active sources (`news_sources`)

| ID | Focus | How fetched |
|----|--------|-------------|
| `legit-education` | [Legit.ng — Education](https://www.legit.ng/education) | RSS `https://www.legit.ng/rss/education.rss`. `pubDate` becomes `published_at`. Enclosure image. No keyword filter. |
| `tribune-education` | [Nigerian Tribune — Education](https://tribuneonlineng.com/category/education/) | RSS `https://tribuneonlineng.com/category/education/feed/`. `media:thumbnail` image. |
| `pmnews-education` | [PM News — Education](https://pmnewsnigeria.com/category/education/) | RSS `https://pmnewsnigeria.com/category/education/feed/`. Often no image; the card gradient is the placeholder. |
| `businessday-education` | [BusinessDay — Education](https://businessday.ng/category/education/) | RSS `https://businessday.ng/category/education/feed/` (about 5 items). Image is the first `<img>` in the description. |
| `bbc-education` | [BBC — Education](https://www.bbc.co.uk/news/education) | RSS `https://feeds.bbci.co.uk/news/education/rss.xml`. `media:thumbnail` image. |
| `punch-faith` | [Punch — Religion](https://punchng.com/tags/religion/) | Religion tag scrape + faith keyword filter |
| `ct-nigeria` | [Christianity Today — Nigeria](https://www.christianitytoday.com/topics/nigeria/) | Topic page scrape |

Education RSS rows have an empty `scrape_url`. Those feeds are not HTML-scraped and are not passed through `EDUCATION_RE`.

Disabled: `punch-education` (its category RSS returns no items; do **not** use `https://punchng.com/topics/education/feed/`, which redirects to latest news), `ct-feed`, `christian-today`, `guardian-education`.

The Punch topic scraper still parses `div.meta-time` and `span.post-date` (`October 3, 2026 12:02 am`, Africa/Lagos) if `punch-education` is turned back on, and the education keyword list includes lecturers, professors, graduate, tertiary, and related words.

The same story from two publishers is dropped when the link (tracking params ignored) or the normalised title matches another headline from the last 7 days. A repeat of the same URL still updates that row.

## Setup

1. Apply migrations through `20261106_education_rss_and_cron_header.sql`.
   That file inserts the five education sources and sets `punch-education.enabled` to false. It does not change `news_articles` rows.
2. Deploy the edge function:

```bash
supabase functions deploy fetch-christian-news --no-verify-jwt
supabase secrets set NEWS_CRON_SECRET=your-long-random-secret
```

3. Run a manual fetch (fills the Blog tab). Send the secret in a header, not the URL:

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/fetch-christian-news" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Or:

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/fetch-christian-news" \
  -H "x-cron-secret: YOUR_NEWS_CRON_SECRET" \
  -H "Content-Type: application/json"
```

`?secret=` still works for a short time so an old cron keeps running, but it shows up in logs. Do not use it. After the new SQL and function are deployed, rotate `NEWS_CRON_SECRET` in the edge function secrets and in `edge_cron_config.news_cron_secret`.

4. **Schedule every 6 hours** (already installed as pg_cron `ffiemc-fetch-christian-news`, `0 */6 * * *`, which calls `invoke_scheduled_edge_crons('news')`). The news URL is header-only after `20261106_education_rss_and_cron_header.sql`.

## Public UI

- Tab: `/blog?tab=christian-news`
- **Filter:** Faith / Church · Education · Faith (Nigeria)
- **Sort:** Newest (`published_at`, otherwise `created_at`) · Oldest · Title · Source
- **Layout:** Columns (grid) or List
- Each card shows **Source:** and the publisher name
- Cards open the **original publisher** in a new tab (“Read full article”)
- No image uses the red/amber bar placeholder

## Admin

- **Blog → Christian News** (`/admin/blog/christian-news`)
- Hide unsuitable items
- **Fetch now** sends `x-cron-secret` and does not put the secret in the URL

For the admin “Fetch now” button, set in the frontend env:

```
REACT_APP_NEWS_FETCH_URL=https://YOUR_PROJECT.supabase.co/functions/v1/fetch-christian-news
REACT_APP_NEWS_CRON_SECRET=your-long-random-secret
```

`REACT_APP_NEWS_CRON_SECRET` must match the Edge Function secret `NEWS_CRON_SECRET`. A cPanel frontend deploy is required after changing the Blog sort or the Fetch now button.

## Legal note

This feature is a **news aggregator** (headline, short excerpt, attribution, outbound link). Do not store or display full third-party article bodies.
