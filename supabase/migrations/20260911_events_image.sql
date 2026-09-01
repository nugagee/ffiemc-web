-- Event card images for homepage / events page + admin upload

alter table public.events
  add column if not exists image text not null default '';

create or replace function public.admin_upsert_item(
  p_token text,
  p_collection text,
  p_id uuid,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_row jsonb;
  v_status text;
  v_scheduled timestamptz;
  v_published boolean;
  v_published_at timestamptz;
  v_slug text;
begin
  perform public._require_permission(
    p_token,
    public._feature_for_collection(p_collection),
    'edit'
  );
  v_id := coalesce(p_id, gen_random_uuid());

  if p_collection = 'blog' then
    if p_data ? 'status' then
      v_status := coalesce(nullif(p_data->>'status', ''), 'draft');
    else
      v_status := case when coalesce((p_data->>'published')::boolean, true) then 'published' else 'draft' end;
    end if;
    if v_status not in ('draft', 'scheduled', 'published') then
      v_status := 'draft';
    end if;
    v_scheduled := nullif(p_data->>'scheduled_at', '')::timestamptz;
    v_slug := coalesce(p_data->>'slug', '');
    if v_status = 'published' then
      v_published := true;
      v_scheduled := null;
      v_published_at := coalesce(nullif(p_data->>'published_at', '')::timestamptz, now());
    elsif v_status = 'scheduled' then
      if v_scheduled is not null and v_scheduled <= now() then
        v_status := 'published';
        v_published := true;
        v_published_at := v_scheduled;
        v_scheduled := null;
      else
        v_published := false;
        v_published_at := null;
      end if;
    else
      v_published := false;
      v_scheduled := null;
      v_published_at := null;
    end if;

    insert into public.blog_posts (
      id, title, excerpt, content, author, category, image, featured, published,
      slug, status, scheduled_at, published_at, tags, updated_at
    )
    values (
      v_id,
      coalesce(p_data->>'title', ''),
      coalesce(p_data->>'excerpt', ''),
      coalesce(p_data->>'content', ''),
      coalesce(p_data->>'author', ''),
      coalesce(p_data->>'category', 'General'),
      coalesce(p_data->>'image', ''),
      coalesce((p_data->>'featured')::boolean, false),
      v_published,
      v_slug,
      v_status,
      v_scheduled,
      v_published_at,
      coalesce(p_data->>'tags', ''),
      now()
    )
    on conflict (id) do update set
      title = excluded.title,
      excerpt = excluded.excerpt,
      content = excluded.content,
      author = excluded.author,
      category = excluded.category,
      image = excluded.image,
      featured = excluded.featured,
      published = excluded.published,
      slug = excluded.slug,
      status = excluded.status,
      scheduled_at = excluded.scheduled_at,
      published_at = excluded.published_at,
      tags = excluded.tags,
      updated_at = now()
    returning to_jsonb(public.blog_posts.*) into v_row;

  elsif p_collection = 'events' then
    insert into public.events (id, title, date, time, location, description, image, featured, sort_order, updated_at)
    values (
      v_id,
      coalesce(p_data->>'title', ''),
      coalesce(p_data->>'date', ''),
      coalesce(p_data->>'time', ''),
      coalesce(p_data->>'location', ''),
      coalesce(p_data->>'description', ''),
      coalesce(p_data->>'image', ''),
      coalesce((p_data->>'featured')::boolean, false),
      coalesce(
        (p_data->>'sort_order')::integer,
        (select coalesce(max(sort_order), -1) + 1 from public.events),
        0
      ),
      now()
    )
    on conflict (id) do update set
      title = excluded.title, date = excluded.date, time = excluded.time,
      location = excluded.location, description = excluded.description,
      image = excluded.image,
      featured = excluded.featured,
      sort_order = case when p_data ? 'sort_order' then excluded.sort_order else public.events.sort_order end,
      updated_at = now()
    returning to_jsonb(public.events.*) into v_row;

  elsif p_collection = 'sermons' then
    insert into public.sermons (id, title, pastor, date, series, scripture, description, "audioUrl", "videoUrl", sort_order, updated_at)
    values (
      v_id,
      coalesce(p_data->>'title', ''),
      coalesce(p_data->>'pastor', ''),
      coalesce(p_data->>'date', ''),
      coalesce(p_data->>'series', ''),
      coalesce(p_data->>'scripture', ''),
      coalesce(p_data->>'description', ''),
      coalesce(p_data->>'audioUrl', ''),
      coalesce(p_data->>'videoUrl', ''),
      coalesce(
        (p_data->>'sort_order')::integer,
        (select coalesce(max(sort_order), -1) + 1 from public.sermons),
        0
      ),
      now()
    )
    on conflict (id) do update set
      title = excluded.title, pastor = excluded.pastor, date = excluded.date,
      series = excluded.series, scripture = excluded.scripture,
      description = excluded.description, "audioUrl" = excluded."audioUrl",
      "videoUrl" = excluded."videoUrl",
      sort_order = case when p_data ? 'sort_order' then excluded.sort_order else public.sermons.sort_order end,
      updated_at = now()
    returning to_jsonb(public.sermons.*) into v_row;

  elsif p_collection = 'testimonies' then
    insert into public.testimonies (
      id, name, role, testimony, image, "dateJoined", featured, sort_order,
      status, email, phone, title, admin_notes, source, published_at, updated_at
    )
    values (
      v_id,
      coalesce(p_data->>'name', ''),
      coalesce(p_data->>'role', ''),
      coalesce(p_data->>'testimony', ''),
      coalesce(p_data->>'image', ''),
      coalesce(p_data->>'dateJoined', ''),
      coalesce((p_data->>'featured')::boolean, false),
      coalesce(
        (p_data->>'sort_order')::integer,
        (select coalesce(max(sort_order), -1) + 1 from public.testimonies),
        0
      ),
      coalesce(nullif(p_data->>'status', ''), 'published'),
      coalesce(p_data->>'email', ''),
      coalesce(p_data->>'phone', ''),
      coalesce(p_data->>'title', ''),
      coalesce(p_data->>'admin_notes', ''),
      coalesce(nullif(p_data->>'source', ''), 'admin'),
      case when coalesce(nullif(p_data->>'status', ''), 'published') = 'published' then now() else null end,
      now()
    )
    on conflict (id) do update set
      name = excluded.name, role = excluded.role, testimony = excluded.testimony,
      image = excluded.image, "dateJoined" = excluded."dateJoined",
      featured = excluded.featured,
      email = excluded.email, phone = excluded.phone, title = excluded.title,
      admin_notes = excluded.admin_notes,
      status = case when p_data ? 'status' then excluded.status else public.testimonies.status end,
      sort_order = case when p_data ? 'sort_order' then excluded.sort_order else public.testimonies.sort_order end,
      published_at = case
        when p_data ? 'status' and excluded.status = 'published'
          then coalesce(public.testimonies.published_at, now())
        when p_data ? 'status' and excluded.status <> 'published' then null
        else public.testimonies.published_at
      end,
      updated_at = now()
    returning to_jsonb(public.testimonies.*) into v_row;

  elsif p_collection = 'ministries' then
    insert into public.ministries (id, name, description, leader, "meetingTime", image, sort_order, updated_at)
    values (
      v_id,
      coalesce(p_data->>'name', ''),
      coalesce(p_data->>'description', ''),
      coalesce(p_data->>'leader', ''),
      coalesce(p_data->>'meetingTime', ''),
      coalesce(p_data->>'image', ''),
      coalesce(
        (p_data->>'sort_order')::integer,
        (select coalesce(max(sort_order), -1) + 1 from public.ministries),
        0
      ),
      now()
    )
    on conflict (id) do update set
      name = excluded.name, description = excluded.description, leader = excluded.leader,
      "meetingTime" = excluded."meetingTime", image = excluded.image,
      sort_order = case when p_data ? 'sort_order' then excluded.sort_order else public.ministries.sort_order end,
      updated_at = now()
    returning to_jsonb(public.ministries.*) into v_row;

  elsif p_collection = 'hero-slides' then
    insert into public.hero_slides (id, title, subtitle, description, "backgroundImage", "ctaText", "ctaLink", "order", updated_at)
    values (
      v_id,
      coalesce(p_data->>'title', ''),
      coalesce(p_data->>'subtitle', ''),
      coalesce(p_data->>'description', ''),
      coalesce(p_data->>'backgroundImage', ''),
      coalesce(p_data->>'ctaText', 'Learn More'),
      coalesce(p_data->>'ctaLink', '/about'),
      coalesce(
        (p_data->>'order')::integer,
        (select coalesce(max("order"), -1) + 1 from public.hero_slides),
        0
      ),
      now()
    )
    on conflict (id) do update set
      title = excluded.title, subtitle = excluded.subtitle, description = excluded.description,
      "backgroundImage" = excluded."backgroundImage", "ctaText" = excluded."ctaText",
      "ctaLink" = excluded."ctaLink",
      "order" = case when p_data ? 'order' then excluded."order" else public.hero_slides."order" end,
      updated_at = now()
    returning to_jsonb(public.hero_slides.*) into v_row;

  else
    raise exception 'Unknown collection';
  end if;

  return v_row;
end;
$$;
