import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import User from "@/lib/models/User";
import Organization from "@/lib/models/Organization";
import { QRCodeService } from "@/lib/services/qr-code-service";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";
import { AuthorizationPermissions } from "@/lib/utils/authorization-permissions";
import { z } from "zod";

// Validation schemas
const CreateGrantRequestSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
  requestingPractitionerId: z.string().optional(),
  accessScope: z.array(z.string()).min(1, "At least one access scope is required"),
  timeWindowHours: z.number().min(1).max(168, "Time window must be between 1 and 168 hours"), // Max 1 week
  justification: z.string().min(10, "Justification must be at least 10 characters"),
  metadata: z
    .object({
      requestSource: z.string().optional(),
      urgencyLevel: z.enum(["low", "normal", "high", "critical"]).default("normal"),
      autoApprove: z.boolean().default(false),
    })
    .optional(),
});

/**
 * POST /api/authorization/request
 * Create a new authorization grant request
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const validatedData = CreateGrantRequestSchema.parse(body);

    // Verify that user exists
    const user = await User.findById(validatedData.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify that organization exists
    const organization = await Organization.findById(validatedData.organizationId);
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Verify practitioner permissions if provided
    if (validatedData.requestingPractitionerId) {
      const permissionCheck = await AuthorizationPermissions.canRequestGrant(
        validatedData.requestingPractitionerId,
        validatedData.organizationId,
        validatedData.accessScope
      );

      if (!permissionCheck.allowed) {
        return NextResponse.json({ error: permissionCheck.error }, { status: 403 });
      }
    }

    // Check for existing active grants between user and organization
    const existingGrant = await AuthorizationGrant.findOne({
      userId: validatedData.userId,
      organizationId: validatedData.organizationId,
      "grantDetails.status": "ACTIVE",
    });

    if (existingGrant) {
      return NextResponse.json(
        {
          error: "An active authorization grant already exists between this user and organization",
          existingGrantId: existingGrant._id,
        },
        { status: 409 }
      );
    }

    // Create the authorization grant
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + validatedData.timeWindowHours);

    const authGrant = new AuthorizationGrant({
      userId: validatedData.userId,
      organizationId: validatedData.organizationId,
      requestingPractitionerId: validatedData.requestingPractitionerId,
      grantDetails: {
        status: validatedData.metadata?.autoApprove ? "ACTIVE" : "PENDING",
        timeWindowHours: validatedData.timeWindowHours,
        expiresAt: expiresAt,
        justification: validatedData.justification,
      },
      accessScope: validatedData.accessScope,
      metadata: {
        requestSource: validatedData.metadata?.requestSource || "api",
        urgencyLevel: validatedData.metadata?.urgencyLevel || "normal",
        requestedAt: new Date(),
      },
      auditCreatedBy: validatedData.requestingPractitionerId || "system",
    });

    await authGrant.save();

    // Log the authorization request
    await auditLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS, request, validatedData.userId, {
      action: "AUTHORIZATION_REQUESTED",
      grantId: authGrant._id.toString(),
      organizationId: validatedData.organizationId,
      practitionerId: validatedData.requestingPractitionerId,
      accessScope: validatedData.accessScope,
      autoApproved: validatedData.metadata?.autoApprove || false,
    });

    // Populate the response with related data
    await authGrant.populate(["userId", "organizationId", "requestingPractitionerId"]);

    return NextResponse.json(
      {
        success: true,
        data: {
          grant: authGrant,
          qrDisplayUrl: QRCodeService.createQRDisplayURL(authGrant._id.toString()),
          scanUrl: QRCodeService.createScanURL(authGrant._id.toString()),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating authorization grant:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/authorization/request
 * Get authorization grants for a user or organization
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const organizationId = searchParams.get("organizationId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!userId && !organizationId) {
      return NextResponse.json({ error: "Either userId or organizationId is required" }, { status: 400 });
    }

    // Build query
    const query: any = {};
    if (userId) query.userId = userId;
    if (organizationId) query.organizationId = organizationId;
    if (status) query["grantDetails.status"] = status;

    // Execute query with pagination and projection for efficiency
    const grants = await AuthorizationGrant.find(query)
      .select("userId organizationId requestingPractitionerId grantDetails accessScope createdAt updatedAt")
      .populate([
        { path: "userId", select: "name email digitalIdentifier" },
        { path: "organizationId", select: "name organizationInfo.type" },
        { path: "requestingPractitionerId", select: "professionalInfo.specialty professionalInfo.licenseNumber" },
      ])
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);
    const total = await AuthorizationGrant.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        grants,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + grants.length < total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching authorization grants:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
