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

Supabase Dashboard → **Edge Functions** → `spool-daily-growth` → **Schedules**

Recommended cron (6:00 Africa/Lagos):

```
0 5 * * *
```

UTC 05:00 ≈ Lagos 06:00 (WAT, UTC+1). Adjust if DST/policy changes.

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
