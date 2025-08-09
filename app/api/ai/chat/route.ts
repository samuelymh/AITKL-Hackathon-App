import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { AIServiceFactory } from "@/lib/services/ai-service-factory";
// Import to ensure registration
import "@/lib/services/groq-healthcare";

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
      userId: z.string().optional(),
      patientId: z.string().optional(),
      practitionerId: z.string().optional(),
      organizationId: z.string().optional(),
      encounterId: z.string().optional(),
    })
    .optional(),
  userRole: z.enum(["patient", "doctor", "pharmacist", "admin"]).default("patient"),
  conversationHistory: z.array(z.any()).optional(),
});

// Initialize AI Service through factory
const aiService = AIServiceFactory.getService("groq");

/**
 * POST /api/ai/chat
 * Handle AI chat interactions
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  console.log("🚀 AI Chat API request received", { requestId });
  logger.info("AI Chat API request received", {
    requestId,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get("user-agent"),
    method: request.method,
  });

  try {
    console.log("📥 Starting request processing...");

    // Parse and validate request body
    const body = await request.json();
    console.log("📋 Request body parsed:", {
      messageLength: body.message?.length,
      sessionType: body.sessionType,
      userRole: body.userRole,
      context: body.context,
      hasContext: !!body.context,
      contextKeys: body.context ? Object.keys(body.context) : [],
    });

    const {
      sessionId,
      message,
      sessionType,
      context,
      userRole: requestedUserRole,
      conversationHistory,
    } = ChatRequestSchema.parse(body);

    console.log("✅ Request validation passed");

    // Get authentication context
    console.log("🔐 Getting auth context...");
    const authContext = getAuthContext(request);
    console.log("🔐 Auth context result:", {
      userId: authContext?.userId,
      role: authContext?.role,
      isAuthenticated: !!authContext,
    });

    if (!authContext) {
      console.log("❌ Authentication failed - no auth context");
      return NextResponse.json({ error: "Authentication required for AI chat" }, { status: 401 });
    }

    console.log("✅ Authentication successful");

    // Security check: Ensure the authenticated user matches the context
    if (context?.userId && context.userId !== authContext.userId) {
      console.log("❌ Security violation: User ID mismatch", {
        authUserId: authContext.userId,
        contextUserId: context.userId,
      });
      return NextResponse.json({ error: "Access denied: User ID mismatch" }, { status: 403 });
    }

    // Validate user role matches the request
    let userRole = requestedUserRole;
    if (requestedUserRole !== authContext.role) {
      console.log("⚠️ Role mismatch detected", {
        requestRole: requestedUserRole,
        authRole: authContext.role,
      });
      // Use the authenticated role instead of the requested role for security
      userRole = authContext.role as typeof userRole;
    }

    console.log("✅ Security validation passed");

    // Connect to database
    console.log("📡 Connecting to database...");
    await connectToDatabase();
    console.log("✅ Database connected");

    // Rate limiting check (basic implementation)
    console.log("⏱️ Checking rate limits...");
    const userRequestKey = `ai_chat_${authContext.userId}`;
    // Rate limiting logic would go here...

    // Generate AI response using Groq
    console.log("🤖 Generating AI response...");
    console.log("📊 AI request parameters:", {
      message: message.substring(0, 100) + "...",
      sessionType,
      userRole,
      context,
      hasConversationHistory: !!conversationHistory,
      authUserId: authContext.userId,
    });

    const aiStartTime = Date.now();
    const aiResponse = await aiService.generateResponse(message, sessionType, userRole, context, conversationHistory);
    const aiProcessingTime = Date.now() - aiStartTime;
    console.log("✅ AI response generated", {
      processingTime: aiProcessingTime,
      tokensUsed: aiResponse.tokensUsed,
      emergencyDetected: aiResponse.emergencyDetected,
    });

    // Log the AI interaction for audit purposes
    console.log("📋 Logging audit event...");
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
      console.log("🚨 Emergency detected, logging security event...");
      await auditLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, request, authContext.userId, {
        action: "EMERGENCY_DETECTED",
        sessionId,
        emergencyContext: aiResponse.emergencyContext,
        message: message.substring(0, 100), // Log first 100 chars for context
        requiresImmediateAction: true,
      });

      logger.warn("Emergency situation detected in AI chat", {
        requestId,
        userId: authContext.userId,
        sessionId,
        emergencyContext: aiResponse.emergencyContext,
      });
    }

    // Successful response
    console.log("🎉 AI Chat processing completed successfully");
    logger.info("AI Chat interaction completed successfully", {
      requestId,
      userId: authContext.userId,
      sessionId,
      sessionType,
      tokensUsed: aiResponse.tokensUsed,
      processingTime: Date.now() - startTime,
      emergencyDetected: aiResponse.emergencyDetected,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      response: aiResponse.response,
      emergencyDetected: aiResponse.emergencyDetected,
      emergencyContext: aiResponse.emergencyContext,
      tokensUsed: aiResponse.tokensUsed,
      confidence: aiResponse.confidence,
      modelUsed: aiResponse.modelUsed,
      requestId,
    });
  } catch (error) {
    console.error("❌ AI Chat API error:", error);
    logger.error("AI Chat API request failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
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
          provider: "Groq",
          model: "llama-3.3-70b-versatile",
          availableModels: ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"],
          supportedSessionTypes: [
            "consultation_prep",
            "clinical_support",
            "medication_education",
            "emergency_triage",
            "general",
          ],
          features: {
            emergencyDetection: true,
            functionCalling: true,
            roleBasedResponses: true,
            auditLogging: true,
          },
        },
      });
    }

    // Default response
    return NextResponse.json({
      success: true,
      message: "AI Chat API powered by Groq + Llama 3.3 70B is running. Use POST to send messages.",
    });
  } catch (error) {
    logger.error("AI Chat GET Error:", {
      error: error instanceof Error ? error.message : error,
    });

    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
