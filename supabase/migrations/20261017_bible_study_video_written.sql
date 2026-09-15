-- Monday Bible Study: video vs written categories

alter table public.church_resources
  add column if not exists content_format text not null default 'written';

alter table public.church_resources
  drop constraint if exists church_resources_content_format_check;

alter table public.church_resources
  add constraint church_resources_content_format_check
  check (content_format in ('video', 'written'));

-- Backfill: media kinds → video; bible study with media links → video; rest → written
update public.church_resources
set content_format = case
  when kind in ('sunday_sermon', 'choir_ministration') then 'video'
  when kind = 'bible_study'
    and (
      nullif(trim(youtube_url), '') is not null
      or nullif(trim(facebook_url), '') is not null
      or nullif(trim(audiomack_url), '') is not null
    ) then 'video'
  else 'written'
end;

create index if not exists church_resources_kind_format_idx
  on public.church_resources (kind, content_format, published);

create or replace function public.public_list_church_resources(p_kind text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := lower(nullif(trim(p_kind), ''));
begin
  if v_kind is not null and v_kind not in ('bible_study', 'daily_manna', 'sunday_sermon', 'choir_ministration') then
    raise exception 'Invalid resource kind';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by
      coalesce(r.service_date, r.study_date, r.week_of) desc nulls last,
      r.sort_order asc,
      r.created_at desc)
    from public.church_resources r
    where r.published = true
      and (v_kind is null or r.kind = v_kind)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_list_church_resources(p_token text, p_kind text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := lower(nullif(trim(p_kind), ''));
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  if v_kind is not null and v_kind not in ('bible_study', 'daily_manna', 'sunday_sermon', 'choir_ministration') then
    raise exception 'Invalid resource kind';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by
      coalesce(r.service_date, r.study_date, r.week_of) desc nulls last,
      r.sort_order asc,
      r.created_at desc)
    from public.church_resources r
    where v_kind is null or r.kind = v_kind
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_church_resource(p_token text, p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_kind text;
  v_format text;
  v_row jsonb;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  v_id := coalesce(p_id, gen_random_uuid());
  v_kind := lower(coalesce(nullif(p_data->>'kind', ''), 'bible_study'));
  if v_kind not in ('bible_study', 'daily_manna', 'sunday_sermon', 'choir_ministration') then
    raise exception 'Invalid resource kind';
  end if;

  v_format := lower(coalesce(nullif(trim(p_data->>'content_format'), ''), ''));
  if v_kind in ('sunday_sermon', 'choir_ministration') then
    v_format := 'video';
  elsif v_kind = 'daily_manna' then
    v_format := 'written';
  elsif v_format not in ('video', 'written') then
    -- Infer for bible_study when format omitted
    if nullif(trim(coalesce(p_data->>'youtube_url', '')), '') is not null
      or nullif(trim(coalesce(p_data->>'facebook_url', '')), '') is not null
      or nullif(trim(coalesce(p_data->>'audiomack_url', '')), '') is not null
    then
      v_format := 'video';
    else
      v_format := 'written';
    end if;
  end if;

  insert into public.church_resources (
    id, kind, content_format, title, slug, excerpt, content, week_of, study_date, service_date,
    attachment_url, youtube_url, facebook_url, audiomack_url, thumbnail_url,
    published, sort_order, updated_at
  )
  values (
    v_id,
    v_kind,
    v_format,
    coalesce(p_data->>'title', ''),
    coalesce(p_data->>'slug', ''),
    coalesce(p_data->>'excerpt', ''),
    coalesce(p_data->>'content', ''),
    nullif(p_data->>'week_of', '')::date,
    nullif(p_data->>'study_date', '')::date,
    nullif(p_data->>'service_date', '')::date,
    coalesce(p_data->>'attachment_url', ''),
    coalesce(p_data->>'youtube_url', ''),
    coalesce(p_data->>'facebook_url', ''),
    coalesce(p_data->>'audiomack_url', ''),
    coalesce(p_data->>'thumbnail_url', ''),
    coalesce((p_data->>'published')::boolean, true),
    coalesce((p_data->>'sort_order')::integer, 0),
    now()
  )
  on conflict (id) do update set
    kind = excluded.kind,
    content_format = excluded.content_format,
    title = excluded.title,
    slug = excluded.slug,
    excerpt = excluded.excerpt,
    content = excluded.content,
    week_of = excluded.week_of,
    study_date = excluded.study_date,
    service_date = excluded.service_date,
    attachment_url = excluded.attachment_url,
    youtube_url = excluded.youtube_url,
    facebook_url = excluded.facebook_url,
    audiomack_url = excluded.audiomack_url,
    thumbnail_url = excluded.thumbnail_url,
    published = excluded.published,
    sort_order = excluded.sort_order,
    updated_at = now()
  returning to_jsonb(public.church_resources.*) into v_row;

  return v_row;
end;
$$;

-- Alerts: bible study videos deep-link to Monday Videos category
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
          case
            when r.kind = 'sunday_sermon' then 'Sunday Sermon'
            when r.kind = 'choir_ministration' then 'Choir'
            when r.kind = 'bible_study' and r.content_format = 'video' then 'Bible Study Video'
            when r.kind = 'bible_study' then 'Bible Study'
            when r.kind = 'daily_manna' then 'Daily Manna'
            else initcap(replace(r.kind, '_', ' '))
          end as kind_label,
          'New Post Alert'::text as badge,
          r.title as title,
          left(coalesce(nullif(trim(r.excerpt), ''), ''), 180) as description,
          case
            when r.kind = 'sunday_sermon' then '/sermons?tab=sunday-sermon'
            when r.kind = 'choir_ministration' then '/sermons?tab=choir'
            when r.kind = 'bible_study' and r.content_format = 'video' then '/sermons?tab=bible-study&cat=video'
            when r.kind = 'bible_study' then '/sermons?tab=bible-study&cat=written'
            when r.kind = 'daily_manna' then '/blog?tab=daily-manna'
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

grant execute on function public.public_list_church_resources(text) to anon, authenticated;
grant execute on function public.admin_list_church_resources(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_church_resource(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.public_list_content_alerts(integer, integer) to anon, authenticated;
