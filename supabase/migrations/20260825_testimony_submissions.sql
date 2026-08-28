-- Testimony submissions: moderation status, contact details, publish notify flags

alter table public.testimonies
  add column if not exists status text not null default 'published',
  add column if not exists email text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists title text not null default '',
  add column if not exists admin_notes text not null default '',
  add column if not exists consent_public boolean not null default true,
  add column if not exists source text not null default 'admin',
  add column if not exists confirmation_sent boolean not null default false,
  add column if not exists publish_notify_sent boolean not null default false,
  add column if not exists reviewed_at timestamptz,
  add column if not exists published_at timestamptz;

update public.testimonies
set status = 'published'
where status is null
   or trim(status) = ''
   or status not in ('pending', 'approved', 'published', 'rejected');

update public.testimonies
set published_at = coalesce(published_at, created_at)
where status = 'published' and published_at is null;

alter table public.testimonies drop constraint if exists testimonies_status_check;
alter table public.testimonies
  add constraint testimonies_status_check
  check (status in ('pending', 'approved', 'published', 'rejected'));

create index if not exists testimonies_status_idx on public.testimonies (status);
create index if not exists testimonies_featured_idx on public.testimonies (featured)
  where status = 'published';

-- Public may only read published testimonies
drop policy if exists "public_read_testimonies" on public.testimonies;
create policy "public_read_testimonies" on public.testimonies
  for select to anon, authenticated
  using (status = 'published');

-- Public form submission
create or replace function public.submit_testimony(
  p_name text,
  p_email text,
  p_phone text default '',
  p_role text default '',
  p_date_joined text default '',
  p_title text default '',
  p_testimony text default '',
  p_consent_public boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if length(trim(p_name)) < 2 then
    raise exception 'Please enter your name';
  end if;
  if length(trim(p_email)) < 5 or position('@' in p_email) = 0 then
    raise exception 'Please enter a valid email';
  end if;
  if length(trim(p_testimony)) < 20 then
    raise exception 'Please share a bit more of your testimony (at least 20 characters)';
  end if;
  if not coalesce(p_consent_public, false) then
    raise exception 'Please confirm you consent to share your testimony';
  end if;

  insert into public.testimonies (
    name, email, phone, role, "dateJoined", title, testimony,
    status, source, consent_public, featured, sort_order
  )
  values (
    trim(p_name),
    trim(p_email),
    coalesce(trim(p_phone), ''),
    coalesce(nullif(trim(p_role), ''), 'Church Member'),
    coalesce(trim(p_date_joined), ''),
    coalesce(trim(p_title), ''),
    trim(p_testimony),
    'pending',
    'form',
    true,
    false,
    (select coalesce(max(sort_order), -1) + 1 from public.testimonies)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_testimony(text, text, text, text, text, text, text, boolean) to anon, authenticated;

create or replace function public.mark_testimony_confirmation_sent(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.testimonies
  set confirmation_sent = true, updated_at = now()
  where id = p_id;
end;
$$;

grant execute on function public.mark_testimony_confirmation_sent(uuid) to anon, authenticated;

-- Admin review / publish / reject / save edits
create or replace function public.admin_review_testimony(
  p_token text,
  p_id uuid,
  p_action text,
  p_data jsonb default '{}'::jsonb,
  p_notify_user boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.testimonies%rowtype;
  v_action text := lower(trim(coalesce(p_action, '')));
begin
  perform public._require_permission(p_token, 'testimonies.list', 'edit');

  select * into v_row from public.testimonies where id = p_id;
  if not found then
    raise exception 'Testimony not found';
  end if;

  if p_data is not null and p_data <> '{}'::jsonb then
    update public.testimonies set
      name = coalesce(nullif(p_data->>'name', ''), name),
      role = coalesce(p_data->>'role', role),
      testimony = coalesce(nullif(p_data->>'testimony', ''), testimony),
      image = coalesce(p_data->>'image', image),
      "dateJoined" = coalesce(p_data->>'dateJoined', "dateJoined"),
      title = coalesce(p_data->>'title', title),
      email = coalesce(p_data->>'email', email),
      phone = coalesce(p_data->>'phone', phone),
      admin_notes = coalesce(p_data->>'admin_notes', admin_notes),
      featured = case
        when p_data ? 'featured' then coalesce((p_data->>'featured')::boolean, false)
        else featured
      end,
      updated_at = now()
    where id = p_id
    returning * into v_row;
  end if;

  if v_action = 'save' then
    return to_jsonb(v_row);
  elsif v_action = 'reject' then
    update public.testimonies set
      status = 'rejected',
      reviewed_at = now(),
      updated_at = now()
    where id = p_id
    returning * into v_row;
    return to_jsonb(v_row);
  elsif v_action in ('publish', 'approve') then
    update public.testimonies set
      status = 'published',
      featured = case
        when p_data ? 'featured' then coalesce((p_data->>'featured')::boolean, featured)
        else featured
      end,
      reviewed_at = coalesce(reviewed_at, now()),
      published_at = coalesce(published_at, now()),
      publish_notify_sent = case
        when coalesce(p_notify_user, false) then true
        else publish_notify_sent
      end,
      updated_at = now()
    where id = p_id
    returning * into v_row;
    return to_jsonb(v_row) || jsonb_build_object('notify_user', coalesce(p_notify_user, false));
  elsif v_action = 'unpublish' then
    update public.testimonies set
      status = 'pending',
      published_at = null,
      updated_at = now()
    where id = p_id
    returning * into v_row;
    return to_jsonb(v_row);
  else
    raise exception 'Unknown action. Use save, publish, reject, or unpublish';
  end if;
end;
$$;

grant execute on function public.admin_review_testimony(text, uuid, text, jsonb, boolean) to anon, authenticated;

-- Extend admin upsert for testimony contact/status fields (keeps rest of function identical)
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
  v_t_status text;
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
    insert into public.events (id, title, date, time, location, description, featured, sort_order, updated_at)
    values (
      v_id,
      coalesce(p_data->>'title', ''),
      coalesce(p_data->>'date', ''),
      coalesce(p_data->>'time', ''),
      coalesce(p_data->>'location', ''),
      coalesce(p_data->>'description', ''),
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
    v_t_status := coalesce(nullif(p_data->>'status', ''), 'published');
    if v_t_status not in ('pending', 'approved', 'published', 'rejected') then
      v_t_status := 'published';
    end if;

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
      v_t_status,
      coalesce(p_data->>'email', ''),
      coalesce(p_data->>'phone', ''),
      coalesce(p_data->>'title', ''),
      coalesce(p_data->>'admin_notes', ''),
      coalesce(nullif(p_data->>'source', ''), 'admin'),
      case when v_t_status = 'published' then now() else null end,
      now()
    )
    on conflict (id) do update set
      name = excluded.name, role = excluded.role, testimony = excluded.testimony,
      image = excluded.image, "dateJoined" = excluded."dateJoined",
      featured = excluded.featured,
      email = excluded.email,
      phone = excluded.phone,
      title = excluded.title,
      admin_notes = excluded.admin_notes,
      status = case when p_data ? 'status' then excluded.status else public.testimonies.status end,
      sort_order = case when p_data ? 'sort_order' then excluded.sort_order else public.testimonies.sort_order end,
      published_at = case
        when p_data ? 'status' and excluded.status = 'published'
          then coalesce(public.testimonies.published_at, now())
        when p_data ? 'status' and excluded.status <> 'published'
          then null
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
