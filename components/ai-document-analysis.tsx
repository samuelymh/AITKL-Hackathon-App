"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { UploadedFile, supabaseStorageService } from "@/lib/services/supabase-storage-service";

import {
  Brain,
  Loader2,
} from "lucide-react";

interface GeminiFile {
  name: string;
  mimeType: string;
  data: string;
}

interface AIDocumentAnalysisProps {
  uploadedFiles: UploadedFile[];
  onRefresh?: () => void;
}

interface DownloadedFile {
  file: UploadedFile;
  binaryData: ArrayBuffer;
}

export default function AIDocumentAnalysis({
  uploadedFiles,
}: AIDocumentAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const { toast } = useToast();

  // Create a cache key based on file IDs
  const fileCacheKey = useMemo(() => 
    uploadedFiles.map(file => file.id).join(','), 
    [uploadedFiles]
  );

  // Persistent cache using localStorage
  const [analysisCache, setAnalysisCache] = useState<Map<string, string>>(() => {
    try {
      const cached = localStorage.getItem('ai-analysis-cache');
      return cached ? new Map(JSON.parse(cached)) : new Map<string, string>();
    } catch (error) {
      console.error('Error loading cache from localStorage:', error);
      return new Map<string, string>();
    }
  });

  // Save cache to localStorage
  const saveCacheToStorage = useCallback((cache: Map<unknown, unknown>) => {
    try {
      localStorage.setItem('ai-analysis-cache', JSON.stringify(Array.from(cache.entries())));
    } catch (error) {
      console.error('Error saving cache to localStorage:', error);
    }
  }, []);

  useEffect(() => {
    const performAnalysis = async () => {
      if (uploadedFiles.length === 0) {
        setAnalysisResult("");
        return;
      }

      // Check if we have a cached result for these files
      if (analysisCache.has(fileCacheKey)) {
        const cachedResult = analysisCache.get(fileCacheKey);
        if (cachedResult) {
          setAnalysisResult(cachedResult);
          return;
        }
      }

      try {
        setIsAnalyzing(true);
        
        // Step 1: Download files as binary data
        const downloadedFiles = await downloadFilesForAnalysis();
        // Step 2: Prepare files for Gemini API
        const filesForGemini = await prepareFilesForGemini(downloadedFiles);
        // Step 3: Send to Gemini API
        const result = await analyzeWithGemini(filesForGemini);
        
        // Cache the result
        const newCache = new Map(analysisCache);
        newCache.set(fileCacheKey, result);
        setAnalysisCache(newCache);
        setAnalysisResult(result);
        
        // Save to localStorage
        saveCacheToStorage(newCache);
        
        toast({
          title: "Analysis Complete",
          description: "Documents have been analyzed successfully.",
        });
      } catch (error) {
        console.error('Analysis failed:', error);
        toast({
          title: "Analysis Failed",
          description: error instanceof Error ? error.message : "An error occurred during analysis.",
          variant: "destructive",
        });
      } finally {
        setIsAnalyzing(false);
      }
    };

    performAnalysis();
  }, [fileCacheKey, uploadedFiles.length, analysisCache, toast]);

  // Method to download files and prepare for Gemini API
  const downloadFilesForAnalysis = async (): Promise<DownloadedFile[]> => {
    try {
      console.log(`Downloading ${uploadedFiles.length} files for analysis...`);
      
      // Download all files as binary data
      const downloadedFiles = await supabaseStorageService.downloadFilesAsBinary(uploadedFiles);
      
      console.log('Files downloaded successfully:', downloadedFiles.map(f => f.file.name));
      return downloadedFiles;
    } catch (error) {
      console.error('Error downloading files:', error);
      throw new Error(`Failed to download files for analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Method to prepare files for Gemini API
  const prepareFilesForGemini = async (downloadedFiles: DownloadedFile[]): Promise<GeminiFile[]> => {
    // Convert ArrayBuffer to base64 for Gemini API
    const filesForGemini = downloadedFiles.map(({ file, binaryData }) => {
      const base64Data = btoa(
        new Uint8Array(binaryData)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      return {
        name: file.name,
        mimeType: 'application/pdf', // Assuming PDF files
        data: base64Data
      };
    });

    console.log('Files prepared for Gemini API:', filesForGemini.map(f => f.name));
    return filesForGemini;
  };

  // Call Gemini API via our server endpoint
  const analyzeWithGemini = async (filesForGemini: GeminiFile[]) => {
    try {
      console.log('Sending files to Gemini API:', filesForGemini.map(f => f.name));
      
      // Call our API route which handles the Gemini service
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: filesForGemini }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.analysis) {
        throw new Error('Invalid response from analysis API');
      }

      // Return the summary from the analysis
      console.log('data.analysis.summary', data.analysis.summary)
      return data.analysis.summary;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            AI Document Analysis
          </h2>
          <p className="text-gray-600">
            Analysis of {uploadedFiles.length} medical document{uploadedFiles.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Document Summary */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Summary</h3>
      <div className="text-gray-700 leading-relaxed">
        {isAnalyzing ? (
          <div className="flex items-center justify-center">
            <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
          </div>
        ) : analysisResult ? (
          <div 
            className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-ul:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-em:text-gray-600"
            dangerouslySetInnerHTML={{ __html: analysisResult }}
          />
        ) : (
          <p className="text-gray-500">No analysis available yet.</p>
        )}
      </div>
    </div>
  );
} 