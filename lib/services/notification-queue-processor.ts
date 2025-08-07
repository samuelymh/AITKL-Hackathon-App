/**
 * Vercel-Compatible Notification Queue Processor
 * Processes queued notification jobs in serverless environment
 */

import mongoose from "mongoose";
import NotificationJob, {
  INotificationJob,
  NotificationJobType,
  JobPriority,
} from "./notification-queue";
import connectToDatabase from "@/lib/mongodb";

// Web Push API configuration (for browser notifications)
interface WebPushConfig {
  vapidKeys: {
    publicKey: string;
    privateKey: string;
  };
  contact: string;
}

// Firebase Cloud Messaging configuration (for mobile)
interface FCMConfig {
  serverKey: string;
  senderId: string;
}

export class NotificationQueueProcessor {
  private static webPushConfig: WebPushConfig | null = null;
  private static fcmConfig: FCMConfig | null = null;

  /**
   * Initialize notification configurations
   */
  static initialize(config: { webPush?: WebPushConfig; fcm?: FCMConfig }) {
    this.webPushConfig = config.webPush || null;
    this.fcmConfig = config.fcm || null;
  }

  /**
   * Enqueue a new notification job
   */
  static async enqueue(
    type: NotificationJobType,
    userId: string,
    payload: INotificationJob["payload"],
    options: {
      priority?: JobPriority;
      maxRetries?: number;
      delaySeconds?: number;
      expiresInHours?: number;
      deviceTokens?: string[];
    } = {},
  ): Promise<string> {
    try {
      await connectToDatabase();

      const scheduledAt = options.delaySeconds
        ? new Date(Date.now() + options.delaySeconds * 1000)
        : new Date();

      const expiresAt = options.expiresInHours
        ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours

      const job = await NotificationJob.createJob({
        type,
        userId: new mongoose.Types.ObjectId(userId),
        payload,
        priority: options.priority || JobPriority.NORMAL,
        maxRetries: options.maxRetries || 3,
        scheduledAt,
        expiresAt,
      });

      console.log(`📋 Notification job enqueued: ${job._id} (${type})`);
      return job._id.toString();
    } catch (error) {
      console.error("Failed to enqueue notification job:", error);
      throw error;
    }
  }

  /**
   * Process a batch of pending notification jobs
   * This method is designed to be called from API routes or cron jobs
   */
  static async processBatch(batchSize: number = 10): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      await connectToDatabase();

      // Get pending jobs
      const jobs = await NotificationJob.getPendingJobs(batchSize);
      results.processed = jobs.length;

      if (jobs.length === 0) {
        console.log("📋 No pending notification jobs to process");
        return results;
      }

      console.log(`📋 Processing ${jobs.length} notification jobs`);

      // Process each job
      for (const job of jobs) {
        try {
          await this.processJob(job);
          results.succeeded++;
        } catch (error) {
          results.failed++;
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          results.errors.push(`Job ${job._id}: ${errorMessage}`);
          console.error(`Failed to process job ${job._id}:`, error);
        }
      }

