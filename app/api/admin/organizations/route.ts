import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/middleware/auth";
import connectToDatabase from "@/lib/mongodb";
import Organization from "@/lib/models/Organization";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/organizations
 * Get all organizations for admin dashboard
 */
async function getAllOrganizationsHandler(request: NextRequest, authContext: any) {
  try {
    logger.info(`Admin ${authContext.userId} requesting all organizations list`);

    await connectToDatabase();

    // Get all organizations (not deleted)
    const organizations = await Organization.find({
      auditDeletedDateTime: { $exists: false },
    })
      .select(
        "organizationInfo.name organizationInfo.type verification.isVerified verification.verifiedAt contact.email contact.phone address createdAt auditCreatedDateTime"
      )
      .sort({ auditCreatedDateTime: -1 });

    const mappedOrganizations = organizations.map((org) => {
      // Determine status based on verification.isVerified
      const verificationStatus = org.verification?.isVerified === true ? "verified" : "pending";

      return {
        id: org._id.toString(),
        name: org.organizationInfo?.name || "Unnamed Organization",
        type: org.organizationInfo?.type || "N/A",
        email: org.contact?.email || "N/A",
        phone: org.contact?.phone || "N/A",
        address: org.address ? `${org.address.street}, ${org.address.city}, ${org.address.state}` : "N/A",
        verificationStatus,
        verifiedAt: org.verification?.verifiedAt,
        createdAt: org.auditCreatedDateTime,
      };
    });

    logger.info(`Retrieved ${mappedOrganizations.length} organizations for admin dashboard`);

    return NextResponse.json({
      success: true,
      data: {
        organizations: mappedOrganizations,
        count: mappedOrganizations.length,
        stats: {
          total: mappedOrganizations.length,
          verified: mappedOrganizations.filter((org) => org.verificationStatus === "verified").length,
          pending: mappedOrganizations.filter((org) => org.verificationStatus === "pending").length,
          rejected: mappedOrganizations.filter((org) => org.verificationStatus === "rejected").length,
        },
      },
    });
  } catch (error) {
    logger.error("Organizations list error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve organizations",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getAllOrganizationsHandler);
