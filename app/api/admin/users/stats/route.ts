import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/middleware/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/lib/models/User";

async function getUserStatsHandler(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get total user counts by role
    const [totalUsers, adminUsers, medicalStaff, patients] = await Promise.all([
      // Total users (not deleted)
      User.countDocuments({
        auditDeletedDateTime: { $exists: false },
      }),

      // Admin users
      User.countDocuments({
        "auth.role": "admin",
        auditDeletedDateTime: { $exists: false },
      }),

      // Medical staff (doctors and pharmacists)
      User.countDocuments({
        "auth.role": { $in: ["doctor", "pharmacist"] },
        auditDeletedDateTime: { $exists: false },
      }),

      // Patients
      User.countDocuments({
        "auth.role": "patient",
        auditDeletedDateTime: { $exists: false },
      }),
    ]);

    // Get user growth data for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newUsersLast7Days = await User.countDocuments({
      auditCreatedDateTime: { $gte: sevenDaysAgo },
      auditDeletedDateTime: { $exists: false },
    });

    // Get active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await User.countDocuments({
      "auth.lastLogin": { $gte: thirtyDaysAgo },
      auditDeletedDateTime: { $exists: false },
    });

    // Get verified vs unverified users
    const verifiedUsers = await User.countDocuments({
      "auth.emailVerified": true,
      auditDeletedDateTime: { $exists: false },
    });

    const stats = {
      totalUsers,
      adminUsers,
      medicalStaff,
      patients,
      newUsersLast7Days,
      activeUsers,
      verifiedUsers,
      unverifiedUsers: totalUsers - verifiedUsers,
      // Breakdown by role
      roleBreakdown: {
        admin: adminUsers,
        doctor: await User.countDocuments({
          "auth.role": "doctor",
          auditDeletedDateTime: { $exists: false },
        }),
        pharmacist: await User.countDocuments({
          "auth.role": "pharmacist",
          auditDeletedDateTime: { $exists: false },
        }),
        patient: patients,
      },
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user statistics",
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getUserStatsHandler);
