import mongoose, { Schema, Document } from "mongoose";
import { auditFields } from "./BaseSchema";
import { z } from "zod";

// Type aliases
export type PractitionerType =
  | "doctor"
  | "nurse"
  | "pharmacist"
  | "technician"
  | "admin"
  | "other";
export type PractitionerStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "pending_verification";
export type AvailabilityStatus =
  | "available"
  | "busy"
  | "unavailable"
  | "on-call";
export type VerificationStatus = "verified" | "pending" | "expired" | "revoked";

// Zod schema for validation
export const PractitionerZodSchema = z.object({
  userId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid User ID",
  }),
  organizationId: z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid Organization ID",
    }),

  // Professional Information
  professionalInfo: z.object({
    licenseNumber: z
      .string()
      .min(3, "License number must be at least 3 characters"),
    specialty: z.string().min(2, "Specialty must be at least 2 characters"),
    practitionerType: z.enum([
      "doctor",
      "nurse",
      "pharmacist",
      "technician",
      "admin",
      "other",
    ] as const),
    yearsOfExperience: z.number().min(0).max(70),
    currentPosition: z.string().optional(),
    department: z.string().optional(),
  }),

  // Verification status
  verification: z.object({
    isLicenseVerified: z.boolean().default(false),
    licenseVerificationDate: z.date().optional(),
    licenseVerificationMethod: z.string().optional(),
    isOrganizationVerified: z.boolean().default(false),
    verificationNotes: z.string().optional(),
  }),

  // Access and Permissions
  permissions: z.object({
    canAccessPatientRecords: z.boolean().default(false),
    canModifyPatientRecords: z.boolean().default(false),
    canPrescribeMedications: z.boolean().default(false),
    canViewAuditLogs: z.boolean().default(false),
    canManageOrganization: z.boolean().default(false),
    canRequestAuthorizationGrants: z.boolean().default(false),
    canApproveAuthorizationGrants: z.boolean().default(false),
    canRevokeAuthorizationGrants: z.boolean().default(false),
    specialPermissions: z.array(z.string()).default([]),
  }),

  // Professional Schedule
  schedule: z
    .object({
      workingHours: z
        .object({
          monday: z.object({ start: z.string(), end: z.string() }).optional(),
          tuesday: z.object({ start: z.string(), end: z.string() }).optional(),
          wednesday: z
            .object({ start: z.string(), end: z.string() })
            .optional(),
          thursday: z.object({ start: z.string(), end: z.string() }).optional(),
          friday: z.object({ start: z.string(), end: z.string() }).optional(),
          saturday: z.object({ start: z.string(), end: z.string() }).optional(),
          sunday: z.object({ start: z.string(), end: z.string() }).optional(),
        })
        .optional(),
      timeZone: z.string().default("UTC"),
      availability: z
        .enum(["available", "busy", "unavailable", "on-call"] as const)
        .default("available"),
    })
    .optional(),

  // Status and Activity
  status: z
    .enum(["active", "inactive", "suspended", "pending_verification"] as const)
    .default("pending_verification"),
  lastActiveDate: z.date().optional(),

  // Additional metadata
  metadata: z
    .object({
      specializations: z.array(z.string()).default([]),
      languages: z.array(z.string()).default([]),
      certifications: z
        .array(
          z.object({
            name: z.string(),
            issuingBody: z.string(),
            issueDate: z.date(),
            expiryDate: z.date().optional(),
            verificationStatus: z
              .enum(["verified", "pending", "expired", "revoked"] as const)
              .default("pending"),
          }),
        )
        .default([]),
      emergencyContact: z
        .object({
          name: z.string(),
          relationship: z.string(),
          phone: z.string(),
          email: z.string().email().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type PractitionerData = z.infer<typeof PractitionerZodSchema>;

// Mongoose Interface
export interface IPractitioner extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  professionalInfo: {
    licenseNumber: string;
    specialty: string;
    practitionerType: PractitionerType;
    yearsOfExperience: number;
    currentPosition?: string;
    department?: string;
  };
  verification: {
    isLicenseVerified: boolean;
    licenseVerificationDate?: Date;
    licenseVerificationMethod?: string;
    isOrganizationVerified: boolean;
    verificationNotes?: string;
  };
  permissions: {
    canAccessPatientRecords: boolean;
    canModifyPatientRecords: boolean;
    canPrescribeMedications: boolean;
    canViewAuditLogs: boolean;
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
    availability: AvailabilityStatus;
  };
  status: PractitionerStatus;
  lastActiveDate?: Date;
  metadata?: {
    specializations: string[];
    languages: string[];
    certifications: Array<{
      name: string;
      issuingBody: string;
      issueDate: Date;
      expiryDate?: Date;
      verificationStatus: VerificationStatus;
    }>;
    emergencyContact?: {
      name: string;
      relationship: string;
      phone: string;
      email?: string;
    };
  };

  // Instance methods
  verifyLicense(method: string, notes?: string): Promise<void>;
  updatePermissions(
    newPermissions: Partial<IPractitioner["permissions"]>,
  ): Promise<void>;
  updateSchedule(schedule: IPractitioner["schedule"]): Promise<void>;
  isAvailable(): boolean;
  hasPermission(permission: keyof IPractitioner["permissions"]): boolean;
  addCertification(cert: {
    name: string;
    issuingBody: string;
    issueDate: Date;
    expiryDate?: Date;
    verificationStatus: VerificationStatus;
  }): Promise<void>;
  getFullProfile(): Promise<any>;
}

// Mongoose Schema
const PractitionerSchema = new Schema<IPractitioner>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    // Professional Information
    professionalInfo: {
      licenseNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },
      specialty: {
        type: String,
        required: true,
        index: true,
      },
      practitionerType: {
        type: String,
        enum: ["doctor", "nurse", "pharmacist", "technician", "admin", "other"],
        required: true,
        index: true,
      },
      yearsOfExperience: {
        type: Number,
        required: true,
        min: 0,
        max: 70,
      },
      currentPosition: String,
      department: {
        type: String,
        index: true,
      },
    },

    // Verification status
    verification: {
      isLicenseVerified: {
        type: Boolean,
        default: false,
        index: true,
      },
      licenseVerificationDate: Date,
      licenseVerificationMethod: String,
      isOrganizationVerified: {
        type: Boolean,
        default: false,
        index: true,
      },
      verificationNotes: String,
    },

    // Access and Permissions
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
      specialPermissions: [
        {
          type: String,
        },
      ],
    },

    // Professional Schedule
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

    // Status and Activity
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending_verification"],
      default: "pending_verification",
      index: true,
    },
    lastActiveDate: Date,

    // Additional metadata
    metadata: {
      specializations: [String],
      languages: [String],
      certifications: [
        {
          name: {
            type: String,
            required: true,
          },
          issuingBody: {
            type: String,
            required: true,
          },
          issueDate: {
            type: Date,
            required: true,
          },
          expiryDate: Date,
          verificationStatus: {
            type: String,
            enum: ["verified", "pending", "expired", "revoked"],
            default: "pending",
          },
        },
      ],
      emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
        email: String,
      },
    },

    ...auditFields,
  },
  {
    timestamps: true,
    collection: "practitioners",
  },
);

