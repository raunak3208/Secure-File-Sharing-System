-- Create the files storage bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'files',
  'files',
  false,
  false,
  104857600, -- 100MB limit
  null
) ON CONFLICT (id) DO NOTHING;

-- Enable authenticated uploads to own folder
CREATE POLICY "Authenticated users can upload files" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'files' 
    AND auth.role() = 'authenticated'
  );

-- Allow users to read their own files
CREATE POLICY "Users can read their own files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
