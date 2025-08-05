import { NextRequest, NextResponse } from "next/server";
import Organization, { OrganizationType } from "@/lib/models/Organization";
import connectToDatabase from "@/lib/mongodb";
import { z } from "zod";

// Validation schema for organization registration
const organizationRegistrationSchema = z.object({
  organizationInfo: z.object({
    name: z.string().min(1).max(200).trim(),
    type: z.enum(["HOSPITAL", "CLINIC", "PHARMACY", "LABORATORY"]),
    registrationNumber: z.string().max(100).trim().optional(),
    description: z.string().max(1000).optional(),
  }),
  address: z.object({
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
  }),
  contact: z.object({
    phone: z
      .string()
      .min(1)
      .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number"),
    email: z.string().email(),
    website: z.string().url().optional(),
  }),
  metadata: z
    .object({
      establishedDate: z.string().datetime().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
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
        { status: 400 }
      );
    }

    const organizationData = validation.data;

    // Connect to database
    await connectToDatabase();

    // Check if organization with same registration number already exists
    if (organizationData.organizationInfo.registrationNumber) {
      const existingOrg = await Organization.findByRegistrationNumber(
        organizationData.organizationInfo.registrationNumber
      );
      if (existingOrg) {
        return NextResponse.json(
          {
            error: "Organization with this registration number already exists",
          },
          { status: 409 }
        );
      }
    }

    // Check if organization with same name and location already exists
    const existingOrgByName = await Organization.findOne({
      "organizationInfo.name": organizationData.organizationInfo.name,
      "address.city": organizationData.address.city,
      "address.state": organizationData.address.state,
      auditDeletedDateTime: { $exists: false },
    });

    if (existingOrgByName) {
      return NextResponse.json(
        {
          error: "Organization with this name already exists in this location",
        },
        { status: 409 }
      );
    }

    // Create new organization
    const organization = new Organization({
      organizationInfo: organizationData.organizationInfo,
      address: organizationData.address,
      contact: organizationData.contact,
      verification: {
        isVerified: false, // New organizations start unverified
      },
      metadata: {
        isActive: true,
        memberCount: 0,
        establishedDate: organizationData.metadata?.establishedDate
          ? new Date(organizationData.metadata.establishedDate)
          : undefined,
      },
      auditCreatedBy: "system", // TODO: Replace with actual user ID from auth
    });

    // Save organization
    const savedOrganization = await organization.save();

    return NextResponse.json(
      {
        success: true,
        message: "Organization registered successfully",
        data: {
          organization: savedOrganization.toPublicJSON(),
        },
      },
      { status: 201 }
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
          { status: 409 }
        );
      }

      if (error.name === "ValidationError") {
        return NextResponse.json(
          {
            error: "Invalid organization data",
            details: error.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to register organization",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve organization details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("id");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();

    // Find organization
    const organization = await Organization.findById(organizationId).where({
      auditDeletedDateTime: { $exists: false },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
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
      { status: 500 }
    );
  }
}
