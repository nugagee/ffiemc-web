-- Volunteer application follow-up messages (admin ↔ applicant thread in portal)

create table if not exists public.volunteer_application_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.volunteer_applications(id) on delete cascade,
  direction text not null check (direction in ('outbound', 'inbound', 'note')),
  subject text not null default '',
  body text not null default '',
  sent_to text not null default '',
  sent_by_admin_id uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists volunteer_application_messages_app_idx
  on public.volunteer_application_messages (application_id, created_at asc);

alter table public.volunteer_application_messages enable row level security;

create or replace function public.admin_list_volunteer_application_messages(
  p_token text,
  p_application_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'volunteer_applications', 'view');
  if p_application_id is null then
    raise exception 'Application id is required';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'application_id', m.application_id,
        'direction', m.direction,
        'subject', m.subject,
        'body', m.body,
        'sent_to', m.sent_to,
        'sent_by_admin_id', m.sent_by_admin_id,
        'sent_by_name', a.full_name,
        'sent_by_email', a.email,
        'created_at', m.created_at
      )
      order by m.created_at asc
    )
    from public.volunteer_application_messages m
    left join public.admins a on a.id = m.sent_by_admin_id
    where m.application_id = p_application_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_add_volunteer_application_message(
  p_token text,
  p_application_id uuid,
  p_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins%rowtype;
  v_app public.volunteer_applications%rowtype;
  v_direction text;
  v_subject text;
  v_body text;
  v_sent_to text;
  v_row public.volunteer_application_messages%rowtype;
begin
  v_admin := public._require_permission(p_token, 'volunteer_applications', 'edit');

  select * into v_app
  from public.volunteer_applications
  where id = p_application_id;
  if not found then raise exception 'Application not found'; end if;

  v_direction := lower(trim(coalesce(p_data->>'direction', 'outbound')));
  if v_direction not in ('outbound', 'inbound', 'note') then
    raise exception 'Invalid message direction';
  end if;

  v_subject := left(trim(coalesce(p_data->>'subject', '')), 240);
  v_body := trim(coalesce(p_data->>'body', ''));
  if v_body = '' then raise exception 'Message body is required'; end if;

  v_sent_to := left(trim(coalesce(p_data->>'sent_to', v_app.email, '')), 240);

  insert into public.volunteer_application_messages (
    application_id, direction, subject, body, sent_to, sent_by_admin_id
  ) values (
    p_application_id, v_direction, v_subject, v_body, v_sent_to, v_admin.id
  )
  returning * into v_row;

  insert into public.volunteer_application_audit (application_id, admin_id, action, changes)
  values (
    p_application_id,
    v_admin.id,
    case v_direction
      when 'outbound' then 'email_sent'
      when 'inbound' then 'reply_logged'
      else 'note_added'
    end,
    jsonb_build_object(
      'message_id', v_row.id,
      'direction', v_direction,
      'subject', v_subject
    )
  );

  return jsonb_build_object(
    'id', v_row.id,
    'application_id', v_row.application_id,
    'direction', v_row.direction,
    'subject', v_row.subject,
    'body', v_row.body,
    'sent_to', v_row.sent_to,
    'sent_by_admin_id', v_row.sent_by_admin_id,
    'created_at', v_row.created_at
  );
end;
$$;

-- Ensure media team admin email stays set; notify list also uses site notificationEmail in the app.
update public.volunteer_teams
set admin_email = coalesce(nullif(trim(admin_email), ''), 'info@firefireintl.org'),
    updated_at = now()
where slug = 'media-department';

grant execute on function public.admin_list_volunteer_application_messages(text, uuid) to anon, authenticated;
grant execute on function public.admin_add_volunteer_application_message(text, uuid, jsonb) to anon, authenticated;
