'use client';

import React from "react"

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, File, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  userId: string;
  onUploadComplete: () => void;
}

export function FileUpload({ userId, onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of selectedFiles) {
        console.log('[v0] Starting upload for file:', file.name, 'Size:', file.size);
        
        // Validate file size (100MB max)
        if (file.size > 100 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 100MB limit`);
        }

        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        console.log('[v0] Uploading to storage:', fileName);
        
        const { error: uploadError } = await supabase.storage
          .from('shared-files')
          .upload(fileName, file);

        if (uploadError) {
          console.error('[v0] Storage upload error:', uploadError);
          throw uploadError;
        }

        console.log('[v0] Storage upload successful, saving to database');

        // Insert into database
        const { error: dbError } = await supabase.from('files').insert({
          user_id: userId,
          name: file.name,
          size: file.size,
          mime_type: file.type,
          storage_path: fileName,
        });

        if (dbError) {
          console.error('[v0] Database insert error:', JSON.stringify(dbError, null, 2));
          console.error('[v0] User ID:', userId);
          console.error('[v0] Error message:', dbError.message);
          console.error('[v0] Error code:', dbError.code);
          throw new Error(`Database error: ${dbError.message || 'Unknown error'}`);
        }

        console.log('[v0] File uploaded successfully:', file.name);
      }

      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success(`${selectedFiles.length} file(s) uploaded successfully`);
      onUploadComplete();
    } catch (error) {
      console.error('[v0] Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file(s)';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="p-8 text-center"
        >
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Drag files here or click to browse
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Maximum file size: 100MB per file
          </p>
          <Button
            type="button"
            variant="outline"
            className="border-border hover:bg-card text-foreground bg-transparent"
            onClick={() => fileInputRef.current?.click()}
          >
            Select Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </Card>

      {selectedFiles.length > 0 && (
        <Card className="border-border bg-card/50">
          <div className="p-4 space-y-3">
            <h4 className="font-medium text-foreground">
              Selected Files ({selectedFiles.length})
            </h4>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <File className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={uploadFiles}
                disabled={isUploading}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Files'
                )}
              </Button>
              <Button
                onClick={() => {
                  setSelectedFiles([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={isUploading}
                variant="outline"
                className="border-border hover:bg-card text-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
