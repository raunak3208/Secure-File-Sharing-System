'use client';

import React, { useEffect, useState } from 'react';
import { LogOut, Share2, Trash2, Eye } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { authService } from '../services/authService';
import { fileService } from '../services/fileService';

export function Dashboard() {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        window.location.href = '/login';
        return;
      }
      setUser(currentUser);
      fetchFiles(currentUser.id);
    } catch (error) {
      console.error('Auth check failed:', error);
      window.location.href = '/login';
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFiles = async (userId) => {
    try {
      const userFiles = await fileService.getUserFiles(userId);
      setFiles(userFiles || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      alert('Failed to fetch files');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to logout');
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await fileService.deleteFile(fileId);
      setFiles(files.filter(f => f.id !== fileId));
      alert('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Secure File Sharing</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
          <FileUpload userId={user?.id} onUploadComplete={() => fetchFiles(user?.id)} />
        </div>

        {/* Files Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Files</h2>

          {files.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No files uploaded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-4">File Name</th>
                    <th className="text-left py-2 px-4">Size</th>
                    <th className="text-left py-2 px-4">Views</th>
                    <th className="text-left py-2 px-4">Uploaded</th>
                    <th className="text-left py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map(file => (
                    <tr key={file.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{file.name}</td>
                      <td className="py-2 px-4">{(file.size / 1024 / 1024).toFixed(2)} MB</td>
                      <td className="py-2 px-4">{file.view_count || 0}</td>
                      <td className="py-2 px-4">{new Date(file.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-4">
                        <div className="flex gap-2">
                          <button className="p-2 hover:bg-gray-200 rounded" title="Share">
                            <Share2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(file.id)}
                            className="p-2 hover:bg-gray-200 rounded text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
