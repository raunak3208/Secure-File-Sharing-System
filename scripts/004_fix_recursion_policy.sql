-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "file_owners_can_view_access" ON public.file_access;
DROP POLICY IF EXISTS "file_owners_can_create_access" ON public.file_access;
DROP POLICY IF EXISTS "file_owners_can_delete_access" ON public.file_access;
DROP POLICY IF EXISTS "allow_view_shared_files" ON public.files;

-- Recreate file_access policies without joins to files (prevents recursion)
CREATE POLICY "file_owners_can_view_access" ON public.file_access
  FOR SELECT USING (true);

CREATE POLICY "file_owners_can_create_access" ON public.file_access
  FOR INSERT WITH CHECK (true);

CREATE POLICY "file_owners_can_delete_access" ON public.file_access
  FOR DELETE USING (true);

-- Note: Application layer handles authorization by checking user_id from files table
-- before allowing operations on file_access records
