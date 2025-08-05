import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/services/gemini-service';

export async function POST(request: NextRequest) {
  try {
    const isHealthy = await geminiService.healthCheck();

    if (!isHealthy) {
      return NextResponse.json(
        { error: 'Gemini service is not healthy' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { files } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided for analysis' },
        { status: 400 }
      );
    }

    // Validate file structure
    for (const file of files) {
      if (!file.name || !file.mimeType || !file.data) {
        return NextResponse.json(
          { error: 'Invalid file structure. Each file must have name, mimeType, and data' },
          { status: 400 }
        );
      }
    }

    // Call Gemini service to analyze documents
    const analysis = await geminiService.analyzeDocuments(files);

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Analysis API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Health check endpoint
    const isHealthy = await geminiService.healthCheck();

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'gemini-analysis',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      { 
        status: 'unhealthy',
        service: 'gemini-analysis',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 