import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/middleware/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/lib/models/User";
import Organization from "@/lib/models/Organization";
import { logger } from "@/lib/logger";

// In-memory cache for analytics data (use Redis in production)
interface CacheEntry {
  data: any;
  timestamp: number;
}

const analyticsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/admin/analytics
 * Advanced analytics and reporting for admin dashboard with caching
 */
async function getAdvancedAnalyticsHandler(request: NextRequest, authContext: any) {
  try {
    logger.info(`Admin ${authContext.userId} requesting advanced analytics`);

    // Check cache first
    const cacheKey = "admin-analytics";
    const cached = analyticsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.info("Serving analytics from cache");
      return NextResponse.json({
        success: true,
        data: { ...cached.data, fromCache: true },
      });
    }

    await connectToDatabase();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // ===============================
    // USER ANALYTICS
    // ===============================

    // User growth metrics
    const userGrowthMetrics = await Promise.all([
      // Total users by role
      User.aggregate([
        { $match: { auditDeletedDateTime: { $exists: false } } },
        { $group: { _id: "$auth.role", count: { $sum: 1 } } },
      ]),

      // User registration trends (last 30 days)
      User.aggregate([
        {
          $match: {
            auditCreatedDateTime: { $gte: thirtyDaysAgo },
            auditDeletedDateTime: { $exists: false },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$auditCreatedDateTime" } },
              role: "$auth.role",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),

      // User activity metrics
      User.aggregate([
        { $match: { auditDeletedDateTime: { $exists: false } } },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: {
                $cond: [{ $gte: ["$auth.lastLogin", sevenDaysAgo] }, 1, 0],
              },
            },
            verifiedEmails: {
              $sum: {
                $cond: [{ $eq: ["$auth.emailVerified", true] }, 1, 0],
              },
            },
            verifiedPhones: {
              $sum: {
                $cond: [{ $eq: ["$auth.phoneVerified", true] }, 1, 0],
              },
            },
            lockedAccounts: {
              $sum: {
                $cond: [{ $eq: ["$auth.accountLocked", true] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    // ===============================
    // ORGANIZATION ANALYTICS
    // ===============================

    const organizationMetrics = await Promise.all([
      // Organizations by type and verification status
      Organization.aggregate([
        { $match: { auditDeletedDateTime: { $exists: false } } },
        {
          $group: {
            _id: {
              type: "$organizationInfo.type",
              verified: "$verification.isVerified",
            },
            count: { $sum: 1 },
          },
        },
      ]),

      // Organization registration trends
      Organization.aggregate([
        {
          $match: {
            auditCreatedDateTime: { $gte: thirtyDaysAgo },
            auditDeletedDateTime: { $exists: false },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$auditCreatedDateTime" } },
              type: "$organizationInfo.type",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),

      // Geographic distribution
      Organization.aggregate([
        { $match: { auditDeletedDateTime: { $exists: false } } },
        {
          $group: {
            _id: {
              state: "$address.state",
              city: "$address.city",
            },
            count: { $sum: 1 },
            types: { $addToSet: "$organizationInfo.type" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);

    // ===============================
    // HEALTHCARE WORKFLOW ANALYTICS
    // ===============================

    const connection = await connectToDatabase();
    const db = connection.connection.db;

    if (!db) {
      throw new Error("Database connection failed");
    }

    const healthcareMetrics = await Promise.all([
      // Encounter analytics
      db
        .collection("encounters")
        .aggregate([
          { $match: { auditCreatedDateTime: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$encounter.encounterDate" } },
                type: "$encounter.encounterType",
              },
              count: { $sum: 1 },
              totalPrescriptions: { $sum: { $size: "$prescriptions" } },
            },
          },
          { $sort: { "_id.date": 1 } },
        ])
        .toArray(),

      // Prescription analytics
      db
        .collection("encounters")
        .aggregate([
          { $match: { auditCreatedDateTime: { $gte: thirtyDaysAgo } } },
          { $unwind: "$prescriptions" },
          {
            $group: {
              _id: {
                medication: "$prescriptions.medicationName",
                status: "$prescriptions.status",
              },
              count: { $sum: 1 },
              avgDosage: { $avg: { $toDouble: { $substr: ["$prescriptions.dosage", 0, -2] } } },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ])
        .toArray(),

      // Dispensation analytics
      db
        .collection("dispensations")
        .aggregate([
          { $match: { auditCreatedDateTime: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$dispensationDetails.fillDate" } },
                status: "$status",
              },
              count: { $sum: 1 },
              avgDaysSupply: { $avg: "$dispensationDetails.daysSupply" },
            },
          },
          { $sort: { "_id.date": 1 } },
        ])
        .toArray(),

      // Authorization grant analytics
      db
        .collection("authorizationGrants")
        .aggregate([
          { $match: { auditCreatedDateTime: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$grantedAt" } },
                status: "$status",
              },
              count: { $sum: 1 },
              avgTimeWindow: { $avg: "$requestDetails.timeWindowHours" },
            },
          },
          { $sort: { "_id.date": 1 } },
        ])
        .toArray(),
    ]);

    // ===============================
    // PERFORMANCE METRICS
    // ===============================

    const performanceMetrics = await Promise.all([
      // Most active organizations (by member count)
      db
        .collection("organizationMembers")
        .aggregate([
          { $match: { status: "active" } },
          {
            $group: {
              _id: "$organizationId",
              memberCount: { $sum: 1 },
              roles: { $addToSet: "$membershipDetails.role" },
            },
          },
          { $sort: { memberCount: -1 } },
          { $limit: 10 },
        ])
        .toArray(),

      // System performance indicators
      db
        .collection("users")
        .aggregate([
          {
            $group: {
              _id: null,
              avgLoginAttempts: { $avg: "$auth.loginAttempts" },
              maxLoginAttempts: { $max: "$auth.loginAttempts" },
              usersWithFailedLogins: {
                $sum: {
                  $cond: [{ $gt: ["$auth.loginAttempts", 0] }, 1, 0],
                },
              },
            },
          },
        ])
        .toArray(),

      // Data quality metrics
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            usersWithProfilePictures: {
              $sum: {
                $cond: [{ $exists: ["$personalInfo.profilePicture"] }, 1, 0],
              },
            },
            usersWithEmergencyContact: {
              $sum: {
                $cond: [{ $exists: ["$medicalInfo.emergencyContact"] }, 1, 0],
              },
            },
            usersWithMedicalInfo: {
              $sum: {
                $cond: [{ $exists: ["$medicalInfo.bloodType"] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    // ===============================
    // SECURITY ANALYTICS
    // ===============================

    const securityMetrics = await Promise.all([
      // Failed login attempts (last 7 days)
      User.aggregate([
        {
          $match: {
            "auth.loginAttempts": { $gt: 0 },
            auditModifiedDateTime: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$auditModifiedDateTime" } },
            },
            failedAttempts: { $sum: "$auth.loginAttempts" },
            uniqueUsers: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),

      // Account security status
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            lockedAccounts: {
              $sum: {
                $cond: [{ $eq: ["$auth.accountLocked", true] }, 1, 0],
              },
            },
            unverifiedEmails: {
              $sum: {
                $cond: [{ $ne: ["$auth.emailVerified", true] }, 1, 0],
              },
            },
            recentPasswordResets: {
              $sum: {
                $cond: [{ $gte: ["$auth.passwordResetAt", sevenDaysAgo] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    // ===============================
    // COMPLIANCE METRICS
    // ===============================

    const complianceMetrics = await Promise.all([
      // Audit trail completeness
      db
        .collection("users")
        .aggregate([
          {
            $group: {
              _id: null,
              recordsWithAuditTrail: {
                $sum: {
                  $cond: [{ $exists: ["$auditCreatedBy"] }, 1, 0],
                },
              },
              totalRecords: { $sum: 1 },
            },
          },
        ])
        .toArray(),

      // Data retention compliance (records older than 7 years)
      db
        .collection("encounters")
        .aggregate([
          {
            $group: {
              _id: null,
              totalEncounters: { $sum: 1 },
              oldRecords: {
                $sum: {
                  $cond: [
                    { $lt: ["$encounter.encounterDate", new Date(now.getTime() - 7 * 365 * 24 * 60 * 60 * 1000)] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray(),

      // Encryption compliance
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            encryptedFields: {
              $sum: {
                $cond: [
                  { $type: ["$personalInfo.firstName"] },
                  { $cond: [{ $eq: [{ $type: ["$personalInfo.firstName"] }, "object"] }, 1, 0] },
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    // ===============================
    // FINANCIAL INSIGHTS (if applicable)
    // ===============================

    const financialMetrics = await Promise.all([
      // Organization subscription analytics (placeholder for future billing)
      Organization.aggregate([
        {
          $group: {
            _id: "$organizationInfo.type",
            count: { $sum: 1 },
            avgMemberCount: { $avg: "$metadata.memberCount" },
          },
        },
      ]),

      // Resource utilization
      db
        .collection("encounters")
        .aggregate([
          { $match: { auditCreatedDateTime: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: "$organizationId",
              encounterCount: { $sum: 1 },
              avgPrescriptionsPerEncounter: { $avg: { $size: "$prescriptions" } },
            },
          },
          { $sort: { encounterCount: -1 } },
          { $limit: 10 },
        ])
        .toArray(),
    ]);

    // Compile all analytics
    const analytics = {
      userAnalytics: {
        growth: userGrowthMetrics[0],
        trends: userGrowthMetrics[1],
        activity: userGrowthMetrics[2][0],
      },
      organizationAnalytics: {
        byType: organizationMetrics[0],
        trends: organizationMetrics[1],
        geography: organizationMetrics[2],
      },
      healthcareWorkflow: {
        encounters: healthcareMetrics[0],
        prescriptions: healthcareMetrics[1],
        dispensations: healthcareMetrics[2],
        authorizations: healthcareMetrics[3],
      },
      performance: {
        topOrganizations: performanceMetrics[0],
        systemHealth: performanceMetrics[1][0],
        dataQuality: performanceMetrics[2][0],
      },
      security: {
        failedLogins: securityMetrics[0],
        accountSecurity: securityMetrics[1][0],
      },
      compliance: {
        auditCompliance: complianceMetrics[0][0],
        dataRetention: complianceMetrics[1][0],
        encryption: complianceMetrics[2][0],
      },
      financial: {
        organizationMetrics: financialMetrics[0],
        resourceUtilization: financialMetrics[1],
      },
      generatedAt: now.toISOString(),
      timeRanges: {
        last7Days: sevenDaysAgo.toISOString(),
        last30Days: thirtyDaysAgo.toISOString(),
        last90Days: ninetyDaysAgo.toISOString(),
      },
    };

    // Cache the result
    analyticsCache.set(cacheKey, {
      data: analytics,
      timestamp: Date.now(),
    });

    logger.info(`Advanced analytics compiled successfully for ${authContext.userId}`);

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("Advanced analytics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve advanced analytics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getAdvancedAnalyticsHandler);
