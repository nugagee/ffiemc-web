-- Cross-month analytics for social media contributions dashboard.

create or replace function public.admin_media_contribution_analytics(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_months jsonb;
  v_months_ranked jsonb;
  v_sources jsonb;
  v_timeline jsonb;
  v_members jsonb;
  v_commitments_status jsonb;
  v_commitments_by_month jsonb;
  v_overview jsonb;
  v_total_raised numeric;
  v_total_commitments numeric;
  v_contrib_count integer;
  v_month_count integer;
  v_with_receipt integer;
  v_avg_completion numeric;
begin
  perform public._require_permission(p_token, 'social_media_contributions', 'view');

  -- Per-month series (chronological)
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.year asc, x.month asc), '[]'::jsonb)
  into v_months
  from (
    select
      m.id,
      m.label,
      m.year,
      m.month,
      to_char(make_date(m.year, m.month, 1), 'Mon YY') as short_label,
      m.target_amount,
      m.is_open,
      coalesce((s.summary->>'total_raised')::numeric, 0) as total_raised,
      coalesce((s.summary->>'contribution_count')::integer, 0) as contribution_count,
      coalesce((s.summary->>'paid_roster_count')::integer, 0) as paid_roster_count,
      coalesce((s.summary->>'active_roster_count')::integer, 0) as active_roster_count,
      coalesce((s.summary->>'unpaid_roster_count')::integer, 0) as unpaid_roster_count,
      coalesce((s.summary->>'commitments_total')::numeric, 0) as commitments_total,
      coalesce((s.summary->>'balance')::numeric, 0) as balance,
      case
        when coalesce((s.summary->>'active_roster_count')::integer, 0) > 0
        then round(
          (
            coalesce((s.summary->>'paid_roster_count')::numeric, 0)
            / (s.summary->>'active_roster_count')::numeric
          ) * 100,
          1
        )
        else 0
      end as completion_pct,
      (
        select count(*)::integer
        from public.social_media_contributions c
        where c.month_id = m.id and c.source = 'public'
      ) as public_count,
      (
        select count(*)::integer
        from public.social_media_contributions c
        where c.month_id = m.id and c.source = 'admin'
      ) as admin_count,
      (
        select count(*)::integer
        from public.social_media_contributions c
        where c.month_id = m.id and nullif(trim(coalesce(c.receipt_url, '')), '') is not null
      ) as with_receipt_count,
      (
        select coalesce(avg(c.amount), 0)::numeric
        from public.social_media_contributions c
        where c.month_id = m.id
      ) as avg_payment,
      (
        select coalesce(max(c.amount), 0)::numeric
        from public.social_media_contributions c
        where c.month_id = m.id
      ) as max_payment,
      (
        select coalesce(min(c.amount), 0)::numeric
        from public.social_media_contributions c
        where c.month_id = m.id
      ) as min_payment,
      (
        select coalesce(sum(cm.amount), 0)::numeric
        from public.social_media_month_commitments cm
        where cm.month_id = m.id and cm.status = 'planned'
      ) as commitments_planned,
      (
        select coalesce(sum(cm.amount), 0)::numeric
        from public.social_media_month_commitments cm
        where cm.month_id = m.id and cm.status = 'purchased'
      ) as commitments_purchased,
      (
        select coalesce(sum(cm.amount), 0)::numeric
        from public.social_media_month_commitments cm
        where cm.month_id = m.id and cm.status = 'achieved'
      ) as commitments_achieved
    from public.social_media_contribution_months m
    cross join lateral (
      select public._smc_month_summary(m.id) as summary
    ) s
  ) x;

  -- Highest → lowest months by raised
  select coalesce(jsonb_agg(elem order by (elem->>'total_raised')::numeric desc), '[]'::jsonb)
  into v_months_ranked
  from jsonb_array_elements(v_months) elem;

  -- Payment source mix
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'source', s.source,
      'count', s.cnt,
      'amount', s.amt
    )
    order by s.amt desc
  ), '[]'::jsonb)
  into v_sources
  from (
    select
      coalesce(nullif(trim(c.source), ''), 'unknown') as source,
      count(*)::integer as cnt,
      coalesce(sum(c.amount), 0)::numeric as amt
    from public.social_media_contributions c
    group by 1
  ) s;

  -- Payment date timeline (day buckets)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'date', t.d,
      'amount', t.amt,
      'count', t.cnt
    )
    order by t.d asc
  ), '[]'::jsonb)
  into v_timeline
  from (
    select
      coalesce(c.payment_date, c.created_at::date) as d,
      coalesce(sum(c.amount), 0)::numeric as amt,
      count(*)::integer as cnt
    from public.social_media_contributions c
    group by 1
  ) t;

  -- Member contribution matrix across months
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'member_id', m.id,
      'full_name', m.full_name,
      'role_label', m.role_label,
      'is_active', m.is_active,
      'total_amount', coalesce(agg.total_amount, 0),
      'months_paid', coalesce(agg.months_paid, 0),
      'avg_amount', coalesce(agg.avg_amount, 0),
      'by_month', coalesce(agg.by_month, '[]'::jsonb)
    )
    order by coalesce(agg.total_amount, 0) desc, m.full_name asc
  ), '[]'::jsonb)
  into v_members
  from public.social_media_team_members m
  left join lateral (
    select
      coalesce(sum(c.amount), 0)::numeric as total_amount,
      count(*)::integer as months_paid,
      coalesce(avg(c.amount), 0)::numeric as avg_amount,
      coalesce(jsonb_agg(
        jsonb_build_object(
          'month_id', mo.id,
          'label', mo.label,
          'short_label', to_char(make_date(mo.year, mo.month, 1), 'Mon YY'),
          'year', mo.year,
          'month', mo.month,
          'amount', c.amount,
          'payment_date', c.payment_date,
          'receipt_url', c.receipt_url
        )
        order by mo.year asc, mo.month asc
      ), '[]'::jsonb) as by_month
    from public.social_media_contributions c
    join public.social_media_contribution_months mo on mo.id = c.month_id
    where c.team_member_id = m.id
  ) agg on true
  where m.is_active = true
     or exists (
       select 1 from public.social_media_contributions c2 where c2.team_member_id = m.id
     );

  -- Commitment status mix (all time)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'status', s.status,
      'count', s.cnt,
      'amount', s.amt
    )
    order by s.amt desc
  ), '[]'::jsonb)
  into v_commitments_status
  from (
    select
      x.status,
      count(*)::integer as cnt,
      coalesce(sum(x.amount), 0)::numeric as amt
    from public.social_media_month_commitments x
    group by x.status
  ) s;

  -- Commitments stacked by month
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'label', m.label,
      'short_label', to_char(make_date(m.year, m.month, 1), 'Mon YY'),
      'planned', coalesce((
        select sum(x.amount) from public.social_media_month_commitments x
        where x.month_id = m.id and x.status = 'planned'
      ), 0),
      'purchased', coalesce((
        select sum(x.amount) from public.social_media_month_commitments x
        where x.month_id = m.id and x.status = 'purchased'
      ), 0),
      'achieved', coalesce((
        select sum(x.amount) from public.social_media_month_commitments x
        where x.month_id = m.id and x.status = 'achieved'
      ), 0),
      'total', coalesce((
        select sum(x.amount) from public.social_media_month_commitments x
        where x.month_id = m.id
      ), 0),
      'raised', (public._smc_month_summary(m.id)->>'total_raised')::numeric
    )
    order by m.year asc, m.month asc
  ), '[]'::jsonb)
  into v_commitments_by_month
  from public.social_media_contribution_months m;

  select
    coalesce(sum((elem->>'total_raised')::numeric), 0),
    coalesce(sum((elem->>'commitments_total')::numeric), 0),
    coalesce(sum((elem->>'contribution_count')::integer), 0),
    coalesce(count(*), 0),
    coalesce(avg((elem->>'completion_pct')::numeric), 0)
  into v_total_raised, v_total_commitments, v_contrib_count, v_month_count, v_avg_completion
  from jsonb_array_elements(v_months) elem;

  select count(*)::integer into v_with_receipt
  from public.social_media_contributions c
  where nullif(trim(coalesce(c.receipt_url, '')), '') is not null;

  v_overview := jsonb_build_object(
    'total_raised', v_total_raised,
    'total_commitments', v_total_commitments,
    'net_balance', v_total_raised - v_total_commitments,
    'contribution_count', v_contrib_count,
    'month_count', v_month_count,
    'avg_contribution', case when v_contrib_count > 0 then round(v_total_raised / v_contrib_count, 2) else 0 end,
    'avg_monthly_raised', case when v_month_count > 0 then round(v_total_raised / v_month_count, 2) else 0 end,
    'receipt_count', v_with_receipt,
    'receipt_rate', case when v_contrib_count > 0 then round((v_with_receipt::numeric / v_contrib_count) * 100, 1) else 0 end,
    'avg_roster_completion', round(coalesce(v_avg_completion, 0), 1),
    'highest_month', (
      select jsonb_build_object(
        'label', elem->>'label',
        'total_raised', (elem->>'total_raised')::numeric,
        'short_label', elem->>'short_label'
      )
      from jsonb_array_elements(v_months_ranked) elem
      limit 1
    ),
    'lowest_month', (
      select jsonb_build_object(
        'label', elem->>'label',
        'total_raised', (elem->>'total_raised')::numeric,
        'short_label', elem->>'short_label'
      )
      from jsonb_array_elements(v_months_ranked) elem
      order by (elem->>'total_raised')::numeric asc
      limit 1
    ),
    'top_contributor', (
      select jsonb_build_object(
        'full_name', elem->>'full_name',
        'total_amount', (elem->>'total_amount')::numeric,
        'months_paid', (elem->>'months_paid')::integer
      )
      from jsonb_array_elements(v_members) elem
      where (elem->>'total_amount')::numeric > 0
      order by (elem->>'total_amount')::numeric desc
      limit 1
    )
  );

  return jsonb_build_object(
    'generated_at', now(),
    'overview', v_overview,
    'months', v_months,
    'months_ranked', v_months_ranked,
    'sources', v_sources,
    'payment_timeline', v_timeline,
    'members', v_members,
    'commitments_by_status', v_commitments_status,
    'commitments_by_month', v_commitments_by_month
  );
end;
$$;

grant execute on function public.admin_media_contribution_analytics(text) to anon, authenticated;
