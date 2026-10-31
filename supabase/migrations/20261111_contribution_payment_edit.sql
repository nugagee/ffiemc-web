-- Edit individual social media contribution payments.
-- Additive only: a nullable editor column, a tighter admin upsert, and a
-- service-role function the send-email function uses to resolve recipients.
-- The browser never supplies the member or admin address.

alter table public.social_media_contributions
  add column if not exists updated_by uuid references public.admins(id) on delete set null;

comment on column public.social_media_contributions.updated_by is
  'Admin who last saved this payment. Null until an admin creates or edits it.';

create index if not exists social_media_contributions_updated_by_idx
  on public.social_media_contributions (updated_by)
  where updated_by is not null;

create or replace function public.admin_upsert_media_contribution(
  p_token text,
  p_id uuid default null,
  p_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins%rowtype;
  v_row public.social_media_contributions%rowtype;
  v_month_id uuid;
  v_member_id uuid;
  v_name text;
  v_amount numeric;
  v_member public.social_media_team_members%rowtype;
  v_receipt text := left(trim(coalesce(p_data->>'receipt_url', '')), 2000);
  v_note text := left(trim(coalesce(p_data->>'note', '')), 1000);
  v_paid_on date;
begin
  v_admin := public._require_permission(p_token, 'social_media_contributions', 'edit');
  begin
    v_month_id := nullif(trim(coalesce(p_data->>'month_id', '')), '')::uuid;
    v_member_id := nullif(trim(coalesce(p_data->>'team_member_id', '')), '')::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Month or team member was not recognised';
  end;
  if v_month_id is null then raise exception 'Month is required'; end if;
  if not exists (
    select 1 from public.social_media_contribution_months where id = v_month_id
  ) then
    raise exception 'Month not found';
  end if;

  begin
    v_amount := nullif(trim(coalesce(p_data->>'amount', '')), '')::numeric;
  exception
    when others then
      raise exception 'Enter a valid amount';
  end;
  if v_amount is null or v_amount <= 0 then
    raise exception 'Enter an amount greater than 0';
  end if;
  if v_amount > 9999999999.99 then
    raise exception 'Amount is too large';
  end if;

  if v_receipt <> '' and v_receipt !~* '^https?://' then
    raise exception 'Receipt link must start with http';
  end if;

  if nullif(trim(coalesce(p_data->>'payment_date', '')), '') is null
     or trim(p_data->>'payment_date') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Enter a valid payment date';
  end if;
  begin
    v_paid_on := (p_data->>'payment_date')::date;
  exception
    when others then
      raise exception 'Enter a valid payment date';
  end;
  if v_paid_on > current_date then
    raise exception 'Payment date cannot be in the future';
  end if;

  if v_member_id is not null then
    select * into v_member from public.social_media_team_members where id = v_member_id;
    if not found then raise exception 'Team member not found'; end if;
    v_name := v_member.full_name;
  else
    v_name := trim(coalesce(p_data->>'full_name', ''));
    if length(v_name) < 2 then raise exception 'Select a team member or enter a name'; end if;
  end if;

  if v_member_id is not null and exists (
    select 1 from public.social_media_contributions
    where month_id = v_month_id
      and team_member_id = v_member_id
      and (p_id is null or id <> p_id)
  ) then
    raise exception 'This member has already contributed for this month';
  end if;

  if p_id is null then
    insert into public.social_media_contributions (
      month_id, team_member_id, full_name, amount, note, source, receipt_url, payment_date, updated_by
    ) values (
      v_month_id, v_member_id, v_name, round(v_amount, 2),
      v_note, 'admin', v_receipt, v_paid_on, v_admin.id
    )
    returning * into v_row;
  else
    update public.social_media_contributions set
      month_id = v_month_id,
      full_name = v_name,
      team_member_id = v_member_id,
      amount = round(v_amount, 2),
      note = v_note,
      receipt_url = v_receipt,
      payment_date = v_paid_on,
      updated_at = now(),
      updated_by = v_admin.id
    where id = p_id
    returning * into v_row;
    if not found then raise exception 'Contribution not found'; end if;
  end if;

  return to_jsonb(v_row);
end;
$$;

grant execute on function public.admin_upsert_media_contribution(text, uuid, jsonb)
  to anon, authenticated;

-- Called only by the send-email edge function (service role). It checks the
-- same edit permission as the upsert, then returns the member address stored
-- on the roster. Callers cannot pass a destination address.
create or replace function public.contribution_payment_email_context(
  p_token text,
  p_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admins%rowtype;
  v_row public.social_media_contributions%rowtype;
  v_month public.social_media_contribution_months%rowtype;
  v_email text := '';
  v_editor text;
begin
  if p_id is null then
    raise exception 'Contribution is required';
  end if;
  v_admin := public._require_permission(p_token, 'social_media_contributions', 'edit');
  select * into v_row from public.social_media_contributions where id = p_id;
  if not found then raise exception 'Contribution not found'; end if;
  select * into v_month from public.social_media_contribution_months where id = v_row.month_id;

  if v_row.team_member_id is not null then
    select coalesce(trim(email), '') into v_email
    from public.social_media_team_members
    where id = v_row.team_member_id;
  end if;

  v_editor := coalesce(
    nullif(trim(v_admin.full_name), ''),
    nullif(trim(v_admin.username), ''),
    'An administrator'
  );

  return jsonb_build_object(
    'id', v_row.id,
    'full_name', v_row.full_name,
    'amount', v_row.amount,
    'note', v_row.note,
    'receipt_url', v_row.receipt_url,
    'payment_date', v_row.payment_date,
    'source', v_row.source,
    'month_label', coalesce(v_month.label, ''),
    'month_slug', coalesce(v_month.slug, ''),
    'member_email', coalesce(v_email, ''),
    'updated_at', v_row.updated_at,
    'updated_by_name', v_editor
  );
end;
$$;

revoke all on function public.contribution_payment_email_context(text, uuid)
  from public, anon, authenticated;
grant execute on function public.contribution_payment_email_context(text, uuid)
  to service_role;
