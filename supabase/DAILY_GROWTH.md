# Daily Growth (traits, prophecies, facts, riddles)

Each evening at 20:00 UTC (21:00 Africa/Lagos) `spool-daily-growth?schedule_next=1`:

1. **Reserves the next Lagos day's item** in each enabled category. The oldest queued row becomes `scheduled` and is dated for tomorrow. The public site does not show `scheduled` rows.
2. **Fills a category with an empty queue** from the seed list (same 365-day rule) and stores that seed as `scheduled` for tomorrow.

Each morning at 06:00 Europe/London (06:00 Africa/Lagos, which is 05:00 UTC during British Summer Time and 06:00 UTC during GMT) the same function:

1. **Publishes the pre-picked `scheduled` item** for today in each category, then emails it. Pre-picked rows are both published and included in the member email.
2. **Falls back to the oldest queued item** when a category has nothing scheduled for today. An empty queue is filled from a seed only when that title and scripture were not published in the last 365 days.
3. **Puts that day's image at the top of the email** when `daily_growth_images` has a row for the run date and the file loads. A missing image, or one that fails to load, does not delay or cancel the send.
4. **Never includes riddle answers** in the email. The letter says the answer is on the website.
5. **Emails admins** when a category has fewer than 7 queued items left. At most one alert per category per Lagos day. This needs migration `20261109_daily_growth_queue_alerts.sql`.

You can still pre-queue items in admin. You can also set status `scheduled` with a date; `admin_upsert_daily_growth` accepts `scheduled`. Permission for Daily Growth admin, including the email image, is `blog.posts` edit. `uploaded_by` on an image is that admin's `admins.id`.

## Database

Apply migrations in filename order. After `20261109_daily_growth_queue_alerts.sql`, apply `supabase/migrations/20261110_daily_growth_image_schedule_security.sql`.

That migration adds `scheduled`, the `daily_growth_images` table, hides riddle answers from the public list until the day they belong to (today's answer is `public_reveal_daily_growth_answer`), locks the `media` bucket so anon cannot insert, update, or delete, and schedules `ffiemc-schedule-daily-growth`. It does not rewrite existing item bodies.

Tables: `daily_growth_items`, `daily_growth_settings`, `daily_growth_runs`, `daily_growth_queue_alerts`, `daily_growth_images`.

## Deploy edge functions

```bash
supabase functions deploy spool-daily-growth --no-verify-jwt
supabase functions deploy media-upload --no-verify-jwt
supabase functions deploy send-email --no-verify-jwt
supabase secrets set GROWTH_CRON_SECRET=your-long-random-secret
# RESEND_API_KEY and FROM_EMAIL should already be set for send-email
```

`media-upload` checks the site admin token (`admin_login` / `admin_sessions`), not Supabase Auth. Daily Growth images require `blog.posts` edit. Blog images and documents require any active admin. Contribution receipts are the only unauthenticated upload, and they can only create a new file under `contributions/` (JPEG, PNG, WEBP, GIF, AVIF, or PDF). SVG and HTML are rejected. Deploy `media-upload` in the same change as the storage migration, or admin and receipt uploads will fail once anon writes are removed.

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
| `ffiemc-spool-daily-growth` | `0 5,6 * * *` UTC, sends only when Europe/London hour is 6 (`invoke_growth_at_london_6`) | Invoke `spool-daily-growth` (publish + email) |
| `ffiemc-schedule-daily-growth` | `0 20 * * *` UTC (`invoke_growth_schedule_next`) | Invoke `spool-daily-growth?schedule_next=1` (reserve tomorrow, no email) |
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
- Scheduled rows for upcoming dates (hidden on the public site until the morning publish)
- Email image: pick a date, upload, replace, or remove, with a preview
- Optionally build a queue of draft/queued/scheduled items
- Toggle spool + email + categories
- Run spool now / send digest

## Public answers

`/blog?tab=daily-growth` — filters: All · Trait · Prophecy · Fact · Riddle.

`public_list_daily_growth` returns published rows only. The `answer` field is included for riddles whose `published_on` is before today (Lagos). Today's riddle returns `answer: ""` and `answer_available: true`. The Reveal button calls `public_reveal_daily_growth_answer`, which returns the answer only when the row is a published riddle on or before today. Scheduled and future rows are not returned. The table itself is not selectable by `anon`.

## Designer read (tomorrow's scheduled items)

Service role only. The payload has no `answer`. Answers remain on `admin_list_daily_growth` for an admin with `blog.posts` edit.

```sql
select public.designer_list_scheduled_daily_growth(null);
```

`null` means tomorrow in Africa/Lagos. Pass a date to read another day.

Equivalent query for the SQL editor (do not add `answer` to the select list):

```sql
select id, category, title, body, scripture_ref, published_on, status
from public.daily_growth_items
where status = 'scheduled'
  and published_on = (select public._daily_growth_today() + 1)
order by case category
  when 'trait' then 1
  when 'prophecy' then 2
  when 'fact' then 3
  else 4
end;
```
