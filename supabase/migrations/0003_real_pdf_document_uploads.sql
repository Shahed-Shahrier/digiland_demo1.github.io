-- Enable real PDF uploads for Digi-Land application documents.
-- Restrict bucket to PDF files and allow owner/staff access through storage RLS.

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf']
where id = 'digiland';

drop policy if exists "Users read own Digi-Land files or staff" on storage.objects;
drop policy if exists "Users upload own Digi-Land files" on storage.objects;
drop policy if exists "Users update own Digi-Land files or staff" on storage.objects;
drop policy if exists "Users delete own Digi-Land files or staff" on storage.objects;

create policy "Users read own Digi-Land files or staff"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'digiland'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_app_role('admin')
    or public.has_app_role('super_admin')
    or public.has_app_role('reviewer')
    or public.has_app_role('survey_officer')
  )
);

create policy "Users upload own Digi-Land files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'digiland'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users update own Digi-Land files or staff"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'digiland'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_app_role('admin')
    or public.has_app_role('super_admin')
    or public.has_app_role('reviewer')
    or public.has_app_role('survey_officer')
  )
)
with check (
  bucket_id = 'digiland'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_app_role('admin')
    or public.has_app_role('super_admin')
    or public.has_app_role('reviewer')
    or public.has_app_role('survey_officer')
  )
);

create policy "Users delete own Digi-Land files or staff"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'digiland'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_app_role('admin')
    or public.has_app_role('super_admin')
    or public.has_app_role('reviewer')
    or public.has_app_role('survey_officer')
  )
);
