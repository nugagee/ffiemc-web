-- Allow PDF (and common document) uploads in the public media bucket for Bible Study attachments.

update storage.buckets
set
  file_size_limit = greatest(coalesce(file_size_limit, 0), 26214400), -- 25MB
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/html'
  ]
where id = 'media';

-- Ensure insert/read policies exist for media (idempotent)
do $$
begin
  drop policy if exists "media_public_read" on storage.objects;
  create policy "media_public_read"
    on storage.objects for select
    using (bucket_id = 'media');

  drop policy if exists "media_public_insert" on storage.objects;
  create policy "media_public_insert"
    on storage.objects for insert
    with check (bucket_id = 'media');

  drop policy if exists "media_public_update" on storage.objects;
  create policy "media_public_update"
    on storage.objects for update
    using (bucket_id = 'media')
    with check (bucket_id = 'media');
exception when others then
  raise notice 'Could not refresh media storage policies: %', SQLERRM;
end $$;
