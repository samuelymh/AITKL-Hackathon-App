import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import dbConnect from "@/lib/db.connection";
import Practitioner from "@/lib/models/Practitioner";
import OrganizationMember from "@/lib/models/OrganizationMember";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get authentication context
    const authContext = getAuthContext(request);
    if (!authContext?.isAuthenticated) {
      return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
    }

    const userId = authContext.userId;

    // Find the practitioner record for this user
    const practitioner = await Practitioner.findOne({ userId });
    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner profile not found. Please complete your professional profile first." },
        { status: 404 }
      );
    }

    // Find the pharmacist's organization membership
    const membership = await OrganizationMember.findOne({
      practitionerId: practitioner._id,
      "membershipDetails.role": "pharmacist",
      status: "active",
    }).populate("organizationId");

    if (!membership) {
      return NextResponse.json(
        { error: "No active pharmacy organization membership found. Please contact your administrator." },
        { status: 404 }
      );
    }

    // Return the organization information
    return NextResponse.json({
      success: true,
      organization: {
        id: membership.organizationId._id.toString(),
        name: membership.organizationId.organizationInfo?.name || membership.organizationId.name,
        type: membership.organizationId.organizationInfo?.type || membership.organizationId.type,
        registrationNumber: membership.organizationId.organizationInfo?.registrationNumber || "",
        department: membership.membershipDetails.department,
        position: membership.membershipDetails.position,
        role: membership.membershipDetails.role,
        status: membership.status,
      },
    });
  } catch (error) {
    console.error("Error fetching pharmacist organization:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch organization information",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
