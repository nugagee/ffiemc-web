# Fire Buddy (OpenAI via Supabase Edge Function)

Fire Buddy drafts content for admins. The **OpenAI API key stays in Supabase secrets** — it is never shipped in the React bundle.

## 1. Create an OpenAI API key

1. Sign in at [https://platform.openai.com](https://platform.openai.com).
2. Open **Settings → Billing** and add payment / credits (required for API use).
3. Go to **API keys** → **Create new secret key**.
4. Name it e.g. `ffiemc-fire-buddy`, copy the key once (`sk-...`).
5. Optional: under **Limits**, set a monthly budget so church usage cannot surprise-bill you.
6. Prefer model **`gpt-4o-mini`** (cheap, good enough for notices and drafts).

Do **not** put this key in `.env` as `REACT_APP_…` — that would expose it in the browser.

## 2. Deploy the Edge Function

From the `ffiemc-v2` repo (with Supabase CLI logged in):

```bash
cd ffiemc-v2
supabase functions deploy fire-buddy --project-ref mpdvjaotalklzftktuuv --no-verify-jwt
supabase secrets set OPENAI_API_KEY="sk-your-key-here" --project-ref mpdvjaotalklzftktuuv
# optional:
supabase secrets set OPENAI_MODEL="gpt-4o-mini" --project-ref mpdvjaotalklzftktuuv
```

`--no-verify-jwt` is required because FFIEMC admins authenticate with the custom `admin_sessions` token (same pattern as `send-email`), not Supabase Auth JWTs. The function still validates that session itself.

Or set secrets in the Dashboard: **Project → Edge Functions → Secrets**.

## 3. Frontend env

You only need the existing Supabase public values:

```
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

Optional override (defaults to `{SUPABASE_URL}/functions/v1/fire-buddy`):

```
REACT_APP_FIRE_BUDDY_URL=https://YOUR_PROJECT.supabase.co/functions/v1/fire-buddy
REACT_APP_OPENAI_MODEL=gpt-4o-mini
```

`REACT_APP_OPENAI_MODEL` is display-only on the admin UI; the real model is `OPENAI_MODEL` in Edge secrets.

Remove any old `REACT_APP_OPENAI_API_KEY` from `.env` and rebuild/redeploy the site.

## 4. How a chat works

1. Admin opens **Utilities → Fire Buddy**.
2. Client checks quota (`admin_ai_reserve_turn`).
3. Client POSTs messages to `/functions/v1/fire-buddy` with the admin session token.
4. Edge Function verifies the session, calls OpenAI, returns the reply + token counts.
5. Client logs usage (`admin_ai_log_turn`).

## 5. Troubleshooting

| Symptom | Fix |
|--------|-----|
| “not configured on the server” | Set `OPENAI_API_KEY` secret and redeploy if needed |
| Unauthorized | Sign out/in to refresh admin session |
| Permission error | Grant the admin **Fire Buddy** in permissions |
| OpenAI billing / rate limit | Check [platform.openai.com](https://platform.openai.com) usage & billing |

## Security note

Rotate the OpenAI key if it was ever committed or set as `REACT_APP_OPENAI_API_KEY` in a public build.
