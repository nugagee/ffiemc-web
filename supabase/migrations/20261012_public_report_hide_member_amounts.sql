-- Hide individual member contribution amounts on the public team report.
-- Aggregate totals (raised / commitments / balance) remain visible for oversight.

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
      'amount', null,
      'amount_private', true,
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
      'amount', null,
      'amount_private', true,
      'note', c.note,
      'receipt_url', c.receipt_url,
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
    'roster', v_roster,
    'privacy', jsonb_build_object(
      'member_amounts_hidden', true
    )
  );
end;
$$;

grant execute on function public.public_media_contribution_report(text) to anon, authenticated;
