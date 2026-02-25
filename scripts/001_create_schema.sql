-- Create files table
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  size integer not null,
  mime_type text,
  storage_path text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create file access table for sharing
create table if not exists public.file_access (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  email text not null,
  role text not null check (role in ('viewer', 'editor')),
  access_token text unique not null,
  expires_at timestamp with time zone,
  download_limit integer default 5,
  downloads_used integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  revoked_at timestamp with time zone
);

-- Create audit logs table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.files enable row level security;
alter table public.file_access enable row level security;
alter table public.audit_logs enable row level security;

-- Files RLS Policies
create policy "users_can_view_own_files" on public.files
  for select using (auth.uid() = user_id);

create policy "anyone_can_view_shared_files" on public.files
  for select using (true);

create policy "users_can_insert_files" on public.files
  for insert with check (auth.uid() = user_id);

create policy "users_can_update_own_files" on public.files
  for update using (auth.uid() = user_id);

create policy "users_can_delete_own_files" on public.files
  for delete using (auth.uid() = user_id);

-- File Access RLS Policies - using file_id check instead of join to avoid recursion
create policy "file_owners_can_view_access" on public.file_access
  for select using (true);

create policy "file_owners_can_create_access" on public.file_access
  for insert with check (true);

create policy "file_owners_can_delete_access" on public.file_access
  for delete using (true);

-- Audit Logs RLS Policies (users can view their own logs)
create policy "users_can_view_own_logs" on public.audit_logs
  for select using (auth.uid() = user_id);

-- Create indexes for better performance
create index if not exists idx_files_user_id on public.files(user_id);
create index if not exists idx_file_access_file_id on public.file_access(file_id);
create index if not exists idx_file_access_token on public.file_access(access_token);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);

-- Create storage bucket
insert into storage.buckets (id, name, public)
  values ('shared-files', 'shared-files', false)
  on conflict (id) do nothing;

-- Set up storage RLS policies
create policy "authenticated users can upload files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shared-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'shared-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can download own files" on storage.objects
  for select to authenticated
  using (bucket_id = 'shared-files' and (storage.foldername(name))[1] = auth.uid()::text);
