# Transactional email (Supabase Edge + Resend)

FFIEMC sends all transactional mail through the **`send-email`** Supabase Edge Function using **Resend**. FormSubmit is no longer used.

## Required setup

1. Verify **ffiem.org** in Resend and add the DNS records (DKIM + CNAMEs) at Hostinger.
2. Set secrets:

```bash
supabase secrets set RESEND_API_KEY="re_xxxxxxxx" --project-ref mpdvjaotalklzftktuuv
supabase secrets set FROM_EMAIL="Fire-Fire Church <contact@ffiem.org>" --project-ref mpdvjaotalklzftktuuv
```

3. Deploy:

```bash
supabase functions deploy send-email --no-verify-jwt --project-ref mpdvjaotalklzftktuuv
supabase functions deploy notify-experience-survey --no-verify-jwt --project-ref mpdvjaotalklzftktuuv
```

4. Frontend `.env`:

```
REACT_APP_USE_EDGE_EMAIL=true
REACT_APP_SUPABASE_URL=https://mpdvjaotalklzftktuuv.supabase.co
REACT_APP_SUPABASE_ANON_KEY=...
```

## What uses Edge email

Contact, testimonies, **prayer submissions** (admin notify + visitor confirmation), prayer replies, pastor credentials, program registrations, membership, volunteers, member announcements, meeting invites, media contributions, experience surveys, and admin compose.

Admin notification recipients come from **Website → Contact** (`notificationEmail` + secondary emails).

## Customize subjects

Admin → **Messages & email** → **Email & church settings** → Email titles per feature.

## Note on Supabase Auth SMTP

Custom SMTP under Supabase Auth (for login/OTP) is separate from Resend transactional mail. Both can use `contact@ffiem.org` once DNS is verified.
