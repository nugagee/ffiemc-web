-- Church meetings (audience categories + video link + calendar) and
-- allow sent member announcements to be edited, resent, or deleted.

create table if not exists public.church_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Africa/Lagos',
  meet_code text not null default '',
  meet_url text not null default '',
  location text not null default '',
  category_id uuid references public.notification_categories(id) on delete set null,
  audience_filters jsonb not null default '{}'::jsonb,
  status text not null default 'scheduled'
    check (status in ('draft', 'scheduled', 'cancelled')),
  invites_sent_at timestamptz,
  recipient_count integer not null default 0,
  admin_id uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_meetings_starts_idx on public.church_meetings (starts_at desc);

create table if not exists public.church_meeting_invites (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.church_meetings(id) on delete cascade,
  recipient_type text not null default 'member',
  recipient_id uuid,
  full_name text not null default '',
  email text not null default '',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text not null default '',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists church_meeting_invites_meeting_idx on public.church_meeting_invites (meeting_id);

alter table public.church_meetings enable row level security;
alter table public.church_meeting_invites enable row level security;

create or replace function public._can_manage_meetings(p_admin public.admins)
returns boolean
language plpgsql stable set search_path = public as $$
begin
  if p_admin.role = 'superadmin' then return true; end if;
  if public._has_perm(p_admin, 'church_meetings', 'view') then return true; end if;
  if public._has_perm(p_admin, 'church_meetings', 'edit') then return true; end if;
  return false;
end;
$$;

create or replace function public.admin_list_church_meetings(p_token text, p_bucket text default 'upcoming')
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._can_manage_meetings(v_admin) then
    raise exception 'You do not have permission to view meetings';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.starts_at)
    from (
      select
        m.*,
        c.name as category_name,
        case
          when m.status = 'cancelled' then 'cancelled'
          when m.ends_at is not null and m.ends_at < now() then 'past'
          when m.starts_at <= now() and (m.ends_at is null or m.ends_at >= now()) then 'live'
          else 'upcoming'
        end as time_bucket,
        (select count(*) from public.church_meeting_invites i where i.meeting_id = m.id and i.status = 'sent') as invites_sent
      from public.church_meetings m
      left join public.notification_categories c on c.id = m.category_id
      where (
        p_bucket is null or p_bucket in ('', 'all')
        or (p_bucket = 'upcoming' and m.status <> 'cancelled' and m.starts_at > now())
        or (p_bucket = 'live' and m.status <> 'cancelled' and m.starts_at <= now()
            and (
              (m.ends_at is not null and m.ends_at >= now())
              or (m.ends_at is null and m.starts_at >= now() - interval '3 hours')
            ))
        or (p_bucket = 'past' and (
              m.status = 'cancelled'
              or (m.ends_at is not null and m.ends_at < now())
              or (m.ends_at is null and m.starts_at < now() - interval '3 hours')
            ))
      )
      order by
        case when p_bucket = 'past' then 1 else 0 end,
        m.starts_at
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_church_meeting(p_token text, p_id uuid, p_data jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_row public.church_meetings%rowtype;
  v_filters jsonb;
  v_category public.notification_categories%rowtype;
begin
  v_admin := public._require_admin(p_token);
  if not (v_admin.role = 'superadmin' or public._has_perm(v_admin, 'church_meetings', 'edit')) then
    raise exception 'You do not have permission to edit meetings';
  end if;

  v_filters := coalesce(p_data->'audience_filters', '{}'::jsonb);
  if p_data ? 'category_id' and nullif(p_data->>'category_id', '') is not null then
    select * into v_category from public.notification_categories where id = (p_data->>'category_id')::uuid;
    if found then
      v_filters := v_category.filters || v_filters;
    end if;
  end if;

  insert into public.church_meetings (
    id, title, description, starts_at, ends_at, timezone, meet_code, meet_url, location,
    category_id, audience_filters, status, admin_id, updated_at
  ) values (
    v_id,
    coalesce(p_data->>'title', ''),
    coalesce(p_data->>'description', ''),
    (p_data->>'starts_at')::timestamptz,
    nullif(p_data->>'ends_at', '')::timestamptz,
    coalesce(nullif(p_data->>'timezone', ''), 'Africa/Lagos'),
    coalesce(p_data->>'meet_code', ''),
    coalesce(p_data->>'meet_url', ''),
    coalesce(p_data->>'location', ''),
    nullif(p_data->>'category_id', '')::uuid,
    v_filters,
    coalesce(nullif(p_data->>'status', ''), 'scheduled'),
    v_admin.id,
    now()
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    timezone = excluded.timezone,
    meet_code = excluded.meet_code,
    meet_url = excluded.meet_url,
    location = excluded.location,
    category_id = excluded.category_id,
    audience_filters = excluded.audience_filters,
    status = excluded.status,
    updated_at = now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_delete_church_meeting(p_token text, p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not (v_admin.role = 'superadmin' or public._has_perm(v_admin, 'church_meetings', 'delete')) then
    raise exception 'You do not have permission to delete meetings';
  end if;
  delete from public.church_meetings where id = p_id;
  if not found then raise exception 'Meeting not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_start_meeting_invites(p_token text, p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
  v_row public.church_meetings%rowtype;
  v_recipients jsonb;
  v_count integer;
begin
  v_admin := public._require_admin(p_token);
  if not (v_admin.role = 'superadmin' or public._has_perm(v_admin, 'church_meetings', 'edit')) then
    raise exception 'You do not have permission to send meeting invites';
  end if;

  select * into v_row from public.church_meetings where id = p_id for update;
  if not found then raise exception 'Meeting not found'; end if;
  if v_row.status = 'cancelled' then raise exception 'Cancelled meetings cannot be sent'; end if;
  if trim(v_row.title) = '' then raise exception 'Title is required'; end if;

  select coalesce(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb)
  into v_recipients
  from public._notification_recipients(v_row.audience_filters) r;

  v_count := jsonb_array_length(v_recipients);
  if v_count = 0 then
    raise exception 'No recipients match the selected audience';
  end if;

  delete from public.church_meeting_invites where meeting_id = p_id;

  insert into public.church_meeting_invites (
    meeting_id, recipient_type, recipient_id, full_name, email, status
  )
  select
    p_id,
    coalesce(r->>'recipient_type', 'member'),
    nullif(r->>'recipient_id', '')::uuid,
    coalesce(r->>'full_name', ''),
    coalesce(r->>'email', ''),
    'pending'
  from jsonb_array_elements(v_recipients) r
  where nullif(trim(r->>'email'), '') is not null;

  update public.church_meetings
  set recipient_count = v_count, admin_id = v_admin.id, updated_at = now()
  where id = p_id;

  return jsonb_build_object(
    'meeting_id', p_id,
    'recipient_count', v_count,
    'invites', (
      select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
      from public.church_meeting_invites i
      where i.meeting_id = p_id and i.status = 'pending'
    )
  );
end;
$$;

create or replace function public.admin_complete_meeting_invites(p_token text, p_id uuid, p_results jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin public.admins;
  v_result jsonb;
  v_sent integer := 0;
begin
  v_admin := public._require_admin(p_token);
  if not public._can_manage_meetings(v_admin) then
    raise exception 'You do not have permission to complete meeting invites';
  end if;

  for v_result in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb))
  loop
    update public.church_meeting_invites
    set status = coalesce(v_result->>'status', 'failed'),
        error_message = coalesce(v_result->>'error_message', ''),
        sent_at = case when coalesce(v_result->>'status', '') = 'sent' then now() else sent_at end
    where id = (v_result->>'invite_id')::uuid and meeting_id = p_id;
    if coalesce(v_result->>'status', '') = 'sent' then
      v_sent := v_sent + 1;
    end if;
  end loop;

  update public.church_meetings
  set invites_sent_at = now(), updated_at = now()
  where id = p_id;

  return jsonb_build_object('ok', true, 'sent', v_sent);
end;
$$;

create or replace function public.public_get_meeting(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  return (
    select to_jsonb(m)
    from public.church_meetings m
    where m.id = p_id and m.status <> 'cancelled'
  );
end;
$$;

-- Sent announcements: allow update, delete, and resend
create or replace function public.admin_delete_member_notification(p_token text, p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_admin public.admins;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'member_notifications', 'delete') then
    raise exception 'You do not have permission to delete member notifications';
  end if;
  delete from public.member_notifications where id = p_id and status <> 'sending';
  if not found then
    raise exception 'Cannot delete a notification that is currently sending';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_upsert_member_notification(
  p_token text, p_id uuid, p_data jsonb
)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_admin public.admins;
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_row public.member_notifications%rowtype;
  v_filters jsonb;
  v_category public.notification_categories%rowtype;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'member_notifications', 'edit') then
    raise exception 'You do not have permission to edit member notifications';
  end if;

  v_filters := coalesce(p_data->'audience_filters', p_data->'audienceFilters', '{}'::jsonb);

  if p_data ? 'category_id' and nullif(p_data->>'category_id', '') is not null then
    select * into v_category from public.notification_categories where id = (p_data->>'category_id')::uuid;
    if found then
      v_filters := v_category.filters || v_filters;
    end if;
  end if;

  if p_data ? 'program_id' and nullif(p_data->>'program_id', '') is not null then
    v_filters := v_filters || jsonb_build_object('program_id', p_data->>'program_id', 'source', 'program_registrants');
  end if;

  insert into public.member_notifications (
    id, title, subject, body, program_id, category_id, audience_filters,
    send_email, send_sms, status, scheduled_at, admin_id, updated_at
  )
  values (
    v_id,
    coalesce(p_data->>'title', ''),
    coalesce(nullif(p_data->>'subject', ''), p_data->>'title', ''),
    coalesce(p_data->>'body', ''),
    nullif(p_data->>'program_id', '')::uuid,
    nullif(p_data->>'category_id', '')::uuid,
    v_filters,
    coalesce((p_data->>'send_email')::boolean, (p_data->>'sendEmail')::boolean, true),
    coalesce((p_data->>'send_sms')::boolean, (p_data->>'sendSms')::boolean, false),
    coalesce(nullif(p_data->>'status', ''), 'draft'),
    nullif(p_data->>'scheduled_at', '')::timestamptz,
    v_admin.id,
    now()
  )
  on conflict (id) do update set
    title = excluded.title,
    subject = excluded.subject,
    body = excluded.body,
    program_id = excluded.program_id,
    category_id = excluded.category_id,
    audience_filters = excluded.audience_filters,
    send_email = excluded.send_email,
    send_sms = excluded.send_sms,
    status = case
      when public.member_notifications.status = 'sending' then public.member_notifications.status
      else excluded.status
    end,
    scheduled_at = excluded.scheduled_at,
    updated_at = now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_start_member_notification(p_token text, p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_admin public.admins;
  v_row public.member_notifications%rowtype;
  v_recipients jsonb;
  v_count integer;
begin
  v_admin := public._require_admin(p_token);
  if not public._has_perm(v_admin, 'member_notifications', 'edit') then
    raise exception 'You do not have permission to send member notifications';
  end if;

  select * into v_row from public.member_notifications where id = p_id for update;
  if not found then raise exception 'Notification not found'; end if;
  if v_row.status = 'sending' then
    raise exception 'Notification is already sending';
  end if;
  if not v_row.send_email and not v_row.send_sms then
    raise exception 'Select at least one channel (email or SMS)';
  end if;
  if trim(v_row.title) = '' or trim(v_row.body) = '' then
    raise exception 'Title and message body are required';
  end if;

  select coalesce(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb)
  into v_recipients
  from public._notification_recipients(v_row.audience_filters) r;

  v_count := jsonb_array_length(v_recipients);
  if v_count = 0 then
    raise exception 'No recipients match the selected audience';
  end if;

  update public.member_notifications
  set status = 'sending', recipient_count = v_count, admin_id = v_admin.id, updated_at = now()
  where id = p_id;

  delete from public.member_notification_deliveries where notification_id = p_id;

  insert into public.member_notification_deliveries (
    notification_id, recipient_type, recipient_id, full_name, email, phone, channel, status
  )
  select
    p_id,
    (r->>'recipient_type')::text,
    (r->>'recipient_id')::uuid,
    coalesce(r->>'full_name', ''),
    coalesce(r->>'email', ''),
    coalesce(r->>'phone', ''),
    ch.channel,
    'pending'
  from jsonb_array_elements(v_recipients) r
  cross join lateral (
    select unnest(
      array_remove(
        array[
          case when v_row.send_email and nullif(trim(r->>'email'), '') is not null then 'email' end,
          case when v_row.send_sms and nullif(trim(r->>'phone'), '') is not null then 'sms' end
        ],
        null
      )
    ) as channel
  ) ch;

  return jsonb_build_object(
    'notification_id', p_id,
    'recipient_count', v_count,
    'deliveries', (
      select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
      from public.member_notification_deliveries d
      where d.notification_id = p_id and d.status = 'pending'
    )
  );
end;
$$;

grant execute on function public.admin_list_church_meetings(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_church_meeting(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_church_meeting(text, uuid) to anon, authenticated;
grant execute on function public.admin_start_meeting_invites(text, uuid) to anon, authenticated;
grant execute on function public.admin_complete_meeting_invites(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.public_get_meeting(uuid) to anon, authenticated;
grant execute on function public.admin_delete_member_notification(text, uuid) to anon, authenticated;
grant execute on function public.admin_upsert_member_notification(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_start_member_notification(text, uuid) to anon, authenticated;

create or replace function public._has_perm(p_admin public.admins, p_feature text, p_action text)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_page text;
  v_section text;
  v_pages jsonb;
  v_sec jsonb;
  v_legacy text;
begin
  if p_admin.role = 'superadmin' then return true; end if;
  if p_feature is null or p_action is null then return false; end if;

  if p_feature in (
    'overview', 'visitors', 'contacts',
    'program_types', 'programs', 'program_registrations', 'church_roles', 'church_members',
    'church_branches', 'member_notifications', 'volunteer_applications', 'banners',
    'approvals', 'church_meetings', 'form_dropdowns'
  ) then
    if p_action = 'view' then
      return coalesce((p_admin.permissions -> p_feature ->> 'view')::boolean, false)
          or coalesce((p_admin.permissions -> p_feature ->> 'edit')::boolean, false)
          or coalesce((p_admin.permissions -> p_feature ->> 'delete')::boolean, false);
    end if;
    return coalesce((p_admin.permissions -> p_feature ->> p_action)::boolean, false);
  end if;

  v_pages := coalesce(p_admin.permissions -> 'pages', '{}'::jsonb);

  if position('.' in p_feature) > 0 then
    v_page := split_part(p_feature, '.', 1);
    v_section := split_part(p_feature, '.', 2);
    v_sec := v_pages -> v_page -> 'sections' -> v_section;
    if p_action = 'view' then
      if coalesce((v_pages -> v_page ->> 'access')::boolean, false)
        or coalesce((v_sec ->> 'edit')::boolean, false)
        or coalesce((v_sec ->> 'delete')::boolean, false) then
        return true;
      end if;
    elsif coalesce((v_sec ->> p_action)::boolean, false) then
      return true;
    end if;

    v_legacy := case p_feature
      when 'home.hero' then 'hero'
      when 'blog.posts' then 'blog'
      when 'events.list' then 'events'
      when 'sermons.list' then 'sermons'
      when 'ministries.list' then 'ministries'
      when 'testimonies.list' then 'testimonies'
      when 'prayer.inbox' then 'prayers'
      when 'contact.church' then 'website'
      when 'home.welcome' then 'website'
      when 'services.times' then 'website'
      else null
    end;
    if v_legacy is not null then
      if p_action = 'view' then
        return coalesce((p_admin.permissions -> v_legacy ->> 'view')::boolean, false)
            or coalesce((p_admin.permissions -> v_legacy ->> 'edit')::boolean, false)
            or coalesce((p_admin.permissions -> v_legacy ->> 'delete')::boolean, false);
      end if;
      return coalesce((p_admin.permissions -> v_legacy ->> p_action)::boolean, false);
    end if;
    return false;
  end if;

  if coalesce((v_pages -> p_feature ->> 'access')::boolean, false) then
    if p_action = 'view' then return true; end if;
    return exists (
      select 1 from jsonb_each(coalesce(v_pages -> p_feature -> 'sections', '{}'::jsonb)) s
      where coalesce((s.value ->> p_action)::boolean, false)
    );
  end if;
  return false;
end;
$$;
