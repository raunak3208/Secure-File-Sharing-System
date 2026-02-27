'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Share2, Download, Clock, Eye, X, Lock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function DashboardPage() {
  const router = useRouter()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/auth/login')
          return
        }
        setUser(authUser)
        fetchFiles(authUser.id)
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/auth/login')
      }
    }
    checkAuth()
  }, [router])

  const fetchFiles = async (userId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('[v0] Fetching files for user:', userId)
      console.log('[v0] Files query result:', { data, error })

      setFiles(data || [])
    } catch (error) {
      console.error('Error fetching files:', error)
      toast.error('Failed to fetch files')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    try {
      setUploadingFile(true)

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('shared-files')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: fileData, error: dbError } = await supabase
        .from('files')
        .insert({
          name: file.name,
          size: file.size,
          mime_type: file.type,
          storage_path: fileName,
          user_id: user.id,
        })
        .select()
        .single()

      if (dbError) throw dbError

      setFiles([fileData, ...files])
      toast.success('File uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleShare = async (fileId, shareData) => {
    try {
      const { email, role, download_limit, expires_at } = shareData

      const token = Math.random().toString(36).substr(2, 21)

      const { error } = await supabase
        .from('file_access')
        .insert({
          file_id: fileId,
          shared_with_email: email,
          role: role,
          download_limit: download_limit,
          expires_at: expires_at,
          token: token,
        })

      if (error) throw error

      console.log('[v0] Creating share with:', shareData)

      const shareUrl = `${window.location.origin}/shared/${token}`
      
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard!')
      setShareModalOpen(false)
    } catch (error) {
      console.error('Share error:', error)
      toast.error('Failed to share file')
    }
  }

  const handleDeleteFile = async (fileId, storagePath) => {
    try {
      await supabase.storage.from('shared-files').remove([storagePath])
      
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)

      if (error) throw error

      setFiles(files.filter(f => f.id !== fileId))
      toast.success('File deleted successfully')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete file')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Loading Dashboard</h1>
          <div className="animate-pulse">
            <div className="h-12 bg-primary rounded w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Secure File Sharing Dashboard</h1>
          <p className="text-lg text-muted-foreground">Upload and securely share your files with advanced protection</p>
        </div>

        {/* Upload Section */}
        <Card className="mb-8 border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Upload New File
            </CardTitle>
            <CardDescription>Drag and drop or click to upload your file</CardDescription>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploadingFile}
              className="w-full"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
            />
            {uploadingFile && <p className="text-sm text-muted-foreground mt-2">Uploading...</p>}
          </CardContent>
        </Card>

        {/* Files List */}
        <div className="grid gap-4">
          <h2 className="text-2xl font-bold">Your Files ({files.length})</h2>
          {files.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No files yet. Upload your first file to get started.</p>
              </CardContent>
            </Card>
          ) : (
            files.map((file) => (
              <Card key={file.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-primary" />
                        {file.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Created {new Date(file.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setSelectedFile(file)
                          setShareModalOpen(true)
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                      <Button
                        onClick={() => handleDeleteFile(file.id, file.storage_path)}
                        variant="destructive"
                        size="sm"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {/* Share Modal */}
        {shareModalOpen && selectedFile && (
          <ShareModal
            file={selectedFile}
            onClose={() => {
              setShareModalOpen(false)
              setSelectedFile(null)
            }}
            onShare={(data) => handleShare(selectedFile.id, data)}
          />
        )}
      </div>
    </div>
  )
}

function ShareModal({ file, onClose, onShare }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [downloadLimit, setDownloadLimit] = useState(10)
  const [expiresAt, setExpiresAt] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter an email address')
      return
    }
    onShare({
      email,
      role,
      download_limit: downloadLimit,
      expires_at: expiresAt,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Share File: {file.name}</CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Access Level</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              >
                <option value="viewer">Viewer Only</option>
                <option value="editor">Can Download</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Download Limit (if viewer)</label>
              <input
                type="number"
                value={downloadLimit}
                onChange={(e) => setDownloadLimit(parseInt(e.target.value))}
                min="1"
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expires At</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Generate Share Link
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
