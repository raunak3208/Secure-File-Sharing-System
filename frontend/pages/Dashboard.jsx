'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  LogOut,
  File,
  Share2,
  Trash2,
  Lock,
  Loader2,
  XCircle,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/dashboard/file-upload';
import { ShareModal } from '@/components/dashboard/share-modal';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<any[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);
      fetchFiles();
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error('[v0] No user found when fetching files');
        setFiles([]);
        return;
      }

      console.log('[v0] Fetching files for user:', user.id);

      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('[v0] Files query result:', { data, error });

      if (error) {
        console.error('[v0] Detailed error:', JSON.stringify(error, null, 2));
        throw error;
      }
      setFiles(data || []);
    } catch (error) {
      console.error('[v0] Error fetching files:', error);
      toast.error('Failed to fetch files');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to logout');
    }
  };

  const handleFileUploaded = () => {
    fetchFiles();
    toast.success('File uploaded successfully');
  };

  const handleShare = (file: any) => {
    setSelectedFile(file);
    setShareModalOpen(true);
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const file = files.find((f) => f.id === fileId);
      if (!file) return;

      // Delete from storage
      await supabase.storage.from('shared-files').remove([file.storage_path]);

      // Delete from database
      await supabase.from('files').delete().eq('id', fileId);

      setFiles(files.filter((f) => f.id !== fileId));
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleRevokeAllLinks = async (fileId: string) => {
    if (!confirm('Are you sure? This will revoke ALL sharing links for this file immediately.')) return;

    try {
      // Mark all file_access records as revoked for this file
      await supabase
        .from('file_access')
        .update({ revoked_at: new Date().toISOString() })
        .eq('file_id', fileId);

      toast.success('All sharing links have been revoked');
    } catch (error) {
      console.error('Error revoking links:', error);
      toast.error('Failed to revoke links');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">SecureShare</h1>
              <p className="text-xs text-muted-foreground">
                {user?.user_metadata?.full_name || user?.email}
              </p>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            variant="ghost"
            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-card"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Upload Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Upload Files
          </h2>
          <FileUpload userId={user?.id} onUploadComplete={handleFileUploaded} />
        </div>

        {/* Files Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Your Files
            </h2>
            <span className="text-sm text-muted-foreground">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
          </div>

          {files.length === 0 ? (
            <Card className="border-border bg-card/50">
              <div className="p-12 text-center">
                <File className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No files yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Upload your first file to get started
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <Card
                  key={file.id}
                  className="border-border bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <File className="w-6 h-6 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {file.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB •{' '}
                          {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleShare(file)}
                        className="text-muted-foreground hover:text-primary hover:bg-card gap-1"
                        title="Create or manage sharing links"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevokeAllLinks(file.id)}
                        className="text-muted-foreground hover:text-orange-500 hover:bg-card"
                        title="Revoke all sharing links immediately"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(file.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-card"
                        title="Delete file permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Share Modal */}
      {selectedFile && (
        <ShareModal
          isOpen={shareModalOpen}
          file={selectedFile}
          onOpenChange={setShareModalOpen}
          onShare={() => {
            fetchFiles();
            setShareModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
