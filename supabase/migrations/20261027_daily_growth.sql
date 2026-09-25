-- Daily Growth: content pool (traits, prophecies, facts, riddles) + settings + runs + RPCs

create table if not exists public.daily_growth_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('trait', 'prophecy', 'fact', 'riddle')),
  title text not null default '',
  body text not null default '',
  scripture_ref text not null default '',
  answer text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'published', 'archived')),
  published_on date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_growth_items_status_cat_idx
  on public.daily_growth_items (status, category, created_at);
create index if not exists daily_growth_items_published_on_idx
  on public.daily_growth_items (published_on desc nulls last);

alter table public.daily_growth_items enable row level security;

drop policy if exists "public_read_published_daily_growth" on public.daily_growth_items;
create policy "public_read_published_daily_growth"
  on public.daily_growth_items for select
  using (status = 'published');

grant select on public.daily_growth_items to anon, authenticated;

create table if not exists public.daily_growth_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default true,
  email_enabled boolean not null default true,
  categories_enabled jsonb not null default '["trait","prophecy","fact","riddle"]'::jsonb,
  cron_hour integer not null default 6 check (cron_hour >= 0 and cron_hour <= 23),
  email_subject_template text not null default 'FFIEMC Daily Growth — {{date}}',
  last_run_at timestamptz,
  last_run_status text not null default '',
  last_run_message text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.daily_growth_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.daily_growth_settings enable row level security;

create table if not exists public.daily_growth_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  items jsonb not null default '[]'::jsonb,
  emails_sent integer not null default 0,
  emails_failed integer not null default 0,
  status text not null default 'ok',
  error text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists daily_growth_runs_run_date_uidx
  on public.daily_growth_runs (run_date);

alter table public.daily_growth_runs enable row level security;

-- Lagos "today"
create or replace function public._daily_growth_today()
returns date
language sql
stable
as $$
  select (timezone('Africa/Lagos', now()))::date;
$$;

create or replace function public.public_list_daily_growth(p_category text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat text := nullif(lower(trim(coalesce(p_category, ''))), '');
begin
  if v_cat is not null and v_cat not in ('trait', 'prophecy', 'fact', 'riddle') then
    raise exception 'Invalid category';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(i) order by i.published_on desc nulls last, i.created_at desc)
    from public.daily_growth_items i
    where i.status = 'published'
      and (v_cat is null or i.category = v_cat)
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.public_list_daily_growth(text) to anon, authenticated;

