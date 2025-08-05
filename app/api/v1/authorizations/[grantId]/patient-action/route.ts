import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import { withAuth } from "@/lib/middleware/auth";
import { UserRole } from "@/lib/auth";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";
import { z } from "zod";

// Validation schema for patient approval actions
const PatientActionSchema = z.object({
  action: z.enum(["approve", "deny"]),
  reason: z.string().min(1, "Reason is required").optional(),
});

/**
 * Extract grant ID from URL path
 */
function extractGrantId(request: NextRequest): string | null {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split("/");
  return pathSegments[pathSegments.indexOf("authorizations") + 1] || null;
}

/**
 * Validate grant ownership and status
 */
function validateGrantForAction(grant: any, userId: string): { isValid: boolean; error?: string } {
  if (!grant) {
    return { isValid: false, error: "Authorization grant not found" };
  }

  if (grant.userId.toString() !== userId) {
    return { isValid: false, error: "Unauthorized: This grant does not belong to you" };
  }

  if (grant.grantDetails.status !== "PENDING") {
    return { isValid: false, error: `Cannot modify grant with status: ${grant.grantDetails.status}` };
  }

  if (grant.isExpired()) {
    return { isValid: false, error: "Authorization grant has expired" };
  }

  return { isValid: true };
}

/**
 * Update grant status based on action
 */
async function updateGrantStatus(grant: any, action: string): Promise<void> {
  if (action === "approve") {
    grant.grantDetails.status = "ACTIVE";
    grant.grantDetails.grantedAt = new Date();

    // Calculate expiration based on time window
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + grant.grantDetails.timeWindowHours);
    grant.grantDetails.expiresAt = expirationTime;
  } else if (action === "deny") {
    grant.grantDetails.status = "DENIED";
    grant.grantDetails.deniedAt = new Date();
  }

  await grant.save();
}

/**
 * POST /api/v1/authorizations/[grantId]/patient-action
 * Allow patients to approve or deny authorization requests
 *
 * This is the patient-facing approval endpoint
 */
async function patientActionHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Extract grantId from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const grantId = pathSegments[pathSegments.indexOf("authorizations") + 1];

    if (!grantId) {
      return NextResponse.json({ error: "Grant ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = PatientActionSchema.parse(body);

    // Find the authorization grant
    const authGrant = await AuthorizationGrant.findById(grantId)
      .populate("organizationId")
      .populate("requestingPractitionerId");

    // Validate grant
    const validation = validateGrantForAction(authGrant, authContext.userId);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // At this point authGrant is guaranteed to exist
    const validGrant = authGrant!;

    let updatedGrant;
    const currentStatus = validGrant.grantDetails.status;

    // Perform the action
    if (validatedData.action === "approve") {
      updatedGrant = await validGrant.approve(authContext.userId);
    } else {
      updatedGrant = await validGrant.deny(authContext.userId);
    }

    // Log the patient action
    await auditLogger.logSecurityEvent(SecurityEventType.DATA_MODIFICATION, request, authContext.userId, {
      action: `PATIENT_${validatedData.action.toUpperCase()}D_ACCESS`,
      grantId: validGrant._id.toString(),
      organizationId: validGrant.organizationId._id.toString(),
      requestingPractitionerId: validGrant.requestingPractitionerId?._id.toString(),
      reason: validatedData.reason,
      previousStatus: currentStatus,
      newStatus: updatedGrant.grantDetails.status,
      patientDecision: validatedData.action,
    });

    // Format response
    const organization = validGrant.organizationId as any;
    const practitioner = validGrant.requestingPractitionerId as any;

    return NextResponse.json({
      success: true,
      message: `Authorization request ${validatedData.action}d successfully`,
      data: {
        grantId: updatedGrant._id.toString(),
        action: validatedData.action,
        previousStatus: currentStatus,
        newStatus: updatedGrant.grantDetails.status,
        organization: {
          name: organization.organizationInfo.name,
          type: organization.organizationInfo.type,
        },
        practitioner: practitioner
          ? {
              name: `${practitioner.personalInfo.firstName} ${practitioner.personalInfo.lastName}`,
              role: practitioner.professionalInfo.role,
            }
          : null,
        accessScope: updatedGrant.accessScope,
        expiresAt: updatedGrant.grantDetails.expiresAt,
        grantedAt: updatedGrant.grantDetails.grantedAt,
      },
    });
  } catch (error) {
    console.error("Error processing patient authorization action:", error);

    // Extract grantId for logging (if available)
    let grantIdForLog = "unknown";
    try {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split("/");
      grantIdForLog = pathSegments[pathSegments.indexOf("authorizations") + 1] || "unknown";
    } catch (urlError) {
      console.warn("Failed to extract grantId for logging:", urlError);
    }

    // Log the error
    await auditLogger.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      request,
      authContext?.userId || "unknown",
      {
        action: "PATIENT_ACTION_ERROR",
        grantId: grantIdForLog,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    );

    return NextResponse.json(
      { error: `Failed to process authorization action: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

// Export with authentication middleware
export const POST = withAuth(patientActionHandler, {
  allowedRoles: [UserRole.PATIENT],
  requireAuth: true,
});
