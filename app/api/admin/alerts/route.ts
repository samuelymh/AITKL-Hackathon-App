import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/middleware/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/lib/models/User";
import Organization from "@/lib/models/Organization";
import { logger } from "@/lib/logger";
import mongoose from "mongoose";

type AlertSeverity = "critical" | "high" | "medium" | "low";
type AlertType = "security" | "system" | "compliance" | "performance";

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  data: Record<string, any>;
}

/**
 * GET /api/admin/alerts
 * Real-time critical alerts for admin dashboard
 */
async function getAdminAlertsHandler(request: NextRequest, authContext: any) {
  try {
    logger.info(`Admin ${authContext.userId} requesting critical alerts`);

    await connectToDatabase();

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const alerts: Alert[] = [];

    // Security Alerts
    const securityAlerts = await Promise.all([
      // Multiple failed login attempts
      User.find({
        "auth.loginAttempts": { $gte: 5 },
        auditModifiedDateTime: { $gte: oneHourAgo },
      }).select("_id personalInfo.firstName personalInfo.lastName auth.loginAttempts auditModifiedDateTime"),

      // Recently locked accounts
      User.find({
        "auth.accountLocked": true,
        auditModifiedDateTime: { $gte: oneDayAgo },
      }).select("_id personalInfo.firstName personalInfo.lastName auditModifiedDateTime"),

      // Suspicious login patterns (multiple accounts from same IP with failures)
      User.aggregate([
        {
          $match: {
            "auth.loginAttempts": { $gt: 0 },
            auditModifiedDateTime: { $gte: oneDayAgo },
          },
        },
        {
          $group: {
            _id: "$auth.lastLoginIP",
            failedAttempts: { $sum: "$auth.loginAttempts" },
            affectedUsers: { $sum: 1 },
            userIds: { $push: "$_id" },
          },
        },
        {
          $match: {
            failedAttempts: { $gte: 10 },
            affectedUsers: { $gte: 3 },
          },
        },
      ]),
    ]);

    // Process security alerts
    securityAlerts[0].forEach((user) => {
      alerts.push({
        id: `security-failed-login-${user._id}`,
        type: "security",
        severity: "high",
        title: "Multiple Failed Login Attempts",
        message: `User ${user.personalInfo?.firstName} ${user.personalInfo?.lastName} has ${user.auth?.loginAttempts || 0} failed login attempts`,
        timestamp: user.auditModifiedDateTime ? new Date(user.auditModifiedDateTime) : now,
        data: { userId: user._id, attempts: user.auth?.loginAttempts || 0 },
      });
    });

    securityAlerts[1].forEach((user) => {
      alerts.push({
        id: `security-locked-${user._id}`,
        type: "security",
        severity: "critical",
        title: "Account Locked",
        message: `User account for ${user.personalInfo?.firstName} ${user.personalInfo?.lastName} has been locked`,
        timestamp: user.auditModifiedDateTime ? new Date(user.auditModifiedDateTime) : now,
        data: { userId: user._id },
      });
    });

    securityAlerts[2].forEach((ipAlert: any) => {
      alerts.push({
        id: `security-suspicious-ip-${ipAlert._id}`,
        type: "security",
        severity: "critical",
        title: "Suspicious Login Pattern",
        message: `IP ${ipAlert._id} has ${ipAlert.failedAttempts} failed attempts across ${ipAlert.affectedUsers} accounts`,
        timestamp: now,
        data: { ip: ipAlert._id, attempts: ipAlert.failedAttempts, users: ipAlert.affectedUsers },
      });
    });

    // System Health Alerts
    const connection = await connectToDatabase();
    const db = connection.connection.db;

    if (!db) {
      throw new Error("Database connection failed");
    }

    const systemAlerts = await Promise.all([
      // High volume of new registrations (potential spam)
      User.aggregate([
        {
          $match: {
            auditCreatedDateTime: { $gte: oneHourAgo },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
          },
        },
      ]),

      // Organizations pending verification for too long
      Organization.find({
        "verification.isVerified": false,
        auditCreatedDateTime: { $lte: sevenDaysAgo },
      }).select("_id organizationInfo.name auditCreatedDateTime"),

      // Unprocessed encounters older than 24 hours
      db
        .collection("encounters")
        .find({
          "encounter.status": "scheduled",
          "encounter.encounterDate": { $lte: oneDayAgo },
        })
        .toArray(),

      // High prescription rejection rate
      db
        .collection("dispensations")
        .aggregate([
          {
            $match: {
              auditCreatedDateTime: { $gte: oneDayAgo },
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    // Process system alerts
    if (systemAlerts[0][0]?.count > 50) {
      alerts.push({
        id: "system-high-registrations",
        type: "system",
        severity: "medium",
        title: "High Registration Volume",
        message: `${systemAlerts[0][0].count} new user registrations in the last hour`,
        timestamp: now,
        data: { count: systemAlerts[0][0].count },
      });
    }

    systemAlerts[1].forEach((org: any) => {
      const daysPending = Math.floor((now.getTime() - org.auditCreatedDateTime.getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `system-org-verification-${org._id}`,
        type: "system",
        severity: "medium",
        title: "Organization Verification Pending",
        message: `${org.organizationInfo.name} has been pending verification for ${daysPending} days`,
        timestamp: org.auditCreatedDateTime,
        data: { organizationId: org._id, daysPending },
      });
    });

    systemAlerts[2].forEach((encounter: any) => {
      alerts.push({
        id: `system-stale-encounter-${encounter._id}`,
        type: "system",
        severity: "medium",
        title: "Stale Encounter",
        message: `Encounter ${encounter._id} has been scheduled since ${encounter.encounter.encounterDate.toLocaleDateString()}`,
        timestamp: encounter.encounter.encounterDate,
        data: { encounterId: encounter._id },
      });
    });

    const dispensationStats = systemAlerts[3].reduce((acc: Record<string, number>, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const totalDispensations = Object.values(dispensationStats).reduce((sum: number, count: number) => sum + count, 0);
    const rejectedCount = dispensationStats.rejected || 0;

    if (totalDispensations > 0 && rejectedCount / totalDispensations > 0.2) {
      alerts.push({
        id: "system-high-rejection-rate",
        type: "system",
        severity: "high",
        title: "High Prescription Rejection Rate",
        message: `${Math.round((rejectedCount / totalDispensations) * 100)}% of prescriptions rejected in last 24h`,
        timestamp: now,
        data: { rejectionRate: rejectedCount / totalDispensations, total: totalDispensations },
      });
    }

    // Compliance Alerts
    const complianceAlerts = await Promise.all([
      // Users with unverified emails for more than 7 days
      User.find({
        "auth.emailVerified": { $ne: true },
        auditCreatedDateTime: { $lte: sevenDaysAgo },
      }).countDocuments(),

      // Missing audit trails
      User.find({
        auditCreatedBy: { $exists: false },
      }).countDocuments(),

      // Organizations without required documentation
      Organization.find({
        "verification.isVerified": false,
        "verification.documents": { $size: 0 },
      }).countDocuments(),
    ]);

    if (complianceAlerts[0] > 100) {
      alerts.push({
        id: "compliance-unverified-emails",
        type: "compliance",
        severity: "medium",
        title: "Unverified Email Accounts",
        message: `${complianceAlerts[0]} users have unverified emails for over 7 days`,
        timestamp: now,
        data: { count: complianceAlerts[0] },
      });
    }

    if (complianceAlerts[1] > 0) {
      alerts.push({
        id: "compliance-missing-audit",
        type: "compliance",
        severity: "high",
        title: "Missing Audit Trails",
        message: `${complianceAlerts[1]} records are missing audit trail information`,
        timestamp: now,
        data: { count: complianceAlerts[1] },
      });
    }

    if (complianceAlerts[2] > 10) {
      alerts.push({
        id: "compliance-missing-docs",
        type: "compliance",
        severity: "medium",
        title: "Organizations Missing Documentation",
        message: `${complianceAlerts[2]} organizations lack required verification documents`,
        timestamp: now,
        data: { count: complianceAlerts[2] },
      });
    }

    // Performance Alerts
    const performanceAlerts = await Promise.all([
      // Check for database performance issues (simulated)
      User.aggregate([
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: 1 }, // Placeholder - in real app, track actual response times
          },
        },
      ]),

      // Large data volumes that might affect performance
      db.collection("encounters").countDocuments({
        auditCreatedDateTime: { $gte: oneDayAgo },
      }),
    ]);

    if (performanceAlerts[1] > 1000) {
      alerts.push({
        id: "performance-high-volume",
        type: "performance",
        severity: "medium",
        title: "High Data Volume",
        message: `${performanceAlerts[1]} encounters created in the last 24 hours`,
        timestamp: now,
        data: { count: performanceAlerts[1] },
      });
    }

    // Sort alerts by severity and timestamp
    const severityOrder: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Add summary statistics
    const summary = {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      high: alerts.filter((a) => a.severity === "high").length,
      medium: alerts.filter((a) => a.severity === "medium").length,
      low: alerts.filter((a) => a.severity === "low").length,
      byType: {
        security: alerts.filter((a) => a.type === "security").length,
        system: alerts.filter((a) => a.type === "system").length,
        compliance: alerts.filter((a) => a.type === "compliance").length,
        performance: alerts.filter((a) => a.type === "performance").length,
      },
    };

    logger.info(`Generated ${alerts.length} admin alerts`);

    return NextResponse.json({
      success: true,
      data: {
        alerts: alerts.slice(0, 50), // Limit to 50 most critical alerts
        summary,
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Admin alerts error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve admin alerts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getAdminAlertsHandler);
