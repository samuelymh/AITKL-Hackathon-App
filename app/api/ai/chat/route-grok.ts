import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { GrokHealthcareService } from "@/lib/services/grok-healthcare";

// Types for the AI chat system
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;
    confidence?: number;
    modelUsed?: string;
  };
}

interface ChatContext {
  patientId?: string;
  practitionerId?: string;
  organizationId?: string;
  encounterId?: string;
}

// Validation schema
const ChatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(2000),
  sessionType: z.enum(["consultation_prep", "clinical_support", "medication_education", "emergency_triage", "general"]),
  context: z
    .object({
      patientId: z.string().optional(),
      practitionerId: z.string().optional(),
      organizationId: z.string().optional(),
      encounterId: z.string().optional(),
    })
    .optional(),
  userRole: z.enum(["patient", "doctor", "pharmacist", "admin"]).default("patient"),
  conversationHistory: z.array(z.any()).optional(),
});

// Initialize Grok AI Service
const aiService = new GrokHealthcareService();

/**
 * POST /api/ai/chat
 * Handle AI chat interactions
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    await connectToDatabase();

    // Get authenticated user context
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required for AI chat",
        },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = ChatRequestSchema.parse(body);

    const { sessionId, message, sessionType, context, userRole, conversationHistory } = validatedData;

    // Security check: Ensure user role matches authenticated user role
    if (userRole !== authContext.role) {
      logger.warn(`Role mismatch in AI chat: claimed ${userRole}, actual ${authContext.role}`, {
        userId: authContext.userId,
        sessionId,
      });
    }

    // Rate limiting check (basic implementation)
    // In production, implement more sophisticated rate limiting
    const userRequestKey = `ai_chat_${authContext.userId}`;
    // Rate limiting logic would go here...

    // Generate AI response using Grok
    const aiStartTime = Date.now();
    const aiResponse = await aiService.generateResponse(
      message,
      sessionType,
      authContext.role as 'patient' | 'doctor' | 'pharmacist' | 'admin',
      context,
      conversationHistory
    );
    const aiProcessingTime = Date.now() - aiStartTime;

    // Log the AI interaction for audit purposes
    await auditLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS, request, authContext.userId, {
      action: "AI_CHAT_INTERACTION",
      sessionId,
      sessionType,
      messageLength: message.length,
      tokensUsed: aiResponse.tokensUsed,
      processingTime: aiProcessingTime,
      modelUsed: aiResponse.modelUsed,
      emergencyDetected: aiResponse.emergencyDetected,
      userRole: authContext.role,
      context: context || {},
    });

    // If emergency detected, log additional security event
    if (aiResponse.emergencyDetected) {
      await auditLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, request, authContext.userId, {
        action: "EMERGENCY_SCENARIO_DETECTED",
        sessionId,
        emergencyContext: aiResponse.emergencyContext,
        userMessage: message,
        responseTime: aiProcessingTime,
      });
    }

    const totalProcessingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        response: aiResponse.response,
        emergencyDetected: aiResponse.emergencyDetected,
        emergencyContext: aiResponse.emergencyContext,
      },
      metadata: {
        sessionId,
        modelUsed: aiResponse.modelUsed,
        tokensUsed: aiResponse.tokensUsed,
        confidence: aiResponse.confidence,
        processingTime: totalProcessingTime,
        aiProcessingTime,
        timestamp: new Date().toISOString(),
      },
      disclaimers: {
        medical:
          "This AI assistant provides educational information only and does not replace professional medical advice. Always consult with qualified healthcare providers for medical decisions.",
        aiLimitations:
          "AI responses are generated based on training data and may not always be accurate or complete. Use your judgment and seek professional advice when needed.",
        emergencyInstructions: aiResponse.emergencyDetected
          ? "If this is a medical emergency, call 911 immediately or go to your nearest emergency room."
          : undefined,
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error("AI Chat Error:", {
      error: error instanceof Error ? error.message : error,
      processingTime,
    });

    // Try to log the error if we have auth context
    try {
      const authContext = await getAuthContext(request);
      if (authContext) {
        await auditLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, request, authContext.userId, {
          action: "AI_CHAT_ERROR",
          error: error instanceof Error ? error.message : "Unknown error",
          processingTime,
        });
      }
    } catch (logError) {
      logger.error("Failed to log AI chat error:", {
        logError: logError instanceof Error ? logError.message : logError,
      });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Please try again.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/chat
 * Get chat session information or health check
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "health") {
      return NextResponse.json({
        success: true,
        data: {
          status: "healthy",
          version: "2.0.0",
          provider: "Grok (xAI)",
          availableModels: ["grok-beta"],
          supportedSessionTypes: ["consultation_prep", "clinical_support", "medication_education", "emergency_triage", "general"],
          features: {
            emergencyDetection: true,
            functionCalling: process.env.GROK_ENABLE_FUNCTIONS === 'true',
            roleBasedResponses: true,
            auditLogging: true
          }
        },
      });
    }

    // Default response
    return NextResponse.json({
      success: true,
      message: "AI Chat API powered by Grok is running. Use POST to send messages.",
    });
  } catch (error) {
    logger.error("AI Chat GET Error:", {
      error: error instanceof Error ? error.message : error,
    });

    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
