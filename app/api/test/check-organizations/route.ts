import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Organization from "@/lib/models/Organization";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const organizations = await Organization.find({}).select("_id name type verificationStatus").lean();

    return NextResponse.json({
      success: true,
      totalOrganizations: organizations.length,
      organizations: organizations,
    });
  } catch (error) {
    console.error("Error checking organizations:", error);
    return NextResponse.json({ success: false, error: "Failed to check organizations" }, { status: 500 });
  }
}
