import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectToDatabase from "@/lib/mongodb";
import Practitioner from "@/lib/models/Practitioner";
import Organization from "@/lib/models/Organization";
import { withAuth } from "@/lib/middleware/auth";
import { logger } from "@/lib/logger";
import { UserRole } from "@/lib/types/enums";

// Validation schema for pharmacist professional information
const PharmacistProfessionalInfoSchema = z.object({
  licenseNumber: z.string().min(3, "License number must be at least 3 characters").max(50),
  specialty: z.string().min(2, "Specialty must be at least 2 characters").max(100),
  practitionerType: z
    .enum([
      "pharmacist",
      "clinical_pharmacist",
      "hospital_pharmacist",
      "community_pharmacist",
      "industrial_pharmacist",
      "consultant_pharmacist",
    ])
    .default("pharmacist"),
  yearsOfExperience: z
    .number()
    .min(0, "Years of experience cannot be negative")
    .max(70, "Years of experience seems too high"),
  currentPosition: z.string().min(2, "Position must be at least 2 characters").max(100),
  department: z.string().optional(),
  organizationId: z.string().optional(),

  // Pharmacy-specific fields
  certifications: z
    .array(
      z.object({
        name: z.string().min(2, "Certification name required"),
        issuingBody: z.string().min(2, "Issuing body required"),
        issueDate: z.string().transform((str) => new Date(str)),
        expiryDate: z
          .string()
          .transform((str) => new Date(str))
          .optional(),
        verificationStatus: z.enum(["pending", "verified", "expired"]).default("pending"),
      })
    )
    .default([]),

  specializations: z.array(z.string().min(2, "Specialization must be at least 2 characters")).default([]),

  languages: z.array(z.string().min(2, "Language must be at least 2 characters")).default([]),

  // Professional development
  continuingEducation: z
    .object({
      totalHours: z.number().min(0).default(0),
      lastCompletedDate: z
        .string()
        .transform((str) => new Date(str))
        .optional(),
      certifyingBody: z.string().optional(),
    })
    .optional(),

  // Emergency contact for professional purposes
  emergencyContact: z
    .object({
      name: z.string().min(2, "Emergency contact name required"),
      relationship: z.string().min(2, "Relationship required"),
      phone: z.string().regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
      email: z.string().email("Invalid email format").optional(),
    })
    .optional(),

  // Professional preferences
  preferences: z
    .object({
      workingHours: z.string().optional(),
      consultationTypes: z.array(z.string()).default([]),
      specialInterests: z.array(z.string()).default([]),
    })
    .optional(),
});

/**
 * GET /api/pharmacist/professional-info
 * Retrieve pharmacist's professional information
 */