// Instance Methods
PractitionerSchema.methods.verifyLicense = async function (
  method: string,
  notes?: string,
): Promise<void> {
  this.verification.isLicenseVerified = true;
  this.verification.licenseVerificationDate = new Date();
  this.verification.licenseVerificationMethod = method;
  if (notes) {
    this.verification.verificationNotes = notes;
  }
  await this.save();
};

PractitionerSchema.methods.updatePermissions = async function (
  newPermissions: Partial<IPractitioner["permissions"]>,
): Promise<void> {
  Object.assign(this.permissions, newPermissions);
  await this.save();
};

PractitionerSchema.methods.updateSchedule = async function (
  schedule: IPractitioner["schedule"],
): Promise<void> {
  this.schedule = schedule;
  await this.save();
};

PractitionerSchema.methods.isAvailable = function (): boolean {
  return (
    this.status === "active" && this.schedule?.availability === "available"
  );
};

PractitionerSchema.methods.hasPermission = function (
  permission: keyof IPractitioner["permissions"],
): boolean {
  return this.permissions[permission] === true;
};

PractitionerSchema.methods.addCertification = async function (cert: {
  name: string;
  issuingBody: string;
  issueDate: Date;
  expiryDate?: Date;
  verificationStatus: VerificationStatus;
}): Promise<void> {
  if (!this.metadata) {
    this.metadata = { specializations: [], languages: [], certifications: [] };
  }
  if (!this.metadata.certifications) {
    this.metadata.certifications = [];
  }
  this.metadata.certifications.push(cert);
  await this.save();
};

