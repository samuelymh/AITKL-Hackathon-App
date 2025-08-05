import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db.connection";
import Organization from "@/lib/models/Organization";

/**
 * POST endpoint to verify an organization (development only)
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Verify endpoint not available in production" }, { status: 403 });
    }

    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Update verification status
    organization.verification = {
      ...organization.verification,
      isVerified: true,
      verifiedAt: new Date(),
      verificationNotes: "Verified by dev-admin for testing",
    };

    await organization.save();

    return NextResponse.json({
      success: true,
      message: `Organization "${organization.organizationInfo.name}" has been verified`,
      organization: {
        id: organization._id,
        name: organization.organizationInfo.name,
        verified: organization.verification.isVerified,
      },
    });
  } catch (error) {
    console.error("Verify API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      },
      { status: 500 }
    );
  }
}
