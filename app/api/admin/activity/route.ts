import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/middleware/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/lib/models/User";
import Organization from "@/lib/models/Organization";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/activity
 * Get recent system activity for admin dashboard
 */
async function getRecentActivityHandler(request: NextRequest, authContext: any) {
  try {
    logger.info(`Admin ${authContext.userId} requesting recent activity`);

    await connectToDatabase();

    const activities: any[] = [];

    // Get recent user registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await User.find({
      auditCreatedDateTime: { $gte: sevenDaysAgo },
      auditDeletedDateTime: { $exists: false },
    })
      .sort({ auditCreatedDateTime: -1 })
      .limit(5)
      .select("personalInfo.firstName personalInfo.lastName personalInfo.contact.email auth.role auditCreatedDateTime");

    // Add user activities
    recentUsers.forEach((user) => {
      activities.push({
        id: `user-${user._id}`,
        action: `${user.auth?.role === "admin" ? "Admin" : "User"} registered`,
        user: user.personalInfo?.contact?.email || "Unknown user",
        timestamp: user.auditCreatedDateTime.toISOString(),
        type: "user",
        status: "success",
      });
    });

    // Get recent organization requests (last 7 days)
    const recentOrganizations = await Organization.find({
      auditCreatedDateTime: { $gte: sevenDaysAgo },
      auditDeletedDateTime: { $exists: false },
    })
      .sort({ auditCreatedDateTime: -1 })
      .limit(5)
      .select("name verificationStatus auditCreatedDateTime");

    // Add organization activities
    recentOrganizations.forEach((org) => {
      activities.push({
        id: `org-${org._id}`,
        action: "Organization verification request",
        user: org.name || "Unknown organization",
        timestamp: org.auditCreatedDateTime.toISOString(),
        type: "organization",
        status: org.verificationStatus === "pending" ? "warning" : "success",
      });
    });

    // Get recent logins (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentLogins = await User.find({
      "auth.lastLogin": { $gte: yesterday },
      auditDeletedDateTime: { $exists: false },
    })
      .sort({ "auth.lastLogin": -1 })
      .limit(3)
      .select("personalInfo.firstName personalInfo.lastName personalInfo.contact.email auth.lastLogin auth.role");

    // Add login activities
    recentLogins.forEach((user) => {
      activities.push({
        id: `login-${user._id}`,
        action: `User logged in`,
        user: user.personalInfo?.contact?.email || "Unknown user",
        timestamp: user.auth?.lastLogin?.toISOString() || new Date().toISOString(),
        type: "user",
        status: "success",
      });
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Return top 10 most recent activities
    const recentActivity = activities.slice(0, 10);

    logger.info(`Recent activity retrieved: ${recentActivity.length} items`);

    return NextResponse.json({
      success: true,
      data: recentActivity,
    });
  } catch (error) {
    logger.error("Recent activity error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve recent activity",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getRecentActivityHandler);