      console.log(
        `📋 Batch complete: ${results.succeeded} succeeded, ${results.failed} failed`,
      );
      return results;
    } catch (error) {
      console.error("Failed to process notification batch:", error);
      throw error;
    }
  }

  /**
   * Process a single notification job
   */
  private static async processJob(job: INotificationJob): Promise<void> {
    try {
      // Mark job as started
      await NotificationJob.markStarted(job._id.toString());

      // Process based on job type
      switch (job.type) {
        case NotificationJobType.AUTHORIZATION_REQUEST:
          await this.sendAuthorizationNotification(job);
          break;
        case NotificationJobType.STATUS_UPDATE:
          await this.sendStatusUpdateNotification(job);
          break;
        case NotificationJobType.REMINDER:
          await this.sendReminderNotification(job);
          break;
        case NotificationJobType.SYSTEM_ALERT:
          await this.sendSystemAlertNotification(job);
          break;
        default:
          throw new Error(`Unknown notification type: ${job.type}`);
      }

      // Mark job as completed
      await NotificationJob.markCompleted(job._id.toString());
      console.log(`✅ Job ${job._id} completed successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await NotificationJob.markFailed(job._id.toString(), errorMessage);
      throw error;
    }
  }

  /**
   * Send authorization request notification
   */
  private static async sendAuthorizationNotification(
    job: INotificationJob,
  ): Promise<void> {
    const { payload, deviceTokens } = job;

    // For demo purposes, we'll log the notification
    // In production, this would integrate with actual push services
    console.log("🔔 Sending authorization notification:", {
      userId: job.userId,
      title: payload.title,
      body: payload.body,
      deviceCount: deviceTokens?.length || 0,
    });

    // Simulate async notification sending
    await this.simulateNotificationSend(payload, deviceTokens);
  }

  /**
   * Send status update notification
   */
  private static async sendStatusUpdateNotification(
    job: INotificationJob,
  ): Promise<void> {
    const { payload, deviceTokens } = job;

    console.log("🔔 Sending status update notification:", {
      userId: job.userId,
      title: payload.title,
      body: payload.body,
      status: payload.data?.status,
    });

    await this.simulateNotificationSend(payload, deviceTokens);
  }

  /**
   * Send reminder notification
   */
  private static async sendReminderNotification(
    job: INotificationJob,
  ): Promise<void> {
    const { payload, deviceTokens } = job;

    console.log("🔔 Sending reminder notification:", {
      userId: job.userId,
      title: payload.title,
      body: payload.body,
    });

    await this.simulateNotificationSend(payload, deviceTokens);
  }

  /**
   * Send system alert notification
   */
  private static async sendSystemAlertNotification(
    job: INotificationJob,
  ): Promise<void> {
    const { payload, deviceTokens } = job;

    console.log("🚨 Sending system alert notification:", {
      userId: job.userId,
      title: payload.title,
      body: payload.body,
      priority: "high",
    });

    await this.simulateNotificationSend(payload, deviceTokens);
  }

  /**
   * Simulate notification sending (replace with actual implementation)
   */
  private static async simulateNotificationSend(
    payload: INotificationJob["payload"],
    deviceTokens?: string[],
  ): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) =>
      setTimeout(resolve, 100 + Math.random() * 400),
    );

    // Simulate occasional failures for testing retry logic
    if (Math.random() < 0.05) {
      // 5% failure rate
      throw new Error("Simulated notification service error");
    }

    console.log("📱 Notification sent successfully");
  }

  /**
   * Clean up old processed jobs
   */
  static async cleanup(olderThanHours: number = 24): Promise<number> {
    try {
      await connectToDatabase();
      const result = await NotificationJob.cleanup(olderThanHours);
      console.log(`🧹 Cleaned up ${result.deletedCount} old notification jobs`);
      return result.deletedCount || 0;
    } catch (error) {
      console.error("Failed to cleanup notification jobs:", error);
      throw error;
    }
  }

  /**
   * Get job statistics
   */
  static async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    retrying: number;
  }> {
    try {
      await connectToDatabase();

      const stats = await NotificationJob.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const result = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        retrying: 0,
      };

      stats.forEach((stat) => {
        const status = stat._id.toLowerCase();
        if (status in result) {
          result[status as keyof typeof result] = stat.count;
        }
      });

      return result;
    } catch (error) {
      console.error("Failed to get notification job stats:", error);
      throw error;
    }
  }
}

// Helper functions for common notification patterns
export class NotificationHelpers {
  /**
   * Enqueue authorization request notification
   */
  static async enqueueAuthorizationRequest(
    userId: string,
    grantId: string,
    organizationName: string,
    practitionerName?: string,
    isUrgent: boolean = false,
  ): Promise<string> {
    const practitionerSuffix = practitionerName
      ? ` for Dr. ${practitionerName}`
      : "";

    return await NotificationQueueProcessor.enqueue(
      NotificationJobType.AUTHORIZATION_REQUEST,
      userId,
      {
        title: "Healthcare Access Request",
        body: `${organizationName} is requesting access to your medical records${practitionerSuffix}`,
        icon: "/icons/health-request.png",
        badge: "/icons/badge.png",
        data: {
          type: "authorization_request",
          grantId: grantId,
          urgent: isUrgent,
        },
        actions: [
          {
            action: "approve",
            title: "Approve",
            icon: "/icons/approve.png",
          },
          {
            action: "deny",
            title: "Deny",
            icon: "/icons/deny.png",
          },
          {
            action: "view",
            title: "View Details",
            icon: "/icons/view.png",
          },
        ],
      },
      {
        priority: isUrgent ? JobPriority.URGENT : JobPriority.HIGH,
        expiresInHours: 48, // Authorization requests expire in 48 hours
      },
    );
  }

  /**
   * Enqueue status update notification
   */
  static async enqueueStatusUpdate(
    userId: string,
    grantId: string,
    status: "approved" | "denied" | "revoked" | "expired",
  ): Promise<string> {
    const statusMessages = {
      approved: "Your healthcare access request has been approved",
      denied: "Your healthcare access request has been denied",
      revoked: "Healthcare access has been revoked",
      expired: "Healthcare access has expired",
    };

    return await NotificationQueueProcessor.enqueue(
      NotificationJobType.STATUS_UPDATE,
      userId,
      {
        title: "Access Status Update",
        body: statusMessages[status],
        icon: "/icons/status-update.png",
        data: {
          type: "status_update",
          grantId: grantId,
          status: status,
        },
      },
      {
        priority: JobPriority.NORMAL,
        expiresInHours: 24,
      },
    );
  }
}

export default NotificationQueueProcessor;
