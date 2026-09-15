# Transactional email (FormSubmit → optional Resend / Supabase Edge)

## Why you still see FormSubmit

FFIEMC currently sends most mail **from the browser** through [FormSubmit](https://formsubmit.co) after a form is saved in Supabase. That is simple (no API keys in the client) but limited: subject lines are FormSubmit `_subject` fields, delivery depends on activating each recipient address once, and there is no true Gmail-style “from your domain” branding.

## How AdaptBuddy does it (for comparison)

AdaptBuddy does **not** use Supabase Auth’s built-in mailer for product emails. Auth OTP uses **custom SMTP** in the Supabase dashboard. Weekly digests use a **Supabase Edge Function** that calls **Resend** with secrets:

- `RESEND_API_KEY`
- `DIGEST_FROM_EMAIL` / `FROM_EMAIL`

Supabase Auth email templates (`{{ .Token }}`) are only for login/OTP — they are not a general “send any email” API.

## Customize email titles in FFIEMC (available now)

1. Open admin → **Messages & email** → **Email & church settings**  
   (URL: `/admin/website`)
2. Scroll to **Email titles (subjects) per feature**
3. Edit subjects; use placeholders like `{fullName}`, `{teamName}`, `{amount}`
4. Save

Also set **Primary admin email** and optional **Secondary emails** on the same page.

## Compose new email (available now)

Admin → **Utilities** → **Compose email** (`/admin/utilities/compose`)

Gmail-style compose panel: To, Cc, Subject, body, Send.

## Optional: switch compose + future alerts to Resend (AdaptBuddy style)

1. Create a [Resend](https://resend.com) account and verify your domain (or use their onboarding domain for tests).
2. Deploy the edge function in this repo:

```bash
cd ffiemc-v2
supabase functions deploy send-email
supabase secrets set RESEND_API_KEY="re_xxxxxxxx"
supabase secrets set FROM_EMAIL="Fire-Fire Church <noreply@yourdomain.com>"
```

3. In the frontend `.env`:

```
REACT_APP_USE_EDGE_EMAIL=true
```

4. Redeploy the site. **Compose email** will call `/functions/v1/send-email` instead of FormSubmit.

> Note: the function validates your admin session via `admin_sessions.token` (same token the dashboard stores after login).

FormSubmit remains the default for public form notifications until those call sites are migrated to the same edge function.
