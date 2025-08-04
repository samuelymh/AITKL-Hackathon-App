import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant, {
  GrantStatus,
} from "@/lib/models/AuthorizationGrant";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";
import {
  AuthorizationPermissions,
  GrantStateManager,
} from "@/lib/utils/authorization-permissions";
import {
  AuthorizationError,
  NotFoundError,
  GrantActionError,
  ErrorHandler,
} from "@/lib/errors/custom-errors";
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
export async function POST(
  request: NextRequest,
  { params }: { params: { grantId: string } },
) {
  try {
    await connectToDatabase();

    const { grantId } = params;
    const body = await request.json();
    const validatedData = ApprovalActionSchema.parse(body);

    // Find and validate the authorization grant
    const authGrant = await findAndValidateGrant(grantId);

    // Validate permissions and action
    const { action, actionBy } = validatedData;
    await validateActionPermissions(actionBy, action, authGrant);

    // Validate state transition
    const currentStatus = authGrant.grantDetails.status;
    validateStateTransition(currentStatus, action);

    // Perform the action
    const updatedGrant = await performGrantAction(authGrant, action, actionBy);

    // Log the action for audit purposes
    await logGrantAction(
      request,
      authGrant,
      updatedGrant,
      validatedData,
      currentStatus,
    );

    // Prepare response
    await updatedGrant.populate([
      "userId",
      "organizationId",
      "requestingPractitionerId",
    ]);

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

    const errorResponse = ErrorHandler.handleError(error);
    return NextResponse.json(errorResponse, {
      status: errorResponse.statusCode,
    });
  }
}

/**
 * Find and validate the authorization grant exists
 */
async function findAndValidateGrant(grantId: string) {
  const authGrant = await AuthorizationGrant.findById(grantId);
  if (!authGrant) {
    throw new NotFoundError("Authorization grant");
  }
  return authGrant;
}

/**
 * Validate that the user has permission to perform the action
 */
async function validateActionPermissions(
  actionBy: string,
  action: string,
  authGrant: any,
) {
  const permissionCheck = await AuthorizationPermissions.canPerformAction(
    actionBy,
    action as "approve" | "deny" | "revoke",
    authGrant.organizationId.toString(),
  );

  if (!permissionCheck.allowed) {
    throw new AuthorizationError(
      permissionCheck.error ||
        "Insufficient permissions to perform this action",
    );
  }
}

/**
 * Validate that the state transition is allowed
 */
function validateStateTransition(currentStatus: GrantStatus, action: string) {
  const newStatus = GrantStateManager.getNewStatus(currentStatus, action);

  if (!newStatus) {
    throw new GrantActionError(
      `Cannot ${action} a grant with status ${currentStatus}`,
      currentStatus,
      GrantStateManager.getAllowedActions(currentStatus),
    );
  }
}

// Action map for cleaner and more maintainable grant actions
const actionMap: {
  [key: string]: (grant: any, actionBy: string) => Promise<any>;
} = {
  approve: (grant, actionBy) => grant.approve(actionBy),
  deny: (grant, actionBy) => grant.deny(actionBy),
  revoke: (grant, actionBy) => grant.revoke(actionBy),
};

/**
 * Perform the grant action using the model methods
 */
async function performGrantAction(
  authGrant: any,
  action: string,
  actionBy: string,
) {
  const grantAction = actionMap[action];

  if (!grantAction) {
    throw new GrantActionError(
      `Invalid action: ${action}`,
      authGrant.grantDetails.status,
      GrantStateManager.getAllowedActions(authGrant.grantDetails.status),
    );
  }

  try {
    return await grantAction(authGrant, actionBy);
  } catch (modelError: any) {
    throw new GrantActionError(
      modelError.message,
      authGrant.grantDetails.status,
      GrantStateManager.getAllowedActions(authGrant.grantDetails.status),
    );
  }
}

/**
 * Log the grant action for audit purposes
 */
async function logGrantAction(
  request: NextRequest,
  authGrant: any,
  updatedGrant: any,
  validatedData: z.infer<typeof ApprovalActionSchema>,
  currentStatus: GrantStatus,
) {
  await auditLogger.logSecurityEvent(
    SecurityEventType.DATA_MODIFICATION,
    request,
    authGrant.userId.toString(),
    {
      action: `AUTHORIZATION_${validatedData.action.toUpperCase()}D`,
      grantId: authGrant._id.toString(),
      organizationId: authGrant.organizationId.toString(),
      actionBy: validatedData.actionBy,
      reason: validatedData.reason,
      previousStatus: currentStatus,
      newStatus: updatedGrant.grantDetails.status,
      metadata: validatedData.metadata,
    },
  );
}

/**
 * GET /api/authorization/[grantId]/action
 * Get grant details and available actions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { grantId: string } },
) {
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
      return NextResponse.json(
        { error: "Authorization grant not found" },
        { status: 404 },
      );
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Helper function to get allowed actions based on current status
 */
function getAllowedActions(status: GrantStatus): string[] {
  return GrantStateManager.getAllowedActions(status);
}
