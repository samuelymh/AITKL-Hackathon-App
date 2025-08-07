import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";

export interface AuthorizationGrantQuery {
  organizationId?: string;
  requestingPractitionerId?: string;
  status?: string;
  includeExpired?: boolean;
}

export interface PendingGrantData {
  grantId: string;
  patient: {
    name: string;
    digitalIdentifier: string;
  };
  requester?: {
    name: string;
    type: string;
  } | null;
  accessScope: string[];
  createdAt: Date;
  expiresAt: Date;
  timeWindowHours: number;
}

export interface GrantData extends PendingGrantData {
  organization: any;
  status: string;
  grantedAt?: Date;
}

/**
 * Get pending authorization grants for an organization
 * @param organizationId - Organization ID to filter by
 * @returns Array of pending grants
 */
export async function getPendingAuthorizationGrants(
  organizationId: string,
): Promise<PendingGrantData[]> {
  await connectToDatabase();

  const grants = await AuthorizationGrant.find({
    organizationId: organizationId,
    "grantDetails.status": "PENDING",
    "grantDetails.expiresAt": { $gt: new Date() },
  })
    .populate(
      "userId",
      "personalInfo.firstName personalInfo.lastName digitalIdentifier",
    )
    .populate({
      path: "requestingPractitionerId",
      select: "userId professionalInfo.practitionerType",
      populate: {
        path: "userId",
        select: "personalInfo.firstName personalInfo.lastName",
      },
    })
    .sort({ createdAt: -1 })
    .lean();

  return grants.map((grant: any) => ({
    grantId: grant._id,
    patient: {
      name: `${grant.userId.personalInfo.firstName} ${grant.userId.personalInfo.lastName}`,
      digitalIdentifier: grant.userId.digitalIdentifier,
    },
    requester: grant.requestingPractitionerId
      ? {
          name: `${grant.requestingPractitionerId.userId.personalInfo.firstName} ${grant.requestingPractitionerId.userId.personalInfo.lastName}`,
          type: grant.requestingPractitionerId.professionalInfo
            .practitionerType,
        }
      : null,
    accessScope: grant.accessScope,
    createdAt: grant.auditCreatedDateTime,
    expiresAt: grant.grantDetails.expiresAt,
    timeWindowHours: grant.grantDetails.timeWindowHours,
  }));
}

/**
 * Get authorization grants for a practitioner
 * @param query - Query parameters for filtering grants
 * @returns Array of grants
 */
export async function getAuthorizationGrantsForPractitioner(
  query: AuthorizationGrantQuery,
): Promise<GrantData[]> {
  await connectToDatabase();

  const grantQuery: any = {};

  if (query.requestingPractitionerId) {
    grantQuery.requestingPractitionerId = query.requestingPractitionerId;
  }

  if (query.organizationId) {
    grantQuery.organizationId = query.organizationId;
  }

  if (
    query.status &&
    ["PENDING", "ACTIVE", "EXPIRED", "REVOKED"].includes(query.status)
  ) {
    grantQuery["grantDetails.status"] = query.status;
  }

  if (!query.includeExpired) {
    grantQuery["grantDetails.expiresAt"] = { $gt: new Date() };
  }

  const grants = await AuthorizationGrant.find(grantQuery)
    .populate(
      "userId",
      "personalInfo.firstName personalInfo.lastName digitalIdentifier",
    )
    .populate("organizationId", "organizationInfo.name organizationInfo.type")
    .populate({
      path: "requestingPractitionerId",
      select: "userId professionalInfo.practitionerType",
      populate: {
        path: "userId",
        select: "personalInfo.firstName personalInfo.lastName",
      },
    })
    .sort({ createdAt: -1 })
    .lean();

  return grants.map((grant: any) => ({
    grantId: grant._id,
    patient: {
      name: `${grant.userId.personalInfo.firstName} ${grant.userId.personalInfo.lastName}`,
      digitalIdentifier: grant.userId.digitalIdentifier,
    },
    requester: grant.requestingPractitionerId
      ? {
          name: `${grant.requestingPractitionerId.userId.personalInfo.firstName} ${grant.requestingPractitionerId.userId.personalInfo.lastName}`,
          type: grant.requestingPractitionerId.professionalInfo
            .practitionerType,
        }
      : null,
    organization: grant.organizationId,
    status: grant.grantDetails.status,
    accessScope: grant.accessScope,
    createdAt: grant.auditCreatedDateTime,
    expiresAt: grant.grantDetails.expiresAt,
    grantedAt: grant.grantDetails.grantedAt,
    timeWindowHours: grant.grantDetails.timeWindowHours,
  }));
}

