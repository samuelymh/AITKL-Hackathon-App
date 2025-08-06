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
  try {
    console.log("Creating notification job for patient:", patientId, "grant:", grantId);

    const notificationJob = await NotificationJob.createJob({
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

    console.log("Notification job created successfully:", notificationJob._id);
  } catch (error) {
    console.error("Error creating notification job:", error);
    throw error;
  }
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
 * Get notifications for a user with optimized data fetching using aggregation pipeline
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

  // Build match query
  const matchQuery: any = {
    userId: new mongoose.Types.ObjectId(userId),
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
  };

  if (status) {
    matchQuery.status = status;
  }

  // If grant details are not needed, use simple query
  if (!includeGrantDetails) {
    const notifications = await NotificationJob.find(matchQuery).sort({ scheduledAt: -1 }).limit(limit).lean();

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

  // Use aggregation pipeline to join with authorization grants in a single query
  const aggregationPipeline: any[] = [
    { $match: matchQuery },
    {
      $addFields: {
        "payload.data.grantObjectId": {
          $cond: {
            if: { $ne: ["$payload.data.grantId", null] },
            then: { $toObjectId: "$payload.data.grantId" },
            else: null,
          },
        },
      },
    },
    {
      $lookup: {
        from: "authorization_grants", // Correct collection name with underscore
        localField: "payload.data.grantObjectId",
        foreignField: "_id",
        as: "grantDetails",
      },
    },
    { $unwind: { path: "$grantDetails", preserveNullAndEmptyArrays: true } }, // Unwind even if no grant details
    { $sort: { scheduledAt: -1 } },
    { $limit: limit },
  ];

  const notifications = await NotificationJob.aggregate(aggregationPipeline);

  // Post-process to get practitioner names with proper decryption
  const notificationsWithNames = await Promise.all(
    notifications.map(async (notification: any) => {
      const grant = notification.grantDetails;
      let additionalData = {};

      if (grant) {
        additionalData = {
          grantStatus: grant.grantDetails?.status,
          expiresAt: grant.grantDetails?.expiresAt,
          accessScope: grant.accessScope,
          organization: grant.organizationId,
          practitioner: grant.requestingPractitionerId,
        };
      }

      // Get practitioner name by loading the user model instance
      let practitionerName = "Unknown Practitioner";
      let practitionerType = "practitioner";
      const practitionerId = notification.payload?.data?.requestingPractitionerId;
      
      if (practitionerId) {
        try {
          // Import User model to get access to decryption methods
          const User = (await import("../models/User")).default;
          const practitionerUser = await User.findById(practitionerId);
          if (practitionerUser) {
            practitionerName = await practitionerUser.getFullName();
            // Get basic role from User model
            practitionerType = practitionerUser.auth?.role || "practitioner";
          }

          // Try to get more detailed practitioner type from Practitioner model
          try {
            const Practitioner = (await import("../models/Practitioner")).default;
            const practitionerProfile = await Practitioner.findOne({ userId: practitionerId });
            if (practitionerProfile?.professionalInfo?.practitionerType) {
              practitionerType = practitionerProfile.professionalInfo.practitionerType;
            }
          } catch (practitionerError) {
            // If Practitioner model lookup fails, we'll use the role from User model
            console.debug(`Could not fetch detailed practitioner info for ${practitionerId}:`, practitionerError);
          }
        } catch (error) {
          console.warn(`Failed to get practitioner name for ${practitionerId}:`, error);
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
        practitionerName: practitionerName,
        practitionerType: practitionerType,
        ...additionalData,
      };
    })
  );

  return notificationsWithNames;
}
