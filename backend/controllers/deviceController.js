const supabase = require('../config/database');

// Bind device on first access
exports.bindDevice = async (req, res) => {
  try {
    const { fileAccessId, deviceFingerprint } = req.body;

    // Check if already bound
    const { data: existing } = await supabase
      .from('device_bindings')
      .select('*')
      .eq('file_access_id', fileAccessId)
      .single();

    if (existing) {
      // Device already bound - check if match
      if (existing.device_fingerprint !== deviceFingerprint) {
        return res.status(403).json({
          success: false,
          error: 'Device mismatch - file can only be accessed from original device',
        });
      }

      // Update last accessed
      const { data, error } = await supabase
        .from('device_bindings')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('file_access_id', fileAccessId)
        .select();

      if (error) throw error;
      return res.json({ success: true, data: data[0], bound: false });
    }

    // First access - bind this device
    const { data, error } = await supabase
      .from('device_bindings')
      .insert({
        file_access_id: fileAccessId,
        device_fingerprint: deviceFingerprint,
        first_access_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      })
      .select();

    if (error) throw error;

    res.json({ success: true, data: data[0], bound: true });
  } catch (error) {
    console.error('Error binding device:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Check device binding
exports.checkDevice = async (req, res) => {
  try {
    const { fileAccessId, deviceFingerprint } = req.body;

    const { data, error } = await supabase
      .from('device_bindings')
      .select('*')
      .eq('file_access_id', fileAccessId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      // Not yet bound
      return res.json({ success: true, bound: false, match: null });
    }

    // Check match
    const match = data.device_fingerprint === deviceFingerprint;

    res.json({
      success: true,
      bound: true,
      match,
      data,
    });
  } catch (error) {
    console.error('Error checking device:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get device history for a file
exports.getDeviceHistory = async (req, res) => {
  try {
    const { fileAccessId } = req.params;

    const { data, error } = await supabase
      .from('device_bindings')
      .select('*')
      .eq('file_access_id', fileAccessId);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching device history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
