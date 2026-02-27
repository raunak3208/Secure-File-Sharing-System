-- Add view_count column to file_access table to track how many times each shared file has been viewed
alter table public.file_access 
add column if not exists view_count integer default 0;

-- Create an index for better query performance
create index if not exists idx_file_access_view_count on public.file_access(view_count);
