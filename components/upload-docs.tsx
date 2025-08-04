"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

import {
  ArrowLeft,
  Upload,
  FileText,
  Check,
  Share2,
  Calendar,
  Pill,
  Activity,
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

const careTimeline = [
  {
    date: "July 2024",
    type: "diagnosis",
    title: "Hypertension Diagnosis",
    provider: "Dr. Ahmad Hassan",
    icon: Activity,
    color: "red",
  },
  {
    date: "June 2024",
    type: "medication",
    title: "Lisinopril 10mg prescribed",
    provider: "Dr. Ahmad Hassan",
    icon: Pill,
    color: "blue",
  },
  {
    date: "May 2024",
    type: "visit",
    title: "Annual Physical Exam",
    provider: "Dr. Sarah Johnson",
    icon: Calendar,
    color: "green",
  },
  {
    date: "March 2024",
    type: "diagnosis",
    title: "Type 2 Diabetes",
    provider: "Dr. Lisa Chen",
    icon: Activity,
    color: "orange",
  },
];

export default function UploadDocs({
  onBack,
  onDataUploaded,
  userId,
}: UploadDocsProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const handleShareSummary = () => {
    // This would generate a QR code for the care summary
    alert("QR code generated for care summary sharing!");
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

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);

      // Generate unique filename with user ID folder
      const timestamp = Date.now();
      const fileName = `${userId}/${timestamp}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('medical-records')
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
        .from('medical-records')
        .getPublicUrl(fileName);

      const uploadedFile: UploadedFile = {
        id: Date.now().toString(),
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

      // Show timeline after first successful upload
      if (uploadedFiles.length === 0) {
        setTimeout(() => {
          setShowTimeline(true);
          onDataUploaded(careTimeline);
        }, 1000);
      }

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
        .from('medical-records')
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
        .from('medical-records')
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
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Uploaded Files</h3>
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                >
                  <FileText className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <span className="text-sm font-medium block">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {file.uploadedAt.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewFile(file)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="w-4 h-4 mr-1" />
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
          )}

          {/* AI Insights Section */}
          {uploadedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  AI Document Analysis
                </CardTitle>
                <p className="text-sm text-gray-600">
                  AI-powered insights from your uploaded medical documents
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key Findings */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Key Findings
                  </h4>
                  <div className="grid gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Hypertension Detected</p>
                          <p className="text-xs text-gray-600">Blood pressure readings consistently above 140/90 mmHg</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Elevated Cholesterol</p>
                          <p className="text-xs text-gray-600">LDL levels at 160 mg/dL, above recommended range</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Normal Kidney Function</p>
                          <p className="text-xs text-gray-600">Creatinine levels within normal range (0.7-1.3 mg/dL)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-blue-600" />
                    AI Recommendations
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-purple-600">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Schedule Follow-up Appointment</p>
                        <p className="text-xs text-gray-600">Recommended within 2-4 weeks to monitor blood pressure</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-purple-600">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Lifestyle Modifications</p>
                        <p className="text-xs text-gray-600">Reduce sodium intake, increase physical activity, consider DASH diet</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-purple-600">3</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Medication Review</p>
                        <p className="text-xs text-gray-600">Current Lisinopril dosage appears effective, continue as prescribed</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-red-600" />
                    Risk Assessment
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-xs font-bold text-red-600">H</span>
                      </div>
                      <p className="text-xs font-medium text-gray-900">High Risk</p>
                      <p className="text-xs text-gray-600">Cardiovascular</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-xs font-bold text-yellow-600">M</span>
                      </div>
                      <p className="text-xs font-medium text-gray-900">Medium Risk</p>
                      <p className="text-xs text-gray-600">Diabetes</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-xs font-bold text-green-600">L</span>
                      </div>
                      <p className="text-xs font-medium text-gray-900">Low Risk</p>
                      <p className="text-xs text-gray-600">Kidney Disease</p>
                    </div>
                  </div>
                </div>

                {/* Document Summary */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    Document Summary
                  </h4>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700">
                      Analysis of {uploadedFiles.length} medical document{uploadedFiles.length > 1 ? 's' : ''} reveals 
                      consistent patterns of hypertension management with current medication showing positive effects. 
                      Lab results indicate elevated cholesterol levels requiring dietary intervention. Overall health 
                      status shows improvement with continued medication adherence.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* AI-Generated Care Timeline */}
      {showTimeline && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                AI-Generated Care Timeline
              </CardTitle>
              <p className="text-sm text-gray-600">
                Based on your uploaded documents
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {careTimeline.map((event, index) => {
                const IconComponent = event.icon;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full bg-${event.color}-100 flex items-center justify-center flex-shrink-0`}
                    >
                      <IconComponent
                        className={`w-5 h-5 text-${event.color}-600`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {event.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{event.provider}</p>
                      <p className="text-xs text-gray-500">{event.date}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Share Summary Button */}
          <Button
            onClick={handleShareSummary}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share Summary as QR Code
          </Button>
        </>
      )}
    </div>
  );
}
