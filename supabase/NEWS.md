# Christian & education news aggregator

The Blog page includes a **Christian News** tab that shows headlines and short summaries from trusted sources, with the publisher named on each card and a link back to the original article. Full articles are **not** republished.

Christian news on the site is **Nigerian Christian news only**. Education stories are unchanged. Nigerian religion desks use a Christian-only keyword filter, so Islamic-only items are left out. International wires keep an item only when the title and excerpt are both Nigerian and Christian. Broad politics feeds stay disabled.

## Active sources (`news_sources`)

`filter_mode`: `none` (no keyword filter), `faith` (Christian or Islamic wording), `christian` (Christian wording, Islamic-only rows dropped), or `nigeria_christian` (Nigerian wording and Christian wording; anything else is dropped). Nigerian wording is Nigeria, Nigerian, Abuja, Lagos, the 36 states and major cities, plus Nigerian church bodies and leaders (CAN, PFN, CBCN, RCCG, Winners Chapel, Living Faith, MFM, Deeper Life, CAC, Redeemed Christian Church, ECWA, TREM, Christ Embassy, Adeboye, Oyedepo, Kumuyi, Olukoya, and the same list in the parser). Bare “redeemed” and bare “winners” do not count as Nigeria. `nigeria_route`: `off`, `mention` (Nigeria wording is stored as Faith (Nigeria); other rows keep the source category), or `only` (keep Nigeria wording, drop the rest).

| ID | Focus | How fetched |
|----|--------|-------------|
| `legit-education` | [Legit.ng — Education](https://www.legit.ng/education) | RSS `https://www.legit.ng/rss/education.rss`. `pubDate` becomes `published_at`. Enclosure image. No keyword filter. |
| `tribune-education` | [Nigerian Tribune — Education](https://tribuneonlineng.com/category/education/) | RSS `https://tribuneonlineng.com/category/education/feed/`. `media:thumbnail` image. |
| `pmnews-education` | [PM News — Education](https://pmnewsnigeria.com/category/education/) | RSS `https://pmnewsnigeria.com/category/education/feed/`. Often no image; the card gradient is the placeholder. |
| `businessday-education` | [BusinessDay — Education](https://businessday.ng/category/education/) | RSS `https://businessday.ng/category/education/feed/` (about 5 items). Image is the first `<img>` in the description. |
| `bbc-education` | [BBC — Education](https://www.bbc.co.uk/news/education) | RSS `https://feeds.bbci.co.uk/news/education/rss.xml`. `media:thumbnail` image. |
| `ct-nigeria` | [Christianity Today — Nigeria](https://www.christianitytoday.com/tag/nigeria/) | RSS `https://www.christianitytoday.com/tag/nigeria/feed/`. `filter_mode` none. Category `nigeria`. |
| `morningstar-nigeria` | [Morning Star News — Nigeria](https://morningstarnews.org/tag/nigeria/) | RSS `https://morningstarnews.org/tag/nigeria/feed/`. `filter_mode` none. |
| `tribune-religion` | [Nigerian Tribune — Religion](https://tribuneonlineng.com/category/religion/) | RSS `https://tribuneonlineng.com/category/religion/feed/`. `filter_mode` christian. |
| `dailypost-can` | [Daily Post — CAN](https://dailypost.ng/tag/can/) | RSS `https://dailypost.ng/tag/can/feed/`. `filter_mode` christian. |
| `newtelegraph-faith` | [New Telegraph — Faith](https://newtelegraphng.com/category/faith/) | RSS `https://newtelegraphng.com/category/faith/feed/`. `filter_mode` christian. Often no image. |
| `leadership-religion` | [Leadership — Religion](https://leadership.ng/religion/) | RSS `https://leadership.ng/religion/feed/`. `filter_mode` christian. Often no image. |
| `icc` | [International Christian Concern](https://www.persecution.org/) | RSS `https://www.persecution.org/feed/`. `filter_mode` christian. `nigeria_route` only, so non-Nigeria stories are dropped. |
| `christian-today` | [Christian Today](https://www.christiantoday.com/) | RSS `https://www.christiantoday.com/rss.xml` (~550 items, not date-ordered). `filter_mode` `nigeria_christian`. Kept items stay in category `christian`. No images in the feed. |
| `christian-daily` | [Christian Daily International](https://www.christiandaily.com/) | RSS `https://www.christiandaily.com/rss.xml`. `filter_mode` `nigeria_christian`. Kept items stay in category `christian`. |

Disabled international wires (a 6 Oct 2026 dry run found no Nigerian item). `filter_mode` is still `nigeria_christian`, so turning one back on does not publish international Christian news:

| ID | Feed |
|----|------|
| `ct-feed` | `https://www.christianitytoday.com/feed/` |
| `christian-post` | `https://www.christianpost.com/rss` |
| `rns` | `https://religionnews.com/feed/` |
| `ewtn-news` | `https://www.ewtnnews.com/rss` |

The parser reads every RSS item, drops duplicate links, sorts by `pubDate` descending, then keeps 30. Images use `media:content`, then `media:thumbnail`, then `enclosure`, then the first content image. An empty `image_url` keeps the card gradient.

Education RSS rows have an empty `scrape_url`. Those feeds are not HTML-scraped and are not passed through `EDUCATION_RE`.

Disabled: `ct-feed`, `christian-post`, `rns`, `ewtn-news` (no Nigerian items in the 6 Oct 2026 dry run), `punch-faith` (the Punch religion tag has no current stories, and its `/feed/` URL redirects to latest news), `punch-education` (its category RSS returns no items; do **not** use `https://punchng.com/topics/education/feed/`, which redirects to latest news), `guardian-education`.

The Punch topic scraper still parses `div.meta-time` and `span.post-date` (`October 3, 2026 12:02 am`, Africa/Lagos) if `punch-education` is turned back on, and the education keyword list includes lecturers, professors, graduate, tertiary, and related words.

The same story from two publishers is dropped when the link (tracking params ignored) or the normalised title matches another headline from the last 7 days. Titles also drop small words (`the`, `in`, `on`, and the rest of the stopword list) before that comparison. A repeat of the same URL still updates that row. Hidden rows stay hidden.

## Setup

1. Apply migrations through `20261108_nigeria_christian_only.sql`.
   `20261106_education_rss_and_cron_header.sql` inserts the five education sources and sets `punch-education.enabled` to false.
   `20261107_faith_rss_sources.sql` disables `punch-faith`, turns the faith RSS rows back on, and adds the sources in the table above. It does not change `news_articles` rows and does not unhide anything.
   `20261108_nigeria_christian_only.sql` allows `filter_mode` `nigeria_christian`, keeps Christian Today and Christian Daily on that filter, and disables Christianity Today’s main feed, Christian Post, Religion News Service, and EWTN. It does not change `news_articles` rows and does not hide or unhide anything.
   `supabase/scripts/hide_non_nigerian_faith_news.sql` is optional and is **not** a migration. Run it yourself only if existing international faith rows should be hidden. It was not run from this repo.
2. Deploy the edge function `fetch-christian-news` after that migration. A cPanel frontend deploy is required: the Blog Faith filter now shows both `christian` and `nigeria` rows, and `build/` has to be uploaded.

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
- **Filter:** Faith (categories `christian` and `nigeria` together) · Education
- Card badges stay **Faith** and **Faith (Nigeria)**, matching the stored category
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
