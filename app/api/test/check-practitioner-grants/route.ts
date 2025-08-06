import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const practitionerId = "6891b41c5f75f2f335d1a187";

    // Find all grants for this practitioner
    const grants = await AuthorizationGrant.find({
      requestingPractitionerId: new mongoose.Types.ObjectId(practitionerId),
    })
      .populate("userId", "personalInfo digitalIdentifier")
      .populate("organizationId", "organizationInfo")
      .lean();

    return NextResponse.json({
      success: true,
      practitionerId: practitionerId,
      totalGrants: grants.length,
      grants: grants.map((grant) => ({
        id: grant._id,
        userId: grant.userId,
        organizationId: grant.organizationId,
        status: grant.grantDetails?.status,
        expiresAt: grant.grantDetails?.expiresAt,
        grantedAt: grant.grantDetails?.grantedAt,
        accessScope: grant.accessScope,
        isExpired: new Date() > new Date(grant.grantDetails?.expiresAt || 0),
        isActive: grant.grantDetails?.status === "ACTIVE" && new Date() <= new Date(grant.grantDetails?.expiresAt || 0),
      })),
    });
  } catch (error) {
    console.error("Error checking practitioner grants:", error);
    return NextResponse.json({ success: false, error: "Failed to check grants" }, { status: 500 });
  }
}
