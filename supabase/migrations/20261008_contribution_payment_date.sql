-- Payment date on social media contributions (when the money was sent).

alter table public.social_media_contributions
  add column if not exists payment_date date;

drop function if exists public.submit_media_contribution(text, uuid, text, numeric, text);
drop function if exists public.submit_media_contribution(text, uuid, text, numeric, text, text);

create or replace function public.submit_media_contribution(
  p_slug text,
  p_team_member_id uuid default null,
  p_full_name text default '',
  p_amount numeric default null,
  p_note text default '',
  p_receipt_url text default '',
  p_payment_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month public.social_media_contribution_months%rowtype;
  v_member public.social_media_team_members%rowtype;
  v_name text;
  v_id uuid;
  v_receipt text := trim(coalesce(p_receipt_url, ''));
  v_paid_on date := coalesce(p_payment_date, current_date);
begin
  select * into v_month
  from public.social_media_contribution_months
  where slug = lower(trim(p_slug));
  if not found then raise exception 'Contribution month not found'; end if;
  if not v_month.is_open then raise exception 'This month is closed for new contributions'; end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Please enter a valid amount';
  end if;

  if v_receipt <> '' and position('http' in lower(v_receipt)) <> 1 then
    raise exception 'Invalid receipt URL';
  end if;

  if p_team_member_id is not null then
    select * into v_member
    from public.social_media_team_members
    where id = p_team_member_id and is_active = true;
    if not found then raise exception 'Team member not found'; end if;
    if exists (
      select 1 from public.social_media_contributions
      where month_id = v_month.id and team_member_id = p_team_member_id
    ) then
      raise exception 'This member has already contributed for this month';
    end if;
    v_name := v_member.full_name;
  else
    v_name := trim(coalesce(p_full_name, ''));
    if length(v_name) < 2 then raise exception 'Please select or enter your name'; end if;
  end if;

  insert into public.social_media_contributions (
    month_id, team_member_id, full_name, amount, note, source, receipt_url, payment_date
  ) values (
    v_month.id,
    p_team_member_id,
    v_name,
    round(p_amount::numeric, 2),
    coalesce(trim(p_note), ''),
    'public',
    v_receipt,
    v_paid_on
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'full_name', v_name,
    'amount', round(p_amount::numeric, 2),
    'month_label', v_month.label,
    'month_slug', v_month.slug,
    'note', coalesce(trim(p_note), ''),
    'receipt_url', v_receipt,
    'payment_date', v_paid_on,
    'summary', public._smc_month_summary(v_month.id)
  );
end;
$$;

grant execute on function public.submit_media_contribution(text, uuid, text, numeric, text, text, date)
  to anon, authenticated;

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
  v_row public.social_media_contributions%rowtype;
  v_month_id uuid := nullif(p_data->>'month_id', '')::uuid;
  v_member_id uuid := nullif(p_data->>'team_member_id', '')::uuid;
  v_name text;
  v_amount numeric;
  v_member public.social_media_team_members%rowtype;
  v_receipt text := trim(coalesce(p_data->>'receipt_url', ''));
  v_paid_on date;
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'edit');
  if v_month_id is null then raise exception 'Month is required'; end if;
  v_amount := nullif(p_data->>'amount', '')::numeric;
  if v_amount is null or v_amount <= 0 then raise exception 'Valid amount is required'; end if;

  if v_receipt <> '' and position('http' in lower(v_receipt)) <> 1 then
    raise exception 'Invalid receipt URL';
  end if;

  if nullif(trim(coalesce(p_data->>'payment_date', '')), '') is not null then
    v_paid_on := (p_data->>'payment_date')::date;
  else
    v_paid_on := current_date;
  end if;

  if v_member_id is not null then
    select * into v_member from public.social_media_team_members where id = v_member_id;
    if not found then raise exception 'Team member not found'; end if;
    v_name := v_member.full_name;
  else
    v_name := trim(coalesce(p_data->>'full_name', ''));
    if length(v_name) < 2 then raise exception 'Name is required'; end if;
  end if;

  if p_id is null then
    if v_member_id is not null and exists (
      select 1 from public.social_media_contributions
      where month_id = v_month_id and team_member_id = v_member_id
    ) then
      raise exception 'This member has already contributed for this month';
    end if;
    insert into public.social_media_contributions (
      month_id, team_member_id, full_name, amount, note, source, receipt_url, payment_date
    ) values (
      v_month_id, v_member_id, v_name, round(v_amount, 2),
      coalesce(trim(p_data->>'note'), ''), 'admin', v_receipt, v_paid_on
    )
    returning * into v_row;
  else
    update public.social_media_contributions set
      full_name = v_name,
      team_member_id = coalesce(v_member_id, team_member_id),
      amount = round(v_amount, 2),
      note = coalesce(p_data->>'note', note),
      receipt_url = case
        when p_data ? 'receipt_url' then v_receipt
        else receipt_url
      end,
      payment_date = case
        when p_data ? 'payment_date' then v_paid_on
        else payment_date
      end,
      updated_at = now()
    where id = p_id
    returning * into v_row;
    if not found then raise exception 'Contribution not found'; end if;
  end if;
  return to_jsonb(v_row);
end;
$$;

grant execute on function public.admin_upsert_media_contribution(text, uuid, jsonb)
  to anon, authenticated;

create or replace function public.public_media_contribution_report(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month public.social_media_contribution_months%rowtype;
  v_contributions jsonb;
  v_commitments jsonb;
  v_roster jsonb;
begin
  select * into v_month
  from public.social_media_contribution_months
  where slug = lower(trim(p_slug));
  if not found then raise exception 'Contribution month not found'; end if;
  if not v_month.report_public then
    raise exception 'This report is not public yet';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'full_name', c.full_name,
      'amount', c.amount,
      'note', c.note,
      'receipt_url', c.receipt_url,
      'payment_date', c.payment_date,
      'created_at', c.created_at,
      'on_roster', c.team_member_id is not null
    )
    order by coalesce(c.payment_date, c.created_at::date) desc, c.full_name asc
  ), '[]'::jsonb)
  into v_contributions
  from public.social_media_contributions c
  where c.month_id = v_month.id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'title', x.title,
      'description', x.description,
      'amount', x.amount,
      'status', x.status
    )
    order by x.sort_order asc, x.created_at asc
  ), '[]'::jsonb)
  into v_commitments
  from public.social_media_month_commitments x
  where x.month_id = v_month.id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'full_name', m.full_name,
      'paid', c.id is not null,
      'amount', c.amount,
      'payment_date', c.payment_date
    )
    order by (c.id is null) asc, m.full_name asc
  ), '[]'::jsonb)
  into v_roster
  from public.social_media_team_members m
  left join public.social_media_contributions c
    on c.team_member_id = m.id and c.month_id = v_month.id
  where m.is_active = true;

  return jsonb_build_object(
    'month', jsonb_build_object(
      'label', v_month.label,
      'year', v_month.year,
      'month', v_month.month,
      'slug', v_month.slug,
      'target_amount', v_month.target_amount
    ),
    'summary', public._smc_month_summary(v_month.id),
    'contributions', v_contributions,
    'commitments', v_commitments,
    'roster', v_roster
  );
end;
$$;

grant execute on function public.public_media_contribution_report(text) to anon, authenticated;

-- Backfill existing rows
update public.social_media_contributions
set payment_date = coalesce(payment_date, created_at::date)
where payment_date is null;
