-- Use month-name slugs for public links:
--   /contribute/media/september
--   /contribute/media/september/report
-- If the same month name already exists for another year, use september-2026.

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
  v_base_slug text;
  v_month_name text;
  v_suffix integer := 1;
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'edit');
  v_year := coalesce((p_data->>'year')::integer, extract(year from now())::integer);
  v_month := coalesce((p_data->>'month')::integer, extract(month from now())::integer);
  if v_month < 1 or v_month > 12 then raise exception 'Invalid month'; end if;
  if v_label = '' then
    v_label := to_char(make_date(v_year, v_month, 1), 'FMMonth YYYY');
  end if;

  v_month_name := to_char(make_date(v_year, v_month, 1), 'FMMonth');

  -- Prefer explicit slug, else plain month name (september), else month-year
  v_base_slug := coalesce(
    nullif(public._smc_slugify(p_data->>'slug'), ''),
    public._smc_slugify(v_month_name)
  );
  v_slug := v_base_slug;

  if exists (
    select 1
    from public.social_media_contribution_months m
    where m.slug = v_slug
      and (p_id is null or m.id <> p_id)
  ) then
    v_base_slug := public._smc_slugify(v_month_name || '-' || v_year::text);
    v_slug := v_base_slug;
  end if;

  while exists (
    select 1
    from public.social_media_contribution_months m
    where m.slug = v_slug
      and (p_id is null or m.id <> p_id)
  ) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

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

grant execute on function public.admin_upsert_media_contribution_month(text, uuid, jsonb) to anon, authenticated;

-- Backfill existing months to month-name slugs (oldest year keeps plain name).
do $$
declare
  r record;
  v_month_name text;
  v_base text;
  v_slug text;
  v_suffix integer;
begin
  for r in
    select id, year, month
    from public.social_media_contribution_months
    order by year asc, month asc, created_at asc
  loop
    v_month_name := to_char(make_date(r.year, r.month, 1), 'FMMonth');
    v_base := public._smc_slugify(v_month_name);
    v_slug := v_base;

    if exists (
      select 1 from public.social_media_contribution_months m
      where m.slug = v_slug and m.id <> r.id
    ) then
      v_base := public._smc_slugify(v_month_name || '-' || r.year::text);
      v_slug := v_base;
    end if;

    v_suffix := 1;
    while exists (
      select 1 from public.social_media_contribution_months m
      where m.slug = v_slug and m.id <> r.id
    ) loop
      v_suffix := v_suffix + 1;
      v_slug := v_base || '-' || v_suffix::text;
    end loop;

    update public.social_media_contribution_months
    set slug = v_slug, updated_at = now()
    where id = r.id and slug is distinct from v_slug;
  end loop;
end;
$$;
