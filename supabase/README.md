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

If login returns **Invalid credentials**, the seed admin is missing or the password was changed. Run `supabase/migrations/20260829_reset_default_admin.sql` in the SQL Editor, then try again.

### Programs & registrations
Run `supabase/migrations/20260830_programs_registrations.sql` for program types, registrations, roles, and members.

### Church branches
Run `supabase/migrations/20260830_church_branches.sql` after the programs migration for:
- Local & international branch registry (Ibadan HQ, Lagos, Abuja, UK, International Members, etc.)
- **Church branch** field on program registration, membership, contact, prayer, and testimony forms
- Admin filter and CSV export by branch (foundation for per-branch notifications)

**Public routes:**
- `/register/youth-convention-2026` — program registration (slug from admin)
- `/join-church` — membership registration for pastors/members
- `/volunteer/media-department` — media volunteer applications

**Membership form fields:** phone uses a country dial selector (default Nigeria); state, baptism, occupation, marital status, country, ministry, and gender are dropdowns managed under **Admin → Registrations → Church membership → Form dropdowns**.

Registration stays open until the **Registration closes** date on **Admin → Programs**. Run `supabase/migrations/20260831_program_registration_window.sql` to reopen FFYC'26 through 12 September 2026 (edit that date anytime in admin).

Then run `supabase/migrations/20260901_banner_analytics_volunteers.sql` for:
- Homepage popups after 3 seconds, Close, and Don't show again
- Banner analytics (views, clicks, reactions, visitor device/browser)
- Media volunteer banner (popup + purple sticky) linking to `/volunteer/media-department`
- Volunteer applications table, approval, search, CSV export, audit log

Then run `supabase/migrations/20260902_form_dropdowns.sql` for:
- Admin RPC to save **form dropdown catalogs** on `site_settings` (`formDropdowns`)
- Public membership / volunteer phone country code (defaults to Nigeria `+234`)
- Dropdowns for state, baptism status, occupation (includes Student), marital status, country, ministry, gender
- **Admin → Registrations → Church membership → Form dropdowns** — add/remove options, rename labels, create new dropdown fields

Then run `supabase/migrations/20260903_notification_recipients.sql` so member announcements can find newly registered (pending) members.

Then run `supabase/migrations/20260904_approvals_member_filters.sql` for pending/approved members and the approval queue.

Then run `supabase/migrations/20260905_church_meetings.sql` for church meetings (audience categories, video join link, Google Calendar / .ics) and to allow editing, resending, or deleting sent member announcements.

Then run `supabase/migrations/20260908_member_multiple_roles.sql` so a member can hold more than one church role (registration, admin, announcements, and meetings).

Then run `supabase/migrations/20260909_admin_utilities.sql` for private admin notes/diary used under Utilities.

Then run `supabase/migrations/20260910_event_pages_person_names.sql` for FFIEYC-style program nav, registration counts, title + first/last name on forms, and structured registration emails.

Then run `supabase/migrations/20260912_church_resources.sql` for Monday Bible Study and Daily Manna resources with admin upload/import.

Then run `supabase/migrations/20260913_seed_convention_blog.sql` to seed the six convention blog posts (Failure, Time to Youth, Way/Truth/Life, All in All, Top 10, Stepping Out Again).

Also run `supabase/migrations/20260911_events_image.sql` if event card images are not set up yet.

Built-in lists still work from the frontend defaults if this migration is not run yet; admin “Save” falls back to updating site settings when the RPC is missing (needs permission to edit settings).

**Admin:** Programs submenu (programs, types, branches, registrations, roles, members, **announcements**)

### Event popups & member announcements
Run `supabase/migrations/20260830_banners_member_notifications.sql`, then `supabase/migrations/20260831_banner_sticky_recurrence.sql` for:
- **Popup flyers** and a **sticky marquee** above the navbar (text scrolls left → right)
- **Placement** per banner: popup, sticky, or both
- **Schedule** start/end date & time, plus **weekly / monthly / yearly** repeat
- Multiple banners with different **rotation intervals** in the sticky bar
- **Member announcements** — publish to registered members by category via email or SMS
- Pre-seeded FFYC'26 banner (popup + sticky) pointing to `/register/youth-convention-2026`

**Admin:**
- **Pages → Home → Event banners** — manage popups, sticky marquees, schedules
- **Programs → Announcements** — compose and publish member notifications

**SMS (optional):** add to `.env`:
```
REACT_APP_SMS_API_URL=https://your-sms-provider-api
REACT_APP_SMS_API_KEY=your_api_key
REACT_APP_SMS_SENDER_ID=FFIEMC
```

### Analytics dashboard
For time-on-page, daily/weekly/monthly reports, top visitors, and demography (device / browser / OS / language / timezone), run:

`supabase/migrations/20260829_analytics_dashboard.sql`

Then open **Admin → Overview** (period tabs) and **Visitors** (feed + visitor journey drawer).

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
