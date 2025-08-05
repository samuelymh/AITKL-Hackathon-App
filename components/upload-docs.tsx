"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabaseStorageService, UploadedFile } from "@/lib/services/supabase-storage-service";
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

export default function UploadDocs({
  onBack,
  onDataUploaded,
  userId,
}: UploadDocsProps) {
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Load previously uploaded files on component mount
  useEffect(() => {
    const loadExistingFiles = async () => {
      try {
        setIsLoadingFiles(true);
        const files = await supabaseStorageService.listUserFiles(userId);
        setUploadedFiles(files);
      } catch (error) {
        console.error('Error loading existing files:', error);
        toast({
          title: "Load Failed",
          description: "Unable to load previously uploaded files.",
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
      setIsUploading(true);
      const uploadedFile = await supabaseStorageService.uploadFile(file, userId);
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
      await supabaseStorageService.viewFile(file);
    } catch (error) {
      toast({
        title: "View Error",
        description: error instanceof Error ? error.message : "Unable to open the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file) return;

    try {
      await supabaseStorageService.deleteFile(file.path);
      setUploadedFiles((prev) => prev.filter(f => f.id !== fileId));
      toast({
        title: "File Deleted",
        description: `${file.name} has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Delete Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred while deleting the file.",
        variant: "destructive",
      });
    }
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
                      {supabaseStorageService.formatFileSize(file.size)} • {file.uploadedAt.toLocaleDateString()}
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
