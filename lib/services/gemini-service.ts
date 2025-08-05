export interface DocumentAnalysis {
  summary: string;
}

export interface GeminiFile {
  name: string;
  mimeType: string;
  data: string; // base64 encoded
}

export class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  constructor() {
    this.apiKey = process.env.GOOGLE_AI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('GOOGLE_AI_API_KEY not found in environment variables');
    }
  }

  /**
   * Analyze medical documents using Gemini AI
   */
  async analyzeDocuments(files: GeminiFile[]): Promise<DocumentAnalysis> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    if (files.length === 0) {
      throw new Error('No files provided for analysis');
    }

    try {
      // Prepare the request payload for Gemini API
      const contents = [
        {
          parts: [
            {
              text: "Analyze the files content and provide a comprehensive summary of the medical documents. Format your response as structured HTML with the following sections: 1) Executive Summary (h3), 2) Key Findings (h4 with bullet points), 3) Medical Information (h4 with relevant details), 4) Recommendations (h4 with actionable items). Use proper HTML tags like <h3>, <h4>, <ul>, <li>, <p>, <strong>, and <em> to structure the content. Focus on key medical information, findings, and important details that would be relevant for healthcare professionals."
            },
            ...files.map(file => ({
              inlineData: {
                mimeType: file.mimeType,
                data: file.data
              }
            }))
          ]
        }
      ];

      const requestBody = {
        contents,
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
      }

      const analysisText = data.candidates[0].content.parts[0].text;
      
      // Parse the response and structure it
      return this.parseAnalysisResponse(analysisText, files);
      
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error(`Failed to analyze documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse the raw text response from Gemini into structured data
   */
  private parseAnalysisResponse(analysisText: string, files: GeminiFile[]): DocumentAnalysis {
    const fileNames = files.map(f => f.name).join(", ");
    
    // Extract HTML content from markdown code blocks if present
    let cleanHtml = analysisText;
    
    // Remove markdown code block wrappers (```html ... ```)
    const htmlCodeBlockRegex = /```html\s*([\s\S]*?)\s*```/;
    const match = analysisText.match(htmlCodeBlockRegex);
    
    if (match && match[1]) {
      cleanHtml = match[1].trim();
    } else {
      // If no code blocks, check for regular code blocks (``` ... ```)
      const codeBlockRegex = /```\s*([\s\S]*?)\s*```/;
      const codeMatch = analysisText.match(codeBlockRegex);
      
      if (codeMatch && codeMatch[1]) {
        cleanHtml = codeMatch[1].trim();
      }
    }
    
    return {
      summary: cleanHtml
    };
  }

  /**
   * Health check for the Gemini service
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }
      
      // Make a simple test request
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Hello, this is a health check."
            }]
          }]
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Gemini health check failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const geminiService = new GeminiService(); 