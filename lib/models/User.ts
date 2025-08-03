import mongoose, { Model } from "mongoose";
import { randomUUID } from "crypto";
import { createExtendedSchema } from "./SchemaUtils";
import { IBaseDocument } from "./BaseSchema";

// Interface definitions matching the knowledge base
export interface IUser extends IBaseDocument {
  digitalIdentifier: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    contact: {
      email: string;
      phone: string;
      verified: {
        email: boolean;
        phone: boolean;
      };
    };
  };
  medicalInfo: {
    bloodType?: string;
    knownAllergies?: string[];
    emergencyContact?: {
      name: string;
      phone: string;
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
  getFullName(): string;
  isContactVerified(): boolean;
  getAge(): number;
  toPublicJSON(): any;
}

// Static methods interface
export interface IUserModel extends Model<IUser> {
  findByDigitalId(digitalId: string): Promise<IUser | null>;
  findByBloodType(bloodType: string): Promise<IUser[]>;
  findByAllergy(allergy: string): Promise<IUser[]>;
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
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    lastName: {
      type: String,
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
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
      },
      phone: {
        type: String,
        required: true,
        trim: true,
        match: [/^\+?[\d\s\-()]+$/, "Please enter a valid phone number"],
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
        type: String,
        trim: true,
        maxlength: 100,
      },
    ],
    emergencyContact: {
      name: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      phone: {
        type: String,
        trim: true,
        match: [/^\+?[\d\s\-()]+$/, "Please enter a valid phone number"],
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

// Additional indexes for performance (non-unique fields)
UserSchema.index({ createdAt: 1 });
UserSchema.index({ updatedAt: 1 });

// Pre-save middleware for data validation and transformation
UserSchema.pre("save", function (next) {
  // Generate digital identifier if not provided or empty
  if (!this.digitalIdentifier || (typeof this.digitalIdentifier === "string" && this.digitalIdentifier.trim() === "")) {
    this.digitalIdentifier = `HID_${randomUUID()}`;
  }

  // Ensure digital identifier is unique format
  const digitalId = this.digitalIdentifier;
  if (digitalId && typeof digitalId === "string" && !digitalId.startsWith("HID_")) {
    this.digitalIdentifier = `HID_${digitalId}`;
  }

  next();
});

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
  getFullName: function () {
    return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
  },

  // Check if contact info is verified
  isContactVerified: function () {
    return this.personalInfo.contact.verified.email && this.personalInfo.contact.verified.phone;
  },

  // Get age
  getAge: function () {
    const today = new Date();
    const birthDate = new Date(this.personalInfo.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  },

  // Convert to safe public format (no sensitive data)
  toPublicJSON: function () {
    const role = this.auth?.role || "patient";
    return {
      id: this._id.toString(),
      digitalIdentifier: this.digitalIdentifier,
      firstName: this.personalInfo.firstName,
      lastName: this.personalInfo.lastName,
      email: this.personalInfo.contact.email,
      phone: this.personalInfo.contact.phone,
      role: role,
      emailVerified: this.auth?.emailVerified || false,
      phoneVerified: this.auth?.phoneVerified || false,
      name: this.getFullName(),
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
const User: IUserModel = (mongoose.models.User || mongoose.model<IUser, IUserModel>("User", UserSchema)) as IUserModel;

export default User;
