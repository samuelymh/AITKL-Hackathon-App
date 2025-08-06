import connectToDatabase from "@/lib/mongodb";
import Encounter, { PrescriptionStatus } from "@/lib/models/Encounter";
import mongoose from "mongoose";

export interface PharmacyStats {
  prescriptionsToday: number;
  pendingVerifications: number;
  consultationsScheduled: number;
  inventoryAlerts: number;
  prescriptionsThisWeek: number;
  prescriptionsThisMonth: number;
  mostCommonMedications: Array<{
    name: string;
    count: number;
  }>;
}

export interface PrescriptionData {
  id: string;
  patientName: string;
  patientId: string;
  medicationName?: string;
  dosage?: string;
  frequency?: string;
  status: PrescriptionStatus | string;
  issuedAt: Date;
  prescribingPractitioner: {
    name: string;
    type: string;
  };
  notes?: string;
  priority: "normal" | "urgent" | "stat";
  type?: "prescription" | "authorization_grant";
  grantId?: string;
  organizationName?: string;
  accessScope?: any;
}

export interface ConsultationData {
  id: string;
  patientName: string;
  scheduledTime: Date;
  type: "medication_review" | "drug_interaction" | "counseling" | "vaccination";
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  notes?: string;
}

/**
 * Get pharmacy statistics for a pharmacist
 * @param practitionerId - The ID of the pharmacist
 */
