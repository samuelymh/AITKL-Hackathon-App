/**
 * Vercel-Compatible Notification Queue System
 * Uses database-backed job persistence and retry mechanisms
 * Works within serverless environment constraints
 */

import mongoose from "mongoose";
import { createExtendedSchema } from "@/lib/models/SchemaUtils";
import { IBaseDocument } from "@/lib/models/BaseSchema";

// Notification Job Status
export enum NotificationJobStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  RETRYING = "RETRYING",
}

// Notification Job Types
export enum NotificationJobType {
  AUTHORIZATION_REQUEST = "AUTHORIZATION_REQUEST",
  STATUS_UPDATE = "STATUS_UPDATE",
  REMINDER = "REMINDER",
  SYSTEM_ALERT = "SYSTEM_ALERT",
}

// Job Priority Levels
export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 8,
  URGENT = 10,
}

// Notification Job Interface
export interface INotificationJob extends IBaseDocument {
  type: NotificationJobType;
  status: NotificationJobStatus;
  priority: JobPriority;

  // Target Information
  userId: mongoose.Types.ObjectId;
  deviceTokens?: string[];

  // Notification Payload
  payload: {
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
  };

  // Retry Configuration
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;

  // Execution Tracking
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Error Information
  lastError?: string;
  errorHistory: Array<{
    timestamp: Date;
    error: string;
    attempt: number;
  }>;

  // Expiration
  expiresAt?: Date;
}

// Mongoose Schema
const notificationJobSchema = {
  type: {
    type: String,
    enum: Object.values(NotificationJobType),
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: Object.values(NotificationJobStatus),
    default: NotificationJobStatus.PENDING,
    required: true,
    index: true,
  },
  priority: {
    type: Number,
    enum: [1, 5, 8, 10], // LOW, NORMAL, HIGH, URGENT - explicit numeric values
    default: 5, // JobPriority.NORMAL
    required: true,
    index: true,
  },

  // Target Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  deviceTokens: [
    {
      type: String,
      trim: true,
    },
  ],

  // Notification Payload
  payload: {
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    icon: String,
    badge: String,
    data: mongoose.Schema.Types.Mixed,
    actions: [
      {
        action: String,
        title: String,
        icon: String,
      },
    ],
  },

  // Retry Configuration
  retryCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: 0,
    max: 10,
  },
  nextRetryAt: {
    type: Date,
    index: true,
  },

  // Execution Tracking
  scheduledAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true,
  },
  startedAt: Date,
  completedAt: Date,

  // Error Information
  lastError: String,
  errorHistory: [
    {
      timestamp: {
        type: Date,
        default: Date.now,
      },
      error: String,
      attempt: Number,
    },
  ],

  // Expiration (TTL)
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }, // MongoDB TTL index
  },
};

// Create extended schema with audit fields
const NotificationJobSchema = createExtendedSchema(notificationJobSchema, {
  timestamps: true,
  versionKey: false,
  collection: "notification_jobs",
});

// Compound indexes for query optimization
NotificationJobSchema.index({ status: 1, priority: -1, scheduledAt: 1 });
NotificationJobSchema.index({ userId: 1, status: 1 });
NotificationJobSchema.index({ type: 1, status: 1 });
NotificationJobSchema.index({ nextRetryAt: 1, status: 1 });

// Static methods for job management
NotificationJobSchema.statics = {
  /**
   * Get pending jobs ready for processing
   */
  getPendingJobs: function (limit: number = 10) {
    const now = new Date();
    return this.find({
      status: { $in: [NotificationJobStatus.PENDING, NotificationJobStatus.RETRYING] },
      $and: [
        {
          $or: [{ nextRetryAt: { $exists: false } }, { nextRetryAt: { $lte: now } }],
        },
        {
          $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
        },
      ],
    })
      .sort({ priority: -1, scheduledAt: 1 })
      .limit(limit);
  },

  /**
   * Create a new notification job
   */
  createJob: function (jobData: Partial<INotificationJob>) {
    const job = new this({
      ...jobData,
      scheduledAt: jobData.scheduledAt || new Date(),
      expiresAt: jobData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
    });
    return job.save();
  },

  /**
   * Mark job as started
   */
  markStarted: function (jobId: string) {
    return this.findByIdAndUpdate(jobId, {
      status: NotificationJobStatus.PROCESSING,
      startedAt: new Date(),
    });
  },

  /**
   * Mark job as completed
   */
  markCompleted: function (jobId: string) {
    return this.findByIdAndUpdate(jobId, {
      status: NotificationJobStatus.COMPLETED,
      completedAt: new Date(),
    });
  },

  /**
   * Mark job as failed and schedule retry if applicable
   */
  markFailed: function (jobId: string, error: string) {
    return this.findById(jobId).then((job: INotificationJob | null) => {
      if (!job) return null;

      const canRetry = job.retryCount < job.maxRetries;
      const nextRetryDelay = Math.min(Math.pow(2, job.retryCount) * 1000, 300000); // Exponential backoff, max 5 minutes

      const update: any = {
        lastError: error,
        $push: {
          errorHistory: {
            timestamp: new Date(),
            error: error,
            attempt: job.retryCount + 1,
          },
        },
      };

      if (canRetry) {
        update.status = NotificationJobStatus.RETRYING;
        update.nextRetryAt = new Date(Date.now() + nextRetryDelay);
        update.retryCount = job.retryCount + 1;
      } else {
        update.status = NotificationJobStatus.FAILED;
      }

      return this.findByIdAndUpdate(jobId, update);
    });
  },

  /**
   * Clean up old completed/failed jobs
   */
  cleanup: function (olderThanHours: number = 24) {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    return this.deleteMany({
      status: { $in: [NotificationJobStatus.COMPLETED, NotificationJobStatus.FAILED] },
      completedAt: { $lt: cutoff },
    });
  },
};

// Create and export the model with proper typing
export interface INotificationJobModel extends mongoose.Model<INotificationJob> {
  getPendingJobs(limit?: number): Promise<INotificationJob[]>;
  createJob(jobData: Partial<INotificationJob>): Promise<INotificationJob>;
  markStarted(jobId: string): Promise<INotificationJob | null>;
  markCompleted(jobId: string): Promise<INotificationJob | null>;
  markFailed(jobId: string, error: string): Promise<INotificationJob | null>;
  cleanup(olderThanHours?: number): Promise<{ deletedCount?: number }>;
}

const NotificationJob: INotificationJobModel = (mongoose.models.NotificationJob ||
  mongoose.model<INotificationJob, INotificationJobModel>(
    "NotificationJob",
    NotificationJobSchema
  )) as INotificationJobModel;

export default NotificationJob;
