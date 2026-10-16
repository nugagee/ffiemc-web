# Daily Growth (traits, prophecies, facts, riddles)

Each morning at 06:00 Europe/London the `spool-daily-growth` edge function:

1. **Publishes the oldest queued item** in each enabled category (trait, prophecy, fact, riddle). Your queue always wins.
2. **Fills an empty category** from the seed list and loads the verse text from [bible-api.com](https://bible-api.com) (KJV). The seed is the least-recently-used title whose title and scripture were not published in the last 365 days. If every seed is still inside that window, that category is skipped instead of repeated.
3. **Emails admins** when a category has fewer than 7 queued items left (including an empty queue). At most one alert per category per Lagos day, via `send-email` to the church notification address. This needs migration `20261109_daily_growth_queue_alerts.sql`.
4. **Emails members** its own message at 06:00 Europe/London (optional; controlled in settings). This is not part of the What's New digest.

You can still pre-queue your own items in admin; the Bible API path only runs when a category’s queue is empty.

## Database

Apply migration `supabase/migrations/20261027_daily_growth.sql`, then `supabase/migrations/20261109_daily_growth_queue_alerts.sql` (alert dedupe only; it does not change existing rows).

Tables: `daily_growth_items`, `daily_growth_settings`, `daily_growth_runs`, `daily_growth_queue_alerts`.

## Deploy edge functions

```bash
supabase functions deploy spool-daily-growth --no-verify-jwt
supabase functions deploy send-email --no-verify-jwt
supabase secrets set GROWTH_CRON_SECRET=your-long-random-secret
# RESEND_API_KEY and FROM_EMAIL should already be set for send-email
```

## Manual run

Publish only (no email):

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/spool-daily-growth?secret=YOUR_GROWTH_CRON_SECRET&skip_email=1&force=1"
```

Publish + email digest (also auto-fills from Bible API if queue empty):

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/spool-daily-growth?secret=YOUR_GROWTH_CRON_SECRET&force=1"
```

Email today's published items only (no new spool):

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/spool-daily-growth?secret=YOUR_GROWTH_CRON_SECRET&email_only=1"
```

## Schedule

Preferred (automatic via database when `pg_cron` + `pg_net` are available):

Jobs created by migration `20261028_schedule_edge_crons.sql`:

| Job | Schedule | Action |
|-----|----------|--------|
| `ffiemc-spool-daily-growth` | `0 5,6 * * *` UTC, sends only when Europe/London hour is 6 (`invoke_growth_at_london_6`) | Invoke `spool-daily-growth` |
| `ffiemc-fetch-christian-news` | `0 */6 * * *` | Invoke `fetch-christian-news` |

Config row: `public.edge_cron_config` (`project_url`, secrets). No public RLS access.

Manual catch-up from admin:

- Blog → Daily Growth → **Run spool now** / **Send digest**
- Blog → Christian News → **Fetch now**

## Frontend env (admin “Run now”)

```
REACT_APP_GROWTH_SPOOL_URL=https://YOUR_PROJECT.supabase.co/functions/v1/spool-daily-growth
REACT_APP_GROWTH_CRON_SECRET=your-long-random-secret
```

If omitted, admin derives the URL from `REACT_APP_SUPABASE_URL` and can fall back to `REACT_APP_NEWS_CRON_SECRET`. Restart `npm start` after adding new `REACT_APP_*` vars.

## Admin

**Blog → Daily Growth** (`/admin/blog/daily-growth`)

- Queue counts per category, and the queued items in publish order. Amber means fewer than 7 days left
- Optionally build a queue of draft/queued items (those are published before any seed)
- Toggle spool + email + categories
- Run spool now / send digest

## Public

`/blog?tab=daily-growth` — filters: All · Trait · Prophecy · Fact · Riddle