export async function getPharmacyStatistics(practitionerId: string): Promise<PharmacyStats> {
  await connectToDatabase();

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfWeek = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  try {
    // Get prescriptions handled by this pharmacist today
    const prescriptionsToday = await Encounter.aggregate([
      {
        $match: {
          "prescriptions.prescribingPractitionerId": new mongoose.Types.ObjectId(practitionerId),
          "prescriptions.issuedAt": { $gte: startOfToday },
        },
      },
      {
        $unwind: "$prescriptions",
      },
      {
        $match: {
          "prescriptions.prescribingPractitionerId": new mongoose.Types.ObjectId(practitionerId),
          "prescriptions.issuedAt": { $gte: startOfToday },
        },
      },
      {
        $count: "total",
      },
    ]);

    // Get prescriptions this week
    const prescriptionsThisWeek = await Encounter.aggregate([
      {
        $match: {
          "prescriptions.prescribingPractitionerId": new mongoose.Types.ObjectId(practitionerId),
          "prescriptions.issuedAt": { $gte: startOfWeek },
        },
      },
      {
        $unwind: "$prescriptions",
      },
      {
        $match: {
          "prescriptions.prescribingPractitionerId": new mongoose.Types.ObjectId(practitionerId),
          "prescriptions.issuedAt": { $gte: startOfWeek },
        },
      },
      {
        $count: "total",
      },
    ]);

    // Get prescriptions this month
    const prescriptionsThisMonth = await Encounter.aggregate([
      {
        $match: {
          "prescriptions.prescribingPractitionerId": new mongoose.Types.ObjectId(practitionerId),
          "prescriptions.issuedAt": { $gte: startOfMonth },
        },
      },
      {
        $unwind: "$prescriptions",
      },
      {
        $match: {
          "prescriptions.prescribingPractitionerId": new mongoose.Types.ObjectId(practitionerId),
          "prescriptions.issuedAt": { $gte: startOfMonth },
        },
      },
      {
        $count: "total",
      },
    ]);

    // Get pending prescription verifications (prescriptions with ISSUED status needing pharmacist attention)
    const pendingPrescriptions = await Encounter.aggregate([
      {
        $match: {
          "prescriptions.status": PrescriptionStatus.ISSUED,
        },
      },
      {
        $unwind: "$prescriptions",
      },
      {
        $match: {
          "prescriptions.status": PrescriptionStatus.ISSUED,
        },
      },
      {
        $count: "total",
      },
    ]);

    // Also check for authorization grants for this pharmacist
    let allGrantsCount = 0;
    let pendingGrantsCount = 0;
    try {
      const AuthorizationGrant = (await import("@/lib/models/AuthorizationGrant")).default;
      
      // Count all grants for this practitioner
      allGrantsCount = await AuthorizationGrant.countDocuments({
        requestingPractitionerId: new mongoose.Types.ObjectId(practitionerId),
        auditDeletedDateTime: { $exists: false },
      });
      
      // Count only pending grants
      pendingGrantsCount = await AuthorizationGrant.countDocuments({
        requestingPractitionerId: new mongoose.Types.ObjectId(practitionerId),
        "grantDetails.status": "PENDING",
        "grantDetails.expiresAt": { $gt: new Date() },
        auditDeletedDateTime: { $exists: false },
      });
    } catch (error) {
      console.error("Error fetching authorization grants:", error);
    }

    const pendingVerifications = (pendingPrescriptions[0]?.total || 0) + pendingGrantsCount;

    // Get most common medications prescribed by this pharmacist
    const mostCommonMedications = await Encounter.aggregate([
      {
        $match: {
          "prescriptions.prescribingPractitionerId": new mongoose.Types.ObjectId(practitionerId),
          "prescriptions.issuedAt": { $gte: startOfMonth },
        },
      },
      {
        $unwind: "$prescriptions",
      },
      {
        $match: {
          "prescriptions.prescribingPractitionerId": new mongoose.Types.ObjectId(practitionerId),
          "prescriptions.issuedAt": { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: "$prescriptions.medicationName",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          name: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    return {
      prescriptionsToday: prescriptionsToday[0]?.total || 0,
      pendingVerifications: pendingVerifications || 0,
      consultationsScheduled: 0, // TODO: Implement when consultation model is available
      inventoryAlerts: 0, // TODO: Implement when inventory model is available
      prescriptionsThisWeek: prescriptionsThisWeek[0]?.total || 0,
      prescriptionsThisMonth: prescriptionsThisMonth[0]?.total || 0,
      mostCommonMedications: mostCommonMedications || [],
    };
  } catch (error) {
    console.error("Error fetching pharmacy statistics:", error);
    return {
      prescriptionsToday: 0,
      pendingVerifications: 0,
      consultationsScheduled: 0,
      inventoryAlerts: 0,
      prescriptionsThisWeek: 0,
      prescriptionsThisMonth: 0,
      mostCommonMedications: [],
    };
  }
}

/**
 * Get recent prescriptions for a pharmacist
 * @param practitionerId - The ID of the pharmacist
 * @param limit - Maximum number of prescriptions to return
 */
export async function getRecentPrescriptions(practitionerId: string, limit: number = 20): Promise<PrescriptionData[]> {
  await connectToDatabase();

  try {
    const prescriptions = await Encounter.aggregate([
      {
        $match: {
          "prescriptions.prescribingPractitionerId": new mongoose.Types.ObjectId(practitionerId),
        },
      },
      {
        $unwind: "$prescriptions",
      },
      {
        $match: {
          "prescriptions.prescribingPractitionerId": new mongoose.Types.ObjectId(practitionerId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "patient",
        },
      },
      {
        $unwind: "$patient",
      },
      {
        $lookup: {
          from: "practitioners",
          localField: "prescriptions.prescribingPractitionerId",
          foreignField: "_id",
          as: "prescriber",
        },
      },
      {
        $unwind: "$prescriber",
      },
      {
        $lookup: {
          from: "users",
          localField: "prescriber.userId",
          foreignField: "_id",
          as: "prescriberUser",
        },
      },
      {
        $unwind: "$prescriberUser",
      },
      {
        $sort: { "prescriptions.issuedAt": -1 },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          id: "$prescriptions._id",
          patientName: {
            $concat: ["$patient.personalInfo.firstName", " ", "$patient.personalInfo.lastName"],
          },
          patientId: "$patient.digitalIdentifier",
          medicationName: "$prescriptions.medicationName",
          dosage: "$prescriptions.dosage",
          frequency: "$prescriptions.frequency",
          status: "$prescriptions.status",
          issuedAt: "$prescriptions.issuedAt",
          notes: "$prescriptions.notes",
          prescribingPractitioner: {
            name: {
              $concat: ["$prescriberUser.personalInfo.firstName", " ", "$prescriberUser.personalInfo.lastName"],
            },
            type: "$prescriber.professionalInfo.practitionerType",
          },
        },
      },
    ]);

    return prescriptions.map((prescription: any) => ({
      ...prescription,
      priority: getPrescriptionPriority(prescription.medicationName, prescription.notes),
    }));
  } catch (error) {
    console.error("Error fetching recent prescriptions:", error);
    return [];
  }
}

/**
 * Get prescription verifications and authorization grants for a pharmacist
 * Shows all grants regardless of status, with latest granted ones at the top
 * @param practitionerId - The ID of the pharmacist
 */
export async function getPendingPrescriptionVerifications(practitionerId: string): Promise<PrescriptionData[]> {
  await connectToDatabase();

  try {
    // Get pending prescription verifications
    const pendingPrescriptions = await Encounter.aggregate([
      {
        $match: {
          "prescriptions.status": PrescriptionStatus.ISSUED,
        },
      },
      {
        $unwind: "$prescriptions",
      },
      {
        $match: {
          "prescriptions.status": PrescriptionStatus.ISSUED,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "patient",
        },
      },
      {
        $unwind: "$patient",
      },
      {
        $lookup: {
          from: "practitioners",
          localField: "prescriptions.prescribingPractitionerId",
          foreignField: "_id",
          as: "prescriber",
        },
      },
      {
        $unwind: "$prescriber",
      },
      {
        $lookup: {
          from: "users",
          localField: "prescriber.userId",
          foreignField: "_id",
          as: "prescriberUser",
        },
      },
      {
        $unwind: "$prescriberUser",
      },
      {
        $sort: { "prescriptions.issuedAt": -1 },
      },
      {
        $project: {
          id: "$prescriptions._id",
          patientName: {
            $concat: ["$patient.personalInfo.firstName", " ", "$patient.personalInfo.lastName"],
          },
          patientId: "$patient.digitalIdentifier",
          medicationName: "$prescriptions.medicationName",
          dosage: "$prescriptions.dosage",
          frequency: "$prescriptions.frequency",
          status: "$prescriptions.status",
          issuedAt: "$prescriptions.issuedAt",
          notes: "$prescriptions.notes",
          prescribingPractitioner: {
            name: {
              $concat: ["$prescriberUser.personalInfo.firstName", " ", "$prescriberUser.personalInfo.lastName"],
            },
            type: "$prescriber.professionalInfo.practitionerType",
          },
          type: { $literal: "prescription" },
        },
      },
    ]);

    // Get all authorization grants for this pharmacist
    let allGrants: any[] = [];
    try {
      const AuthorizationGrant = (await import("@/lib/models/AuthorizationGrant")).default;
      const User = (await import("@/lib/models/User")).default;
      const Organization = (await import("@/lib/models/Organization")).default;
      const Practitioner = (await import("@/lib/models/Practitioner")).default;

      allGrants = await AuthorizationGrant.aggregate([
        {
          $match: {
            requestingPractitionerId: new mongoose.Types.ObjectId(practitionerId),
            auditDeletedDateTime: { $exists: false },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "patient",
          },
        },
        {
          $unwind: "$patient",
        },
        {
          $lookup: {
            from: "organizations",
            localField: "organizationId",
            foreignField: "_id",
            as: "organization",
          },
        },
        {
          $unwind: "$organization",
        },
        {
          $lookup: {
            from: "practitioners",
            localField: "requestingPractitionerId",
            foreignField: "_id",
            as: "practitioner",
          },
        },
        {
          $unwind: { path: "$practitioner", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "users",
            localField: "practitioner.userId",
            foreignField: "_id",
            as: "practitionerUser",
          },
        },
        {
          $unwind: { path: "$practitionerUser", preserveNullAndEmptyArrays: true },
        },
        {
          $sort: { 
            "grantDetails.grantedAt": -1, // Latest granted first
            "grantDetails.status": 1, // Then by status (ACTIVE before PENDING, etc.)
            createdAt: -1 // Finally by creation date
          },
        },
        {
          $project: {
            id: "$_id",
            patientName: {
              $concat: ["$patient.personalInfo.firstName", " ", "$patient.personalInfo.lastName"],
            },
            patientId: "$patient.digitalIdentifier",
            status: "$grantDetails.status",
            issuedAt: {
              $cond: {
                if: { $ne: ["$grantDetails.grantedAt", null] },
                then: "$grantDetails.grantedAt",
                else: "$createdAt"
              }
            },
            notes: {
              $switch: {
                branches: [
                  { case: { $eq: ["$grantDetails.status", "ACTIVE"] }, then: "Access granted - Active authorization" },
                  { case: { $eq: ["$grantDetails.status", "PENDING"] }, then: "Authorization request pending approval" },
                  { case: { $eq: ["$grantDetails.status", "EXPIRED"] }, then: "Authorization expired" },
                  { case: { $eq: ["$grantDetails.status", "REVOKED"] }, then: "Authorization revoked" }
                ],
                default: "Authorization request"
              }
            },
            prescribingPractitioner: {
              name: {
                $cond: {
                  if: { $ne: ["$practitionerUser", null] },
                  then: {
                    $concat: [
                      "$practitionerUser.personalInfo.firstName",
                      " ",
                      "$practitionerUser.personalInfo.lastName",
                    ],
                  },
                  else: "Unknown Practitioner",
                },
              },
              type: {
                $cond: {
                  if: { $ne: ["$practitioner", null] },
                  then: "$practitioner.professionalInfo.practitionerType",
                  else: "practitioner",
                },
              },
            },
            type: { $literal: "authorization_grant" },
            grantId: "$_id",
            organizationName: "$organization.organizationInfo.name",
            accessScope: "$accessScope",
          },
        },
      ]);
    } catch (error) {
      console.error("Error fetching authorization grants:", error);
    }

    // Combine prescriptions and authorization grants
    const allItems = [
      ...pendingPrescriptions.map((prescription: any) => ({
        ...prescription,
        priority: getPrescriptionPriority(prescription.medicationName || "", prescription.notes),
      })),
      ...allGrants.map((grant: any) => ({
        ...grant,
        priority: grant.status === "ACTIVE" ? "high" : grant.status === "PENDING" ? "normal" : "low",
      })),
    ];

    // Sort by priority and date - granted/active items first
    return allItems.sort((a, b) => {
      // First sort by priority
      const priorityOrder = { high: 3, urgent: 3, normal: 2, low: 1, stat: 4 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then sort by date
      return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
    });
  } catch (error) {
    console.error("Error fetching pending prescriptions:", error);
    return [];
  }
}

/**
 * Helper function to determine prescription priority based on medication and notes
 */
function getPrescriptionPriority(medicationName?: string, notes?: string): "normal" | "urgent" | "stat" {
  if (!medicationName) return "normal";

  const urgentMedications = ["insulin", "epinephrine", "nitroglycerin", "warfarin", "digoxin", "phenytoin", "lithium"];

  const statMedications = ["epinephrine", "nitroglycerin", "atropine", "dopamine"];

  const lowerMedName = medicationName.toLowerCase();
  const lowerNotes = notes?.toLowerCase() || "";

  if (statMedications.some((med) => lowerMedName.includes(med)) || lowerNotes.includes("stat")) {
    return "stat";
  }

  if (
    urgentMedications.some((med) => lowerMedName.includes(med)) ||
    lowerNotes.includes("urgent") ||
    lowerNotes.includes("asap")
  ) {
    return "urgent";
  }

  return "normal";
}
