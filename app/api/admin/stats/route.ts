import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/middleware/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/lib/models/User";
import Organization from "@/lib/models/Organization";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/stats
 * Get system statistics for admin dashboard
 */
async function getSystemStatsHandler(request: NextRequest, authContext: any) {
  try {
    logger.info(`Admin ${authContext.userId} requesting system statistics`);

    await connectToDatabase();

    // Get total users count
    const totalUsers = await User.countDocuments({
      auditDeletedDateTime: { $exists: false },
    });

    // Get active admin users count
    const activeAdmins = await User.countDocuments({
      "auth.role": "admin",
      "auth.accountLocked": { $ne: true },
      auditDeletedDateTime: { $exists: false },
    });

    // Get pending organizations count
    const pendingOrganizations = await Organization.countDocuments({
      verificationStatus: "pending",
      auditDeletedDateTime: { $exists: false },
    });

    // Get daily logins count (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const dailyLogins = await User.countDocuments({
      "auth.lastLogin": { $gte: yesterday },
      auditDeletedDateTime: { $exists: false },
    });

    // Simple system health check (can be enhanced with more metrics)
    let systemHealth: "healthy" | "warning" | "critical" = "healthy";
    if (pendingOrganizations > 20) {
      systemHealth = "warning";
    }
    if (pendingOrganizations > 50) {
      systemHealth = "critical";
    }

    // Audit logs count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const auditLogs =
      (await User.countDocuments({
        auditCreatedDateTime: { $gte: thirtyDaysAgo },
      })) +
      (await Organization.countDocuments({
        auditCreatedDateTime: { $gte: thirtyDaysAgo },
      }));

    const stats = {
      totalUsers,
      activeAdmins,
      pendingOrganizations,
      systemHealth,
      auditLogs,
      dailyLogins,
    };

    logger.info(`System stats retrieved: ${JSON.stringify(stats)}`);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("System stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve system statistics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const GET = withAdminAuth(getSystemStatsHandler);
