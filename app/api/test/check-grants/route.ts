import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const grants = await AuthorizationGrant.find({})
      .select("_id userId organizationId grantDetails requestingPractitionerId")
      .lean();

    return NextResponse.json({
      success: true,
      totalGrants: grants.length,
      grants: grants,
    });
  } catch (error) {
    console.error("Error checking authorization grants:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check authorization grants" },
      { status: 500 },
    );
  }
}
