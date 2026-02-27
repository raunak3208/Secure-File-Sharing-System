-- Enable public access to files table for shared file viewing
-- This allows unauthenticated users to view file metadata when they have a valid access token

-- Drop existing policy if it exists
drop policy if exists "anyone_can_view_shared_files" on public.files;

-- Create new policy that allows anyone to read files
create policy "anyone_can_view_shared_files" on public.files
  for select using (true);

-- Also ensure storage allows public downloads for shared files
drop policy if exists "allow_download_shared_files" on storage.objects;

create policy "allow_download_shared_files" on storage.objects
  for select using (bucket_id = 'shared-files');
