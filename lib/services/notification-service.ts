import NotificationJob, { NotificationJobType, JobPriority } from "./notification-queue";
import mongoose from "mongoose";

export interface NotificationData {
  title: string;
  body: string;
  data: Record<string, any>;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationJobType;
  priority: JobPriority;
  payload: NotificationData;
  maxRetries?: number;
  expiresAt?: Date;
}

/**
 * Create an authorization request notification
 * @param patientId - ID of the patient
 * @param grantId - ID of the authorization grant
 * @param organization - Organization requesting access
 * @param requestingPractitionerId - ID of the requesting practitioner
 * @param scope - Access scope requested
 * @param timeWindowHours - Time window for the request
 */
export async function createAuthorizationRequestNotification(
  patientId: string,
  grantId: string,
  organization: any,
  requestingPractitionerId: string,
  scope: string[],
  timeWindowHours: number
): Promise<void> {
  await NotificationJob.createJob({
    type: NotificationJobType.AUTHORIZATION_REQUEST,
    priority: timeWindowHours <= 2 ? JobPriority.URGENT : JobPriority.NORMAL,
    userId: new mongoose.Types.ObjectId(patientId),
    payload: {
      title: "Healthcare Access Request",
      body: `${organization.organizationInfo.name} has requested access to your medical records`,
      data: {
        grantId: grantId,
        organizationId: organization._id.toString(),
        organizationName: organization.organizationInfo.name,
        requestingPractitionerId: requestingPractitionerId,
        accessScope: scope,
        timeWindowHours: timeWindowHours,
      },
    },
    maxRetries: 3,
    expiresAt: new Date(Date.now() + timeWindowHours * 60 * 60 * 1000), // Same as grant expiration
  });
}

/**
 * Create a general notification job
 * @param params - Notification parameters
 */
export async function createNotificationJob(params: CreateNotificationParams): Promise<void> {
  await NotificationJob.createJob({
    type: params.type,
    priority: params.priority,
    userId: new mongoose.Types.ObjectId(params.userId),
    payload: params.payload,
    maxRetries: params.maxRetries || 3,
    expiresAt: params.expiresAt,
  });
}

/**
 * Mark a notification as completed
 * @param notificationId - ID of the notification
 * @param userId - ID of the user (for security check)
 */
export async function markNotificationCompleted(notificationId: string, userId: string): Promise<boolean> {
  const notification = await NotificationJob.findOneAndUpdate(
    {
      _id: notificationId,
      userId: userId,
    },
    {
      status: "COMPLETED",
      completedAt: new Date(),
    },
    { new: true }
  );

  return !!notification;
}

/**
 * Get notifications for a user with optimized data fetching
 * @param userId - ID of the user
 * @param options - Query options
 */
export async function getNotificationsForUser(
  userId: string,
  options: {
    status?: string;
    limit?: number;
    includeGrantDetails?: boolean;
  } = {}
) {
  const { status, limit = 20, includeGrantDetails = false } = options;

  // Build query
  const query: any = {
    userId: userId,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
  };

  if (status) {
    query.status = status;
  }

  // Fetch notification jobs
  const notifications = await NotificationJob.find(query).sort({ scheduledAt: -1 }).limit(limit).lean();

  if (!includeGrantDetails) {
    return notifications.map((notification) => ({
      id: notification._id,
      type: notification.type,
      status: notification.status,
      priority: notification.priority,
      title: notification.payload.title,
      body: notification.payload.body,
      data: notification.payload.data,
      createdAt: notification.scheduledAt,
    }));
  }

  // If grant details are needed, batch fetch them
  const grantIds = notifications.filter((n) => n.payload.data?.grantId).map((n) => n.payload.data.grantId);

  let grantMap = new Map();
  if (grantIds.length > 0) {
    const { getAuthorizationGrantsBatch } = await import("./authorization-service");
    grantMap = await getAuthorizationGrantsBatch(grantIds);
  }

  // Transform notifications with grant details
  return notifications.map((notification) => {
    let additionalData = {};

    if (notification.payload.data?.grantId) {
      const grant = grantMap.get(notification.payload.data.grantId);
      if (grant) {
        additionalData = {
          grantStatus: grant.grantDetails.status,
          expiresAt: grant.grantDetails.expiresAt,
          accessScope: grant.accessScope,
          organization: grant.organizationId,
          practitioner: grant.requestingPractitionerId,
        };
      }
    }

    return {
      id: notification._id,
      type: notification.type,
      status: notification.status,
      priority: notification.priority,
      title: notification.payload.title,
      body: notification.payload.body,
      data: notification.payload.data,
      createdAt: notification.scheduledAt,
      ...additionalData,
    };
  });
}
