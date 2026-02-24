'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Shield, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { ScreenCaptureDetector } from '@/lib/security/screenshot-detection';
import { generateDeviceFingerprint, getClientIP, getGeoLocation } from '@/lib/security/device-binding';

interface SecurityMonitorProps {
  fileAccessId: string;
  supabase: any;
  onSecurityViolation?: (violation: any) => void;
}

export function SecurityMonitor({ fileAccessId, supabase, onSecurityViolation }: SecurityMonitorProps) {
  const [securityStatus, setSecurityStatus] = useState<'safe' | 'warning' | 'violated'>('safe');
  const [violations, setViolations] = useState<any[]>([]);
  const [detector] = useState(() => new ScreenCaptureDetector());

  useEffect(() => {
    // Initialize device binding and security monitoring
    const initializeSecurity = async () => {
      try {
        // Get device fingerprint
        const deviceFingerprint = generateDeviceFingerprint();
        const clientIP = await getClientIP();
        const geoLocation = await getGeoLocation(clientIP);

        console.log('[v0] Security: Device fingerprint:', deviceFingerprint);
        console.log('[v0] Security: Client IP:', clientIP);
        console.log('[v0] Security: Geolocation:', geoLocation);

        // Record access attempt in database
        if (supabase && fileAccessId) {
          await supabase.from('access_attempts').insert({
            file_access_id: fileAccessId,
            device_id: deviceFingerprint.deviceId,
            ip_address: clientIP,
            user_agent: deviceFingerprint.userAgent,
            country: geoLocation?.country,
            city: geoLocation?.city,
            latitude: geoLocation?.latitude,
            longitude: geoLocation?.longitude,
            timestamp: new Date().toISOString(),
          });
        }

        // Check if this is the first device accessing this share
        const { data: existingAttempts } = await supabase
          .from('access_attempts')
          .select('*')
          .eq('file_access_id', fileAccessId)
          .order('timestamp', { ascending: false });

        if (existingAttempts && existingAttempts.length > 1) {
          const firstAttempt = existingAttempts[existingAttempts.length - 1];
          if (firstAttempt.device_id !== deviceFingerprint.deviceId) {
            // Different device accessing the same share
            const violation = {
              type: 'device-mismatch',
              timestamp: Date.now(),
              details: `File accessed from different device: ${firstAttempt.device_id} vs ${deviceFingerprint.deviceId}`,
            };
            recordViolation(violation);
            toast.error('Warning: This file is being accessed from a different device than the original share');
          }
        }
      } catch (err) {
        console.error('[v0] Security initialization error:', err);
      }
    };

    initializeSecurity();

    // Monitor for screenshot attempts
    detector.onAttempt(() => {
      const violation = {
        type: 'screenshot-attempt',
        timestamp: Date.now(),
        details: 'Screenshot attempt detected',
      };
      recordViolation(violation);
      setSecurityStatus('violated');
      toast.error('Screenshot attempt blocked');
    });

    // Monitor for blur events (potential screenshot)
    const handleBlur = () => {
      console.log('[v0] Window blur detected - possible screenshot tool');
    };

    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [fileAccessId, supabase, detector]);

  const recordViolation = async (violation: any) => {
    setViolations((prev) => [...prev, violation]);

    if (supabase && fileAccessId) {
      await supabase.from('security_violations').insert({
        file_access_id: fileAccessId,
        violation_type: violation.type,
        details: violation.details,
        timestamp: new Date().toISOString(),
      });
    }

    if (onSecurityViolation) {
      onSecurityViolation(violation);
    }
  };

  if (violations.length > 0) {
    return (
      <div className="fixed bottom-4 right-4 bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg flex items-start gap-3 max-w-sm animate-in slide-in-from-right-4">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Security Alert</p>
          <p className="text-xs opacity-90 mt-1">{violations.length} security violations detected</p>
          <ul className="mt-2 space-y-1">
            {violations.slice(-3).map((v, idx) => (
              <li key={idx} className="text-xs opacity-75">
                • {v.details}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-green-500/10 border border-green-500/30 text-green-700 p-3 rounded-lg flex items-center gap-2 text-xs">
      <Shield className="w-4 h-4" />
      <span>Security Monitoring Active</span>
    </div>
  );
}
