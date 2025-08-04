import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import User from "@/lib/models/User";
import Organization from "@/lib/models/Organization";
import { QRCodeService } from "@/lib/services/qr-code-service";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";
import { AuthorizationPermissions } from "@/lib/utils/authorization-permissions";
import {
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ErrorHandler,
} from "@/lib/errors/custom-errors";
import { z } from "zod";

// Validation schemas
const CreateGrantRequestSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
  requestingPractitionerId: z.string().optional(),
  accessScope: z
    .array(z.string())
    .min(1, "At least one access scope is required"),
  timeWindowHours: z
    .number()
    .min(1)
    .max(168, "Time window must be between 1 and 168 hours"), // Max 1 week
  justification: z
    .string()
    .min(10, "Justification must be at least 10 characters"),
  metadata: z
    .object({
      requestSource: z.string().optional(),
      urgencyLevel: z
        .enum(["low", "normal", "high", "critical"])
        .default("normal"),
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

    // Verify entities exist and validate permissions
    await validateEntitiesAndPermissions(validatedData);

    // Check for existing grants
    await checkExistingGrants(validatedData);

    // Create the authorization grant
    const authGrant = await createAuthorizationGrant(validatedData);

    // Log the security event
    await logAuthorizationRequest(request, authGrant, validatedData);

    // Prepare response
    await authGrant.populate([
      "userId",
      "organizationId",
      "requestingPractitionerId",
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          grant: authGrant,
          qrDisplayUrl: QRCodeService.createQRDisplayURL(
            authGrant._id.toString(),
          ),
          scanUrl: QRCodeService.createScanURL(authGrant._id.toString()),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating authorization grant:", error);

    const errorResponse = ErrorHandler.handleError(error);
    return NextResponse.json(errorResponse, {
      status: errorResponse.statusCode,
    });
  }
}

/**
 * Validate that entities exist and check permissions
 */
async function validateEntitiesAndPermissions(
  validatedData: z.infer<typeof CreateGrantRequestSchema>,
) {
  // Verify that user exists
  const user = await User.findById(validatedData.userId);
  if (!user) {
    throw new NotFoundError("User");
  }

  // Verify that organization exists
  const organization = await Organization.findById(
    validatedData.organizationId,
  );
  if (!organization) {
    throw new NotFoundError("Organization");
  }

  // Verify practitioner permissions if provided
  if (validatedData.requestingPractitionerId) {
    const permissionCheck = await AuthorizationPermissions.canRequestGrant(
      validatedData.requestingPractitionerId,
      validatedData.organizationId,
      validatedData.accessScope,
    );

    if (!permissionCheck.allowed) {
      throw new AuthorizationError(
        permissionCheck.error || "Insufficient permissions",
      );
    }
  }
}

/**
 * Check for existing active grants
 */
async function checkExistingGrants(
  validatedData: z.infer<typeof CreateGrantRequestSchema>,
) {
  const existingGrant = await AuthorizationGrant.findOne({
    userId: validatedData.userId,
    organizationId: validatedData.organizationId,
    "grantDetails.status": "ACTIVE",
  });

  if (existingGrant) {
    throw new ConflictError(
      `An active authorization grant already exists between this user and organization. Grant ID: ${existingGrant._id}`,
    );
  }
}

/**
 * Create the authorization grant
 */
async function createAuthorizationGrant(
  validatedData: z.infer<typeof CreateGrantRequestSchema>,
) {
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
  return authGrant;
}

/**
 * Log the authorization request for audit purposes
 */
async function logAuthorizationRequest(
  request: NextRequest,
  authGrant: any,
  validatedData: z.infer<typeof CreateGrantRequestSchema>,
) {
  await auditLogger.logSecurityEvent(
    SecurityEventType.DATA_ACCESS,
    request,
    validatedData.userId,
    {
      action: "AUTHORIZATION_REQUESTED",
      grantId: authGrant._id.toString(),
      organizationId: validatedData.organizationId,
      practitionerId: validatedData.requestingPractitionerId,
      accessScope: validatedData.accessScope,
      autoApproved: validatedData.metadata?.autoApprove || false,
    },
  );
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
      return NextResponse.json(
        { error: "Either userId or organizationId is required" },
        { status: 400 },
      );
    }

    // Build query
    const query: any = {};
    if (userId) query.userId = userId;
    if (organizationId) query.organizationId = organizationId;
    if (status) query["grantDetails.status"] = status;

    // Execute query with pagination and projection for efficiency
    const grants = await AuthorizationGrant.find(query)
      .select(
        "userId organizationId requestingPractitionerId grantDetails accessScope createdAt updatedAt",
      )
      .populate([
        { path: "userId", select: "name email digitalIdentifier" },
        { path: "organizationId", select: "name organizationInfo.type" },
        {
          path: "requestingPractitionerId",
          select: "professionalInfo.specialty professionalInfo.licenseNumber",
        },
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
