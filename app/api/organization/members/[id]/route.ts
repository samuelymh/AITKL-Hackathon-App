import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/db.connection";
import { OrganizationMember } from "@/lib/models/OrganizationMember";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-helpers";
import { getAuthContext } from "@/lib/auth";
import {
  ORGANIZATION_MEMBER_ACTIONS,
  ORGANIZATION_MEMBER_STATUS,
  ORGANIZATION_MEMBER_ROLES,
  type OrganizationMemberAction,
} from "@/lib/constants/organization-member";
import mongoose from "mongoose";

const isValidAction = (action: any): action is OrganizationMemberAction => {
  return Object.values(ORGANIZATION_MEMBER_ACTIONS).includes(action);
};

/**
 * Check if user has permission to modify a membership
 */
async function checkMembershipModifyPermission(
  userId: string,
  organizationId: string,
  practitionerId: string,
): Promise<boolean> {
  // User can modify their own membership
  if (userId === practitionerId) {
    return true;
  }

  // Check if user is an admin in the organization
  const adminMembership = await OrganizationMember.findOne({
    organizationId,
    practitionerId: userId,
    status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
    "membershipDetails.role": ORGANIZATION_MEMBER_ROLES.ADMIN,
  });

  return !!adminMembership;
}

/**
 * Handle membership update with validation
 */
async function handleMembershipUpdate(
  membership: any,
  updateData: any,
): Promise<void> {
  // Validate and update membership details
  if (updateData.membershipDetails) {
    const validFields = ["department", "position", "employeeId", "accessLevel"];
    const filteredDetails = Object.keys(updateData.membershipDetails)
      .filter((key) => validFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updateData.membershipDetails[key];
        return obj;
      }, {});

    Object.assign(membership.membershipDetails, filteredDetails);
  }

  // Update permissions if provided
  if (updateData.permissions) {
    await membership.updatePermissions(updateData.permissions);
  }

  // Update schedule if provided
  if (updateData.schedule) {
    await membership.updateSchedule(updateData.schedule);
  }

  // Update status if provided and valid
  if (updateData.status) {
    const validStatuses = Object.values(ORGANIZATION_MEMBER_STATUS);
    if (validStatuses.includes(updateData.status)) {
      membership.status = updateData.status;
    }
  }

  await membership.save();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectToDatabase();

    // Verify authentication
    const authContext = getAuthContext(request);
    if (!authContext?.isAuthenticated) {
      return createErrorResponse("Unauthorized", 401);
    }

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return createErrorResponse("Invalid membership ID", 400);
    }

    const body = await request.json();
    const { action, ...updateData } = body;

    // Validate action parameter
    if (!action) {
      return createErrorResponse("Action parameter is required", 400);
    }

    if (!isValidAction(action)) {
      return createErrorResponse(
        `Invalid action. Supported actions: ${Object.values(ORGANIZATION_MEMBER_ACTIONS).join(", ")}`,
        400,
      );
    }

    // Find the membership
    const membership = await OrganizationMember.findById(id);
    if (!membership) {
      return createErrorResponse("Organization membership not found", 404);
    }

    // Authorization check: Only admins or the membership owner can modify
    const canModify = await checkMembershipModifyPermission(
      authContext.userId,
      membership.organizationId.toString(),
      membership.practitionerId.toString(),
    );

    if (!canModify) {
      return createErrorResponse(
        "Insufficient permissions to modify this membership",
        403,
      );
    }

    // Handle different actions
    switch (action) {
      case ORGANIZATION_MEMBER_ACTIONS.ACTIVATE: {
        await membership.activate();
        break;
      }
      case ORGANIZATION_MEMBER_ACTIONS.DEACTIVATE: {
        await membership.deactivate();
        break;
      }
      case ORGANIZATION_MEMBER_ACTIONS.VERIFY: {
        const { method, notes } = updateData;
        if (!method) {
          return createErrorResponse("Verification method is required", 400);
        }
        await membership.verify(authContext.userId, method, notes);
        break;
      }
      case ORGANIZATION_MEMBER_ACTIONS.UPDATE: {
        await handleMembershipUpdate(membership, updateData);
        break;
      }
      default: {
        return createErrorResponse("Unsupported action", 400);
      }
    }

    // Reload and populate the membership
    await membership.populate(["organizationId", "practitionerId"]);

    return createSuccessResponse(membership);
  } catch (error) {
    console.error("Error updating organization membership:", error);
    return createErrorResponse("Failed to update organization membership", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectToDatabase();

    // Verify authentication
    const authContext = getAuthContext(request);
    if (!authContext?.isAuthenticated) {
      return createErrorResponse("Unauthorized", 401);
    }

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return createErrorResponse("Invalid membership ID", 400);
    }

    // Find the membership first
    const membership = await OrganizationMember.findById(id);
    if (!membership) {
      return createErrorResponse("Organization membership not found", 404);
    }

    // Authorization check: Only admins or the membership owner can delete
    const canDelete = await checkMembershipModifyPermission(
      authContext.userId,
      membership.organizationId.toString(),
      membership.practitionerId.toString(),
    );

    if (!canDelete) {
      return createErrorResponse(
        "Insufficient permissions to remove this membership",
        403,
      );
    }

    // Remove the membership
    await OrganizationMember.findByIdAndDelete(id);

    return createSuccessResponse({
      message: "Organization membership removed successfully",
    });
  } catch (error) {
    console.error("Error removing organization membership:", error);
    return createErrorResponse("Failed to remove organization membership", 500);
  }
}
