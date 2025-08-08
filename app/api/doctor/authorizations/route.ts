import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getPractitionerByUserId } from "@/lib/services/practitioner-service";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import User from "@/lib/models/User";
import Practitioner from "@/lib/models/Practitioner";
import Organization from "@/lib/models/Organization";

/**
 * GET /api/doctor/authorizations
 * Get authorization grants for a doctor's organization
 * Query params: status (optional), limit (optional, default 20)
 */
async function getDoctorAuthorizationsHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    // Ensure models are registered
    User;
    Practitioner;
    Organization;

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ACTIVE"; // Default to ACTIVE grants
    const limit = parseInt(searchParams.get("limit") || "20");

    // Validate limit parameter
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Limit must be between 1 and 100" }, { status: 400 });
    }

    // Find the practitioner record for the authenticated user
    const practitioner = await getPractitionerByUserId(authContext.userId);
    console.log("🔍 Debug - Doctor Auth Context:", { userId: authContext.userId, role: authContext.role });
    console.log("🔍 Debug - Doctor Practitioner found:", practitioner ? `ID: ${practitioner._id}` : "null");

    if (!practitioner) {
      return NextResponse.json({ error: "Doctor practitioner not found" }, { status: 404 });
    }

    // Find the organization member record to get organizationId
    const OrganizationMember = (await import("@/lib/models/OrganizationMember")).default;

    // Try both schema structures for compatibility
    let organizationMember = await OrganizationMember.findOne({
      practitionerId: practitioner._id,
      status: "active", // New schema
    });

    // If not found with new schema, try old schema
    if (!organizationMember) {
      organizationMember = await OrganizationMember.findOne({
        practitionerId: practitioner._id,
        "membership.isActive": true, // Old schema
      });
    }

    console.log("🔍 Debug - Doctor Organization member query:", {
      practitionerId: practitioner._id,
      "tried new schema (status: active)": !!organizationMember,
    });
    console.log(
      "🔍 Debug - Doctor Organization member found:",
      organizationMember ? `ID: ${organizationMember._id}` : "null"
    );

    if (!organizationMember) {
      // Let's also try a broader search for debugging
      const allMembersForPractitioner = await OrganizationMember.find({
        practitionerId: practitioner._id,
      });
      console.log("🔍 Debug - All members for doctor practitioner:", allMembersForPractitioner.length);
      allMembersForPractitioner.forEach((member, i) => {
        console.log(
          `   ${i + 1}. Status: ${member.status}, Active: ${member.membership?.isActive}, Org: ${member.organizationId}`
        );
      });

      return NextResponse.json({ error: "No active organization membership found for doctor" }, { status: 404 });
    }

    // Build query based on status - doctors can see grants for their organization
    let query: any = {
      organizationId: organizationMember.organizationId,
    };

    // Optionally filter by requesting practitioner (doctor who created the request)
    const filterByDoctor = searchParams.get("myRequests") === "true";
    if (filterByDoctor) {
      query.requestingPractitionerId = practitioner._id;
    }

    if (status === "ACTIVE") {
      // Support both schema formats
      query.$or = [
        { "grantDetails.status": "ACTIVE", "grantDetails.expiresAt": { $gt: new Date() } },
        { status: "approved", expiresAt: { $gt: new Date() } }, // Our test data format
      ];
    } else if (status === "PENDING") {
      query.$or = [
        { "grantDetails.status": "PENDING" },
        { status: "pending" }, // Our test data format
      ];
    } else if (status) {
      query.$or = [
        { "grantDetails.status": status },
        { status: status.toLowerCase() }, // Our test data format
      ];
    }

    // Fetch authorization grants
    const grants = await AuthorizationGrant.find(query).sort({ createdAt: -1 }).limit(limit);

    // Transform data for the frontend with manual data fetching
    const transformedGrants = await Promise.all(
      grants.map(async (grant) => {
        // Use type assertion to access raw database fields
        const grantData = grant.toObject() as any;

        // Fetch patient data using the correct field name
        let patient = { name: "Unknown Patient", digitalIdentifier: "N/A" };

        try {
          const patientId = grantData.userId; // The correct field name from the debug output
          if (patientId) {
            const patientUser = await User.findById(patientId);
            if (patientUser) {
              // Try to get the patient's actual name, fallback to digital ID
              let patientName = `Patient ${patientUser.digitalIdentifier}`;

              // Check if we can access the decrypted name fields
              if (patientUser.personalInfo?.firstName || patientUser.personalInfo?.lastName) {
                const firstName =
                  typeof patientUser.personalInfo.firstName === "string" ? patientUser.personalInfo.firstName : "";
                const lastName =
                  typeof patientUser.personalInfo.lastName === "string" ? patientUser.personalInfo.lastName : "";
                if (firstName || lastName) {
                  patientName = `${firstName} ${lastName}`.trim() || `Patient ${patientUser.digitalIdentifier}`;
                }
              }

              patient = {
                name: patientName,
                digitalIdentifier: patientUser.digitalIdentifier || "N/A",
              };
            }
          }
        } catch (error) {
          console.error("Error fetching patient data:", error);
        }

        // Fetch requesting practitioner info
        let requester = null;
        try {
          const requestingPractitionerId = grantData.requestingPractitionerId;
          if (requestingPractitionerId) {
            const requestingPractitioner = await Practitioner.findById(requestingPractitionerId).populate(
              "userId",
              "personalInfo"
            );
            if (requestingPractitioner && requestingPractitioner.userId) {
              const practitionerUser = requestingPractitioner.userId as any;
              requester = {
                name:
                  practitionerUser.personalInfo?.firstName && practitionerUser.personalInfo?.lastName
                    ? `${practitionerUser.personalInfo.firstName} ${practitionerUser.personalInfo.lastName}`
                    : "Unknown Doctor",
                type: requestingPractitioner.professionalInfo?.practitionerType || "doctor",
                specialty: requestingPractitioner.professionalInfo?.specialty || "General Medicine",
              };
            }
          }
        } catch (error) {
          console.error("Error fetching requesting practitioner data:", error);
        }

        return {
          id: grant._id.toString(),
          patient,
          status: grant.grantDetails?.status || grantData.status || "UNKNOWN",
          grantedAt: grant.grantDetails?.grantedAt || grantData.grantedAt,
          expiresAt: grant.grantDetails?.expiresAt || grantData.expiresAt,
          timeWindowHours: grant.grantDetails?.timeWindowHours || 24,
          accessScope: Object.entries(grant.accessScope || grantData.permissions || {})
            .filter(([key, value]) => value === true)
            .map(([key]) => key),
          organization: null,
          requester,
        };
      })
    );

    console.log("🔍 Debug - Doctor Transformed grants:", JSON.stringify(transformedGrants, null, 2));

    return NextResponse.json({
      success: true,
      data: transformedGrants,
      total: transformedGrants.length,
      status: status,
      filterByDoctor,
    });
  } catch (error) {
    console.error("Error fetching doctor authorizations:", error);
    return NextResponse.json({ error: "Failed to fetch authorization grants for doctor" }, { status: 500 });
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(getDoctorAuthorizationsHandler);
