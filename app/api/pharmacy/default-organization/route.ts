import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Organization from "@/lib/models/Organization";

/**
 * GET /api/pharmacy/default-organization
 * Returns the default pharmacy organization or creates one if none exists
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // First, try to find an existing pharmacy organization
    let pharmacy = await Organization.findOne({
      "organizationInfo.type": "PHARMACY",
      "verification.isVerified": true,
      auditDeletedDateTime: { $exists: false },
    });

    // If no verified pharmacy exists, create a default one
    if (!pharmacy) {
      const defaultPharmacyData = {
        organizationInfo: {
          name: "Demo Pharmacy",
          type: "PHARMACY",
          registrationNumber: "DEMO-PHARM-001",
          description: "Demo pharmacy for testing and development",
        },
        address: {
          street: "123 Pharmacy Street",
          city: "Demo City",
          state: "Demo State",
          postalCode: "12345",
          country: "Demo Country",
        },
        contact: {
          phone: "+1-555-0123",
          email: "info@demopharmacy.com",
          website: "https://demopharmacy.com",
        },
        verification: {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: "system-auto",
        },
        metadata: {
          isActive: true,
          memberCount: 0,
          establishedDate: new Date("2020-01-01"),
        },
      };

      pharmacy = new Organization(defaultPharmacyData);
      await pharmacy.save();
      console.log("Created default pharmacy organization:", pharmacy._id);
    }

    return NextResponse.json(
      {
        success: true,
        organization: {
          id: pharmacy._id,
          name: pharmacy.organizationInfo.name,
          type: pharmacy.organizationInfo.type,
          registrationNumber: pharmacy.organizationInfo.registrationNumber,
          verified: pharmacy.verification.isVerified,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error getting default pharmacy organization:", error);
    return NextResponse.json(
      {
        error: "Failed to get default pharmacy organization",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