create or replace function public.admin_list_daily_growth(
  p_token text,
  p_category text default null,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat text := nullif(lower(trim(coalesce(p_category, ''))), '');
  v_status text := nullif(lower(trim(coalesce(p_status, ''))), '');
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  if v_cat is not null and v_cat not in ('trait', 'prophecy', 'fact', 'riddle') then
    raise exception 'Invalid category';
  end if;
  if v_status is not null and v_status not in ('draft', 'queued', 'published', 'archived') then
    raise exception 'Invalid status';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(i) order by
      case i.status when 'queued' then 0 when 'draft' then 1 when 'published' then 2 else 3 end,
      i.created_at desc)
    from public.daily_growth_items i
    where (v_cat is null or i.category = v_cat)
      and (v_status is null or i.status = v_status)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_daily_growth(p_token text, p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_cat text;
  v_status text;
  v_row jsonb;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  v_id := coalesce(p_id, gen_random_uuid());
  v_cat := lower(coalesce(nullif(trim(p_data->>'category'), ''), 'fact'));
  if v_cat not in ('trait', 'prophecy', 'fact', 'riddle') then
    raise exception 'Invalid category';
  end if;
  v_status := lower(coalesce(nullif(trim(p_data->>'status'), ''), 'draft'));
  if v_status not in ('draft', 'queued', 'published', 'archived') then
    raise exception 'Invalid status';
  end if;

  insert into public.daily_growth_items (
    id, category, title, body, scripture_ref, answer, status, published_on, sort_order, updated_at
  )
  values (
    v_id,
    v_cat,
    coalesce(p_data->>'title', ''),
    coalesce(p_data->>'body', ''),
    coalesce(p_data->>'scripture_ref', ''),
    coalesce(p_data->>'answer', ''),
    v_status,
    case
      when v_status = 'published' then coalesce(nullif(p_data->>'published_on', '')::date, public._daily_growth_today())
      else nullif(p_data->>'published_on', '')::date
    end,
    coalesce((p_data->>'sort_order')::integer, 0),
    now()
  )
  on conflict (id) do update set
    category = excluded.category,
    title = excluded.title,
    body = excluded.body,
    scripture_ref = excluded.scripture_ref,
    answer = excluded.answer,
    status = excluded.status,
    published_on = excluded.published_on,
    sort_order = excluded.sort_order,
    updated_at = now()
  returning to_jsonb(public.daily_growth_items.*) into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_delete_daily_growth(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'blog.posts', 'delete');
  delete from public.daily_growth_items where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_get_daily_growth_settings(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  return coalesce((select to_jsonb(s) from public.daily_growth_settings s where s.id = 1), '{}'::jsonb);
end;
$$;

create or replace function public.admin_update_daily_growth_settings(p_token text, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_cats jsonb;
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  v_cats := coalesce(p_data->'categories_enabled', null);

  update public.daily_growth_settings s
  set
    enabled = coalesce((p_data->>'enabled')::boolean, s.enabled),
    email_enabled = coalesce((p_data->>'email_enabled')::boolean, s.email_enabled),
    categories_enabled = coalesce(v_cats, s.categories_enabled),
    cron_hour = coalesce((p_data->>'cron_hour')::integer, s.cron_hour),
    email_subject_template = coalesce(nullif(p_data->>'email_subject_template', ''), s.email_subject_template),
    updated_at = now()
  where s.id = 1
  returning to_jsonb(s.*) into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_list_daily_growth_runs(p_token text, p_limit integer default 14)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 14), 60));
