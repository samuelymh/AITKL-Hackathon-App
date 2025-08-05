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

    if (!authGrant) {
      return NextResponse.json({ error: "Authorization grant not found" }, { status: 404 });
    }

    // Verify this grant belongs to the authenticated patient
    if (authGrant.userId.toString() !== authContext.userId) {
      return NextResponse.json({ error: "You can only approve/deny your own authorization requests" }, { status: 403 });
    }

    // Verify grant is in pending status
    if (authGrant.grantDetails.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot ${validatedData.action} a grant with status ${authGrant.grantDetails.status}` },
        { status: 400 }
      );
    }

    // Check if grant has expired
    if (authGrant.isExpired()) {
      return NextResponse.json({ error: "Cannot process expired authorization request" }, { status: 400 });
    }

    let updatedGrant;
    const currentStatus = authGrant.grantDetails.status;

    // Perform the action
    if (validatedData.action === "approve") {
      updatedGrant = await authGrant.approve(authContext.userId);
    } else {
      updatedGrant = await authGrant.deny(authContext.userId);
    }

    // Log the patient action
    await auditLogger.logSecurityEvent(SecurityEventType.DATA_MODIFICATION, request, authContext.userId, {
      action: `PATIENT_${validatedData.action.toUpperCase()}D_ACCESS`,
      grantId: authGrant._id.toString(),
      organizationId: authGrant.organizationId._id.toString(),
      requestingPractitionerId: authGrant.requestingPractitionerId?._id.toString(),
      reason: validatedData.reason,
      previousStatus: currentStatus,
      newStatus: updatedGrant.grantDetails.status,
      patientDecision: validatedData.action,
    });

    // Format response
    const organization = authGrant.organizationId as any;
    const practitioner = authGrant.requestingPractitionerId as any;

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

    return NextResponse.json({ error: "Failed to process authorization action" }, { status: 500 });
  }
}

// Export with authentication middleware
export const POST = withAuth(patientActionHandler, {
  allowedRoles: [UserRole.PATIENT],
  requireAuth: true,
});
