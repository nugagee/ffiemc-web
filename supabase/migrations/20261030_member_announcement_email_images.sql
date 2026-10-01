-- Member announcement emails can include a header image, extra images, and a button link.
-- Images are public https URLs (existing "media" storage bucket). Text-only rows stay valid.
-- Apply this before deploying the admin build that edits these fields.

alter table public.member_notifications
  add column if not exists header_image_url text not null default '',
  add column if not exists images jsonb not null default '[]'::jsonb,
  add column if not exists button_label text not null default '',
  add column if not exists button_url text not null default '';

alter table public.member_notifications
  drop constraint if exists member_notifications_images_array_check;

alter table public.member_notifications
  add constraint member_notifications_images_array_check
  check (jsonb_typeof(images) = 'array');

comment on column public.member_notifications.header_image_url is
  'Optional public banner URL shown at the top of the announcement email.';
comment on column public.member_notifications.images is
  'Public image objects [{url, alt}] rendered in the announcement email.';
comment on column public.member_notifications.button_url is
  'Optional http(s) link rendered as a button in the email.';
comment on column public.member_notifications.button_label is
  'Label for button_url. Empty uses "Learn more" in the email.';

-- Not security definer. Validates a public image or button URL. Not granted to API roles.
create or replace function public._safe_announcement_http_url(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v text := trim(coalesce(p_value, ''));
begin
  if v = '' or length(v) > 2000 then
    return '';
  end if;
  if v !~* '^https?://' then
    return '';
  end if;
  if position(' ' in v) > 0
    or position(E'\n' in v) > 0
    or position(E'\r' in v) > 0
    or position(E'\t' in v) > 0
    or position('<' in v) > 0
    or position('>' in v) > 0
    or position('"' in v) > 0
    or position('''' in v) > 0 then
    return '';
  end if;
  if v ~* '^https?://[^/]*@' then
    return '';
  end if;
  return v;
end;
$$;

revoke all on function public._safe_announcement_http_url(text) from public;
revoke all on function public._safe_announcement_http_url(text) from anon, authenticated;

-- Latest body is from 20260905_church_meetings.sql, plus the image columns.
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
  v_images jsonb := '[]'::jsonb;
  v_item jsonb;
  v_url text;
  v_alt text;
  v_header text := '';
  v_button_url text := '';
  v_button_label text := '';
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

  if p_data ? 'header_image_url' or p_data ? 'headerImageUrl' then
    v_header := public._safe_announcement_http_url(coalesce(p_data->>'header_image_url', p_data->>'headerImageUrl', ''));
  end if;

  if p_data ? 'button_url' or p_data ? 'buttonUrl' then
    v_button_url := public._safe_announcement_http_url(coalesce(p_data->>'button_url', p_data->>'buttonUrl', ''));
  end if;

  if p_data ? 'button_label' or p_data ? 'buttonLabel' then
    v_button_label := left(trim(coalesce(p_data->>'button_label', p_data->>'buttonLabel', '')), 80);
  end if;

  if (p_data ? 'images') and jsonb_typeof(p_data->'images') = 'array' then
    for v_item in select value from jsonb_array_elements(p_data->'images')
    loop
      exit when jsonb_array_length(v_images) >= 8;
      if jsonb_typeof(v_item) = 'string' then
        v_url := public._safe_announcement_http_url(trim(both '"' from v_item::text));
        v_alt := '';
      elsif jsonb_typeof(v_item) = 'object' then
        v_url := public._safe_announcement_http_url(coalesce(v_item->>'url', v_item->>'src', ''));
        v_alt := left(regexp_replace(coalesce(v_item->>'alt', v_item->>'name', ''), E'\\s+', ' ', 'g'), 180);
      else
        continue;
      end if;
      if v_url = '' then
        continue;
      end if;
      if v_url = v_header then
        continue;
      end if;
      if exists (
        select 1
        from jsonb_array_elements(v_images) existing
        where existing->>'url' = v_url
      ) then
        continue;
      end if;
      v_images := v_images || jsonb_build_array(jsonb_build_object('url', v_url, 'alt', v_alt));
    end loop;
  end if;

  insert into public.member_notifications (
    id, title, subject, body, program_id, category_id, audience_filters,
    send_email, send_sms, status, scheduled_at, admin_id,
    header_image_url, images, button_label, button_url,
    updated_at
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
    v_header,
    v_images,
    v_button_label,
    v_button_url,
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
    header_image_url = case
      when p_data ? 'header_image_url' or p_data ? 'headerImageUrl' then excluded.header_image_url
      else public.member_notifications.header_image_url
    end,
    images = case
      when p_data ? 'images' then excluded.images
      else public.member_notifications.images
    end,
    button_label = case
      when p_data ? 'button_label' or p_data ? 'buttonLabel' then excluded.button_label
      else public.member_notifications.button_label
    end,
    button_url = case
      when p_data ? 'button_url' or p_data ? 'buttonUrl' then excluded.button_url
      else public.member_notifications.button_url
    end,
    updated_at = now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

grant execute on function public.admin_upsert_member_notification(text, uuid, jsonb) to anon, authenticated;
