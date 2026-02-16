import { supabase } from './supabaseClient';

export const securityService = {
  async checkDeviceBinding(fileShareId) {
    const deviceId = this.getDeviceId();
    
    const { data, error } = await supabase
      .from('device_bindings')
      .select('*')
      .eq('file_share_id', fileShareId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No binding exists yet - create one
      return await this.bindDevice(fileShareId, deviceId);
    }

    if (data && data.device_fingerprint !== deviceId) {
      return { error: 'Device mismatch - access denied', data: null };
    }

    return { data, error };
  },

  async bindDevice(fileShareId, deviceId = null) {
    const id = deviceId || this.getDeviceId();
    
    const { data, error } = await supabase
      .from('device_bindings')
      .insert({
        file_share_id: fileShareId,
        device_fingerprint: id,
        first_access_at: new Date().toISOString(),
      })
      .select()
      .single();

    return { data, error };
  },

  getDeviceId() {
    let deviceId = localStorage.getItem('secureshare_device_id');
    
    if (!deviceId) {
      const navigator = window.navigator;
      const screen = window.screen;
      const fingerprint = `${navigator.userAgent}-${screen.width}x${screen.height}-${navigator.language}`;
      deviceId = btoa(fingerprint).substring(0, 32);
      localStorage.setItem('secureshare_device_id', deviceId);
    }
    
    return deviceId;
  },

  async logSecurityEvent(fileShareId, eventType, details = {}) {
    const { error } = await supabase
      .from('security_violations')
      .insert({
        file_share_id: fileShareId,
        violation_type: eventType,
        details: JSON.stringify(details),
        timestamp: new Date().toISOString(),
        device_fingerprint: this.getDeviceId(),
      });

    return { error };
  },

  detectScreenshot() {
    const handleScreenshot = async (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'PrintScreen') {
        e.preventDefault();
        console.warn('[v0] Screenshot attempt detected');
      }
    };

    window.addEventListener('keydown', handleScreenshot);
    return () => window.removeEventListener('keydown', handleScreenshot);
  },

  disableContextMenu() {
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  },

  disableCopyPaste() {
    const handleCopy = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }
};
