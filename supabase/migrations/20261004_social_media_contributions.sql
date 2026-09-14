-- Social media team monthly contributions: roster, months, payments, commitments/equipment.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.social_media_team_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null default '',
  phone text not null default '',
  role_label text not null default 'Team member',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_media_team_members_active_idx
  on public.social_media_team_members (is_active, sort_order, full_name);

create table if not exists public.social_media_contribution_months (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  year integer not null,
  month integer not null check (month between 1 and 12),
  slug text not null unique,
  intro text not null default '',
  target_amount numeric(12,2),
  is_open boolean not null default true,
  report_public boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, month)
);

create index if not exists social_media_contribution_months_open_idx
  on public.social_media_contribution_months (is_open, year desc, month desc);

create table if not exists public.social_media_contributions (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.social_media_contribution_months(id) on delete cascade,
  team_member_id uuid references public.social_media_team_members(id) on delete set null,
  full_name text not null,
  amount numeric(12,2) not null check (amount > 0),
  note text not null default '',
  source text not null default 'public' check (source in ('public', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists social_media_contributions_member_month_uidx
  on public.social_media_contributions (month_id, team_member_id)
  where team_member_id is not null;

create index if not exists social_media_contributions_month_idx
  on public.social_media_contributions (month_id, created_at desc);

create table if not exists public.social_media_month_commitments (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.social_media_contribution_months(id) on delete cascade,
  title text not null,
  description text not null default '',
  amount numeric(12,2) not null default 0 check (amount >= 0),
  status text not null default 'planned' check (status in ('planned', 'purchased', 'achieved')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_media_month_commitments_month_idx
  on public.social_media_month_commitments (month_id, sort_order, created_at);

alter table public.social_media_team_members enable row level security;
alter table public.social_media_contribution_months enable row level security;
alter table public.social_media_contributions enable row level security;
alter table public.social_media_month_commitments enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public._smc_slugify(p_text text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := lower(trim(coalesce(p_text, '')));
begin
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := regexp_replace(v, '(^-|-$)', '', 'g');
  if v = '' then v := 'month'; end if;
  return v;
end;
$$;

create or replace function public._smc_month_summary(p_month_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_count integer;
  v_paid_members integer;
  v_active_members integer;
  v_commitments_total numeric;
begin
  select coalesce(sum(amount), 0), count(*)
    into v_total, v_count
  from public.social_media_contributions
  where month_id = p_month_id;

  select count(*) into v_paid_members
  from public.social_media_contributions
  where month_id = p_month_id and team_member_id is not null;

  select count(*) into v_active_members
  from public.social_media_team_members
  where is_active = true;

  select coalesce(sum(amount), 0) into v_commitments_total
  from public.social_media_month_commitments
  where month_id = p_month_id;

  return jsonb_build_object(
    'total_raised', v_total,
    'contribution_count', v_count,
    'paid_roster_count', v_paid_members,
    'active_roster_count', v_active_members,
    'unpaid_roster_count', greatest(v_active_members - v_paid_members, 0),
    'commitments_total', v_commitments_total,
    'balance', v_total - v_commitments_total
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------
create or replace function public.public_get_media_contribution_month(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month public.social_media_contribution_months%rowtype;
  v_members jsonb;
begin
  select * into v_month
  from public.social_media_contribution_months
  where slug = lower(trim(p_slug));
  if not found then
    raise exception 'Contribution month not found';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'full_name', m.full_name,
      'role_label', m.role_label,
      'paid', c.id is not null,
      'amount', c.amount
    )
    order by m.sort_order asc, m.full_name asc
  ), '[]'::jsonb)
  into v_members
  from public.social_media_team_members m
  left join public.social_media_contributions c
    on c.team_member_id = m.id and c.month_id = v_month.id
  where m.is_active = true;

  return jsonb_build_object(
    'month', jsonb_build_object(
      'id', v_month.id,
      'label', v_month.label,
      'year', v_month.year,
      'month', v_month.month,
      'slug', v_month.slug,
      'intro', v_month.intro,
      'target_amount', v_month.target_amount,
      'is_open', v_month.is_open,
      'report_public', v_month.report_public
    ),
    'members', v_members,
    'summary', public._smc_month_summary(v_month.id)
  );
end;
$$;

grant execute on function public.public_get_media_contribution_month(text) to anon, authenticated;

create or replace function public.submit_media_contribution(
  p_slug text,
  p_team_member_id uuid default null,
  p_full_name text default '',
  p_amount numeric default null,
  p_note text default ''
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
begin
  select * into v_month
  from public.social_media_contribution_months
  where slug = lower(trim(p_slug));
  if not found then raise exception 'Contribution month not found'; end if;
  if not v_month.is_open then raise exception 'This month is closed for new contributions'; end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Please enter a valid amount';
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
    month_id, team_member_id, full_name, amount, note, source
  ) values (
    v_month.id,
    p_team_member_id,
    v_name,
    round(p_amount::numeric, 2),
    coalesce(trim(p_note), ''),
    'public'
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'full_name', v_name,
    'amount', round(p_amount::numeric, 2),
    'month_label', v_month.label,
    'summary', public._smc_month_summary(v_month.id)
  );
end;
$$;

grant execute on function public.submit_media_contribution(text, uuid, text, numeric, text) to anon, authenticated;

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
      'created_at', c.created_at,
      'on_roster', c.team_member_id is not null
    )
    order by c.amount desc, c.full_name asc
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
      'amount', c.amount
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

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_media_team_members(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'view');
  return coalesce((
    select jsonb_agg(to_jsonb(m) order by m.sort_order asc, m.full_name asc)
    from public.social_media_team_members m
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_media_team_member(
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
  v_row public.social_media_team_members%rowtype;
  v_name text := trim(coalesce(p_data->>'full_name', ''));
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'edit');
  if length(v_name) < 2 then raise exception 'Full name is required'; end if;

  if p_id is null then
    insert into public.social_media_team_members (
      full_name, email, phone, role_label, is_active, sort_order, notes
    ) values (
      v_name,
      coalesce(trim(p_data->>'email'), ''),
      coalesce(trim(p_data->>'phone'), ''),
      coalesce(nullif(trim(p_data->>'role_label'), ''), 'Team member'),
      coalesce((p_data->>'is_active')::boolean, true),
      coalesce((p_data->>'sort_order')::integer, 0),
      coalesce(trim(p_data->>'notes'), '')
    )
    returning * into v_row;
  else
    update public.social_media_team_members set
      full_name = v_name,
      email = coalesce(p_data->>'email', email),
      phone = coalesce(p_data->>'phone', phone),
      role_label = coalesce(nullif(trim(p_data->>'role_label'), ''), role_label),
      is_active = case when p_data ? 'is_active' then coalesce((p_data->>'is_active')::boolean, true) else is_active end,
      sort_order = case when p_data ? 'sort_order' then coalesce((p_data->>'sort_order')::integer, 0) else sort_order end,
      notes = coalesce(p_data->>'notes', notes),
      updated_at = now()
    where id = p_id
    returning * into v_row;
    if not found then raise exception 'Team member not found'; end if;
  end if;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_delete_media_team_member(p_token text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'delete');
  delete from public.social_media_team_members where id = p_id;
  return true;
end;
$$;

create or replace function public.admin_list_media_contribution_months(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'view');
  return coalesce((
    select jsonb_agg(
      to_jsonb(m) || jsonb_build_object('summary', public._smc_month_summary(m.id))
      order by m.year desc, m.month desc
    )
    from public.social_media_contribution_months m
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_media_contribution_month(
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
  v_row public.social_media_contribution_months%rowtype;
  v_label text := trim(coalesce(p_data->>'label', ''));
  v_year integer;
  v_month integer;
  v_slug text;
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'edit');
  v_year := coalesce((p_data->>'year')::integer, extract(year from now())::integer);
  v_month := coalesce((p_data->>'month')::integer, extract(month from now())::integer);
  if v_month < 1 or v_month > 12 then raise exception 'Invalid month'; end if;
  if v_label = '' then
    v_label := to_char(make_date(v_year, v_month, 1), 'FMMonth YYYY');
  end if;
  -- Prefer explicit slug, else stable year-month + label (avoids label-only collisions)
  declare
    v_base_slug text;
    v_suffix integer := 1;
  begin
    v_base_slug := coalesce(
      nullif(public._smc_slugify(p_data->>'slug'), ''),
      public._smc_slugify(v_year::text || '-' || lpad(v_month::text, 2, '0') || '-' || v_label),
      public._smc_slugify(v_year::text || '-' || lpad(v_month::text, 2, '0'))
    );
    v_slug := v_base_slug;
    while exists (
      select 1 from public.social_media_contribution_months m
      where m.slug = v_slug and (p_id is null or m.id <> p_id)
    ) loop
      v_suffix := v_suffix + 1;
      v_slug := v_base_slug || '-' || v_suffix::text;
    end loop;
  end;

  if p_id is null then
    if exists (
      select 1 from public.social_media_contribution_months m
      where m.year = v_year and m.month = v_month
    ) then
      raise exception 'A contribution month for % already exists', v_label;
    end if;

    insert into public.social_media_contribution_months (
      label, year, month, slug, intro, target_amount, is_open, report_public, notes
    ) values (
      v_label, v_year, v_month, v_slug,
      coalesce(trim(p_data->>'intro'), ''),
      nullif(p_data->>'target_amount', '')::numeric,
      coalesce((p_data->>'is_open')::boolean, true),
      coalesce((p_data->>'report_public')::boolean, true),
      coalesce(trim(p_data->>'notes'), '')
    )
    returning * into v_row;
  else
    update public.social_media_contribution_months set
      label = v_label,
      year = v_year,
      month = v_month,
      slug = v_slug,
      intro = coalesce(p_data->>'intro', intro),
      target_amount = case
        when p_data ? 'target_amount' then nullif(p_data->>'target_amount', '')::numeric
        else target_amount
      end,
      is_open = case when p_data ? 'is_open' then coalesce((p_data->>'is_open')::boolean, true) else is_open end,
      report_public = case when p_data ? 'report_public' then coalesce((p_data->>'report_public')::boolean, true) else report_public end,
      notes = coalesce(p_data->>'notes', notes),
      updated_at = now()
    where id = p_id
    returning * into v_row;
    if not found then raise exception 'Month not found'; end if;
  end if;

  return to_jsonb(v_row) || jsonb_build_object('summary', public._smc_month_summary(v_row.id));
end;
$$;

create or replace function public.admin_delete_media_contribution_month(p_token text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'delete');
  delete from public.social_media_contribution_months where id = p_id;
  return true;
end;
$$;

create or replace function public.admin_get_media_contribution_month(p_token text, p_id uuid)
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
  perform public._require_permission(p_token, 'social_media_contributions', 'view');
  select * into v_month from public.social_media_contribution_months where id = p_id;
  if not found then raise exception 'Month not found'; end if;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc), '[]'::jsonb)
  into v_contributions
  from public.social_media_contributions c
  where c.month_id = p_id;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.sort_order asc, x.created_at asc), '[]'::jsonb)
  into v_commitments
  from public.social_media_month_commitments x
  where x.month_id = p_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'full_name', m.full_name,
      'email', m.email,
      'phone', m.phone,
      'role_label', m.role_label,
      'is_active', m.is_active,
      'paid', c.id is not null,
      'contribution_id', c.id,
      'amount', c.amount,
      'contributed_at', c.created_at
    )
    order by m.sort_order asc, m.full_name asc
  ), '[]'::jsonb)
  into v_roster
  from public.social_media_team_members m
  left join public.social_media_contributions c
    on c.team_member_id = m.id and c.month_id = p_id
  where m.is_active = true;

  return jsonb_build_object(
    'month', to_jsonb(v_month),
    'summary', public._smc_month_summary(p_id),
    'contributions', v_contributions,
    'commitments', v_commitments,
    'roster', v_roster
  );
end;
$$;

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
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'edit');
  if v_month_id is null then raise exception 'Month is required'; end if;
  v_amount := nullif(p_data->>'amount', '')::numeric;
  if v_amount is null or v_amount <= 0 then raise exception 'Valid amount is required'; end if;

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
      month_id, team_member_id, full_name, amount, note, source
    ) values (
      v_month_id, v_member_id, v_name, round(v_amount, 2),
      coalesce(trim(p_data->>'note'), ''), 'admin'
    )
    returning * into v_row;
  else
    update public.social_media_contributions set
      full_name = v_name,
      team_member_id = coalesce(v_member_id, team_member_id),
      amount = round(v_amount, 2),
      note = coalesce(p_data->>'note', note),
      updated_at = now()
    where id = p_id
    returning * into v_row;
    if not found then raise exception 'Contribution not found'; end if;
  end if;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_delete_media_contribution(p_token text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'delete');
  delete from public.social_media_contributions where id = p_id;
  return true;
