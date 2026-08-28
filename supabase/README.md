# Supabase setup (Fire-Fire / ffiemc-v2)

## 1. Create a project
Create a project at [supabase.com](https://supabase.com).

## 2. Run the schema
In **SQL Editor**, paste and run `supabase/schema.sql`.

If the project was already set up earlier, also run any new files under `supabase/migrations/` (for example `20260824_sort_order_and_reorder.sql`, `20260824_fix_page_section_nested.sql`, `20260824_admin_set_password.sql`, `20260825_testimony_submissions.sql`, `20260825_prayer_chat_pastors.sql`, and `20260825_announcements_admin_activity.sql` for announcement popups + admin activity audit).

This creates:
- Admin auth (`admins`, `admin_sessions`)
- CMS tables (blog, events, sermons, ministries, testimonies, hero slides)
- Contact / prayer / donation intents
- Site settings (including notification email, hero copy, stats, programmes)
- Visitor analytics (`page_visits`)
- RPCs for admin CRUD, analytics, admin users, and public form submits

Default admin:
- Email / username: `admin@firefireintl.org` or `admin`
- Password: `FireFire2025!`

## 3. Frontend env
Add to project root `.env`:

```
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

Restart `npm start` after saving.

## 4. Admin
Open `/login` and sign in. Dashboard routes:

- `/admin` — Overview (page views, unique visitors, messages, 14-day chart)
- `/admin/visitors` — recent public page views
- `/admin/contacts` — contact-form inbox (new / read / replied)
- `/admin/website` — live edits for contact details, notification email, hero text, stats, services, programmes
- `/admin/admins` — superadmin can create more admins, grant whole website pages, and pick which contents on each page they may edit/delete
- Content: banners, blog, events, sermons, ministries, testimonies, prayer requests

Contact form submissions are stored in the database. The visitor gets a confirmation email, and a copy is sent to **notification email** (default `adenugaolajideadewale@gmail.com`, editable under Website). The first FormSubmit email asks you to confirm that address.

Testimony flow:
- Public form at `/share-testimony` saves as `pending` and emails the admin + submitter confirmation
- Admins review under **Pages → Testimonies**: edit for formality, optionally email the submitter on publish (checkbox), then publish
- Only `status = published` items appear on `/testimonies` and the homepage autoplay carousel

## Notes
- Public pages fall back to mock data if Supabase is unset or unreachable.
- Donation form stores **intents** in Supabase (Paystack Edge Function can be added later).
