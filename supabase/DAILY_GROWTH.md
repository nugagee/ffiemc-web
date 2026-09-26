# Daily Growth (traits, prophecies, facts, riddles)

Spools one queued item per enabled category each morning (Africa/Lagos), publishes them on the Blog **Daily Growth** tab, and optionally emails a short digest to approved/active church members.

## Database

Apply migration `supabase/migrations/20261027_daily_growth.sql`.

Tables: `daily_growth_items`, `daily_growth_settings`, `daily_growth_runs`.

## Deploy edge function

```bash
supabase functions deploy spool-daily-growth --no-verify-jwt
supabase secrets set GROWTH_CRON_SECRET=your-long-random-secret
# RESEND_API_KEY and FROM_EMAIL should already be set for send-email
```

## Manual run

Publish only (no email):

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/spool-daily-growth?secret=YOUR_GROWTH_CRON_SECRET&skip_email=1&force=1"
```

Publish + email digest:

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
| `ffiemc-spool-daily-growth` | `0 5 * * *` UTC (~6:00 Lagos) | Invoke `spool-daily-growth` |
| `ffiemc-fetch-christian-news` | `0 */6 * * *` | Invoke `fetch-christian-news` |

Config row: `public.edge_cron_config` (`project_url`, secrets). No public RLS access.

You can also schedule in Supabase Dashboard → **Edge Functions** → function → **Schedules**.

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

- Build a queue of draft/queued items
- Toggle spool + email + categories
- Run spool now / send digest

## Public

`/blog?tab=daily-growth` — filters: All · Trait · Prophecy · Fact · Riddle
