import mongoose, { Model } from "mongoose";
import { randomUUID } from "crypto";
import { createExtendedSchema } from "./SchemaUtils";
import { IBaseDocument } from "./BaseSchema";
import {
  encryptionPlugin,
  EncryptedFieldType,
} from "../services/encryption-plugin";

// Interface definitions matching the knowledge base with encryption support
export interface IUser extends IBaseDocument {
  digitalIdentifier: string;
  personalInfo: {
    firstName: EncryptedFieldType; // Encrypted PII
    lastName: EncryptedFieldType; // Encrypted PII
    dateOfBirth: Date;
    contact: {
      email: EncryptedFieldType; // Encrypted PII
      phone: EncryptedFieldType; // Encrypted PII
      verified: {
        email: boolean;
        phone: boolean;
      };
    };
  };
  medicalInfo: {
    bloodType?: string;
    knownAllergies?: EncryptedFieldType[]; // Encrypted PHI
    smokingStatus?: "never" | "current" | "former";
    additionalNotes?: string;
    emergencyContact?: {
      name: EncryptedFieldType; // Encrypted PII
      phone: EncryptedFieldType; // Encrypted PII
      relationship: string;
    };
  };
  auth?: {
    passwordHash: string;
    role: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    lastLogin: Date | null;
    loginAttempts: number;
    accountLocked: boolean;
    accountLockedUntil: Date | null;
    tokenVersion?: number; // For JWT refresh token rotation
  };

  // Instance methods
  getFullName(): Promise<string>;
  isContactVerified(): boolean;
  getAge(): number;
  toPublicJSON(): Promise<any>;

  // Encryption-specific methods (provided by plugin)
  decryptField?(fieldPath: string): Promise<string | null>;
  needsReEncryption?(fieldPath: string): boolean;
  reEncryptField?(fieldPath: string): Promise<void>;
}

// Static methods interface
export interface IUserModel extends Model<IUser> {
  findByDigitalId(digitalId: string): Promise<IUser | null>;
  findByBloodType(bloodType: string): Promise<IUser[]>;
  findByAllergy(allergy: string): Promise<IUser[]>;
  bulkReEncrypt(batchSize?: number): Promise<number>;
}

// User schema fields (excluding audit fields which are added by createExtendedSchema)
const userSchemaFields = {
  digitalIdentifier: {
    type: String,
    required: false, // Let pre-save middleware generate this
    unique: true,
    trim: true,
    minlength: 10,
    maxlength: 45, // HID_ prefix (4) + UUID (36) = 40 chars, with some buffer
  },
  personalInfo: {
    firstName: {
      type: mongoose.Schema.Types.Mixed, // Support both string and encrypted object
      required: true,
      trim: true,
      maxlength: 100,
    },
    lastName: {
      type: mongoose.Schema.Types.Mixed, // Support both string and encrypted object
      required: true,
      trim: true,
      maxlength: 100,
    },
    dateOfBirth: {
      type: Date,
      required: true,
      validate: {
        validator: function (value: Date) {
          return value <= new Date();
        },
        message: "Date of birth cannot be in the future",
      },
    },
    contact: {
      email: {
        type: mongoose.Schema.Types.Mixed, // Support both string and encrypted object
        required: true,
        lowercase: true,
        trim: true,
        // Note: validation will be applied to decrypted values
      },
      searchableEmail: {
        type: String,
        required: false, // Will be set by pre-save middleware
        unique: true,
        lowercase: true,
        trim: true,
        // This field stores the email in a hashed/searchable format for uniqueness
      },
      phone: {
        type: mongoose.Schema.Types.Mixed, // Support both string and encrypted object
        required: true,
        trim: true,
        // Note: validation will be applied to decrypted values
      },
      verified: {
        email: {
          type: Boolean,
          default: false,
        },
        phone: {
          type: Boolean,
          default: false,
        },
      },
    },
  },
  medicalInfo: {
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      uppercase: true,
    },
    knownAllergies: [
      {
        type: mongoose.Schema.Types.Mixed, // Support both string and encrypted object
        trim: true,
        maxlength: 100,
      },
    ],
    smokingStatus: {
      type: String,
      enum: ["never", "current", "former"],
      default: "never",
    },
    additionalNotes: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    emergencyContact: {
      name: {
        type: mongoose.Schema.Types.Mixed, // Support both string and encrypted object
        trim: true,
        maxlength: 100,
      },
      phone: {
        type: mongoose.Schema.Types.Mixed, // Support both string and encrypted object
        trim: true,
        // Note: validation will be applied to decrypted values
      },
      relationship: {
        type: String,
        trim: true,
        maxlength: 50,
      },
    },
  },
  auth: {
    passwordHash: {
      type: String,
      required: function () {
        return !!(this as any).auth;
      },
      select: false, // Don't include in queries by default
    },
    role: {
      type: String,
      enum: ["patient", "doctor", "pharmacist", "admin", "system"],
      default: "patient",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    accountLocked: {
      type: Boolean,
      default: false,
    },
    accountLockedUntil: {
      type: Date,
      default: null,
    },
    tokenVersion: {
      type: Number,
      default: 1,
    },
  },
};

