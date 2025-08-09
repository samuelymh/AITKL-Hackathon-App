import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/middleware/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/lib/models/User";

// Helper function to determine user status
function getUserStatus(user: any): string {
  if (user.auth?.accountLocked) return "suspended";
  if (!user.auth?.emailVerified) return "pending";
  return "active";
}

// Helper function to format last login time
function formatLastLogin(lastLogin: Date | null): string {
  if (!lastLogin) return "Never";

  const loginDate = new Date(lastLogin);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - loginDate.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;

  return loginDate.toLocaleDateString();
}

// Helper function to format user data
function formatUserData(user: any) {
  const email = user.personalInfo?.contact?.email || "No email";
  const firstName = user.personalInfo?.firstName || "Unknown";
  const lastName = user.personalInfo?.lastName || "User";

  return {
    id: user._id.toString(),
    digitalIdentifier: user.digitalIdentifier,
    name: `${firstName} ${lastName}`,
    email: email,
    role: user.auth?.role || "patient",
    status: getUserStatus(user),
    lastLogin: formatLastLogin(user.auth?.lastLogin),
    verified: user.auth?.emailVerified || false,
    createdAt: user.auditCreatedDateTime,
  };
}

async function getRecentUsersHandler(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    // Fetch recent users (sorted by creation date)
    const recentUsers = await User.find({
      auditDeletedDateTime: { $exists: false },
    })
      .select(
        `
      digitalIdentifier 
      personalInfo.firstName 
      personalInfo.lastName 
      personalInfo.contact.email 
      auth.role 
      auth.emailVerified 
      auth.lastLogin 
      auth.accountLocked
      auditCreatedDateTime
    `
      )
      .sort({ auditCreatedDateTime: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Format the data for the frontend
    const formattedUsers = recentUsers.map(formatUserData);

    // Get total count for pagination
    const totalUsers = await User.countDocuments({
      auditDeletedDateTime: { $exists: false },
    });

    return NextResponse.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
          hasNext: page * limit < totalUsers,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching recent users:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch recent users",
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getRecentUsersHandler);
