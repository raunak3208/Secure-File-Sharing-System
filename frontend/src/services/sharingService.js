import { supabase } from './supabaseClient';

export const sharingService = {
  async createShare(fileId, shareData) {
    const { data, error } = await supabase
      .from('file_shares')
      .insert({
        file_id: fileId,
        token: shareData.token,
        email: shareData.email,
        role: shareData.role,
        expires_at: shareData.expires_at,
        download_limit: shareData.download_limit,
      })
      .select()
      .single();

    return { data, error };
  },

  async getShares(fileId) {
    const { data, error } = await supabase
      .from('file_shares')
      .select('*')
      .eq('file_id', fileId);

    return { data, error };
  },

  async getShareByToken(token) {
    const { data, error } = await supabase
      .from('file_shares')
      .select('*')
      .eq('token', token)
      .single();

    return { data, error };
  },

  async deleteShare(shareId) {
    const { error } = await supabase
      .from('file_shares')
      .delete()
      .eq('id', shareId);

    return { error };
  },

  async logAccess(fileShareId, accessType = 'view') {
    const { error } = await supabase
      .from('access_logs')
      .insert({
        file_share_id: fileShareId,
        access_type: accessType,
        timestamp: new Date().toISOString(),
        ip_address: await this.getClientIp(),
      });

    return { error };
  },

  async getClientIp() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  },

  async updateDownloadCount(fileShareId) {
    const { data: share } = await supabase
      .from('file_shares')
      .select('downloads_used, download_limit')
      .eq('id', fileShareId)
      .single();

    if (share && share.downloads_used < share.download_limit) {
      const { error } = await supabase
        .from('file_shares')
        .update({ downloads_used: share.downloads_used + 1 })
        .eq('id', fileShareId);

      return { error };
    }

    return { error: 'Download limit reached' };
  }
};
