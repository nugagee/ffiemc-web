-- Arm one existing announcement. Run this in the SQL editor AFTER
-- 20261111_weekly_member_notifications.sql. It does not send mail by itself.
--
-- Social Media Meeting
--   id      8bcd4e60-5eaf-498e-b8a0-5b2102ae9671
--   subject Reminder: Weekly Social Media Team Meeting Tonight at 9:00 PM
--   when    every Saturday 18:00 Africa/Lagos (17:00 UTC, no daylight saving)
--
-- Turn it off later with:
--   update public.member_notifications
--   set repeat_enabled = false, updated_at = now()
--   where id = '8bcd4e60-5eaf-498e-b8a0-5b2102ae9671';

update public.member_notifications
set
  repeat_enabled = true,
  repeat_interval = 'weekly',
  repeat_weekday = 6,
  repeat_time = time '18:00',
  repeat_timezone = 'Africa/Lagos',
  updated_at = now()
where id = '8bcd4e60-5eaf-498e-b8a0-5b2102ae9671'
  and send_email = true;

-- Expect one row. If updated = 0, the id is missing or email is turned off.
