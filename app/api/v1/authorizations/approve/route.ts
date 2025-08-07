import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import NotificationJob from "@/lib/services/notification-queue";
import { withAuth } from "@/lib/middleware/auth";
import { UserRole } from "@/lib/auth";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";
import { z } from "zod";

// Ensure models are registered by importing them
import Organization from "@/lib/models/Organization";
import Practitioner from "@/lib/models/Practitioner";
import User from "@/lib/models/User";

// Make sure the models are actually used (prevents "unused import" warnings)
const __ensureModelsRegistered = [Organization, Practitioner, User];

// Validation schema
const ApproveRequestSchema = z.object({
  grantId: z.string().min(1, "Grant ID is required"),
  reason: z.string().optional(),
});

/**
 * PATCH /api/v1/authorizations/approve
 * Approve an authorization request (patient action)
 */
async function approveAuthorizationHandler(
  request: NextRequest,
  authContext: any,
) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedData = ApproveRequestSchema.parse(body);

    // Find the authorization grant
    const authGrant = await AuthorizationGrant.findById(validatedData.grantId)
      .populate("organizationId")
      .populate("requestingPractitionerId");

    if (!authGrant) {
      return NextResponse.json(
        { error: "Authorization grant not found" },
        { status: 404 },
      );
    }

    // Verify ownership - check if this grant belongs to the current user
    if (
      authGrant.userId.toString() !== authContext.digitalIdentifier &&
      authGrant.userId.toString() !== authContext.userId
    ) {
      return NextResponse.json(
        { error: "Unauthorized: This grant does not belong to you" },
        { status: 403 },
      );
    }

    // Check if grant is in PENDING status
    if (authGrant.grantDetails?.status !== "PENDING") {
      return NextResponse.json(
        {
          error: `Cannot approve grant with status: ${authGrant.grantDetails?.status || "unknown"}`,
        },
        { status: 400 },
      );
    }

    // Check if grant has expired
    if (authGrant.isExpired?.()) {
      return NextResponse.json(
        { error: "Authorization grant has expired" },
        { status: 400 },
      );
    }

    const currentStatus = authGrant.grantDetails?.status;

    // Approve the grant
    const updatedGrant = await authGrant.approve(authContext.userId);

    // Update any related notification jobs to COMPLETED status
    try {
      await NotificationJob.updateMany(
        {
          "payload.data.grantId": validatedData.grantId,
          type: "AUTHORIZATION_REQUEST",
        },
        {
          $set: {
            status: "COMPLETED",
            processedAt: new Date(),
          },
        },
      );
    } catch (notificationError) {
      console.warn("Failed to update notification status:", notificationError);
      // Don't fail the request if notification update fails
    }

    // Log the approval action
    await auditLogger.logSecurityEvent(
      SecurityEventType.DATA_MODIFICATION,
      request,
      authContext.userId,
      {
        action: "PATIENT_APPROVED_ACCESS",
        grantId: authGrant._id.toString(),
        organizationId: authGrant.organizationId?._id?.toString(),
        requestingPractitionerId:
          authGrant.requestingPractitionerId?._id?.toString(),
        reason: validatedData.reason,
        previousStatus: currentStatus,
        newStatus: updatedGrant.grantDetails?.status,
        patientDecision: "approve",
      },
    );

    // Format response
    const organization = authGrant.organizationId as any;
    const practitioner = authGrant.requestingPractitionerId as any;

    return NextResponse.json({
      success: true,
      message: "Authorization request approved successfully",
      data: {
        grantId: updatedGrant._id.toString(),
        action: "approve",
        previousStatus: currentStatus,
        newStatus: updatedGrant.grantDetails?.status,
        organization: organization
          ? {
              name:
                organization.organizationInfo?.name || "Unknown Organization",
              type: organization.organizationInfo?.type || "UNKNOWN",
            }
          : null,
        practitioner: practitioner
          ? {
              name: `${practitioner.userId?.personalInfo?.firstName || "Unknown"} ${practitioner.userId?.personalInfo?.lastName || "User"}`,
              type:
                practitioner.professionalInfo?.practitionerType ||
                practitioner.auth?.role ||
                "practitioner",
            }
          : null,
        accessScope: updatedGrant.accessScope || [],
        expiresAt: updatedGrant.grantDetails?.expiresAt,
        grantedAt: updatedGrant.grantDetails?.grantedAt,
        timeWindowHours: updatedGrant.grantDetails?.timeWindowHours || 24,
      },
    });
  } catch (error) {
    console.error("Error approving authorization request:", error);

    // Log the error
    await auditLogger.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      request,
      authContext?.userId || "unknown",
      {
        action: "PATIENT_APPROVE_ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    );

    return NextResponse.json(
      {
        error: "Failed to approve authorization request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Export with authentication middleware
export const PATCH = withAuth(approveAuthorizationHandler, {
  allowedRoles: [UserRole.PATIENT, UserRole.ADMIN], // Allow admin for testing
  requireAuth: true,
});
