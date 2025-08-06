import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Practitioner from "@/lib/models/Practitioner";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const practitioners = await Practitioner.find({}).select("_id userId firstName lastName professionalInfo").lean();

    return NextResponse.json({
      success: true,
      totalPractitioners: practitioners.length,
      practitioners: practitioners,
    });
  } catch (error) {
    console.error("Error checking practitioners:", error);
    return NextResponse.json({ success: false, error: "Failed to check practitioners" }, { status: 500 });
  }
}
