import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";
import { logger } from "@/lib/logger";
import { z } from "zod";
import mongoose from "mongoose";

// AI Chat Session Schema
const ChatSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      enum: ["patient", "doctor", "pharmacist", "admin"],
      required: true,
    },
    sessionType: {
      type: String,
      enum: ["consultation_prep", "clinical_support", "medication_education", "emergency_triage", "general"],
      required: true,
    },
    title: {
      type: String,
      default: "New Chat Session",
    },
    context: {
      patientId: String,
      practitionerId: String,
      organizationId: String,
      encounterId: String,
      department: String,
      specialty: String,
    },
    messages: [
      {
        messageId: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          enum: ["user", "assistant", "system"],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        metadata: {
          tokensUsed: Number,
          responseTime: Number,
          confidence: Number,
          modelUsed: String,
          emergencyDetected: Boolean,
        },
      },
    ],
    status: {
      type: String,
      enum: ["active", "archived", "emergency_flagged"],
      default: "active",
    },
    analytics: {
      totalMessages: {
        type: Number,
        default: 0,
      },
      totalTokensUsed: {
        type: Number,
        default: 0,
      },
      averageResponseTime: {
        type: Number,
        default: 0,
      },
      emergencyFlagged: {
        type: Boolean,
        default: false,
      },
      lastActivity: {
        type: Date,
        default: Date.now,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
ChatSessionSchema.index({ userId: 1, sessionType: 1 });
ChatSessionSchema.index({ createdAt: -1 });
ChatSessionSchema.index({ "analytics.lastActivity": -1 });

const ChatSession = mongoose.models.ChatSession || mongoose.model("ChatSession", ChatSessionSchema);

// Validation schemas
const CreateSessionSchema = z.object({
  sessionType: z.enum(["consultation_prep", "clinical_support", "medication_education", "emergency_triage", "general"]),
  title: z.string().min(1).max(200).optional(),
  context: z
    .object({
      patientId: z.string().optional(),
      practitionerId: z.string().optional(),
      organizationId: z.string().optional(),
      encounterId: z.string().optional(),
      department: z.string().optional(),
      specialty: z.string().optional(),
    })
    .optional(),
});

const UpdateSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["active", "archived", "emergency_flagged"]).optional(),
  context: z
    .object({
      patientId: z.string().optional(),
      practitionerId: z.string().optional(),
      organizationId: z.string().optional(),
      encounterId: z.string().optional(),
      department: z.string().optional(),
      specialty: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/ai/sessions
 * Create a new AI chat session
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateSessionSchema.parse(body);

    // Generate unique session ID
    const sessionId = `${authContext.role}_${authContext.userId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Generate session title if not provided
    const sessionTitle = validatedData.title || generateSessionTitle(validatedData.sessionType, authContext.role);

    // Create new chat session
    const newSession = new ChatSession({
      sessionId,
      userId: authContext.userId,
      userRole: authContext.role,
      sessionType: validatedData.sessionType,
      title: sessionTitle,
      context: validatedData.context || {},
      messages: [],
      status: "active",
      analytics: {
        totalMessages: 0,
        totalTokensUsed: 0,
        averageResponseTime: 0,
        emergencyFlagged: false,
        lastActivity: new Date(),
      },
    });

    await newSession.save();

    // Log session creation
    await auditLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS, request, authContext.userId, {
      action: "AI_SESSION_CREATED",
      sessionId,
      sessionType: validatedData.sessionType,
      userRole: authContext.role,
      context: validatedData.context || {},
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        title: sessionTitle,
        sessionType: validatedData.sessionType,
        context: validatedData.context || {},
        createdAt: newSession.createdAt,
        status: "active",
      },
    });
  } catch (error) {
    logger.error("Create AI Session Error:", {
      error: error instanceof Error ? error.message : error,
    });

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

    return NextResponse.json({ success: false, error: "Failed to create session" }, { status: 500 });
  }
}

/**
 * GET /api/ai/sessions
 * Get user's AI chat sessions
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionType = searchParams.get("sessionType");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    const query: any = { userId: authContext.userId };

    if (sessionType) {
      query.sessionType = sessionType;
    }

    if (status) {
      query.status = status;
    }

    // Get sessions
    const sessions = await ChatSession.find(query)
      .select("-messages") // Exclude messages for performance
      .sort({ "analytics.lastActivity": -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    const totalSessions = await ChatSession.countDocuments(query);

    // Log session retrieval
    await auditLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS, request, authContext.userId, {
      action: "AI_SESSIONS_RETRIEVED",
      sessionCount: sessions.length,
      filters: { sessionType, status },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessions.map((session) => ({
          sessionId: session.sessionId,
          title: session.title,
          sessionType: session.sessionType,
          status: session.status,
          context: session.context,
          analytics: session.analytics,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        })),
        pagination: {
          total: totalSessions,
          limit,
          offset,
          hasMore: offset + sessions.length < totalSessions,
        },
      },
    });
  } catch (error) {
    logger.error("Get AI Sessions Error:", {
      error: error instanceof Error ? error.message : error,
    });

    return NextResponse.json({ success: false, error: "Failed to retrieve sessions" }, { status: 500 });
  }
}

/**
 * PATCH /api/ai/sessions
 * Update an AI chat session
 */
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();

    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = UpdateSessionSchema.parse(body);

    // Find and update session
    const session = await ChatSession.findOne({
      sessionId,
      userId: authContext.userId,
    });

    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    // Update fields
    if (validatedData.title) {
      session.title = validatedData.title;
    }

    if (validatedData.status) {
      session.status = validatedData.status;
    }

    if (validatedData.context) {
      session.context = { ...session.context, ...validatedData.context };
    }

    session.updatedAt = new Date();
    await session.save();

    // Log session update
    await auditLogger.logSecurityEvent(SecurityEventType.DATA_MODIFICATION, request, authContext.userId, {
      action: "AI_SESSION_UPDATED",
      sessionId,
      updates: validatedData,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        title: session.title,
        sessionType: session.sessionType,
        status: session.status,
        context: session.context,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Update AI Session Error:", {
      error: error instanceof Error ? error.message : error,
    });

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

    return NextResponse.json({ success: false, error: "Failed to update session" }, { status: 500 });
  }
}

/**
 * DELETE /api/ai/sessions
 * Delete an AI chat session
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 });
    }

    // Find and delete session
    const deletedSession = await ChatSession.findOneAndDelete({
      sessionId,
      userId: authContext.userId,
    });

    if (!deletedSession) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    // Log session deletion
    await auditLogger.logSecurityEvent(SecurityEventType.DATA_DELETION, request, authContext.userId, {
      action: "AI_SESSION_DELETED",
      sessionId,
      sessionType: deletedSession.sessionType,
      messageCount: deletedSession.messages.length,
    });

    return NextResponse.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    logger.error("Delete AI Session Error:", {
      error: error instanceof Error ? error.message : error,
    });

    return NextResponse.json({ success: false, error: "Failed to delete session" }, { status: 500 });
  }
}

// Helper function to generate session titles
function generateSessionTitle(sessionType: string, userRole: string): string {
  const titles = {
    consultation_prep: {
      patient: "Preparing for Your Visit",
      doctor: "Patient Consultation Prep",
      pharmacist: "Medication Consultation Prep",
      admin: "Healthcare Consultation Support",
    },
    clinical_support: {
      patient: "Health Questions",
      doctor: "Clinical Decision Support",
      pharmacist: "Clinical Consultation",
      admin: "Clinical Overview",
    },
    medication_education: {
      patient: "About Your Medications",
      doctor: "Medication Information",
      pharmacist: "Medication Counseling",
      admin: "Medication Management",
    },
    emergency_triage: {
      patient: "Urgent Health Assessment",
      doctor: "Emergency Triage Support",
      pharmacist: "Emergency Medication Support",
      admin: "Emergency Response Support",
    },
    general: {
      patient: "Health Assistant",
      doctor: "Medical AI Assistant",
      pharmacist: "Pharmacy AI Assistant",
      admin: "Healthcare AI Assistant",
    },
  };

  return titles[sessionType]?.[userRole] || "AI Chat Session";
}
