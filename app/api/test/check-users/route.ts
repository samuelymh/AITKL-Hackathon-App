import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const users = await User.find({}).select("email role _id").lean();

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      users: users,
    });
  } catch (error) {
    console.error("Error checking users:", error);
    return NextResponse.json({ success: false, error: "Failed to check users" }, { status: 500 });
  }
}
