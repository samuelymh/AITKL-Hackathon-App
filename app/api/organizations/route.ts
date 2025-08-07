import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OrganizationService } from "@/lib/services/organizationService";
import { withMedicalStaffAuth, withOptionalAuth } from "@/lib/middleware/auth";
import { withCSRFProtection } from "@/lib/middleware/csrf";

// Constants
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || "system";

// Reusable schemas for better maintainability
const organizationInfoSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  type: z.enum(["HOSPITAL", "CLINIC", "PHARMACY", "LABORATORY"]),
  registrationNumber: z.string().max(100).trim().optional(),
  description: z.string().max(1000).optional(),
});

const addressSchema = z.object({
  street: z.string().min(1).max(200).trim(),
  city: z.string().min(1).max(100).trim(),
  state: z.string().min(1).max(100).trim(),
  postalCode: z.string().min(1).max(20).trim(),
  country: z.string().max(100).trim().default("Malaysia"),
  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
    })
    .optional(),
});

const contactSchema = z.object({
  phone: z
    .string()
    .min(1)
    .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number"),
  email: z.string().email(),
  website: z.string().url().optional(),
});

const metadataSchema = z
  .object({
    establishedDate: z.string().datetime().optional(),
  })
  .optional();

// Validation schema for organization registration
// Validation schema for organization registration
const organizationRegistrationSchema = z.object({
  organizationInfo: organizationInfoSchema,
  address: addressSchema,
  contact: contactSchema,
  metadata: metadataSchema,
});

// POST endpoint with authentication and CSRF protection
async function postHandler(request: NextRequest, authContext?: any) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = organizationRegistrationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid organization data",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const organizationData = validation.data;

    // Check if organization already exists
    const existingOrg =
      await OrganizationService.findExistingOrganization(organizationData);
    const validationError = OrganizationService.validateExistingOrganization(
      existingOrg,
      organizationData.organizationInfo.registrationNumber,
    );

    if (validationError) {
      return NextResponse.json(
        { error: validationError.error },
        { status: validationError.status },
      );
    }

    // Use authenticated user ID if available, otherwise fallback to system
    const createdBy = authContext?.userId || SYSTEM_USER_ID;

    // Create new organization
    const savedOrganization = await OrganizationService.createOrganization(
      organizationData,
      createdBy,
    );

    return NextResponse.json(
      {
        success: true,
        message: "Organization registered successfully",
        data: {
          organization: savedOrganization.toPublicJSON(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Organization registration error:", error);

    // Handle specific MongoDB errors
    if (error instanceof Error) {
      if (error.message.includes("E11000")) {
        // Duplicate key error
        return NextResponse.json(
          {
            error: "Organization with this information already exists",
          },
          { status: 409 },
        );
      }

      if (error.name === "ValidationError") {
        return NextResponse.json(
          {
            error: "Invalid organization data",
            details: error.message,
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to register organization",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Apply authentication and CSRF protection to POST endpoint
export const POST = withCSRFProtection(withMedicalStaffAuth(postHandler));

// GET endpoint to retrieve organization details
async function getHandler(request: NextRequest, authContext?: any) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Find organization using service
    const organization =
      await OrganizationService.getOrganizationById(organizationId);

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        organization: organization.toPublicJSON(),
      },
    });
  } catch (error) {
    console.error("Organization retrieval error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve organization",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Apply optional authentication to GET endpoint (public access allowed)
export const GET = withOptionalAuth(getHandler);
