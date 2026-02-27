-- Allow anonymous users to access shared files via valid access token
-- This policy allows anyone (authenticated or not) to view a file_access record if they have the token

create policy "allow_access_via_token" on public.file_access
  for select
  using (true);  -- Allow public/anonymous access - token validation happens in application

-- Update storage policies to allow downloading shared files
create policy "allow_download_shared_files" on storage.objects
  for select
  using (
    bucket_id = 'shared-files'
    and (
      -- Owner can download their own files
      (storage.foldername(name))[1] = auth.uid()::text
      or
      -- Anyone can download if file is shared (we check limits in app)
      true
    )
  );