// Create extended schema with audit fields from BaseSchema
const UserSchema = createExtendedSchema(userSchemaFields, {
  timestamps: true,
  versionKey: false,
  collection: "users",
});

// Pre-save middleware for data validation and transformation (BEFORE encryption)
UserSchema.pre("save", function (next) {
  // Generate digital identifier if not provided or empty
  if (
    !this.digitalIdentifier ||
    (typeof this.digitalIdentifier === "string" &&
      this.digitalIdentifier.trim() === "")
  ) {
    this.digitalIdentifier = `HID_${randomUUID()}`;
  }

  // Ensure digital identifier is unique format
  const digitalId = this.digitalIdentifier;
  if (
    digitalId &&
    typeof digitalId === "string" &&
    !digitalId.startsWith("HID_")
  ) {
    this.digitalIdentifier = `HID_${digitalId}`;
  }

  // Handle searchable email for uniqueness (BEFORE encryption)
  if ((this.personalInfo as any)?.contact?.email) {
    const email = (this.personalInfo as any).contact.email;
    // If it's a string (not yet encrypted), use it for searchableEmail
    if (typeof email === "string") {
      (this.personalInfo as any).contact.searchableEmail = email
        .toLowerCase()
        .trim();
    }
  }

  next();
});

// Apply encryption plugin to the schema (AFTER our pre-save middleware)
UserSchema.plugin(encryptionPlugin, {
  encryptedFields: [
    "personalInfo.firstName",
    "personalInfo.lastName",
    "personalInfo.contact.email",
    "personalInfo.contact.phone",
    "medicalInfo.emergencyContact.name",
    "medicalInfo.emergencyContact.phone",
  ],
  encryptedPaths: ["medicalInfo.knownAllergies"],
});

// Additional indexes for performance (non-unique fields)
UserSchema.index({ createdAt: 1 });
UserSchema.index({ updatedAt: 1 });

// Static methods
UserSchema.statics = {
  // Find user by digital identifier
  findByDigitalId: function (digitalId: string) {
    return this.findOne({ digitalIdentifier: digitalId });
  },

  // Find users by blood type
  findByBloodType: function (bloodType: string) {
    return this.find({ "medicalInfo.bloodType": bloodType });
  },

  // Find users with specific allergies
  findByAllergy: function (allergy: string) {
    return this.find({ "medicalInfo.knownAllergies": { $in: [allergy] } });
  },
};

