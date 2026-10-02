# Member content digests & service reminders

Edge function: `member-content-emails`  
Admin: `/admin/member-emails`

## Jobs

| Job | When (Africa/Lagos) | Cron (UTC) | Purpose |
|-----|---------------------|------------|---------|
| `digest` | Daily ~07:00 | `0 6 * * *` | Summary of newly published content + Read more links |
| `bible_study` | Monday 16:30 | `30 15 * * 1` | Monday Bible Study reminder + shuffled image |
| `sunday_service` | Saturday 21:30 | `30 20 * * 6` | Sunday Service reminder + shuffled image |

pg_cron jobs call `invoke_scheduled_edge_crons(...)` which POSTs the edge function using `edge_cron_config.member_emails_secret`.

## Deploy

```bash
supabase functions deploy member-content-emails --project-ref mpdvjaotalklzftktuuv --no-verify-jwt
supabase secrets set MEMBER_EMAILS_CRON_SECRET=your-long-random-secret --project-ref mpdvjaotalklzftktuuv
```

Also set the same secret on `edge_cron_config.member_emails_secret` (admin upsert or SQL).  
The function also accepts `GROWTH_CRON_SECRET` as a fallback.

Ensure `RESEND_API_KEY` and `FROM_EMAIL` are already set (same as other mail functions).

## Local / admin env

```
REACT_APP_MEMBER_EMAILS_URL=https://YOUR_PROJECT.supabase.co/functions/v1/member-content-emails
REACT_APP_MEMBER_EMAILS_CRON_SECRET=your-long-random-secret
```

Falls back to `REACT_APP_GROWTH_CRON_SECRET` if the member secret is omitted.

## Manual triggers

```bash
# Dry run (no send)
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/member-content-emails?job=digest&secret=SECRET&dry_run=1"

# Force send digest
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/member-content-emails?job=digest&secret=SECRET&force=1"

# Bible Study / Sunday
curl -X POST "...?job=bible_study&secret=SECRET&force=1"
curl -X POST "...?job=sunday_service&secret=SECRET&force=1"
```

Or use **Send … now** on the admin page.

## Image shuffle

Add URLs under **Reminder image pools** (`bible_study` / `sunday_service`).  
Each run picks the least-recently-used active image and stamps `last_used_at`.

## Recipients

Approved/active `church_members` with a valid email (`list_member_email_recipients`).
