import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant, { GrantStatus } from "@/lib/models/AuthorizationGrant";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";
import { z } from "zod";

// Validation schemas
const ApprovalActionSchema = z.object({
  action: z.enum(["approve", "deny", "revoke"]),
  actionBy: z.string().min(1, "Action performer ID is required"),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
  metadata: z
    .object({
      source: z.string().optional(),
      additionalNotes: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/authorization/[grantId]/action
 * Approve, deny, or revoke an authorization grant
 */
export async function POST(request: NextRequest, { params }: { params: { grantId: string } }) {
  try {
    await connectToDatabase();

    const { grantId } = params;
    const body = await request.json();
    const validatedData = ApprovalActionSchema.parse(body);

    // Find the authorization grant
    const authGrant = await AuthorizationGrant.findById(grantId);
    if (!authGrant) {
      return NextResponse.json({ error: "Authorization grant not found" }, { status: 404 });
    }

    // Check current status and validate action
    const currentStatus = authGrant.grantDetails.status;
    const { action, actionBy, reason } = validatedData;

    let newStatus: GrantStatus;
    let isValidAction = false;

    switch (action) {
      case "approve":
        if (currentStatus === GrantStatus.PENDING) {
          newStatus = GrantStatus.ACTIVE;
          isValidAction = true;
        }
        break;
      case "deny":
        if (currentStatus === GrantStatus.PENDING) {
          newStatus = GrantStatus.REVOKED;
          isValidAction = true;
        }
        break;
      case "revoke":
        if (currentStatus === GrantStatus.ACTIVE || currentStatus === GrantStatus.PENDING) {
          newStatus = GrantStatus.REVOKED;
          isValidAction = true;
        }
        break;
    }

    if (!isValidAction) {
      return NextResponse.json(
        {
          error: `Cannot ${action} a grant with status ${currentStatus}`,
          currentStatus,
          allowedActions: getAllowedActions(currentStatus),
        },
        { status: 400 }
      );
    }

    // Perform the action using the model method
    let updatedGrant;
    try {
      switch (action) {
        case "approve":
          updatedGrant = await authGrant.approve(actionBy);
          break;
        case "deny":
          updatedGrant = await authGrant.deny(actionBy);
          break;
        case "revoke":
          updatedGrant = await authGrant.revoke(actionBy);
          break;
      }
    } catch (modelError: any) {
      return NextResponse.json({ error: modelError.message }, { status: 400 });
    }

    // Log the action
    await auditLogger.logSecurityEvent(SecurityEventType.DATA_MODIFICATION, request, authGrant.userId.toString(), {
      action: `AUTHORIZATION_${action.toUpperCase()}D`,
      grantId: authGrant._id.toString(),
      organizationId: authGrant.organizationId.toString(),
      actionBy,
      reason,
      previousStatus: currentStatus,
      newStatus: updatedGrant.grantDetails.status,
      metadata: validatedData.metadata,
    });

    // Populate the response
    await updatedGrant.populate(["userId", "organizationId", "requestingPractitionerId"]);

    return NextResponse.json({
      success: true,
      data: {
        grant: updatedGrant,
        action: action,
        previousStatus: currentStatus,
        newStatus: updatedGrant.grantDetails.status,
      },
    });
  } catch (error) {
    console.error(`Error performing authorization action:`, error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/authorization/[grantId]/action
 * Get grant details and available actions
 */
export async function GET(request: NextRequest, { params }: { params: { grantId: string } }) {
  try {
    await connectToDatabase();

    const { grantId } = params;

    // Find the authorization grant
    const authGrant = await AuthorizationGrant.findById(grantId).populate([
      "userId",
      "organizationId",
      "requestingPractitionerId",
    ]);

    if (!authGrant) {
      return NextResponse.json({ error: "Authorization grant not found" }, { status: 404 });
    }

    const currentStatus = authGrant.grantDetails.status;
    const allowedActions = getAllowedActions(currentStatus);

    return NextResponse.json({
      success: true,
      data: {
        grant: authGrant,
        status: currentStatus,
        allowedActions,
        isExpired: authGrant.isExpired(),
        isActive: authGrant.isActive(),
        expiresAt: authGrant.grantDetails.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error fetching authorization grant:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Helper function to get allowed actions based on current status
 */
function getAllowedActions(status: GrantStatus): string[] {
  switch (status) {
    case GrantStatus.PENDING:
      return ["approve", "deny"];
    case GrantStatus.ACTIVE:
      return ["revoke"];
    case GrantStatus.EXPIRED:
    case GrantStatus.REVOKED:
      return [];
    default:
      return [];
  }
}