// Instance methods
UserSchema.methods = {
  // Get full name
  getFullName: async function () {
    try {
      // The encryption plugin should automatically decrypt fields during query
      // But we'll add a safety check for the decryptField method
      if (typeof this.decryptField === "function") {
        const firstName =
          (await this.decryptField("personalInfo.firstName")) || "Unknown";
        const lastName =
          (await this.decryptField("personalInfo.lastName")) || "Unknown";
        return `${firstName} ${lastName}`;
      } else {
        // Fallback: fields should already be decrypted by post-query middleware
        const firstName = this.personalInfo.firstName || "Unknown";
        const lastName = this.personalInfo.lastName || "Unknown";
        return `${firstName} ${lastName}`;
      }
    } catch (error) {
      console.warn("Error in getFullName:", error);
      return "Unknown User";
    }
  },

  // Check if contact info is verified
  isContactVerified: function () {
    return (
      this.personalInfo.contact.verified.email &&
      this.personalInfo.contact.verified.phone
    );
  },

  // Get age
  getAge: function () {
    const today = new Date();
    const birthDate = new Date(this.personalInfo.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  },

  // Convert to safe public format (no sensitive data)
  toPublicJSON: async function () {
    const role = this.auth?.role || "patient";

    // Import encryption service for direct decryption
    const { encryptionService, encryptionUtils } = await import(
      "../services/encryption-service"
    );

    // Helper function to decrypt a field safely
    const safeDecrypt = async (
      fieldPath: string,
      field: any,
    ): Promise<string | null> => {
      try {
        // Always try direct decryption first if field is encrypted
        if (encryptionUtils.isEncrypted(field)) {
          const decrypted = await encryptionService.decryptField(field);
          console.log(`Direct decryption for ${fieldPath}: success`);
          return decrypted;
        }

        // If not encrypted and is a string, return as-is
        if (typeof field === "string") {
          console.log(`Field ${fieldPath} is plaintext string`);
          return field;
        }

        // Try plugin method as fallback
        if (typeof this.decryptField === "function") {
          const decrypted = await this.decryptField(fieldPath);
          console.log(
            `Plugin decryption for ${fieldPath}:`,
            decrypted ? "success" : "null",
          );
          return decrypted;
        }

        console.log(
          `Field ${fieldPath} could not be decrypted, type:`,
          typeof field,
        );
      } catch (error) {
        console.warn(`Failed to decrypt ${fieldPath}:`, error);
      }
      return null;
    };

    // Try to get decrypted values
    const firstName =
      (await safeDecrypt(
        "personalInfo.firstName",
        this.personalInfo.firstName,
      )) || "User";

    const lastName =
      (await safeDecrypt(
        "personalInfo.lastName",
        this.personalInfo.lastName,
      )) || "Name";

    const email =
      (await safeDecrypt(
        "personalInfo.contact.email",
        this.personalInfo.contact.email,
      )) ||
      this.personalInfo.contact.searchableEmail || // Use searchableEmail as primary fallback
      "user@example.com";

    const phone =
      (await safeDecrypt(
        "personalInfo.contact.phone",
        this.personalInfo.contact.phone,
      )) || "+000000000";

    return {
      id: this._id.toString(),
      digitalIdentifier: this.digitalIdentifier,
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: phone,
      role: role,
      emailVerified: this.auth?.emailVerified || false,
      phoneVerified: this.auth?.phoneVerified || false,
      name: `${firstName} ${lastName}`,
      age: this.getAge(),
      bloodType: this.medicalInfo.bloodType,
      hasEmergencyContact: !!this.medicalInfo.emergencyContact?.name,
      contactVerified: this.isContactVerified(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Include audit information (excluding sensitive audit fields)
      audit: {
        created: this.auditCreatedDateTime,
        modified: this.auditModifiedDateTime,
        isDeleted: !!this.auditDeletedDateTime,
      },
    };
  },
};

// Create and export the model
// Use mongoose.models to prevent re-compilation in serverless environments
const User: IUserModel = (mongoose.models.User ||
  mongoose.model<IUser, IUserModel>("User", UserSchema)) as IUserModel;

export default User;
