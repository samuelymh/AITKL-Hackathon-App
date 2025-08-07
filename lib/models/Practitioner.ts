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

  // Access and Permissions (moved to OrganizationMember model)
  // permissions field removed - now handled per organization membership

  // Professional Schedule (moved to OrganizationMember model)
  // schedule field removed - now handled per organization membership

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
  addCertification(cert: {
    name: string;
    issuingBody: string;
    issueDate: Date;
    expiryDate?: Date;
    verificationStatus: VerificationStatus;
  }): Promise<void>;
  getFullProfile(): Promise<any>;
  getOrganizationMemberships(): Promise<any[]>;
}

// Mongoose Schema
const PractitionerSchema = new Schema<IPractitioner>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // index: true, // Removed: covered by unique compound index
    },

    // Professional Information
    professionalInfo: {
      licenseNumber: {
        type: String,
        required: true,
        // unique: true, // Removed: explicit index at end of file provides uniqueness
        // index: true, // Removed: explicit index at end of file creates the index
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

    // Status and Activity
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending_verification"],
      default: "pending_verification",
      // index: true, // Removed: covered by compound indexes
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
  await this.populate(["userId"]);
  return this;
};

PractitionerSchema.methods.getOrganizationMemberships =
  async function (): Promise<any[]> {
    const OrganizationMember = require("./OrganizationMember").default;
    return await OrganizationMember.find({ practitionerId: this._id }).populate(
      ["organizationId"],
    );
  };

// Static Methods
PractitionerSchema.statics.findByLicenseNumber = function (
  licenseNumber: string,
) {
  return this.findOne({ "professionalInfo.licenseNumber": licenseNumber });
};

PractitionerSchema.statics.findBySpecialty = function (
  specialty: string,
  options: any = {},
) {
  const query = this.find({ "professionalInfo.specialty": specialty });

  if (options.status) {
    query.where("status", options.status);
  }

  if (options.practitionerType) {
    query.where("professionalInfo.practitionerType", options.practitionerType);
  }

  if (options.verified) {
    query.where("verification.isLicenseVerified", true);
  }

  return query;
};

PractitionerSchema.statics.findByUserId = function (userId: string) {
  return this.findOne({ userId });
};

// Pre-save middleware
PractitionerSchema.pre("save", function (next) {
  const doc = this as any;

  // Auto-update last active date when status becomes active
  if (doc.isModified("status") && doc.status === "active") {
    doc.lastActiveDate = new Date();
  }

  next();
});

// Indexes
PractitionerSchema.index({ userId: 1 }, { unique: true });
PractitionerSchema.index({ status: 1 });
PractitionerSchema.index({ "professionalInfo.practitionerType": 1, status: 1 });
PractitionerSchema.index({ "verification.isLicenseVerified": 1, status: 1 });
PractitionerSchema.index(
  { "professionalInfo.licenseNumber": 1 },
  { unique: true },
);

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
