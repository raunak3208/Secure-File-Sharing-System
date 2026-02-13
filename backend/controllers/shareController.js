const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.createShare = async (req, res) => {
  try {
    const { fileId, email, role, expiresAt, downloadLimit, token } = req.body;
    const userId = req.user.id;

    // Verify file ownership
    const { data: file } = await supabase
      .from('files')
      .select('id')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (!file) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create share
    const { data, error } = await supabase
      .from('file_shares')
      .insert({
        file_id: fileId,
        token,
        email,
        role,
        expires_at: expiresAt,
        download_limit: downloadLimit || 10,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getShares = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const { data: file } = await supabase
      .from('files')
      .select('id')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (!file) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('file_shares')
      .select('*')
      .eq('file_id', fileId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getShareByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const { data, error } = await supabase
      .from('file_shares')
      .select('*, files(*)')
      .eq('token', token)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Share not found' });
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Share has expired' });
    }

    // Check download limit
    if (data.downloads_used >= data.download_limit) {
      return res.status(429).json({ error: 'Download limit exceeded' });
    }

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
