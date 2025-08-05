import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import dbConnect from "@/lib/db.connection";
import Practitioner from "@/lib/models/Practitioner";
import OrganizationMember from "@/lib/models/OrganizationMember";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Organization from "@/lib/models/Organization";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get authentication context
    const authContext = getAuthContext(request);
    if (!authContext?.isAuthenticated) {
      return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
    }

    const userId = authContext.userId;
    console.log("Fetching organization for user:", userId);

    // Find the practitioner record for this user
    const practitioner = await Practitioner.findOne({ userId });
    if (!practitioner) {
      console.log("No practitioner found for userId:", userId);
      return NextResponse.json(
        { error: "Practitioner profile not found. Please complete your professional profile first." },
        { status: 404 }
      );
    }

    console.log("Found practitioner:", practitioner._id, "for user:", userId);

    // Find the pharmacist's organization membership (allow active, pending, and pending_verification)
    const membership = await OrganizationMember.findOne({
      practitionerId: practitioner._id,
      "membershipDetails.role": "pharmacist",
      status: { $in: ["active", "pending", "pending_verification"] },
    });

    console.log("Membership query result:", membership ? "Found" : "Not found");
    if (membership) {
      console.log("Membership details:", {
        id: membership._id,
        organizationId: membership.organizationId,
        role: membership.membershipDetails.role,
        status: membership.status,
      });
    }

    if (!membership) {
      // Let's also try to find any membership for this practitioner to debug
      const anyMembership = await OrganizationMember.findOne({
        practitionerId: practitioner._id,
      });

      console.log(
        "Any membership found:",
        anyMembership
          ? {
              role: anyMembership.membershipDetails.role,
              status: anyMembership.status,
            }
          : "None"
      );

      return NextResponse.json(
        { error: "No pharmacy organization membership found. Please contact your administrator." },
        { status: 404 }
      );
    }

    // Fetch the organization separately to avoid schema registration issues
    const organization = await Organization.findById(membership.organizationId);

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Return the organization information
    return NextResponse.json({
      success: true,
      organization: {
        id: organization._id.toString(),
        name: organization.organizationInfo?.name || "Unknown Organization",
        type: organization.organizationInfo?.type || "PHARMACY",
        registrationNumber: organization.organizationInfo?.registrationNumber || "",
        department: membership.membershipDetails.department,
        position: membership.membershipDetails.position,
        role: membership.membershipDetails.role,
        status: membership.status,
        isPending: membership.status === "pending" || membership.status === "pending_verification",
        isVerified: membership.verificationInfo?.isVerified || false,
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