end;
$$;

create or replace function public.admin_upsert_media_commitment(
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
  v_row public.social_media_month_commitments%rowtype;
  v_month_id uuid := nullif(p_data->>'month_id', '')::uuid;
  v_title text := trim(coalesce(p_data->>'title', ''));
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'edit');
  if v_month_id is null then raise exception 'Month is required'; end if;
  if length(v_title) < 2 then raise exception 'Title is required'; end if;

  if p_id is null then
    insert into public.social_media_month_commitments (
      month_id, title, description, amount, status, sort_order
    ) values (
      v_month_id,
      v_title,
      coalesce(trim(p_data->>'description'), ''),
      coalesce(nullif(p_data->>'amount', '')::numeric, 0),
      coalesce(nullif(trim(p_data->>'status'), ''), 'planned'),
      coalesce((p_data->>'sort_order')::integer, 0)
    )
    returning * into v_row;
  else
    update public.social_media_month_commitments set
      title = v_title,
      description = coalesce(p_data->>'description', description),
      amount = case when p_data ? 'amount' then coalesce(nullif(p_data->>'amount', '')::numeric, 0) else amount end,
      status = coalesce(nullif(trim(p_data->>'status'), ''), status),
      sort_order = case when p_data ? 'sort_order' then coalesce((p_data->>'sort_order')::integer, 0) else sort_order end,
      updated_at = now()
    where id = p_id
    returning * into v_row;
    if not found then raise exception 'Commitment not found'; end if;
  end if;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_delete_media_commitment(p_token text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'delete');
  delete from public.social_media_month_commitments where id = p_id;
  return true;
