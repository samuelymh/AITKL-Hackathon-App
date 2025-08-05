import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/db.connection";
import { OrganizationMember } from "@/lib/models/OrganizationMember";
import { Practitioner } from "@/lib/models/Practitioner";
import Organization from "@/lib/models/Organization";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-helpers";
import { getAuthContext } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const authContext = getAuthContext(request);
    if (!authContext?.isAuthenticated) {
      return createErrorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const {
      practitionerId,
      organizationId,
      role,
      accessLevel = "limited",
      department,
      position,
      employeeId,
      isPrimary = false,
    } = body;

    // Validate required fields
    if (!practitionerId || !organizationId || !role) {
      return createErrorResponse("Missing required fields: practitionerId, organizationId, role", 400);
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(practitionerId) || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return createErrorResponse("Invalid practitioner or organization ID", 400);
    }

    // Check if practitioner exists
    const practitioner = await Practitioner.findById(practitionerId);
    if (!practitioner) {
      return createErrorResponse("Practitioner not found", 404);
    }

    // Check if organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return createErrorResponse("Organization not found", 404);
    }

    // Check if membership already exists
    const existingMembership = await OrganizationMember.findOne({
      practitionerId,
      organizationId,
    });

    if (existingMembership) {
      return createErrorResponse("Practitioner is already a member of this organization", 409);
    }

    // TODO: Check if requesting user has permission to manage this organization
    // For now, we'll allow any authenticated user to create memberships

    // Create the organization membership
    const membershipData = {
      organizationId,
      practitionerId,
      membershipDetails: {
        role,
        accessLevel,
        department,
        position,
        employeeId,
        isPrimary,
        startDate: new Date(),
      },
      status: "pending", // Default to pending, can be activated by admin
      metadata: {
        invitedBy: authContext.userId,
        invitationDate: new Date(),
      },
    };

    const membership = new OrganizationMember(membershipData);
    await membership.save();

    // Populate the membership with organization and practitioner details
    await membership.populate(["organizationId", "practitionerId"]);

    return createSuccessResponse(membership, 201);
  } catch (error) {
    console.error("Error creating organization membership:", error);
    return createErrorResponse("Failed to create organization membership", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const authContext = getAuthContext(request);
    if (!authContext?.isAuthenticated) {
      return createErrorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const practitionerId = searchParams.get("practitionerId");
    const status = searchParams.get("status");
    const role = searchParams.get("role");

    let query: any = {};

    if (organizationId) {
      if (!mongoose.Types.ObjectId.isValid(organizationId)) {
        return createErrorResponse("Invalid organization ID", 400);
      }
      query.organizationId = organizationId;
    }

    if (practitionerId) {
      if (!mongoose.Types.ObjectId.isValid(practitionerId)) {
        return createErrorResponse("Invalid practitioner ID", 400);
      }
      query.practitionerId = practitionerId;
    }

    if (status) {
      query.status = status;
    }

    if (role) {
      query["membershipDetails.role"] = role;
    }

    const memberships = await OrganizationMember.find(query)
      .populate([
        {
          path: "organizationId",
          select: "name type address contact verification",
        },
        {
          path: "practitionerId",
          select: "professionalInfo verification status metadata",
          populate: {
            path: "userId",
            select: "firstName lastName email phone",
          },
        },
      ])
      .sort({ createdAt: -1 });

    return createSuccessResponse(memberships);
  } catch (error) {
    console.error("Error retrieving organization memberships:", error);
    return createErrorResponse("Failed to retrieve organization memberships", 500);
  }
}
