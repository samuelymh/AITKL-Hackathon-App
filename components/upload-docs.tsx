"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import AIDocumentAnalysis from "./ai-document-analysis";

import {
  ArrowLeft,
  Upload,
  FileText,
  X,
  Loader2,
} from "lucide-react";

interface UploadDocsProps {
  onBack: () => void;
  onDataUploaded: (data: any) => void;
  userId: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  url: string;
  path: string;
  uploadedAt: Date;
}

export default function UploadDocs({
  onBack,
  onDataUploaded,
  userId,
}: UploadDocsProps) {
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [storageName, setStorageName] = useState('medical-records');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Load previously uploaded files on component mount
  useEffect(() => {
    const loadExistingFiles = async () => {
      try {
        setIsLoadingFiles(true);
        
        // List all files in the user's folder
        const { data: files, error } = await supabase.storage
          .from('medical-records')
          .list(`${userId}/`, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (error) {
          console.error('Error loading existing files:', error);
          toast({
            title: "Load Failed",
            description: "Unable to load previously uploaded files.",
            variant: "destructive",
          });
          return;
        }

        if (files?.length > 0) {
          const existingFiles: UploadedFile[] = [];
          
          for (const file of files) {
            if (file?.name) {
              // Get public URL for each file
              const { data: urlData } = supabase.storage
                .from('medical-records')
                .getPublicUrl(`${userId}/${file.name}`);

              // Extract original filename from the stored filename (remove timestamp prefix)
              const originalName = file.name.replace(/^\d+-/, '');
              
              const uploadedFile: UploadedFile = {
                id: `${userId}/${file.name}`, // Use the full path as unique ID
                name: originalName,
                size: file.metadata?.size || 0,
                url: urlData.publicUrl,
                path: `${userId}/${file.name}`,
                uploadedAt: new Date(file.created_at || Date.now()),
              };

              existingFiles.push(uploadedFile);
            }
          }

          setUploadedFiles(existingFiles);
        }
      } catch (error) {
        console.error('Error loading existing files:', error);
        toast({
          title: "Load Error",
          description: "An unexpected error occurred while loading files.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingFiles(false);
      }
    };

    if (userId) {
      loadExistingFiles();
    }
  }, [userId, toast, onDataUploaded]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await uploadFile(file);
    }
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    try {
      // Validate file type
      if (!file.type.includes('pdf')) {
        toast({
          title: "Invalid File Type",
          description: "Only PDF files are allowed",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 100MB",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);

      // Generate unique filename with user ID folder
      const timestamp = Date.now();
      const fileName = `${userId}/${timestamp}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from(storageName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(storageName)
        .getPublicUrl(fileName);

      const uploadedFile: UploadedFile = {
        id: data.path,
        name: file.name,
        size: file.size,
        url: urlData.publicUrl,
        path: data.path,
        uploadedAt: new Date(),
      };

      setUploadedFiles((prev) => [...prev, uploadedFile]);

      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded successfully.`,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewFile = async (file: UploadedFile) => {
    try {
      // First, try to get a fresh download URL (in case the previous one expired)
      const { data, error } = await supabase.storage
        .from(storageName)
        .createSignedUrl(file.path, 60); // 60 seconds expiry

      if (error) {
        toast({
          title: "View Failed",
          description: "Unable to access the file. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Open the file in a new tab
      window.open(data.signedUrl, '_blank');
      
    } catch (error) {
      // Fallback to the stored URL if signed URL fails
      if (file.url) {
        window.open(file.url, '_blank');
      } else {
        toast({
          title: "View Error",
          description: "Unable to open the file. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file) return;

    try {
      const { error } = await supabase.storage
        .from(storageName)
        .remove([file.path]);

      if (error) {
        toast({
          title: "Delete Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setUploadedFiles((prev) => prev.filter(f => f.id !== fileId));
      toast({
        title: "File Deleted",
        description: `${file.name} has been deleted.`,
      });

    } catch (error) {
      toast({
        title: "Delete Error",
        description: "An unexpected error occurred while deleting the file.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Upload Health Documents</h1>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Document Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
            <Upload className="w-12 h-12 mx-auto text-blue-400 mb-4" />
            <p className="text-lg font-semibold text-gray-700 mb-2">
              Upload Medical Records
            </p>
            <p className="text-sm text-gray-500 mb-4">
              PDF files only, up to 10MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Choose Files"
              )}
            </Button>
          </div>

          {/* Uploaded Files */}
          {isLoadingFiles ? (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
              <p className="text-lg text-gray-600 mt-4">Loading uploaded files...</p>
            </div>
          ) : uploadedFiles?.length ? (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Uploaded Files</h3>
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                >
                  <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block truncate" title={file.name}>{file.name}</span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {file.uploadedAt.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewFile(file)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="w-4 h-4" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete file"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg text-gray-600 mb-4">No files uploaded yet.</p>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