end;
$$;

grant execute on function public.admin_list_media_team_members(text) to anon, authenticated;
grant execute on function public.admin_upsert_media_team_member(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_media_team_member(text, uuid) to anon, authenticated;
grant execute on function public.admin_list_media_contribution_months(text) to anon, authenticated;
grant execute on function public.admin_upsert_media_contribution_month(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_media_contribution_month(text, uuid) to anon, authenticated;
grant execute on function public.admin_get_media_contribution_month(text, uuid) to anon, authenticated;
grant execute on function public.admin_upsert_media_contribution(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_media_contribution(text, uuid) to anon, authenticated;
grant execute on function public.admin_upsert_media_commitment(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_media_commitment(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Permissions catalog
-- ---------------------------------------------------------------------------
create or replace function public._sanitize_permissions(p_permissions jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v jsonb := '{}'::jsonb;
  v_pages jsonb := '{}'::jsonb;
  v_page text;
  v_section text;
  v_feature text;
  v_page_src jsonb;
  v_sec_src jsonb;
  v_feat_src jsonb;
  v_sections jsonb;
  v_access boolean;
  v_edit boolean;
  v_delete boolean;
  v_view boolean;
  v_catalog jsonb := '{
    "home": ["hero","announcements","monthWelcome","facebookLive","welcome","stats","eventsPreview","sermonsPreview","blogPreview","ministriesPreview","cta","testimoniesPreview","social"],
    "about": ["hero","mission","values","doctrines","catechism","history","pastor","visit"],
    "services": ["hero","times","programmes","expect","guidelines","cta"],
    "leadership": ["hero","team","youthEscos","departments","values","cta"],
    "ministries": ["hero","network","departments","bibleSchool","list"],
    "events": ["hero","list"],
    "sermons": ["hero","list"],
    "testimonies": ["hero","list"],
    "blog": ["hero","posts"],
    "contact": ["hero","church","hours"],
    "prayer": ["hero","categories","inbox","pastors"],
    "join": ["hero"],
    "donate": ["hero","purposes","accounts"],
    "privacy": ["hero","sections"],
    "terms": ["hero","sections"]
  }'::jsonb;
  v_features text[] := array[
    'overview', 'visitors', 'contacts', 'banners',
    'program_types', 'programs', 'church_branches', 'church_roles', 'member_notifications',
    'program_registrations', 'volunteer_applications', 'church_members', 'form_dropdowns',
    'approvals', 'church_meetings', 'utilities', 'fire_buddy', 'social_media_contributions'
  ];
begin
  if p_permissions is null or jsonb_typeof(p_permissions) <> 'object' then
    return jsonb_build_object(
      'overview', jsonb_build_object('view', false),
      'visitors', jsonb_build_object('view', false),
      'contacts', jsonb_build_object('view', false, 'edit', false, 'delete', false),
      'pages', '{}'::jsonb
    );
  end if;

  foreach v_feature in array v_features
  loop
    v_feat_src := coalesce(p_permissions->v_feature, '{}'::jsonb);
    if v_feature in ('overview', 'visitors') then
      v := v || jsonb_build_object(
        v_feature,
        jsonb_build_object(
          'view', coalesce((v_feat_src->>'view')::boolean, false)
        )
      );
    elsif v_feature in ('form_dropdowns', 'approvals', 'fire_buddy') then
      v_edit := coalesce((v_feat_src->>'edit')::boolean, false);
      v_view := coalesce((v_feat_src->>'view')::boolean, false) or v_edit;
      v := v || jsonb_build_object(
        v_feature,
        jsonb_build_object('view', v_view, 'edit', v_edit)
      );
    else
      v_edit := coalesce((v_feat_src->>'edit')::boolean, false);
      v_delete := coalesce((v_feat_src->>'delete')::boolean, false);
      if v_delete then v_edit := true; end if;
      v_view := coalesce((v_feat_src->>'view')::boolean, false) or v_edit or v_delete;
      v := v || jsonb_build_object(
        v_feature,
        jsonb_build_object('view', v_view, 'edit', v_edit, 'delete', v_delete)
      );
    end if;
  end loop;

  for v_page in select jsonb_object_keys(v_catalog)
  loop
    v_page_src := coalesce(p_permissions->'pages'->v_page, '{}'::jsonb);
    v_sections := '{}'::jsonb;
    v_access := coalesce((v_page_src->>'access')::boolean, false);

    for v_section in select jsonb_array_elements_text(v_catalog->v_page)
    loop
      v_sec_src := coalesce(v_page_src->'sections'->v_section, '{}'::jsonb);
      v_edit := coalesce((v_sec_src->>'edit')::boolean, false);
      v_delete := coalesce((v_sec_src->>'delete')::boolean, false);
      if v_delete then v_edit := true; end if;
      if v_edit or v_delete then v_access := true; end if;
      v_sections := v_sections || jsonb_build_object(
        v_section,
        jsonb_build_object('edit', v_edit, 'delete', v_delete)
      );
    end loop;

    if v_page = 'home' then
      if coalesce((p_permissions->'hero'->>'edit')::boolean, false) then
        v_sections := jsonb_set(v_sections, '{hero,edit}', 'true'::jsonb);
        v_access := true;
      end if;
      if coalesce((p_permissions->'hero'->>'delete')::boolean, false) then
        v_sections := jsonb_set(v_sections, '{hero,delete}', 'true'::jsonb);
        v_access := true;
      end if;
      if coalesce((p_permissions->'website'->>'edit')::boolean, false) then
        v_sections := jsonb_set(v_sections, '{welcome,edit}', 'true'::jsonb);
        v_access := true;
      end if;
    elsif v_page = 'blog' and coalesce((p_permissions->'blog'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{posts,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'events' and coalesce((p_permissions->'events'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{list,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'sermons' and coalesce((p_permissions->'sermons'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{list,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'ministries' and coalesce((p_permissions->'ministries'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{list,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'testimonies' and coalesce((p_permissions->'testimonies'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{list,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'prayer' and coalesce((p_permissions->'prayers'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{inbox,edit}', 'true'::jsonb); v_access := true;
    elsif v_page = 'contact' and coalesce((p_permissions->'website'->>'edit')::boolean, false) then
      v_sections := jsonb_set(v_sections, '{church,edit}', 'true'::jsonb); v_access := true;
    end if;

    v_pages := v_pages || jsonb_build_object(
      v_page,
      jsonb_build_object('access', v_access, 'sections', v_sections)
    );
  end loop;

  return v || jsonb_build_object('pages', v_pages);
end;
$$;

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
    'approvals', 'church_meetings', 'form_dropdowns', 'utilities', 'fire_buddy',
    'social_media_contributions'
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

grant execute on function public._sanitize_permissions(jsonb) to anon, authenticated;
