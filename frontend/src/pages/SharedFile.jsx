'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lock, Download, Calendar, AlertCircle, Loader2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SharedFilePage() {
  const params = useParams();
  const token = params.token as string;
  const [file, setFile] = useState<any>(null);
  const [access, setAccess] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [viewUrl, setViewUrl] = useState('');
  const [viewIncremented, setViewIncremented] = useState(false);
  const [error, setError] = useState('');
  const [securityViolations, setSecurityViolations] = useState<any[]>([]);
  
  // Create Supabase client with error handling
  let supabase: any = null;
  try {
    supabase = createClient();
  } catch (err) {
    console.error('[v0] Failed to create Supabase client:', err);
  }

  useEffect(() => {
    fetchSharedFile();
  }, [token]);

  // Set up security protections when viewing
  useEffect(() => {
    if (!isViewing) return;

    // Block copy/cut/paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error('Copying is disabled');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error('Cutting is disabled');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [isViewing]);

  const fetchSharedFile = async () => {
    try {
      if (!supabase) {
        setError('Database connection not available. Please check environment configuration.');
        setIsLoading(false);
        return;
      }

      // Get access record
      const { data: accessData, error: accessError } = await supabase
        .from('file_access')
        .select('*')
        .eq('access_token', token)
        .single();

      if (accessError || !accessData) {
        setError('File not found or link is invalid');
        setIsLoading(false);
        return;
      }

      // Check if expired (null expires_at means all-time)
      if (accessData.expires_at && new Date(accessData.expires_at) < new Date()) {
        setError('This share link has expired');
        setIsLoading(false);
        return;
      }
      
      // Check if revoked
      if (accessData.revoked_at) {
        setError('This share link has been revoked');
        setIsLoading(false);
        return;
      }

      // Get file
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('*')
        .eq('id', accessData.file_id)
        .single();

      if (fileError || !fileData) {
        setError('File not found');
        setIsLoading(false);
        return;
      }

      setFile(fileData);
      setAccess(accessData);
    } catch (err) {
      console.error('Error fetching shared file:', err);
      setError('Failed to load file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = async () => {
    if (!file || !access) return;

    setIsLoading(true);

    try {
      // Check device binding - ensure first device is recorded and match subsequent accesses
      await checkAndBindDevice(access.id);

      // Get signed URL for viewing
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('shared-files')
        .createSignedUrl(file.storage_path, 3600);

      if (urlError || !signedUrlData) {
        toast.error('Failed to load file');
        return;
      }

      setViewUrl(signedUrlData.signedUrl);
      setIsViewing(true);

      // Auto-scroll to PDF viewer after state update
      setTimeout(() => {
        const pdfContainer = document.getElementById('pdf-viewer-container');
        if (pdfContainer) {
          pdfContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      // Increment view count (only once per session)
      if (!viewIncremented) {
        await supabase
          .from('file_access')
          .update({
            view_count: (access.view_count || 0) + 1,
          })
          .eq('id', access.id);
        
        setViewIncremented(true);
        setAccess({ ...access, view_count: (access.view_count || 0) + 1 });
      }
    } catch (err) {
      console.error('View error:', err);
      toast.error('Failed to load file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!file || !access) return;

    // Check download limit
    if (
      access.download_limit > 0 &&
      access.downloads_used >= access.download_limit
    ) {
      toast.error('Download limit reached for this file');
      return;
    }

    setIsDownloading(true);

    try {
      // Get signed URL
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('shared-files')
        .createSignedUrl(file.storage_path, 3600);

      if (urlError || !signedUrlData) {
        toast.error('Failed to generate download link');
        return;
      }

      // Update download count
      await supabase
        .from('file_access')
        .update({
          downloads_used: (access.downloads_used || 0) + 1,
        })
        .eq('id', access.id);

      // Trigger download
      window.location.href = signedUrlData.signedUrl;
      toast.success('Download started');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download file');
    } finally {
      setIsDownloading(false);
    }
  };

  // PDF Viewer Modal
  const PDFViewerModal = () => {
    if (!viewUrl) return null;

    return (
      <div 
        id="pdf-viewer-container"
        className="min-h-screen bg-background flex flex-col relative overflow-hidden"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        } as any}
      >
        {/* Anti-Screenshot Watermark */}
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-45deg)',
            fontSize: '120px',
            fontWeight: '900',
            color: 'rgba(255, 0, 0, 0.08)',
            zIndex: 10,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            WebkitUserSelect: 'none' as any,
            textShadow: '0 0 20px rgba(255, 0, 0, 0.1)',
            letterSpacing: '10px',
            width: '200%',
            textAlign: 'center',
          }}
        >
          CONFIDENTIAL - DO NOT SCREENSHOT
        </div>

        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">{file?.name}</h1>
                <p className="text-xs text-muted-foreground">
                  Secure Viewer - Copy/Paste/Print Disabled
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsViewing(false)}
              variant="ghost"
              size="icon"
              className="hover:bg-destructive/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* PDF Viewer */}
        <div className="flex-1 flex items-center justify-center bg-slate-900 p-4 relative">
          <iframe
            src={`${viewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            className="w-full h-full max-w-6xl border-0 rounded-lg shadow-2xl"
            style={{ minHeight: '600px' }}
            title="File Viewer"
          />
        </div>
      </div>
    );
  };



  const generateDeviceFingerprint = (): string => {
    // Generate a unique device ID based on browser characteristics
    const navigator_ = window.navigator;
    const screen_ = window.screen;
    
    const deviceId = `${navigator_.userAgent}-${screen_.width}x${screen_.height}-${navigator_.language}-${new Date().getTimezoneOffset()}`;
    const hash = btoa(deviceId).substring(0, 20);
    
    return hash;
  };

  const checkAndBindDevice = async (accessId: string) => {
    try {
      if (!supabase) return;

      const currentDeviceId = generateDeviceFingerprint();
      const storedDeviceId = localStorage.getItem('secureshare_device_id');

      // Store device ID on first access
      if (!storedDeviceId) {
        localStorage.setItem('secureshare_device_id', currentDeviceId);
      }

      // Get the binding info from database
      const { data: bindingData } = await supabase
        .from('device_bindings')
        .select('*')
        .eq('file_access_id', accessId)
        .single();

      if (!bindingData) {
        // First access - bind this device
        await supabase.from('device_bindings').insert({
          file_access_id: accessId,
          device_fingerprint: currentDeviceId,
          first_access_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        });
      } else {
        // Subsequent access - check if device matches
        if (bindingData.device_fingerprint !== currentDeviceId) {
          toast.error('Access denied: This file can only be accessed from the device where it was first opened');
          throw new Error('Device mismatch - access denied');
        }

        // Update last accessed time
        await supabase
          .from('device_bindings')
          .update({ last_accessed_at: new Date().toISOString() })
          .eq('file_access_id', accessId);
      }
    } catch (err) {
      console.error('Device binding check failed:', err);
      if (err instanceof Error && err.message.includes('Device mismatch')) {
        throw err;
      }
    }
  };

  const logSecurityViolation = async (type: string, details: string) => {
    try {
      if (!supabase || !access) return;

      await supabase.from('security_violations').insert({
        file_access_id: access.id,
        violation_type: type,
        details: details,
        timestamp: new Date().toISOString(),
        device_fingerprint: localStorage.getItem('secureshare_device_id') || 'unknown',
      });
    } catch (err) {
      console.error('Failed to log security violation:', err);
    }
  };

  const setupScreenshotDetection = () => {
    let blurCount = 0;

    // Detect window blur (screenshot tools may minimize the window)
    const handleBlur = async () => {
      blurCount++;
      if (!document.hasFocus()) {
        await logSecurityViolation('screenshot-attempt', `Window blur detected (attempt #${blurCount}) - Possible screenshot tool usage`);
        console.warn('[v0] Possible screenshot tool detected via window blur');
      }
    };

    // Detect visibility change (screenshot tools may hide the page)
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        await logSecurityViolation('screenshot-attempt', 'Document became hidden - Possible screenshot tool usage');
        console.warn('[v0] Possible screenshot tool detected via visibility change');
      }
    };

    // Log keyboard attempts
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Detect PrintScreen
      if (e.key === 'PrintScreen') {
        await logSecurityViolation('screenshot-shortcut', 'PrintScreen key pressed');
      }

      // Detect Ctrl+Shift+S (Windows/Linux)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        await logSecurityViolation('screenshot-shortcut', 'Ctrl+Shift+S pressed');
      }

      // Detect Cmd+Shift+4 or Cmd+Shift+3 (Mac)
      if (e.metaKey && e.shiftKey && (e.key === '4' || e.key === '3')) {
        await logSecurityViolation('screenshot-shortcut', 'Mac screenshot shortcut pressed');
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  };

  useEffect(() => {
    const cleanup = setupScreenshotDetection();
    return () => cleanup();
  }, [isViewing]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading file...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">SecureShare</h1>
              <p className="text-xs text-muted-foreground">Secure File Viewer</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {error ? (
          <Card className="border-border bg-card">
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Unable to access file
              </h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </Card>
        ) : (
          <Card className="border-border bg-card">
            <div className="p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {file?.name}
                  </h2>
                  <p className="text-muted-foreground">
                    {(file?.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-card/50 p-4 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Access Level:</span>
                  <span className="font-medium text-foreground capitalize">
                    {access?.role === 'viewer' ? 'View Only' : 'Download'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Expires:
                  </span>
                  <span className="font-medium text-foreground">
                    {access?.expires_at ? new Date(access.expires_at).toLocaleDateString() : 'Never'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Views:
                  </span>
                  <span className="font-medium text-foreground">
                    {access?.view_count || 0}
                  </span>
                </div>
                {access?.role === 'editor' && access?.download_limit > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Downloads:</span>
                    <span className="font-medium text-foreground">
                      {access?.downloads_used || 0} / {access?.download_limit}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleView}
                  disabled={isLoading}
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Eye className="w-5 h-5" />
                      View File
                    </>
                  )}
                </Button>

                {access?.role === 'editor' && (
                  <Button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    size="lg"
                    variant="outline"
                    className="w-full gap-2 bg-transparent"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Download File
                      </>
                    )}
                  </Button>
                )}

                {access?.role === 'viewer' && (
                  <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg text-center">
                    <p className="text-xs text-accent">
                      This file is view-only and cannot be downloaded.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </main>

      {isViewing && viewUrl && <PDFViewerModal />}
    </div>
  );
}
