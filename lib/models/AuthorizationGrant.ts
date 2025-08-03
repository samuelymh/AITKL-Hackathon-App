import mongoose, { Model } from "mongoose";
import { createExtendedSchema } from "./SchemaUtils";
import { IBaseDocument } from "./BaseSchema";

// Grant status enum matching knowledge base specification
export enum GrantStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
}

// Interface definition matching the knowledge base
export interface IAuthorizationGrant extends IBaseDocument {
  userId: mongoose.Types.ObjectId; // Reference to User
  organizationId: mongoose.Types.ObjectId; // Reference to Organization
  requestingPractitionerId?: mongoose.Types.ObjectId; // Optional specific practitioner

  grantDetails: {
    status: GrantStatus;
    grantedAt?: Date;
    expiresAt: Date;
    revokedAt?: Date;
    timeWindowHours: number; // Duration of access
  };

  requestMetadata: {
    ipAddress: string;
    userAgent: string;
    deviceInfo?: object;
    location?: {
      latitude: number;
      longitude: number;
    };
  };

  accessScope: {
    canViewMedicalHistory: boolean;
    canViewPrescriptions: boolean;
    canCreateEncounters: boolean;
    canViewAuditLogs: boolean;
  };

  // Instance methods
  approve(approvedBy: string): Promise<IAuthorizationGrant>;
  deny(deniedBy: string): Promise<IAuthorizationGrant>;
  revoke(revokedBy: string): Promise<IAuthorizationGrant>;
  isActive(): boolean;
  isExpired(): boolean;
  hasPermission(permission: string): boolean;
}

// Static methods interface
export interface IAuthorizationGrantModel extends Model<IAuthorizationGrant> {
  findActiveGrants(userId: string, organizationId?: string): Promise<IAuthorizationGrant[]>;
  findPendingRequests(userId: string): Promise<IAuthorizationGrant[]>;
  findExpiredGrants(): Promise<IAuthorizationGrant[]>;
  createRequest(
    userId: string,
    organizationId: string,
    requestMetadata: any,
    accessScope: any,
    timeWindowHours?: number,
    requestingPractitionerId?: string
  ): Promise<IAuthorizationGrant>;
}

// Authorization Grant schema fields (excluding audit fields from createExtendedSchema)
const authorizationGrantSchemaFields = {
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },
  requestingPractitionerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Practitioner",
    required: false,
    index: true,
  },

  grantDetails: {
    status: {
      type: String,
      enum: Object.values(GrantStatus),
      default: GrantStatus.PENDING,
      required: true,
      index: true,
    },
    grantedAt: {
      type: Date,
      required: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      required: false,
    },
    timeWindowHours: {
      type: Number,
      required: true,
      min: 1,
      max: 168, // Maximum 1 week (7 * 24 hours)
      default: 24, // Default 24 hours
    },
  },

  requestMetadata: {
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    deviceInfo: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    location: {
      latitude: {
        type: Number,
        required: false,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        required: false,
        min: -180,
        max: 180,
      },
    },
  },

  accessScope: {
    canViewMedicalHistory: {
      type: Boolean,
      default: true,
      required: true,
    },
    canViewPrescriptions: {
      type: Boolean,
      default: true,
      required: true,
    },
    canCreateEncounters: {
      type: Boolean,
      default: false,
      required: true,
    },
    canViewAuditLogs: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
};

// Create extended schema with audit fields from BaseSchema
const AuthorizationGrantSchema = createExtendedSchema(authorizationGrantSchemaFields, {
  timestamps: true,
  versionKey: false,
  collection: "authorization_grants",
});

// Compound indexes for performance optimization (from knowledge base)
AuthorizationGrantSchema.index({ userId: 1, organizationId: 1, "grantDetails.status": 1, "grantDetails.expiresAt": 1 });
AuthorizationGrantSchema.index({ "grantDetails.status": 1, "grantDetails.expiresAt": 1 });
AuthorizationGrantSchema.index({ organizationId: 1, "grantDetails.status": 1 });
AuthorizationGrantSchema.index({ requestingPractitionerId: 1, "grantDetails.status": 1 });

// Pre-save middleware for business logic validation
AuthorizationGrantSchema.pre("save", function (next) {
  const doc = this as any;

  // Set expiration time if not set
  if (!doc.grantDetails?.expiresAt && doc.grantDetails?.timeWindowHours) {
    const now = new Date();
    doc.grantDetails.expiresAt = new Date(now.getTime() + doc.grantDetails.timeWindowHours * 60 * 60 * 1000);
  }

  // Validate that only one active grant exists per user-organization pair
  if (doc.grantDetails?.status === GrantStatus.ACTIVE && doc.isNew) {
    // This validation would ideally be done at the application level to handle race conditions
  }

  next();
});

