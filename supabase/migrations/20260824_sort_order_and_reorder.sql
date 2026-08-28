-- Drag-and-drop sort order for CMS collections
-- Run in Supabase SQL editor if schema was already applied.

alter table public.events add column if not exists sort_order integer not null default 0;
alter table public.sermons add column if not exists sort_order integer not null default 0;
alter table public.testimonies add column if not exists sort_order integer not null default 0;
alter table public.ministries add column if not exists sort_order integer not null default 0;
alter table public.blog_posts add column if not exists sort_order integer not null default 0;

-- Backfill existing rows from created_at (oldest first = lower sort_order)
with ranked as (
  select id, row_number() over (order by created_at asc) - 1 as rn from public.events
)
update public.events e set sort_order = ranked.rn from ranked where e.id = ranked.id and e.sort_order = 0;

with ranked as (
  select id, row_number() over (order by created_at asc) - 1 as rn from public.sermons
)
update public.sermons s set sort_order = ranked.rn from ranked where s.id = ranked.id and s.sort_order = 0;

with ranked as (
  select id, row_number() over (order by created_at asc) - 1 as rn from public.testimonies
)
update public.testimonies t set sort_order = ranked.rn from ranked where t.id = ranked.id and t.sort_order = 0;

with ranked as (
  select id, row_number() over (order by created_at asc) - 1 as rn from public.ministries
)
update public.ministries m set sort_order = ranked.rn from ranked where m.id = ranked.id and m.sort_order = 0;

create or replace function public.admin_list_collection(p_token text, p_collection text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._require_permission(
    p_token,
    public._feature_for_collection(p_collection),
    'view'
  );

  if p_collection = 'blog' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order asc, t.created_at desc) from public.blog_posts t), '[]'::jsonb);
  elsif p_collection = 'events' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order asc, t.created_at desc) from public.events t), '[]'::jsonb);
  elsif p_collection = 'sermons' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order asc, t.created_at desc) from public.sermons t), '[]'::jsonb);
  elsif p_collection = 'testimonies' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order asc, t.created_at desc) from public.testimonies t), '[]'::jsonb);
  elsif p_collection = 'ministries' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order asc, t.created_at desc) from public.ministries t), '[]'::jsonb);
  elsif p_collection = 'hero-slides' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t."order" asc, t.created_at desc) from public.hero_slides t), '[]'::jsonb);
  elsif p_collection = 'prayer-requests' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from public.prayer_requests t), '[]'::jsonb);
  elsif p_collection = 'contact' then
    return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from public.contact_messages t), '[]'::jsonb);
  else
    raise exception 'Unknown collection';
  end if;
end;
$$;

create or replace function public.admin_reorder_collection(
  p_token text,
  p_collection text,
  p_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_i integer;
begin
  perform public._require_permission(
    p_token,
    public._feature_for_collection(p_collection),
    'edit'
  );

  if p_ids is null or array_length(p_ids, 1) is null then
    return jsonb_build_object('ok', true, 'count', 0);
  end if;

  for v_i in 1 .. array_length(p_ids, 1) loop
    if p_collection = 'events' then
      update public.events set sort_order = v_i - 1, updated_at = now() where id = p_ids[v_i];
    elsif p_collection = 'sermons' then
      update public.sermons set sort_order = v_i - 1, updated_at = now() where id = p_ids[v_i];
    elsif p_collection = 'testimonies' then
      update public.testimonies set sort_order = v_i - 1, updated_at = now() where id = p_ids[v_i];
    elsif p_collection = 'ministries' then
      update public.ministries set sort_order = v_i - 1, updated_at = now() where id = p_ids[v_i];
    elsif p_collection = 'blog' then
      update public.blog_posts set sort_order = v_i - 1, updated_at = now() where id = p_ids[v_i];
    elsif p_collection = 'hero-slides' then
      update public.hero_slides set "order" = v_i - 1, updated_at = now() where id = p_ids[v_i];
    else
      raise exception 'Reorder not supported for this collection';
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'count', array_length(p_ids, 1));
end;
$$;

grant execute on function public.admin_reorder_collection(text, text, uuid[]) to anon, authenticated;

-- Also re-apply admin_upsert_item from schema.sql if you need sort_order on create.
-- Prefer re-running the events/sermons/testimonies/ministries branches from supabase/schema.sql.
