import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getPractitionerByUserId } from "@/lib/services/practitioner-service";

/**
 * GET /api/doctor/organization
 * Get doctor's organization information
 */
async function getDoctorOrganizationHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the practitioner record for the authenticated user
    const practitioner = await getPractitionerByUserId(authContext.userId);

    if (!practitioner) {
      return NextResponse.json({ error: "Doctor practitioner not found" }, { status: 404 });
    }

    // Find the organization member record to get organization details
    const OrganizationMember = (await import("@/lib/models/OrganizationMember")).default;
    const Organization = (await import("@/lib/models/Organization")).default;

    // Try both schema structures for compatibility
    let organizationMember = await OrganizationMember.findOne({
      practitionerId: practitioner._id,
      status: "active",
    }).populate("organizationId");

    // If not found with new schema, try old schema
    if (!organizationMember) {
      organizationMember = await OrganizationMember.findOne({
        practitionerId: practitioner._id,
        "membership.isActive": true,
      }).populate("organizationId");
    }

    if (!organizationMember) {
      return NextResponse.json(
        {
          success: false,
          error: "No active organization membership found",
          organization: null,
        },
        { status: 404 }
      );
    }

    const organization = organizationMember.organizationId as any;

    if (!organization) {
      return NextResponse.json(
        {
          success: false,
          error: "Organization details not found",
          organization: null,
        },
        { status: 404 }
      );
    }

    // Determine membership status
    let membershipStatus = "active";
    let isPending = false;
    let isVerified = true;

    if (organizationMember.status) {
      // New schema
      membershipStatus = organizationMember.status;
      isPending = membershipStatus === "pending";
      isVerified = membershipStatus === "active";
    } else if (organizationMember.membership) {
      // Old schema
      isPending = !organizationMember.membership.isActive;
      isVerified = organizationMember.membership.isActive;
      membershipStatus = isPending ? "pending" : "active";
    }

    const organizationInfo = {
      id: organization._id.toString(),
      name: organization.organizationInfo?.name || organization.name || "Unknown Organization",
      type: organization.organizationInfo?.type || organization.type || "HOSPITAL",
      registrationNumber: organization.organizationInfo?.registrationNumber || organization.registrationNumber || "",
      isVerified: organization.verification?.isVerified || organization.verified || false,

      // Membership details
      status: membershipStatus,
      isPending,
      isVerified,
      department: organizationMember.membershipDetails?.department || organizationMember.membership?.department,
      position: organizationMember.membershipDetails?.position || organizationMember.membership?.roleInOrg,
      role: organizationMember.membershipDetails?.role || practitioner.professionalInfo?.practitionerType || "doctor",

      // Address information if available
      address: organization.address
        ? {
            street: organization.address.street,
            city: organization.address.city,
            state: organization.address.state,
            postalCode: organization.address.postalCode,
            country: organization.address.country,
          }
        : null,

      // Contact information if available
      contact: organization.contact
        ? {
            phone: organization.contact.phone,
            email: organization.contact.email,
            website: organization.contact.website,
          }
        : null,
    };

    return NextResponse.json({
      success: true,
      organization: organizationInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching doctor organization:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch organization information",
        organization: null,
      },
      { status: 500 }
    );
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(getDoctorOrganizationHandler);
