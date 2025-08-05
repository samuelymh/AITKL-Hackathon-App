import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db.connection";
import Organization from "@/lib/models/Organization";

const sampleOrganizations = [
  {
    organizationInfo: {
      name: "General Hospital",
      type: "hospital",
      registrationNumber: "GH001",
      description: "A leading healthcare facility providing comprehensive medical services",
    },
    address: {
      street: "123 Medical Center Drive",
      city: "Houston",
      state: "Texas",
      postalCode: "77001",
      country: "United States",
    },
    contact: {
      phone: "+1-713-555-0100",
      email: "info@generalhospital.com",
      website: "https://www.generalhospital.com",
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin",
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date("2000-01-01"),
    },
    auditCreatedBy: "system-seed",
    auditCreatedDateTime: new Date(),
  },
  {
    organizationInfo: {
      name: "City Medical Center",
      type: "clinic",
      registrationNumber: "CMC002",
      description: "Community medical center serving the local area",
    },
    address: {
      street: "456 Healthcare Boulevard",
      city: "Austin",
      state: "Texas",
      postalCode: "73301",
      country: "United States",
    },
    contact: {
      phone: "+1-512-555-0200",
      email: "contact@citymedical.com",
      website: "https://www.citymedical.com",
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin",
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date("2010-06-15"),
    },
    auditCreatedBy: "system-seed",
    auditCreatedDateTime: new Date(),
  },
  {
    organizationInfo: {
      name: "MedPharm Pharmacy",
      type: "pharmacy",
      registrationNumber: "MP003",
      description: "Full-service pharmacy with prescription and OTC medications",
    },
    address: {
      street: "789 Pharmacy Lane",
      city: "Dallas",
      state: "Texas",
      postalCode: "75201",
      country: "United States",
    },
    contact: {
      phone: "+1-214-555-0300",
      email: "info@medpharm.com",
      website: "https://www.medpharm.com",
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin",
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date("2015-03-20"),
    },
    auditCreatedBy: "system-seed",
    auditCreatedDateTime: new Date(),
  },
];

/**
 * POST endpoint to seed organizations (development only)
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Seed endpoint not available in production" }, { status: 403 });
    }

    await connectToDatabase();

    const existingCount = await Organization.countDocuments();
    console.log(`Found ${existingCount} existing organizations`);

    if (existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: "Organizations already exist, skipping seed",
        existingCount,
      });
    }

    const createdOrgs = [];
    for (const orgData of sampleOrganizations) {
      const organization = new Organization(orgData);
      const saved = await organization.save();
      createdOrgs.push({
        id: saved._id,
        name: saved.organizationInfo.name,
        type: saved.organizationInfo.type,
      });
      console.log(`Created organization: ${orgData.organizationInfo.name}`);
    }

    const finalCount = await Organization.countDocuments();
    const verifiedCount = await Organization.countDocuments({ "verification.isVerified": true });

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${createdOrgs.length} organizations`,
      created: createdOrgs,
      stats: {
        totalCount: finalCount,
        verifiedCount,
      },
    });
  } catch (error) {
    console.error("Seed API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Seed failed",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