PractitionerSchema.methods.getFullProfile = async function (): Promise<any> {
  await this.populate(["userId", "organizationId"]);
  return this;
};

// Static Methods
PractitionerSchema.statics.findByLicenseNumber = function (
  licenseNumber: string,
) {
  return this.findOne({ "professionalInfo.licenseNumber": licenseNumber });
};

PractitionerSchema.statics.findByOrganization = function (
  organizationId: string,
  options: any = {},
) {
  const query = this.find({ organizationId });

  if (options.status) {
    query.where("status", options.status);
  }

  if (options.practitionerType) {
    query.where("professionalInfo.practitionerType", options.practitionerType);
  }

  if (options.specialty) {
    query.where("professionalInfo.specialty", options.specialty);
  }

  if (options.verified) {
    query.where("verification.isLicenseVerified", true);
  }

  return query;
};

PractitionerSchema.statics.findAvailable = function (organizationId?: string) {
  const query: any = {
    status: "active",
    "schedule.availability": "available",
  };

  if (organizationId) {
    query.organizationId = organizationId;
  }

  return this.find(query);
};

PractitionerSchema.statics.getByPermission = function (
  permission: keyof IPractitioner["permissions"],
  organizationId?: string,
) {
  const query: any = {
    [`permissions.${permission}`]: true,
    status: "active",
  };

  if (organizationId) {
    query.organizationId = organizationId;
  }

  return this.find(query);
};

// Pre-save middleware
PractitionerSchema.pre("save", function (next) {
  const doc = this as any;

  // Auto-update last active date when status becomes active
  if (doc.isModified("status") && doc.status === "active") {
    doc.lastActiveDate = new Date();
  }

  // Set default permissions based on practitioner type
  if (doc.isNew || doc.isModified("professionalInfo.practitionerType")) {
    const type = doc.professionalInfo.practitionerType;

    switch (type) {
      case "doctor":
        doc.permissions.canAccessPatientRecords = true;
        doc.permissions.canModifyPatientRecords = true;
        doc.permissions.canPrescribeMedications = true;
        break;
      case "nurse":
        doc.permissions.canAccessPatientRecords = true;
        doc.permissions.canModifyPatientRecords = true;
        break;
      case "pharmacist":
        doc.permissions.canAccessPatientRecords = true;
        doc.permissions.canPrescribeMedications = true;
        break;
      case "admin":
        doc.permissions.canViewAuditLogs = true;
        doc.permissions.canManageOrganization = true;
        break;
      default:
        switch (type) {
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
          case "admin":
            doc.permissions.canViewAuditLogs = true;
            doc.permissions.canManageOrganization = true;
            doc.permissions.canRequestAuthorizationGrants = true;
            doc.permissions.canApproveAuthorizationGrants = true;
            doc.permissions.canRevokeAuthorizationGrants = true;
            break;
          default:
            // Basic access for other types
            doc.permissions.canAccessPatientRecords = false;
        }
    }
  }

  next();
});

// Compound Indexes
PractitionerSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
PractitionerSchema.index({ organizationId: 1, status: 1 });
PractitionerSchema.index({ "professionalInfo.practitionerType": 1, status: 1 });
PractitionerSchema.index({ "verification.isLicenseVerified": 1, status: 1 });
PractitionerSchema.index({ "schedule.availability": 1, status: 1 });

// Text search index
PractitionerSchema.index({
  "professionalInfo.specialty": "text",
  "professionalInfo.currentPosition": "text",
  "metadata.specializations": "text",
});

export const Practitioner =
  mongoose.models.Practitioner ||
  mongoose.model<IPractitioner>("Practitioner", PractitionerSchema);
export default Practitioner;
