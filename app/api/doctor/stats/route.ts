import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getPractitionerByUserId } from "@/lib/services/practitioner-service";

/**
 * GET /api/doctor/stats
 * Get statistics for a doctor's dashboard
 */
async function getDoctorStatsHandler(request: NextRequest, authContext: any) {
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

    // Find the organization member record to get organizationId
    const OrganizationMember = (await import("@/lib/models/OrganizationMember")).default;
    const AuthorizationGrant = (await import("@/lib/models/AuthorizationGrant")).default;
    const Encounter = (await import("@/lib/models/Encounter")).default;

    // Find organization membership
    let organizationMember = await OrganizationMember.findOne({
      practitionerId: practitioner._id,
      status: "active",
    });

    if (!organizationMember) {
      organizationMember = await OrganizationMember.findOne({
        practitionerId: practitioner._id,
        "membership.isActive": true,
      });
    }

    if (!organizationMember) {
      return NextResponse.json({ error: "No active organization membership found" }, { status: 404 });
    }

    // Calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count active authorization grants for this doctor's organization
    const activeGrantsCount = await AuthorizationGrant.countDocuments({
      $or: [
        {
          organizationId: organizationMember.organizationId,
          "grantDetails.status": "ACTIVE",
          "grantDetails.expiresAt": { $gt: now },
        },
        {
          organizationId: organizationMember.organizationId,
          status: "approved",
          expiresAt: { $gt: now },
        },
      ],
    });

    // Count pending authorization requests for this doctor's organization
    const pendingRequestsCount = await AuthorizationGrant.countDocuments({
      $or: [
        {
          organizationId: organizationMember.organizationId,
          "grantDetails.status": "PENDING",
        },
        {
          organizationId: organizationMember.organizationId,
          status: "pending",
        },
      ],
    });

    // Count authorization grants requested by this specific doctor
    const myRequestsCount = await AuthorizationGrant.countDocuments({
      requestingPractitionerId: practitioner._id,
      $or: [{ "grantDetails.status": { $in: ["ACTIVE", "PENDING"] } }, { status: { $in: ["approved", "pending"] } }],
    });

    // Count encounters created by this doctor (if Encounter model exists)
    let encountersToday = 0;
    let encountersThisWeek = 0;
    let encountersThisMonth = 0;
    let prescriptionsWritten = 0;
    let mostCommonDiagnoses: Array<{ name: string; count: number }> = [];

    try {
      // Encounters today
      encountersToday = await Encounter.countDocuments({
        attendingPractitionerId: practitioner._id,
        "encounter.encounterDate": { $gte: today },
      });

      // Encounters this week
      encountersThisWeek = await Encounter.countDocuments({
        attendingPractitionerId: practitioner._id,
        "encounter.encounterDate": { $gte: thisWeek },
      });

      // Encounters this month
      encountersThisMonth = await Encounter.countDocuments({
        attendingPractitionerId: practitioner._id,
        "encounter.encounterDate": { $gte: thisMonth },
      });

      // Count prescriptions written (from encounters)
      const encountersWithPrescriptions = await Encounter.find({
        attendingPractitionerId: practitioner._id,
        "encounter.encounterDate": { $gte: thisMonth },
        "prescriptions.0": { $exists: true },
      }).select("prescriptions");

      prescriptionsWritten = encountersWithPrescriptions.reduce((total, encounter) => {
        return total + (encounter.prescriptions?.length || 0);
      }, 0);

      // Get most common diagnoses
      const diagnosisAggregation = await Encounter.aggregate([
        {
          $match: {
            attendingPractitionerId: practitioner._id,
            "encounter.encounterDate": { $gte: thisMonth },
          },
        },
        {
          $unwind: "$diagnoses",
        },
        {
          $group: {
            _id: "$diagnoses.description",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 5,
        },
      ]);

      mostCommonDiagnoses = diagnosisAggregation.map((item) => ({
        name: item._id,
        count: item.count,
      }));
    } catch (encounterError) {
      console.log("Encounters not available or error:", encounterError);
      // Continue without encounter stats
    }

    const stats = {
      // Patient access and authorization stats
      activeAuthorizations: activeGrantsCount,
      pendingRequests: pendingRequestsCount,
      myRequests: myRequestsCount,

      // Clinical activity stats
      patientsToday: encountersToday,
      patientsThisWeek: encountersThisWeek,
      patientsThisMonth: encountersThisMonth,
      prescriptionsWritten,

      // Additional insights
      mostCommonDiagnoses,

      // Organization info
      organizationId: organizationMember.organizationId,
    };

    console.log("🔍 Debug - Doctor Stats:", stats);

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching doctor stats:", error);
    return NextResponse.json({ error: "Failed to fetch doctor statistics" }, { status: 500 });
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(getDoctorStatsHandler);
