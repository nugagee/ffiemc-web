-- Public "New Post Alert" feed: recent published blog + church resources

create or replace function public.public_list_content_alerts(
  p_limit integer default 12,
  p_days integer default 21
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 12), 40));
  v_days integer := greatest(1, least(coalesce(p_days, 21), 90));
  v_since timestamptz := now() - make_interval(days => v_days);
begin
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.published_at desc nulls last)
    from (
      select *
      from (
        select
          ('blog:' || b.id::text) as id,
          'blog_post'::text as kind,
          'Article'::text as kind_label,
          'New Post Alert'::text as badge,
          b.title as title,
          left(coalesce(nullif(trim(b.excerpt), ''), ''), 180) as description,
          case
            when nullif(trim(b.slug), '') is not null then '/blog/' || trim(b.slug)
            else '/blog/' || b.id::text
          end as link_path,
          coalesce(b.published_at, b.created_at) as published_at,
          coalesce(nullif(trim(b.image), ''), '') as image
        from public.blog_posts b
        where (
            b.published = true
            or (b.status = 'published')
            or (b.status = 'scheduled' and b.scheduled_at is not null and b.scheduled_at <= now())
          )
          and coalesce(b.published_at, b.created_at) >= v_since

        union all

        select
          ('resource:' || r.id::text) as id,
          r.kind::text as kind,
          case r.kind
            when 'sunday_sermon' then 'Sunday Sermon'
            when 'choir_ministration' then 'Choir'
            when 'bible_study' then 'Bible Study'
            when 'daily_manna' then 'Daily Manna'
            else initcap(replace(r.kind, '_', ' '))
          end as kind_label,
          'New Post Alert'::text as badge,
          r.title as title,
          left(coalesce(nullif(trim(r.excerpt), ''), ''), 180) as description,
          case r.kind
            when 'sunday_sermon' then '/blog?tab=sunday-sermon'
            when 'choir_ministration' then '/blog?tab=choir'
            when 'bible_study' then '/blog?tab=bible-study'
            when 'daily_manna' then '/blog?tab=daily-manna'
            else '/blog'
          end as link_path,
          coalesce(
            r.service_date::timestamptz,
            r.study_date::timestamptz,
            r.week_of::timestamptz,
            r.created_at
          ) as published_at,
          coalesce(nullif(trim(r.thumbnail_url), ''), '') as image
        from public.church_resources r
        where r.published = true
          and coalesce(
            r.service_date::timestamptz,
            r.study_date::timestamptz,
            r.week_of::timestamptz,
            r.created_at
          ) >= v_since
      ) u
      order by u.published_at desc nulls last
      limit v_limit
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.public_list_content_alerts(integer, integer) to anon, authenticated;