begin
  perform public._require_permission(p_token, 'blog.posts', 'edit');
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.run_date desc)
    from (
      select * from public.daily_growth_runs order by run_date desc limit v_limit
    ) r
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_list_daily_growth(text, text, text) to anon, authenticated;
grant execute on function public.admin_upsert_daily_growth(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_daily_growth(text, uuid) to anon, authenticated;
grant execute on function public.admin_get_daily_growth_settings(text) to anon, authenticated;
grant execute on function public.admin_update_daily_growth_settings(text, jsonb) to anon, authenticated;
grant execute on function public.admin_list_daily_growth_runs(text, integer) to anon, authenticated;

-- Spool: one queued item per enabled category for Lagos today
create or replace function public.spool_daily_growth(p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.daily_growth_settings%rowtype;
  v_today date := public._daily_growth_today();
  v_cat text;
  v_item public.daily_growth_items%rowtype;
  v_existing_json jsonb;
  v_picked jsonb := '[]'::jsonb;
  v_existing uuid;
  v_run_id uuid;
  v_cats text[];
begin
  select * into v_settings from public.daily_growth_settings where id = 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Settings missing');
  end if;

  if not v_settings.enabled and not p_force then
    update public.daily_growth_settings
    set last_run_at = now(), last_run_status = 'skipped', last_run_message = 'Spool disabled', updated_at = now()
    where id = 1;
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'disabled', 'run_date', v_today);
  end if;

  select id into v_existing from public.daily_growth_runs where run_date = v_today;
  if found and not p_force then
    return jsonb_build_object(
      'ok', true,
      'skipped', true,
      'reason', 'already_ran',
      'run_date', v_today,
      'run_id', v_existing,
      'email_enabled', v_settings.email_enabled
    );
  end if;

  select coalesce(
    array(select jsonb_array_elements_text(v_settings.categories_enabled)),
    array['trait','prophecy','fact','riddle']
  ) into v_cats;

  foreach v_cat in array v_cats
  loop
    if v_cat not in ('trait', 'prophecy', 'fact', 'riddle') then
      continue;
    end if;

    -- On force re-run, skip categories that already have a published item today
    if exists (
      select 1 from public.daily_growth_items
      where status = 'published' and category = v_cat and published_on = v_today
    ) and not p_force then
      continue;
    end if;

    if exists (
      select 1 from public.daily_growth_items
      where status = 'published' and category = v_cat and published_on = v_today
    ) and p_force then
      -- keep existing picks for today; do not double-publish
      select to_jsonb(i) into v_existing_json
      from public.daily_growth_items i
      where i.status = 'published' and i.category = v_cat and i.published_on = v_today
      order by i.updated_at desc
      limit 1;
      if v_existing_json is not null then
        v_picked := v_picked || jsonb_build_array(v_existing_json);
      end if;
      continue;
    end if;

    select * into v_item
    from public.daily_growth_items
    where status = 'queued' and category = v_cat
    order by sort_order asc, created_at asc
    limit 1
    for update skip locked;

    if not found then
      continue;
    end if;

    update public.daily_growth_items
    set status = 'published', published_on = v_today, updated_at = now()
    where id = v_item.id
    returning * into v_item;

    v_picked := v_picked || jsonb_build_array(to_jsonb(v_item));
  end loop;

  insert into public.daily_growth_runs (run_date, items, status, error)
  values (
    v_today,
    v_picked,
    case when jsonb_array_length(v_picked) > 0 then 'ok' else 'empty' end,
    case when jsonb_array_length(v_picked) > 0 then '' else 'No queued items for enabled categories' end
  )
  on conflict (run_date) do update set
    items = excluded.items,
    status = excluded.status,
    error = excluded.error
  returning id into v_run_id;

  update public.daily_growth_settings
  set
    last_run_at = now(),
    last_run_status = case when jsonb_array_length(v_picked) > 0 then 'ok' else 'empty' end,
    last_run_message = format('Published %s item(s) for %s', jsonb_array_length(v_picked), v_today),
    updated_at = now()
  where id = 1;

  return jsonb_build_object(
    'ok', true,
    'run_date', v_today,
    'run_id', v_run_id,
    'items', v_picked,
    'count', jsonb_array_length(v_picked),
    'email_enabled', v_settings.email_enabled,
    'subject_template', v_settings.email_subject_template
  );
end;
$$;

create or replace function public.list_daily_growth_digest_recipients()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id,
      'email', m.email,
      'full_name', coalesce(nullif(trim(m.full_name), ''), 'Beloved')
    ) order by lower(m.email))
    from public.church_members m
    where m.status in ('approved', 'active')
      and nullif(trim(m.email), '') is not null
      and position('@' in m.email) > 1
  ), '[]'::jsonb);
end;
$$;

