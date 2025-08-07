/**
 * Enhanced Push Notification Service with Queue Support
 * Refactored to use database-backed job queue for Vercel compatibility
 */

import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import User from "@/lib/models/User";
import {
  NotificationHelpers,
  NotificationQueueProcessor,
} from "./notification-queue-processor";

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class PushNotificationService {
  /**
   * Send authorization request notification to patient (now uses queue)
   */
  static async sendAuthorizationRequest(
    userId: string,
    grantId: string,
  ): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      const grant = await AuthorizationGrant.findById(grantId)
        .populate({
          path: "organizationId",
          select: "organizationInfo.name organizationInfo.type",
        })
        .populate({
          path: "requestingPractitionerId",
          select:
            "userId professionalInfo.specialty professionalInfo.practitionerType",
          populate: {
            path: "userId",
            select: "personalInfo.firstName personalInfo.lastName",
          },
        });

      if (!user || !grant) {
        console.error("User or grant not found for notification");
        return false;
      }

      const organization = grant.organizationId as any;
      const practitioner = grant.requestingPractitionerId as any;

      // Extract practitioner name with fallbacks
      const practitionerLastName =
        practitioner?.userId?.personalInfo?.lastName ||
        practitioner?.personalInfo?.lastName ||
        "Unknown";

      const isUrgent = grant.grantDetails.timeWindowHours <= 2;

      // Enqueue the notification job instead of sending directly
      const jobId = await NotificationHelpers.enqueueAuthorizationRequest(
        userId,
        grantId,
        organization.organizationInfo.name,
        practitionerLastName,
        isUrgent,
      );

      console.log(`🔔 Authorization request notification enqueued: ${jobId}`);
      return true;
    } catch (error) {
      console.error(
        "Failed to enqueue authorization request notification:",
        error,
      );
      return false;
    }
  }

  /**
   * Send notification when authorization status changes (now uses queue)
   */
  static async sendAuthorizationStatusUpdate(
    userId: string,
    grantId: string,
    status: "approved" | "denied" | "revoked" | "expired",
  ): Promise<boolean> {
    try {
      // Enqueue the status update notification
      const jobId = await NotificationHelpers.enqueueStatusUpdate(
        userId,
        grantId,
        status,
      );

      console.log(`🔔 Status update notification enqueued: ${jobId}`);
      return true;
    } catch (error) {
      console.error("Failed to enqueue status update notification:", error);
      return false;
    }
  }

  /**
   * Register device for push notifications
   */
  static async registerDevice(
    userId: string,
    deviceToken: string,
    platform: "web" | "ios" | "android",
  ): Promise<boolean> {
    try {
      // TODO: Store device registration in database
      // This would typically involve:
      // 1. Validating the device token
      // 2. Storing it in a UserDevice model
      // 3. Managing token refresh and cleanup

      console.log("📱 Device registration:", {
        userId,
        platform,
        tokenLength: deviceToken.length,
      });
      return true;
    } catch (error) {
      console.error("Failed to register device:", error);
      return false;
    }
  }

  /**
   * Unregister device from push notifications
   */
  static async unregisterDevice(
    userId: string,
    deviceToken: string,
  ): Promise<boolean> {
    try {
      // TODO: Remove device registration from database
      console.log("📱 Device unregistration:", {
        userId,
        tokenLength: deviceToken.length,
      });
      return true;
    } catch (error) {
      console.error("Failed to unregister device:", error);
      return false;
    }
  }

  /**
   * Process pending notification jobs (for use in API routes/cron)
   */
  static async processPendingNotifications(batchSize: number = 10): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
  }> {
    return await NotificationQueueProcessor.processBatch(batchSize);
  }

  /**
   * Get notification queue statistics
   */
  static async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    retrying: number;
  }> {
    return await NotificationQueueProcessor.getStats();
  }

  /**
   * Clean up old notification jobs
   */
  static async cleanupOldJobs(olderThanHours: number = 24): Promise<number> {
    return await NotificationQueueProcessor.cleanup(olderThanHours);
  }
}

// Export for use in authorization request creation
export { PushNotificationService as NotificationService };
