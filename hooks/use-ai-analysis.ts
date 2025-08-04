import { useState } from 'react';
import { DocumentAnalysis } from '@/lib/services/gemini-service';
import { useToast } from '@/hooks/use-toast';

interface UseAIAnalysisProps {
  userId: string;
}

interface UseAIAnalysisReturn {
  isAnalyzing: boolean;
  analysis: DocumentAnalysis | null;
  showAnalysis: boolean;
  analyzeDocuments: (fileIds: string[]) => Promise<void>;
  resetAnalysis: () => void;
}

export function useAIAnalysis({ userId }: UseAIAnalysisProps): UseAIAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const { toast } = useToast();

  const analyzeDocuments = async (fileIds: string[]) => {
    if (fileIds.length === 0) {
      toast({
        title: "No Documents",
        description: "Please upload documents first before analyzing.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileIds,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze documents');
      }

      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data.analysis);
        setShowAnalysis(true);
        toast({
          title: "Analysis Complete",
          description: `Successfully analyzed ${data.documentsAnalyzed} document${data.documentsAnalyzed > 1 ? 's' : ''}.`,
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Error analyzing documents:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setShowAnalysis(false);
  };

  return {
    isAnalyzing,
    analysis,
    showAnalysis,
    analyzeDocuments,
    resetAnalysis,
  };
} 