create or replace function public.update_daily_growth_run_email_stats(
  p_run_id uuid,
  p_sent integer,
  p_failed integer,
  p_status text default null,
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
begin
  update public.daily_growth_runs r
  set
    emails_sent = coalesce(p_sent, emails_sent),
    emails_failed = coalesce(p_failed, emails_failed),
    status = coalesce(nullif(trim(p_status), ''), status),
    error = coalesce(p_error, error)
  where r.id = p_run_id
  returning to_jsonb(r.*) into v_row;

  update public.daily_growth_settings
  set
    last_run_message = format('Emails sent %s, failed %s', coalesce(p_sent, 0), coalesce(p_failed, 0)),
    updated_at = now()
  where id = 1;

  return coalesce(v_row, '{}'::jsonb);
end;
$$;

create or replace function public.list_daily_growth_published_on(p_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := coalesce(p_date, public._daily_growth_today());
begin
  return coalesce((
    select jsonb_agg(to_jsonb(i) order by
      case i.category when 'trait' then 1 when 'prophecy' then 2 when 'fact' then 3 else 4 end)
    from public.daily_growth_items i
    where i.status = 'published' and i.published_on = v_day
  ), '[]'::jsonb);
end;
$$;

-- Restrict spool / recipient helpers (edge uses service role)
revoke all on function public.spool_daily_growth(boolean) from public;
revoke all on function public.list_daily_growth_digest_recipients() from public;
revoke all on function public.update_daily_growth_run_email_stats(uuid, integer, integer, text, text) from public;
revoke all on function public.list_daily_growth_published_on(date) from public;
grant execute on function public.spool_daily_growth(boolean) to service_role;
grant execute on function public.list_daily_growth_digest_recipients() to service_role;
grant execute on function public.update_daily_growth_run_email_stats(uuid, integer, integer, text, text) to service_role;
grant execute on function public.list_daily_growth_published_on(date) to service_role;
-- Also allow authenticated for list published_on used by public if needed — public uses public_list instead

-- Content alerts: include Daily Growth
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

        union all

        select
          ('growth:' || g.id::text) as id,
          'daily_growth'::text as kind,
          case g.category
            when 'trait' then 'Character Trait'
            when 'prophecy' then 'Prophecy'
            when 'fact' then 'Bible Fact'
            when 'riddle' then 'Bible Riddle'
            else 'Daily Growth'
          end as kind_label,
          'New Post Alert'::text as badge,
          g.title as title,
          left(regexp_replace(coalesce(g.body, ''), '<[^>]+>', '', 'g'), 180) as description,
          '/blog?tab=daily-growth'::text as link_path,
          coalesce(g.published_on::timestamptz, g.updated_at, g.created_at) as published_at,
          ''::text as image
        from public.daily_growth_items g
        where g.status = 'published'
          and coalesce(g.published_on::timestamptz, g.updated_at, g.created_at) >= v_since
      ) u
      order by u.published_at desc nulls last
      limit v_limit
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.public_list_content_alerts(integer, integer) to anon, authenticated;

-- Seed sample queued items (2+ per category)
insert into public.daily_growth_items (category, title, body, scripture_ref, answer, status, sort_order)
select * from (values
  ('trait'::text, 'Humility', '<p>True greatness in God''s kingdom begins with a humble heart that puts others first.</p>', 'Philippians 2:3–5', '', 'queued', 1),
  ('trait', 'Patience', '<p>Patience is faith waiting — trusting God''s timing when answers feel delayed.</p>', 'James 1:2–4', '', 'queued', 2),
  ('trait', 'Kindness', '<p>Kindness is love in action: a soft word, a helping hand, an open heart.</p>', 'Ephesians 4:32', '', 'queued', 3),
  ('prophecy', 'The virgin birth', '<p>Isaiah foretold a virgin would bear a son called Immanuel — God with us — fulfilled in Jesus.</p>', 'Isaiah 7:14; Matthew 1:22–23', '', 'queued', 1),
  ('prophecy', 'Born in Bethlehem', '<p>Micah named Bethlehem as the birthplace of the eternal ruler — centuries before Christ''s birth.</p>', 'Micah 5:2; Matthew 2:1–6', '', 'queued', 2),
  ('prophecy', 'A suffering Servant', '<p>Isaiah 53 describes the Servant who would be pierced for our transgressions — pointing to the cross.</p>', 'Isaiah 53:5', '', 'queued', 3),
  ('fact', 'Shortest verse', '<p>The shortest verse in many English Bibles is simply: “Jesus wept.”</p>', 'John 11:35', '', 'queued', 1),
  ('fact', 'Two of every kind?', '<p>Noah took two of most animals — but seven pairs of clean animals for sacrifice and food.</p>', 'Genesis 7:2–3', '', 'queued', 2),
  ('fact', 'Longest chapter', '<p>Psalm 119 is the longest chapter in the Bible, celebrating God''s Word from A to Z.</p>', 'Psalm 119', '', 'queued', 3),
  ('riddle', 'What fell but never broke?', '<p>It fell from heaven, fed a nation, and melted when the sun grew hot. What was it?</p>', 'Exodus 16', 'Manna', 'queued', 1),
  ('riddle', 'Stronger than a lion?', '<p>Out of the eater came something to eat; out of the strong came something sweet. Who spoke this riddle?</p>', 'Judges 14:14', 'Samson', 'queued', 2),
  ('riddle', 'A bush that burned', '<p>What burned with fire yet was not consumed — and from it God called a deliverer?</p>', 'Exodus 3:2–4', 'The burning bush (and Moses)', 'queued', 3)
) as s(category, title, body, scripture_ref, answer, status, sort_order)
where not exists (select 1 from public.daily_growth_items limit 1);