/**
 * Batch fetch authorization grants by IDs
 * @param grantIds - Array of grant IDs
 * @returns Map of grant ID to grant data
 */
export async function getAuthorizationGrantsBatch(
  grantIds: string[],
): Promise<Map<string, any>> {
  await connectToDatabase();

  if (grantIds.length === 0) {
    return new Map();
  }

  const grants = await AuthorizationGrant.find({ _id: { $in: grantIds } })
    .populate("organizationId", "organizationInfo.name organizationInfo.type")
    .populate({
      path: "requestingPractitionerId",
      select: "userId professionalInfo.practitionerType",
      populate: {
        path: "userId",
        select: "personalInfo.firstName personalInfo.lastName",
      },
    })
    .lean();

  return new Map(grants.map((grant) => [grant._id.toString(), grant]));
}

/**
 * Get authorization grants for a specific patient
 * Shows the patient's complete grant history
 */
export async function getAuthorizationGrantsForPatient(
  patientId: string,
  options: {
    status?: string;
    limit?: number;
    offset?: number;
    includeExpired?: boolean;
  } = {},
): Promise<{ grants: GrantData[]; total: number }> {
  await connectToDatabase();

  const { status, limit = 20, offset = 0, includeExpired = true } = options;

  const query: any = { userId: patientId };

  if (status) {
    query["grantDetails.status"] = status;
  }

  if (!includeExpired) {
    query.$or = [
      { "grantDetails.status": { $ne: "EXPIRED" } },
      { "grantDetails.expiresAt": { $gt: new Date() } },
    ];
  }

  // Get total count for pagination
  const total = await AuthorizationGrant.countDocuments(query);

  // Get paginated grants
  const grants = await AuthorizationGrant.find(query)
    .populate({
      path: "organizationId",
      select: "organizationInfo address",
    })
    .populate({
      path: "requestingPractitionerId",
      select:
        "userId professionalInfo.specialty professionalInfo.practitionerType",
      populate: {
        path: "userId",
        select: "personalInfo.firstName personalInfo.lastName auth.role",
      },
    })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  const grantData = grants.map((grant: any) => ({
    grantId: grant._id.toString(),
    patient: {
      name: "Current User", // Patient viewing their own grants
      digitalIdentifier: grant.userId,
    },
    organization: grant.organizationId,
    requester: grant.requestingPractitionerId
      ? {
          name:
            grant.requestingPractitionerId.userId?.personalInfo?.firstName &&
            grant.requestingPractitionerId.userId?.personalInfo?.lastName
              ? `${grant.requestingPractitionerId.userId.personalInfo.firstName} ${grant.requestingPractitionerId.userId.personalInfo.lastName}`
              : "Unknown Practitioner",
          type:
            grant.requestingPractitionerId.professionalInfo?.practitionerType ||
            grant.requestingPractitionerId.userId?.auth?.role ||
            "practitioner",
          specialty: grant.requestingPractitionerId.professionalInfo?.specialty,
        }
      : null,
    accessScope: grant.accessScope || [],
    status: grant.grantDetails?.status || "UNKNOWN",
    createdAt: grant.createdAt,
    grantedAt: grant.grantDetails?.grantedAt,
    expiresAt:
      grant.grantDetails?.expiresAt ||
      new Date(
        grant.createdAt.getTime() +
          (grant.grantDetails?.timeWindowHours || 24) * 60 * 60 * 1000,
      ),
    timeWindowHours: grant.grantDetails?.timeWindowHours || 24,
  }));

  return {
    grants: grantData,
    total,
  };
}
