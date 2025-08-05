import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db.connection";
import Organization from "@/lib/models/Organization";

const sampleOrganizations = [
  {
    organizationInfo: {
      name: "General Hospital",
      type: "HOSPITAL",
      registrationNumber: "GH001",
      description: "A leading healthcare facility providing comprehensive medical services",
    },
    address: {
      street: "Jalan Hospital 123",
      city: "Kuala Lumpur",
      state: "Selangor",
      postalCode: "50000",
      country: "Malaysia",
    },
    contact: {
      phone: "+60-3-555-0100",
      email: "info@generalhospital.com.my",
      website: "https://www.generalhospital.com.my",
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
      type: "CLINIC",
      registrationNumber: "CMC002",
      description: "Community medical center serving the local area",
    },
    address: {
      street: "Jalan Kesihatan 456",
      city: "Petaling Jaya",
      state: "Selangor",
      postalCode: "46200",
      country: "Malaysia",
    },
    contact: {
      phone: "+60-3-555-0200",
      email: "contact@citymedical.com.my",
      website: "https://www.citymedical.com.my",
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
      type: "PHARMACY",
      registrationNumber: "MP003",
      description: "Full-service pharmacy with prescription and OTC medications",
    },
    address: {
      street: "Jalan Farmasi 789",
      city: "Johor Bahru",
      state: "Johor",
      postalCode: "80000",
      country: "Malaysia",
    },
    contact: {
      phone: "+60-7-555-0300",
      email: "info@medpharm.com.my",
      website: "https://www.medpharm.com.my",
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
  {
    organizationInfo: {
      name: "Wellness Clinic",
      type: "CLINIC",
      registrationNumber: "WC004",
      description: "Specialized wellness and preventive care clinic",
    },
    address: {
      street: "Jalan Wellness 321",
      city: "Penang",
      state: "Pulau Pinang",
      postalCode: "10000",
      country: "Malaysia",
    },
    contact: {
      phone: "+60-4-555-0400",
      email: "hello@wellnessclinic.com.my",
      website: "https://www.wellnessclinic.com.my",
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin",
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date("2018-09-10"),
    },
    auditCreatedBy: "system-seed",
    auditCreatedDateTime: new Date(),
  },
  {
    organizationInfo: {
      name: "DiagnoLab Diagnostics",
      type: "LABORATORY",
      registrationNumber: "DL005",
      description: "Comprehensive diagnostic laboratory services",
    },
    address: {
      street: "Jalan Diagnostik 888",
      city: "Shah Alam",
      state: "Selangor",
      postalCode: "40000",
      country: "Malaysia",
    },
    contact: {
      phone: "+60-3-555-0500",
      email: "lab@diagnolab.com.my",
      website: "https://www.diagnolab.com.my",
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin",
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date("2008-04-12"),
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
