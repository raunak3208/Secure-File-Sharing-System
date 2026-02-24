import { supabase } from './supabaseClient';

export const fileService = {
  async uploadFile(userId, file) {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const storagePath = `${userId}/${timestamp}-${randomStr}`;

    const { data, error } = await supabase.storage
      .from('shared-files')
      .upload(storagePath, file);

    if (error) return { data: null, error };

    // Save file metadata to database
    const { data: fileData, error: dbError } = await supabase
      .from('files')
      .insert({
        user_id: userId,
        name: file.name,
        mime_type: file.type,
        size: file.size,
        storage_path: storagePath,
      })
      .select()
      .single();

    return { data: fileData, error: dbError };
  },

  async getFiles(userId) {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  async deleteFile(fileId, storagePath) {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('shared-files')
      .remove([storagePath]);

    if (storageError) return { error: storageError };

    // Delete from database
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    return { error: dbError };
  },

  async getFileById(fileId) {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    return { data, error };
  }
};
