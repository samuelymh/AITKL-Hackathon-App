import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/db.connection";
import { OrganizationMember } from "@/lib/models/OrganizationMember";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-helpers";
import { getAuthContext } from "@/lib/auth";
import mongoose from "mongoose";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Find the membership
    const membership = await OrganizationMember.findById(id);
    if (!membership) {
      return createErrorResponse("Organization membership not found", 404);
    }

    // Handle different actions
    switch (action) {
      case "activate": {
        await membership.activate();
        break;
      }
      case "deactivate": {
        await membership.deactivate();
        break;
      }
      case "verify": {
        const { method, notes } = updateData;
        await membership.verify(authContext.userId, method || "manual", notes);
        break;
      }
      case "update": {
        // Update membership details
        if (updateData.membershipDetails) {
          Object.assign(membership.membershipDetails, updateData.membershipDetails);
        }
        if (updateData.permissions) {
          await membership.updatePermissions(updateData.permissions);
        }
        if (updateData.schedule) {
          await membership.updateSchedule(updateData.schedule);
        }
        if (updateData.status) {
          membership.status = updateData.status;
        }
        await membership.save();
        break;
      }
      default: {
        return createErrorResponse("Invalid action. Supported actions: activate, deactivate, verify, update", 400);
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Find and remove the membership
    const membership = await OrganizationMember.findByIdAndDelete(id);
    if (!membership) {
      return createErrorResponse("Organization membership not found", 404);
    }

    return createSuccessResponse({ message: "Organization membership removed successfully" });
  } catch (error) {
    console.error("Error removing organization membership:", error);
    return createErrorResponse("Failed to remove organization membership", 500);
  }
}
