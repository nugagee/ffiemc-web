# Christian & education news aggregator

The Blog page includes a **Christian News** tab that shows headlines and short summaries from trusted sources, with links back to the original publishers. Full articles are **not** republished.

Only **faith/church** and **Nigerian education** stories are kept. Broad politics and general news feeds are disabled.

## Active sources (`news_sources`)

| ID | Focus | How fetched |
|----|--------|-------------|
| `punch-education` | [Punch — Education](https://punchng.com/topics/education/) | Topic page scrape (official category RSS is often empty) + education keyword filter |
| `punch-faith` | [Punch — Religion](https://punchng.com/tags/religion/) | Religion tag scrape + faith keyword filter |
| `ct-nigeria` | [Christianity Today — Nigeria](https://www.christianitytoday.com/topics/nigeria/) | Topic page scrape |

Disabled: `ct-feed`, `christian-today`, `guardian-education` (too broad / political noise).

## Setup

1. Apply migrations `20261018_christian_news.sql` and `20261019_news_faith_education_only.sql`.
2. Deploy the edge function:

```bash
supabase functions deploy fetch-christian-news --no-verify-jwt
supabase secrets set NEWS_CRON_SECRET=your-long-random-secret
```

3. Run a manual fetch (fills the Blog tab):

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/fetch-christian-news" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Or with the cron secret:

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/fetch-christian-news?secret=YOUR_NEWS_CRON_SECRET"
```

4. **Schedule every 6 hours** (recommended):
   - Supabase Dashboard → **Edge Functions** → `fetch-christian-news` → **Schedules** → cron `0 */6 * * *`

## Public UI

- Tab: `/blog?tab=christian-news`
- **Filter:** All · Education · Faith / Church · Faith (Nigeria)
- **Sort:** Newest · Oldest · Title · Source
- **Layout:** Columns (grid) or List
- Cards open the **original publisher** in a new tab (“Read full article”)

## Admin

- **Blog → Christian News** (`/admin/blog/christian-news`)
- Hide unsuitable items
- **Fetch now** button triggers the edge function

For the admin “Fetch now” button, set in the frontend env:

```
REACT_APP_NEWS_FETCH_URL=https://YOUR_PROJECT.supabase.co/functions/v1/fetch-christian-news
REACT_APP_NEWS_CRON_SECRET=your-long-random-secret
```

`REACT_APP_NEWS_CRON_SECRET` must match the Edge Function secret `NEWS_CRON_SECRET`.

## Legal note

This feature is a **news aggregator** (headline, short excerpt, attribution, outbound link). Do not store or display full third-party article bodies.