// Instance methods
AuthorizationGrantSchema.methods = {
  // Approve the authorization request
  approve: async function (this: IAuthorizationGrant, approvedBy: string): Promise<IAuthorizationGrant> {
    if (this.grantDetails.status !== GrantStatus.PENDING) {
      throw new Error("Only pending grants can be approved");
    }

    if (this.isExpired()) {
      throw new Error("Cannot approve expired grant request");
    }

    this.grantDetails.status = GrantStatus.ACTIVE;
    this.grantDetails.grantedAt = new Date();
    this.auditModifiedBy = approvedBy;

    return await this.save();
  },

  // Deny the authorization request
  deny: async function (this: IAuthorizationGrant, deniedBy: string): Promise<IAuthorizationGrant> {
    if (this.grantDetails.status !== GrantStatus.PENDING) {
      throw new Error("Only pending grants can be denied");
    }

    // Mark as expired instead of creating a new status
    this.grantDetails.status = GrantStatus.EXPIRED;
    this.auditModifiedBy = deniedBy;

    return await this.save();
  },

  // Revoke an active authorization grant
  revoke: async function (this: IAuthorizationGrant, revokedBy: string): Promise<IAuthorizationGrant> {
    if (this.grantDetails.status !== GrantStatus.ACTIVE) {
      throw new Error("Only active grants can be revoked");
    }

    this.grantDetails.status = GrantStatus.REVOKED;
    this.grantDetails.revokedAt = new Date();
    this.auditModifiedBy = revokedBy;

    return await this.save();
  },

  // Check if grant is currently active and not expired
  isActive: function (this: IAuthorizationGrant): boolean {
    return (
      this.grantDetails.status === GrantStatus.ACTIVE && !this.isExpired() && !this.auditDeletedDateTime // Check if soft deleted
    );
  },

  // Check if grant has expired
  isExpired: function (this: IAuthorizationGrant): boolean {
    return new Date() > this.grantDetails.expiresAt;
  },

  // Check if grant has specific permission
  hasPermission: function (this: IAuthorizationGrant, permission: string): boolean {
    if (!this.isActive()) {
      return false;
    }

    switch (permission) {
      case "viewMedicalHistory":
        return this.accessScope.canViewMedicalHistory;
      case "viewPrescriptions":
        return this.accessScope.canViewPrescriptions;
      case "createEncounters":
        return this.accessScope.canCreateEncounters;
      case "viewAuditLogs":
        return this.accessScope.canViewAuditLogs;
      default:
        return false;
    }
  },
};

// Static methods
AuthorizationGrantSchema.statics = {
  // Find all active grants for a user, optionally filtered by organization
  findActiveGrants: function (userId: string, organizationId?: string) {
    const query: any = {
      userId: new mongoose.Types.ObjectId(userId),
      "grantDetails.status": GrantStatus.ACTIVE,
      "grantDetails.expiresAt": { $gt: new Date() },
      auditDeletedDateTime: { $exists: false },
    };

    if (organizationId) {
      query.organizationId = new mongoose.Types.ObjectId(organizationId);
    }

    return this.find(query).populate("organizationId").populate("requestingPractitionerId");
  },

  // Find pending authorization requests for a user
  findPendingRequests: function (userId: string) {
    return this.find({
      userId: new mongoose.Types.ObjectId(userId),
      "grantDetails.status": GrantStatus.PENDING,
      "grantDetails.expiresAt": { $gt: new Date() },
      auditDeletedDateTime: { $exists: false },
    })
      .populate("organizationId")
      .populate("requestingPractitionerId")
      .sort({ createdAt: -1 });
  },

  // Find expired grants for cleanup
  findExpiredGrants: function () {
    return this.find({
      "grantDetails.status": { $in: [GrantStatus.PENDING, GrantStatus.ACTIVE] },
      "grantDetails.expiresAt": { $lte: new Date() },
      auditDeletedDateTime: { $exists: false },
    });
  },

  // Create a new authorization request
  createRequest: async function (
    userId: string,
    organizationId: string,
    requestMetadata: any,
    accessScope: any,
    timeWindowHours: number = 24,
    requestingPractitionerId?: string
  ): Promise<IAuthorizationGrant> {
    // Check for existing active grant
    const existingGrant = await this.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      "grantDetails.status": GrantStatus.ACTIVE,
      "grantDetails.expiresAt": { $gt: new Date() },
      auditDeletedDateTime: { $exists: false },
    });

    if (existingGrant) {
      throw new Error("Active authorization grant already exists for this user and organization");
    }

    const expiresAt = new Date(Date.now() + timeWindowHours * 60 * 60 * 1000);

    const grantData = {
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      ...(requestingPractitionerId && {
        requestingPractitionerId: new mongoose.Types.ObjectId(requestingPractitionerId),
      }),
      grantDetails: {
        status: GrantStatus.PENDING,
        expiresAt,
        timeWindowHours,
      },
      requestMetadata,
      accessScope: {
        canViewMedicalHistory: accessScope.canViewMedicalHistory ?? true,
        canViewPrescriptions: accessScope.canViewPrescriptions ?? true,
        canCreateEncounters: accessScope.canCreateEncounters ?? false,
        canViewAuditLogs: accessScope.canViewAuditLogs ?? false,
      },
    };

    return await this.create(grantData);
  },
};

// Create and export the model
const AuthorizationGrant: IAuthorizationGrantModel = (mongoose.models.AuthorizationGrant ||
  mongoose.model<IAuthorizationGrant, IAuthorizationGrantModel>(
    "AuthorizationGrant",
    AuthorizationGrantSchema
  )) as IAuthorizationGrantModel;

export default AuthorizationGrant;
