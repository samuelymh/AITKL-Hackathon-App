import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getPractitionerByUserId } from "@/lib/services/practitioner-service";
import Dispensation from "@/lib/models/Dispensation";
import Encounter from "@/lib/models/Encounter";

/**
 * GET /api/pharmacist/dispensations
 * Get dispensation history for the authenticated pharmacist
 */
async function getDispensationsHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the pharmacist's practitioner record
    const pharmacist = await getPractitionerByUserId(authContext.userId);
    if (!pharmacist) {
      return NextResponse.json({ error: "Pharmacist not found" }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query filters
    const filters: any = {
      dispensingPractitionerId: pharmacist._id,
    };

    if (status) {
      filters.status = status;
    }

    if (startDate || endDate) {
      filters["dispensationDetails.fillDate"] = {};
      if (startDate) {
        filters["dispensationDetails.fillDate"].$gte = new Date(startDate);
      }
      if (endDate) {
        filters["dispensationDetails.fillDate"].$lte = new Date(endDate);
      }
    }

    // Get total count for pagination
    const total = await Dispensation.countDocuments(filters);

    // Fetch dispensations with pagination
    const dispensations = await Dispensation.find(filters)
      .populate([
        {
          path: "pharmacyOrganizationId",
          select: "organizationInfo",
        },
      ])
      .sort({ "dispensationDetails.fillDate": -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Batch fetch all encounters to avoid N+1 query problem
    const encounterIds = dispensations.map((d) => d.prescriptionRef.encounterId);
    const encounters = await Encounter.find({ _id: { $in: encounterIds } })
      .populate({
        path: "userId",
        select: "personalInfo digitalIdentifier",
      })
      .populate({
        path: "attendingPractitionerId",
        select: "personalInfo professionalInfo",
      })
      .exec();

    // Create a map for O(1) encounter lookup
    const encounterMap = new Map(encounters.map((encounter) => [encounter._id.toString(), encounter]));

    // Enrich dispensations with encounter data
    const enrichedDispensations = dispensations.map((dispensation) => {
      try {
        const encounter = encounterMap.get(dispensation.prescriptionRef.encounterId.toString());

        if (!encounter) {
          return {
            ...dispensation.toObject(),
            encounter: null,
            patient: null,
            prescription: null,
          };
        }

        const prescription = encounter.prescriptions[dispensation.prescriptionRef.prescriptionIndex];

        return {
          ...dispensation.toObject(),
          encounter: {
            date: encounter.encounter.encounterDate,
            type: encounter.encounter.encounterType,
            chiefComplaint: encounter.encounter.chiefComplaint,
          },
          patient: {
            name: encounter.userId?.personalInfo
              ? `${encounter.userId.personalInfo.firstName} ${encounter.userId.personalInfo.lastName}`
              : `Patient ${encounter.userId?.digitalIdentifier}`,
            digitalIdentifier: encounter.userId?.digitalIdentifier,
          },
          prescription: {
            medicationName: prescription?.medicationName,
            dosage: prescription?.dosage,
            frequency: prescription?.frequency,
            status: prescription?.status,
            issuedAt: prescription?.issuedAt,
          },
          prescribingDoctor: encounter.attendingPractitionerId?.personalInfo
            ? {
                name: `${encounter.attendingPractitionerId.personalInfo.firstName} ${encounter.attendingPractitionerId.personalInfo.lastName}`,
                specialty: encounter.attendingPractitionerId.professionalInfo?.specialty,
              }
            : null,
        };
      } catch (error) {
        console.error("Error enriching dispensation:", error);
        return {
          ...dispensation.toObject(),
          encounter: null,
          patient: null,
          prescription: null,
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        dispensations: enrichedDispensations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
        filters: {
          status: status || "all",
          dateRange: {
            start: startDate,
            end: endDate,
          },
        },
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error fetching dispensations:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dispensations",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(getDispensationsHandler);
