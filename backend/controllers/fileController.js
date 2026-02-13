const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.getFiles = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFileById = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    // Get file to get storage path
    const { data: file, error: getError } = await supabase
      .from('files')
      .select('storage_path')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (getError) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('shared-files')
      .remove([file.storage_path]);

    if (storageError) {
      return res.status(400).json({ error: storageError.message });
    }

    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
