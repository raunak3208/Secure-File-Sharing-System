'use client';

import React from "react"

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  file: any;
  onOpenChange: (open: boolean) => void;
  onShare: () => void;
}

export function ShareModal({
  isOpen,
  file,
  onOpenChange,
  onShare,
}: ShareModalProps) {
  const [expirationDays, setExpirationDays] = useState('7');
  const [accessLevel, setAccessLevel] = useState('view');
  const [maxDownloads, setMaxDownloads] = useState('10');
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const supabase = createClient();
  
  // Check if download option should be enabled (only for "All Time")
  const isAllTime = expirationDays === 'all-time';
  const showDownloadOption = isAllTime;
  
  // Reset access level if it's "download" and user switches away from "all-time"
  useEffect(() => {
    if (accessLevel === 'download' && !showDownloadOption) {
      setAccessLevel('view');
    }
  }, [showDownloadOption, accessLevel]);

  const createShareLink = async () => {
    setIsCreatingLink(true);

    try {
      // Map view/download to viewer/editor roles
      const roleMap: Record<string, string> = {
        'view': 'viewer',
        'download': 'editor',
      };

      const token = Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      
      // Handle expiration - null for "all-time"
      let expiresAt: string | null = null;
      if (expirationDays !== 'all-time') {
        const date = new Date();
        date.setDate(date.getDate() + parseInt(expirationDays));
        expiresAt = date.toISOString();
      }

      // Get current user to populate email field
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || 'shared@example.com';

      console.log('[v0] Creating share with:', {
        file_id: file.id,
        email: userEmail,
        role: roleMap[accessLevel],
        token,
        expires_at: expiresAt,
        download_limit: parseInt(maxDownloads),
      });

      const { error } = await supabase.from('file_access').insert({
        file_id: file.id,
        email: userEmail,
        access_token: token,
        role: roleMap[accessLevel],
        expires_at: expiresAt,
        download_limit: parseInt(maxDownloads),
      });

      if (error) {
        console.error('[v0] Share error details:', JSON.stringify(error, null, 2));
        console.error('[v0] Error code:', error.code);
        console.error('[v0] Error message:', error.message);
        throw new Error(error.message || 'Failed to create share link');
      }

      const shareUrl = `${window.location.origin}/shared/${token}`;
      setShareLink(shareUrl);
      toast.success('Share link created');
    } catch (error) {
      console.error('[v0] Error creating share link:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create share link';
      toast.error(errorMsg);
    } finally {
      setIsCreatingLink(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copied to clipboard');
  };

  const resetForm = () => {
    setShareLink('');
    setExpirationDays('7');
    setAccessLevel('view');
    setMaxDownloads('10');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Share File</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {file.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!shareLink ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Expiration
                </label>
                <Select value={expirationDays} onValueChange={setExpirationDays}>
                  <SelectTrigger className="border-border bg-input text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="all-time">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Access Level
                </label>
                <Select value={accessLevel} onValueChange={setAccessLevel}>
                  <SelectTrigger className="border-border bg-input text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    <SelectItem value="view">View Only</SelectItem>
                    {showDownloadOption && (
                      <SelectItem value="download">Download</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {!showDownloadOption && (
                  <p className="text-xs text-muted-foreground">
                    Download option only available with "All Time" expiration
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Max Downloads
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={maxDownloads}
                  onChange={(e) => setMaxDownloads(e.target.value)}
                  className="border-border bg-input text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Set to 0 for unlimited
                </p>
              </div>

              <Button
                onClick={createShareLink}
                disabled={isCreatingLink}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isCreatingLink ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Link...
                  </>
                ) : (
                  'Create Share Link'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                <p className="text-xs font-medium text-accent mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Secure Share Link Created
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="border-border bg-input text-foreground text-sm"
                  />
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    className="border-border hover:bg-card text-foreground px-3 bg-transparent"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-foreground font-medium">Share Details:</p>
                <div className="space-y-1 text-muted-foreground text-xs">
                  <p>• Expires: {expirationDays === 'all-time' ? 'Never' : `${expirationDays} day(s)`}</p>
                  <p>• Access: {accessLevel === 'view' ? 'View Only' : 'Download'}</p>
                  <p>
                    • Downloads: {maxDownloads === '0' ? 'Unlimited' : maxDownloads}
                  </p>
                </div>
              </div>

              <Button
                onClick={resetForm}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Create Another Link
              </Button>

              <Button
                onClick={() => {
                  onOpenChange(false);
                  resetForm();
                  onShare();
                }}
                variant="outline"
                className="w-full border-border hover:bg-card text-foreground"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
