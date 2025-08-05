import mongoose, { Schema, Document } from "mongoose";
import { auditFields } from "./BaseSchema";
import { z } from "zod";

// Type aliases
export type MembershipRole =
  | "admin"
  | "doctor"
  | "nurse"
  | "pharmacist"
  | "technician"
  | "coordinator"
  | "staff"
  | "guest";

export type MembershipStatus = "active" | "inactive" | "pending" | "suspended" | "terminated";

export type AccessLevel = "full" | "limited" | "read-only" | "emergency-only";

// Zod schema for validation
export const OrganizationMemberZodSchema = z.object({
  organizationId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid Organization ID",
  }),
  practitionerId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid Practitioner ID",
  }),

  membershipDetails: z.object({
    role: z.enum(["admin", "doctor", "nurse", "pharmacist", "technician", "coordinator", "staff", "guest"] as const),
    accessLevel: z.enum(["full", "limited", "read-only", "emergency-only"] as const).default("limited"),
    department: z.string().optional(),
    position: z.string().optional(),
    employeeId: z.string().optional(),
    startDate: z.date().default(() => new Date()),
    endDate: z.date().optional(),
    isPrimary: z.boolean().default(false), // Is this their primary organization?
  }),

  permissions: z.object({
    canAccessPatientRecords: z.boolean().default(false),
    canModifyPatientRecords: z.boolean().default(false),
    canPrescribeMedications: z.boolean().default(false),
    canViewAuditLogs: z.boolean().default(false),
    canManageMembers: z.boolean().default(false),
    canManageOrganization: z.boolean().default(false),
    canRequestAuthorizationGrants: z.boolean().default(false),
    canApproveAuthorizationGrants: z.boolean().default(false),
    canRevokeAuthorizationGrants: z.boolean().default(false),
    specialPermissions: z.array(z.string()).default([]),
  }),

  schedule: z
    .object({
      workingHours: z
        .object({
          monday: z.object({ start: z.string(), end: z.string() }).optional(),
          tuesday: z.object({ start: z.string(), end: z.string() }).optional(),
          wednesday: z.object({ start: z.string(), end: z.string() }).optional(),
          thursday: z.object({ start: z.string(), end: z.string() }).optional(),
          friday: z.object({ start: z.string(), end: z.string() }).optional(),
          saturday: z.object({ start: z.string(), end: z.string() }).optional(),
          sunday: z.object({ start: z.string(), end: z.string() }).optional(),
        })
        .optional(),
      timeZone: z.string().default("UTC"),
      availability: z.enum(["available", "busy", "unavailable", "on-call"] as const).default("available"),
    })
    .optional(),

  status: z.enum(["active", "inactive", "pending", "suspended", "terminated"] as const).default("pending"),

  verificationInfo: z
    .object({
      isVerified: z.boolean().default(false),
      verifiedBy: z.string().optional(),
      verificationDate: z.date().optional(),
      verificationMethod: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  metadata: z
    .object({
      invitedBy: z.string().optional(),
      invitationDate: z.date().optional(),
      activationDate: z.date().optional(),
      lastAccessDate: z.date().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export type OrganizationMemberData = z.infer<typeof OrganizationMemberZodSchema>;

// Mongoose Interface
export interface IOrganizationMember extends Document {
  organizationId: mongoose.Types.ObjectId;
  practitionerId: mongoose.Types.ObjectId;

  membershipDetails: {
    role: MembershipRole;
    accessLevel: AccessLevel;
    department?: string;
    position?: string;
    employeeId?: string;
    startDate: Date;
    endDate?: Date;
    isPrimary: boolean;
  };

  permissions: {
    canAccessPatientRecords: boolean;
    canModifyPatientRecords: boolean;
    canPrescribeMedications: boolean;
    canViewAuditLogs: boolean;
    canManageMembers: boolean;
    canManageOrganization: boolean;
    canRequestAuthorizationGrants: boolean;
    canApproveAuthorizationGrants: boolean;
    canRevokeAuthorizationGrants: boolean;
    specialPermissions: string[];
  };

  schedule?: {
    workingHours?: {
      monday?: { start: string; end: string };
      tuesday?: { start: string; end: string };
      wednesday?: { start: string; end: string };
      thursday?: { start: string; end: string };
      friday?: { start: string; end: string };
      saturday?: { start: string; end: string };
      sunday?: { start: string; end: string };
    };
    timeZone: string;
    availability: "available" | "busy" | "unavailable" | "on-call";
  };

  status: MembershipStatus;

  verificationInfo?: {
    isVerified: boolean;
    verifiedBy?: string;
    verificationDate?: Date;
    verificationMethod?: string;
    notes?: string;
  };

  metadata?: {
    invitedBy?: string;
    invitationDate?: Date;
    activationDate?: Date;
    lastAccessDate?: Date;
    notes?: string;
  };

  // Instance methods
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  updatePermissions(newPermissions: Partial<IOrganizationMember["permissions"]>): Promise<void>;
  verify(verifiedBy: string, method: string, notes?: string): Promise<void>;
  updateSchedule(schedule: IOrganizationMember["schedule"]): Promise<void>;
  hasPermission(permission: keyof IOrganizationMember["permissions"]): boolean;
  isActive(): boolean;
  getFullProfile(): Promise<any>;
}

// Mongoose Schema
const OrganizationMemberSchema = new Schema<IOrganizationMember>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      // index: true, // Removed: covered by compound indexes
    },
    practitionerId: {
      type: Schema.Types.ObjectId,
      ref: "Practitioner",
      required: true,
      // index: true, // Removed: covered by compound indexes
    },

    membershipDetails: {
      role: {
        type: String,
        enum: ["admin", "doctor", "nurse", "pharmacist", "technician", "coordinator", "staff", "guest"],
        required: true,
        index: true,
      },
      accessLevel: {
        type: String,
        enum: ["full", "limited", "read-only", "emergency-only"],
        default: "limited",
        index: true,
      },
      department: {
        type: String,
        index: true,
      },
      position: String,
      employeeId: {
        type: String,
        index: true,
      },
      startDate: {
        type: Date,
        default: Date.now,
        required: true,
      },
      endDate: Date,
      isPrimary: {
        type: Boolean,
        default: false,
        index: true,
      },
    },

    permissions: {
      canAccessPatientRecords: {
        type: Boolean,
        default: false,
      },
      canModifyPatientRecords: {
        type: Boolean,
        default: false,
      },
      canPrescribeMedications: {
        type: Boolean,
        default: false,
      },
      canViewAuditLogs: {
        type: Boolean,
        default: false,
      },
      canManageMembers: {
        type: Boolean,
        default: false,
      },
      canManageOrganization: {
        type: Boolean,
        default: false,
      },
      canRequestAuthorizationGrants: {
        type: Boolean,
        default: false,
      },
      canApproveAuthorizationGrants: {
        type: Boolean,
        default: false,
      },
      canRevokeAuthorizationGrants: {
        type: Boolean,
        default: false,
      },
      specialPermissions: [String],
    },

    schedule: {
      workingHours: {
        monday: {
          start: String,
          end: String,
        },
        tuesday: {
          start: String,
          end: String,
        },
        wednesday: {
          start: String,
          end: String,
        },
        thursday: {
          start: String,
          end: String,
        },
        friday: {
          start: String,
          end: String,
        },
        saturday: {
          start: String,
          end: String,
        },
        sunday: {
          start: String,
          end: String,
        },
      },
      timeZone: {
        type: String,
        default: "UTC",
      },
      availability: {
        type: String,
        enum: ["available", "busy", "unavailable", "on-call"],
        default: "available",
      },
    },

    status: {
      type: String,
      enum: ["active", "inactive", "pending", "suspended", "terminated"],
      default: "pending",
      // index: true, // Removed: covered by compound indexes
    },

    verificationInfo: {
      isVerified: {
        type: Boolean,
        default: false,
        index: true,
      },
      verifiedBy: String,
      verificationDate: Date,
      verificationMethod: String,
      notes: String,
    },

    metadata: {
      invitedBy: String,
      invitationDate: Date,
      activationDate: Date,
      lastAccessDate: Date,
      notes: String,
    },

    ...auditFields,
  },
  {
    timestamps: true,
    collection: "organizationMembers",
  }
);

// Instance Methods
OrganizationMemberSchema.methods.activate = async function (): Promise<void> {
  this.status = "active";
  if (!this.metadata) {
    this.metadata = {};
  }
  this.metadata.activationDate = new Date();
  await this.save();
};

OrganizationMemberSchema.methods.deactivate = async function (): Promise<void> {
  this.status = "inactive";
  await this.save();
};

OrganizationMemberSchema.methods.updatePermissions = async function (
  newPermissions: Partial<IOrganizationMember["permissions"]>
): Promise<void> {
  Object.assign(this.permissions, newPermissions);
  await this.save();
};

OrganizationMemberSchema.methods.verify = async function (
  verifiedBy: string,
  method: string,
  notes?: string
): Promise<void> {
  if (!this.verificationInfo) {
    this.verificationInfo = { isVerified: false };
  }
  this.verificationInfo.isVerified = true;
  this.verificationInfo.verifiedBy = verifiedBy;
  this.verificationInfo.verificationDate = new Date();
  this.verificationInfo.verificationMethod = method;
  if (notes) {
    this.verificationInfo.notes = notes;
  }
  await this.save();
};

OrganizationMemberSchema.methods.updateSchedule = async function (
  schedule: IOrganizationMember["schedule"]
): Promise<void> {
  this.schedule = schedule;
  await this.save();
};

OrganizationMemberSchema.methods.hasPermission = function (
  permission: keyof IOrganizationMember["permissions"]
): boolean {
  return this.permissions[permission] === true;
};

OrganizationMemberSchema.methods.isActive = function (): boolean {
  return this.status === "active" && (!this.membershipDetails.endDate || this.membershipDetails.endDate > new Date());
};

OrganizationMemberSchema.methods.getFullProfile = async function (): Promise<any> {
  await this.populate(["organizationId", "practitionerId"]);
  return this;
};

// Static Methods
OrganizationMemberSchema.statics.findByOrganization = function (organizationId: string, options: any = {}) {
  const query = this.find({ organizationId });

  if (options.status) {
    query.where("status", options.status);
  }

  if (options.role) {
    query.where("membershipDetails.role", options.role);
  }

  if (options.accessLevel) {
    query.where("membershipDetails.accessLevel", options.accessLevel);
  }

  if (options.department) {
    query.where("membershipDetails.department", options.department);
  }

  if (options.verified) {
    query.where("verificationInfo.isVerified", true);
  }

  return query.populate(["organizationId", "practitionerId"]);
};

OrganizationMemberSchema.statics.findByPractitioner = function (practitionerId: string, options: any = {}) {
  const query = this.find({ practitionerId });

  if (options.status) {
    query.where("status", options.status);
  }

  if (options.isPrimary) {
    query.where("membershipDetails.isPrimary", true);
  }

  return query.populate(["organizationId", "practitionerId"]);
};

OrganizationMemberSchema.statics.findActiveMembers = function (organizationId?: string) {
  const query: any = {
    status: "active",
    $or: [{ "membershipDetails.endDate": { $exists: false } }, { "membershipDetails.endDate": { $gt: new Date() } }],
  };

  if (organizationId) {
    query.organizationId = organizationId;
  }

  return this.find(query).populate(["organizationId", "practitionerId"]);
};

OrganizationMemberSchema.statics.findByPermission = function (
  permission: keyof IOrganizationMember["permissions"],
  organizationId?: string
) {
  const query: any = {
    [`permissions.${permission}`]: true,
    status: "active",
  };

  if (organizationId) {
    query.organizationId = organizationId;
  }

  return this.find(query).populate(["organizationId", "practitionerId"]);
};

OrganizationMemberSchema.statics.getPrimaryMembership = function (practitionerId: string) {
  return this.findOne({
    practitionerId,
    "membershipDetails.isPrimary": true,
    status: "active",
  }).populate(["organizationId", "practitionerId"]);
};

// Pre-save middleware
OrganizationMemberSchema.pre("save", function (next) {
  const doc = this as any;

  // Set default permissions based on role
  if (doc.isNew || doc.isModified("membershipDetails.role")) {
    const role = doc.membershipDetails.role;

    // Reset permissions first
    Object.keys(doc.permissions).forEach((key) => {
      if (key !== "specialPermissions") {
        doc.permissions[key] = false;
      }
    });

    // Set role-based permissions
    switch (role) {
      case "admin":
        doc.permissions.canAccessPatientRecords = true;
        doc.permissions.canModifyPatientRecords = true;
        doc.permissions.canViewAuditLogs = true;
        doc.permissions.canManageMembers = true;
        doc.permissions.canManageOrganization = true;
        doc.permissions.canRequestAuthorizationGrants = true;
        doc.permissions.canApproveAuthorizationGrants = true;
        doc.permissions.canRevokeAuthorizationGrants = true;
        break;
      case "doctor":
        doc.permissions.canAccessPatientRecords = true;
        doc.permissions.canModifyPatientRecords = true;
        doc.permissions.canPrescribeMedications = true;
        doc.permissions.canRequestAuthorizationGrants = true;
        doc.permissions.canApproveAuthorizationGrants = true;
        break;
      case "nurse":
        doc.permissions.canAccessPatientRecords = true;
        doc.permissions.canModifyPatientRecords = true;
        doc.permissions.canRequestAuthorizationGrants = true;
        break;
      case "pharmacist":
        doc.permissions.canAccessPatientRecords = true;
        doc.permissions.canPrescribeMedications = true;
        doc.permissions.canRequestAuthorizationGrants = true;
        break;
      case "technician":
        doc.permissions.canAccessPatientRecords = true;
        break;
      case "coordinator":
        doc.permissions.canAccessPatientRecords = true;
        doc.permissions.canRequestAuthorizationGrants = true;
        break;
      case "staff":
        doc.permissions.canAccessPatientRecords = true;
        break;
      case "guest":
        // No default permissions for guests
        break;
    }
  }

  // Ensure only one primary membership per practitioner
  if (doc.isModified("membershipDetails.isPrimary") && doc.membershipDetails.isPrimary) {
    // This should be handled at application level to avoid race conditions
    // but we can add a validation here
  }

  next();
});

// Post-save middleware to handle primary membership uniqueness
OrganizationMemberSchema.post("save", async function (doc) {
  if (doc.membershipDetails.isPrimary) {
    // Remove primary flag from other memberships of the same practitioner
    await mongoose.model("OrganizationMember").updateMany(
      {
        practitionerId: doc.practitionerId,
        _id: { $ne: doc._id },
        "membershipDetails.isPrimary": true,
      },
      {
        $set: { "membershipDetails.isPrimary": false },
      }
    );
  }
});

// Compound Indexes
OrganizationMemberSchema.index({ organizationId: 1, practitionerId: 1 }, { unique: true });
OrganizationMemberSchema.index({ organizationId: 1, status: 1 });
OrganizationMemberSchema.index({ practitionerId: 1, status: 1 });
OrganizationMemberSchema.index({ practitionerId: 1, "membershipDetails.isPrimary": 1 });
OrganizationMemberSchema.index({ "membershipDetails.role": 1, status: 1 });
OrganizationMemberSchema.index({ "membershipDetails.department": 1, status: 1 });
OrganizationMemberSchema.index({ "verificationInfo.isVerified": 1, status: 1 });

// Text search index
OrganizationMemberSchema.index({
  "membershipDetails.position": "text",
  "membershipDetails.department": "text",
  "metadata.notes": "text",
});

export const OrganizationMember =
  mongoose.models.OrganizationMember ||
  mongoose.model<IOrganizationMember>("OrganizationMember", OrganizationMemberSchema);

export default OrganizationMember;