async function getPharmacistProfessionalInfo(request: NextRequest, authContext: any) {
  try {
    const userId = authContext.userId;
    logger.info(`Pharmacist ${userId} requesting professional information`);

    await connectToDatabase();

    // Find the practitioner record for this user
    const practitioner = await Practitioner.findOne({
      userId: userId,
      practitionerType: {
        $in: [
          "pharmacist",
          "clinical_pharmacist",
          "hospital_pharmacist",
          "community_pharmacist",
          "industrial_pharmacist",
          "consultant_pharmacist",
        ],
      },
    }).populate("organizationId", "organizationInfo.name organizationInfo.type address");

    if (!practitioner) {
      logger.info(`No pharmacist professional information found for user ${userId}`);
      return NextResponse.json({
        success: true,
        data: null,
        message: "No professional information found. Please complete your profile.",
      });
    }

    logger.info(`Retrieved pharmacist professional information for user ${userId}`);

    return NextResponse.json({
      success: true,
      data: {
        id: practitioner._id,
        licenseNumber: practitioner.professionalInfo?.licenseNumber,
        specialty: practitioner.professionalInfo?.specialty,
        practitionerType: practitioner.practitionerType,
        yearsOfExperience: practitioner.professionalInfo?.yearsOfExperience,
        currentPosition: practitioner.professionalInfo?.currentPosition,
        department: practitioner.professionalInfo?.department,
        organizationId: practitioner.organizationId?._id,
        organizationName: practitioner.organizationId?.organizationInfo?.name,
        organizationType: practitioner.organizationId?.organizationInfo?.type,
        certifications: practitioner.professionalInfo?.certifications || [],
        specializations: practitioner.professionalInfo?.specializations || [],
        languages: practitioner.professionalInfo?.languages || [],
        continuingEducation: practitioner.professionalInfo?.continuingEducation,
        emergencyContact: practitioner.professionalInfo?.emergencyContact,
        preferences: practitioner.professionalInfo?.preferences,
        completionPercentage: calculateCompletionPercentage(practitioner),
        lastUpdated: practitioner.auditUpdatedDateTime,
      },
    });
  } catch (error) {
    logger.error("Error retrieving pharmacist professional info:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve professional information",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pharmacist/professional-info
 * Create or update pharmacist's professional information
 */
async function savePharmacistProfessionalInfo(request: NextRequest, authContext: any) {
  try {
    const userId = authContext.userId;
    logger.info(`Pharmacist ${userId} updating professional information`);

    const body = await request.json();

    // Validate the input
    const validatedData = PharmacistProfessionalInfoSchema.parse(body);

    await connectToDatabase();

    // Validate organization if provided
    if (validatedData.organizationId) {
      const organization = await Organization.findById(validatedData.organizationId);
      if (!organization) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid organization ID",
            message: "The specified organization does not exist",
          },
          { status: 400 }
        );
      }
    }

    // Find existing practitioner record or create new one
    let practitioner = await Practitioner.findOne({
      userId: userId,
      practitionerType: {
        $in: [
          "pharmacist",
          "clinical_pharmacist",
          "hospital_pharmacist",
          "community_pharmacist",
          "industrial_pharmacist",
          "consultant_pharmacist",
        ],
      },
    });

    const professionalInfo = {
      licenseNumber: validatedData.licenseNumber,
      specialty: validatedData.specialty,
      yearsOfExperience: validatedData.yearsOfExperience,
      currentPosition: validatedData.currentPosition,
      department: validatedData.department,
      certifications: validatedData.certifications,
      specializations: validatedData.specializations,
      languages: validatedData.languages,
      continuingEducation: validatedData.continuingEducation,
      emergencyContact: validatedData.emergencyContact,
      preferences: validatedData.preferences,
    };

    if (practitioner) {
      // Update existing record
      practitioner.professionalInfo = professionalInfo;
      practitioner.practitionerType = validatedData.practitionerType;
      if (validatedData.organizationId) {
        practitioner.organizationId = validatedData.organizationId;
      }
      practitioner.auditUpdatedDateTime = new Date();
      practitioner.auditUpdatedBy = userId;

      await practitioner.save();
      logger.info(`Updated pharmacist professional information for user ${userId}`);
    } else {
      // Create new record
      practitioner = new Practitioner({
        userId: userId,
        practitionerType: validatedData.practitionerType,
        organizationId: validatedData.organizationId || null,
        professionalInfo: professionalInfo,
        status: "active",
        auditCreatedDateTime: new Date(),
        auditCreatedBy: userId,
        auditUpdatedDateTime: new Date(),
        auditUpdatedBy: userId,
      });

      await practitioner.save();
      logger.info(`Created new pharmacist professional information for user ${userId}`);
    }

    // Return the updated information
    return NextResponse.json({
      success: true,
      data: {
        id: practitioner._id,
        licenseNumber: practitioner.professionalInfo?.licenseNumber,
        specialty: practitioner.professionalInfo?.specialty,
        practitionerType: practitioner.practitionerType,
        yearsOfExperience: practitioner.professionalInfo?.yearsOfExperience,
        currentPosition: practitioner.professionalInfo?.currentPosition,
        department: practitioner.professionalInfo?.department,
        organizationId: practitioner.organizationId,
        certifications: practitioner.professionalInfo?.certifications || [],
        specializations: practitioner.professionalInfo?.specializations || [],
        languages: practitioner.professionalInfo?.languages || [],
        continuingEducation: practitioner.professionalInfo?.continuingEducation,
        emergencyContact: practitioner.professionalInfo?.emergencyContact,
        preferences: practitioner.professionalInfo?.preferences,
        completionPercentage: calculateCompletionPercentage(practitioner),
        lastUpdated: practitioner.auditUpdatedDateTime,
      },
      message: "Professional information saved successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`Validation error for pharmacist ${authContext.userId}:`, error.errors);
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    logger.error("Error saving pharmacist professional info:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save professional information",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate completion percentage based on filled fields
 */
function calculateCompletionPercentage(practitioner: any): number {
  const fields = [
    practitioner.professionalInfo?.licenseNumber,
    practitioner.professionalInfo?.specialty,
    practitioner.practitionerType,
    practitioner.professionalInfo?.yearsOfExperience,
    practitioner.professionalInfo?.currentPosition,
    practitioner.professionalInfo?.certifications?.length > 0,
    practitioner.professionalInfo?.languages?.length > 0,
    practitioner.professionalInfo?.emergencyContact?.name,
  ];

  const filledFields = fields.filter(Boolean).length;
  return Math.round((filledFields / fields.length) * 100);
}

// Apply authentication middleware that allows pharmacists, admins, and other healthcare staff
const authenticatedGetHandler = withAuth(getPharmacistProfessionalInfo, {
  allowedRoles: [UserRole.PHARMACIST, UserRole.ADMIN, UserRole.DOCTOR],
  requireAuth: true,
});

const authenticatedPostHandler = withAuth(savePharmacistProfessionalInfo, {
  allowedRoles: [UserRole.PHARMACIST, UserRole.ADMIN],
  requireAuth: true,
});

export { authenticatedGetHandler as GET, authenticatedPostHandler as POST };
