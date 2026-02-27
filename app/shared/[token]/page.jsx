'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Lock, Download, Calendar, AlertCircle, Eye, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function SharedFilePage() {
  const params = useParams()
  const token = params.token
  
  const [file, setFile] = useState(null)
  const [access, setAccess] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isViewing, setIsViewing] = useState(false)
  const [viewUrl, setViewUrl] = useState(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAccessInfo()
  }, [token])

  useEffect(() => {
    if (isViewing) {
      setupSecurityProtections()
    }
  }, [isViewing])

  const fetchAccessInfo = async () => {
    try {
      setLoading(true)
      const { data: accessData, error: accessError } = await supabase
        .from('file_access')
        .select('*')
        .eq('token', token)
        .single()

      if (accessError || !accessData) {
        setError('Invalid or expired access link')
        return
      }

      // Check expiration
      if (accessData.expires_at && new Date(accessData.expires_at) < new Date()) {
        setError('This access link has expired')
        return
      }

      // Check device binding
      await checkAndBindDevice(accessData.id)

      setAccess(accessData)

      // Fetch file info
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('*')
        .eq('id', accessData.file_id)
        .single()

      if (fileError || !fileData) {
        setError('File not found')
        return
      }

      setFile(fileData)
    } catch (err) {
      console.error('Error fetching access info:', err)
      setError('Failed to access file')
    } finally {
      setLoading(false)
    }
  }

  const generateDeviceFingerprint = () => {
    const navigator_ = window.navigator
    const screen_ = window.screen
    const deviceId = `${navigator_.userAgent}-${screen_.width}x${screen_.height}-${navigator_.language}-${new Date().getTimezoneOffset()}`
    const hash = btoa(deviceId).substring(0, 20)
    return hash
  }

  const checkAndBindDevice = async (accessId) => {
    try {
      const currentDeviceId = generateDeviceFingerprint()
      const storedDeviceId = localStorage.getItem('secureshare_device_id')

      if (!storedDeviceId) {
        localStorage.setItem('secureshare_device_id', currentDeviceId)
      }

      const { data: bindingData } = await supabase
        .from('device_bindings')
        .select('*')
        .eq('file_access_id', accessId)
        .single()

      if (!bindingData) {
        await supabase.from('device_bindings').insert({
          file_access_id: accessId,
          device_fingerprint: currentDeviceId,
          first_access_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        })
      } else {
        if (bindingData.device_fingerprint !== currentDeviceId) {
          throw new Error('Device mismatch - access denied')
        }

        await supabase
          .from('device_bindings')
          .update({ last_accessed_at: new Date().toISOString() })
          .eq('file_access_id', accessId)
      }
    } catch (err) {
      console.error('Device binding error:', err)
      if (err.message.includes('Device mismatch')) {
        setError('Access denied: This file can only be accessed from the device where it was first opened')
      }
    }
  }

  const handleView = async () => {
    if (!file || !access) return

    setLoading(true)
    try {
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('shared-files')
        .createSignedUrl(file.storage_path, 3600)

      if (urlError || !signedUrlData) {
        toast.error('Failed to load file')
        return
      }

      setViewUrl(signedUrlData.signedUrl)
      setIsViewing(true)

      setTimeout(() => {
        const pdfContainer = document.getElementById('pdf-viewer-container')
        if (pdfContainer) {
          pdfContainer.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)

      // Log view
      await supabase.from('file_views').insert({
        file_access_id: access.id,
        viewed_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('View error:', err)
      toast.error('Failed to open file')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!file || !access) return

    try {
      setIsDownloading(true)

      if (access.downloads_used >= access.download_limit) {
        toast.error('Download limit reached')
        return
      }

      const { data, error: downloadError } = await supabase.storage
        .from('shared-files')
        .download(file.storage_path)

      if (downloadError) throw downloadError

      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Update download count
      await supabase
        .from('file_access')
        .update({ downloads_used: (access.downloads_used || 0) + 1 })
        .eq('id', access.id)

      setAccess({
        ...access,
        downloads_used: (access.downloads_used || 0) + 1,
      })

      toast.success('File downloaded successfully')
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Failed to download file')
    } finally {
      setIsDownloading(false)
    }
  }

  const setupSecurityProtections = () => {
    if (!isViewing) return

    const handleCopy = (e) => {
      e.preventDefault()
      toast.error('Copying is disabled')
    }

    const handleCut = (e) => {
      e.preventDefault()
      toast.error('Cutting is disabled')
    }

    const handlePaste = (e) => {
      e.preventDefault()
    }

    const handleContextMenu = (e) => {
      e.preventDefault()
    }

    document.addEventListener('copy', handleCopy, true)
    document.addEventListener('cut', handleCut, true)
    document.addEventListener('paste', handlePaste, true)
    document.addEventListener('contextmenu', handleContextMenu, true)

    return () => {
      document.removeEventListener('copy', handleCopy, true)
      document.removeEventListener('cut', handleCut, true)
      document.removeEventListener('paste', handlePaste, true)
      document.removeEventListener('contextmenu', handleContextMenu, true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading file...</h1>
          <div className="animate-pulse">
            <div className="h-12 bg-primary rounded w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="flex items-center gap-2 text-destructive mb-4">
            <AlertCircle className="w-5 h-5" />
            <h1 className="text-xl font-bold">Error</h1>
          </div>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    )
  }

  if (!file || !access) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <p className="text-center text-muted-foreground">File not found</p>
        </Card>
      </div>
    )
  }

  // PDF Viewer Modal
  if (isViewing && viewUrl) {
    return (
      <div
        id="pdf-viewer-container"
        className="min-h-screen bg-background flex flex-col relative overflow-hidden"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
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
            WebkitUserSelect: 'none',
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
                <h1 className="text-lg font-semibold text-foreground">{file.name}</h1>
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
    )
  }

  // Main View
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-8">
        <Card className="p-8">
          <div className="flex items-start gap-4 mb-6">
            <Lock className="w-6 h-6 text-primary mt-1" />
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{file.name}</h1>
              <p className="text-muted-foreground">This file is securely shared with you. All access is logged and protected.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">{new Date(file.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4" />
                <span className="text-muted-foreground">Size:</span>
                <span className="font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4" />
                <span className="text-muted-foreground">Views:</span>
                <span className="font-medium">0</span>
              </div>
              {access.role === 'editor' && access.download_limit > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" />
                  <span className="text-muted-foreground">Downloads:</span>
                  <span className="font-medium">
                    {access.downloads_used || 0} / {access.download_limit}
                  </span>
                </div>
              )}
            </div>
          </div>

          {access.expires_at && (
            <div className="bg-warning/10 border border-warning rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium">Access expires</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(access.expires_at).toLocaleDateString()} at {new Date(access.expires_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button onClick={handleView} size="lg" className="flex-1">
              <Eye className="w-4 h-4 mr-2" />
              View File
            </Button>
            {access.role === 'editor' && access.download_limit > (access.downloads_used || 0) && (
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                variant="outline"
                size="lg"
                className="flex-1 bg-transparent"
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
