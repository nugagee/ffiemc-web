-- Fix contribution month slug collisions: derive slug from year-month, not label.

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
  v_suffix integer := 1;
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'edit');
  v_year := coalesce((p_data->>'year')::integer, extract(year from now())::integer);
  v_month := coalesce((p_data->>'month')::integer, extract(month from now())::integer);
  if v_month < 1 or v_month > 12 then raise exception 'Invalid month'; end if;
  if v_label = '' then
    v_label := to_char(make_date(v_year, v_month, 1), 'FMMonth YYYY');
  end if;

  -- Prefer explicit slug, else stable year-month key (avoids label collisions)
  v_base_slug := coalesce(
    nullif(public._smc_slugify(p_data->>'slug'), ''),
    public._smc_slugify(v_year::text || '-' || lpad(v_month::text, 2, '0') || '-' || v_label),
    public._smc_slugify(v_year::text || '-' || lpad(v_month::text, 2, '0'))
  );
  v_slug := v_base_slug;

  -- Ensure slug uniqueness (especially when label reused across months)
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
