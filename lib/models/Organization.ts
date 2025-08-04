import mongoose, { Model } from "mongoose";
import { createExtendedSchema } from "./SchemaUtils";
import { IBaseDocument } from "./BaseSchema";

// Organization type enum from knowledge base
export enum OrganizationType {
  HOSPITAL = "HOSPITAL",
  CLINIC = "CLINIC",
  PHARMACY = "PHARMACY",
  LABORATORY = "LABORATORY",
}

// Interface definition matching the knowledge base
export interface IOrganization extends IBaseDocument {
  organizationInfo: {
    name: string;
    type: OrganizationType;
    registrationNumber?: string; // Government registration ID
  };
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  verification: {
    isVerified: boolean;
    verifiedAt?: Date;
    verificationDocuments?: string[]; // GridFS file references
  };

  // Instance methods
  verify(verifiedBy: string): Promise<IOrganization>;
  unverify(unverifiedBy: string): Promise<IOrganization>;
  updateContact(contactInfo: any, updatedBy: string): Promise<IOrganization>;
}

// Static methods interface
export interface IOrganizationModel extends Model<IOrganization> {
  findByType(type: OrganizationType): Promise<IOrganization[]>;
  findByRegistrationNumber(
    registrationNumber: string,
  ): Promise<IOrganization | null>;
  findVerified(): Promise<IOrganization[]>;
  findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ): Promise<IOrganization[]>;
}

// Organization schema fields
const organizationSchemaFields = {
  organizationInfo: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(OrganizationType),
      required: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      required: false,
      trim: true,
      unique: true,
      sparse: true, // Allow multiple null values
      index: true,
    },
  },

  address: {
    street: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: "Malaysia",
    },
    coordinates: {
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

  contact: {
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[\d\s\-()]+$/, "Please enter a valid phone number"],
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
      index: true,
    },
    website: {
      type: String,
      required: false,
      trim: true,
      match: [/^https?:\/\/.+/, "Please enter a valid website URL"],
    },
  },

  verification: {
    isVerified: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
    },
    verifiedAt: {
      type: Date,
      required: false,
    },
    verificationDocuments: [
      {
        type: String, // GridFS file references
        required: false,
      },
    ],
  },
};

// Create extended schema with audit fields
const OrganizationSchema = createExtendedSchema(organizationSchemaFields, {
  timestamps: true,
  versionKey: false,
  collection: "organizations",
});

// Indexes for performance
OrganizationSchema.index({ "organizationInfo.name": "text" }); // Text search
OrganizationSchema.index({
  "address.coordinates.latitude": 1,
  "address.coordinates.longitude": 1,
}); // Geospatial
OrganizationSchema.index({
  "organizationInfo.type": 1,
  "verification.isVerified": 1,
}); // Common queries

// Pre-save middleware
OrganizationSchema.pre("save", function (next) {
  // Auto-verify based on registration number format (implement specific logic as needed)
  const doc = this as any;
  if (
    doc.organizationInfo?.registrationNumber &&
    !doc.verification?.isVerified
  ) {
    // Could implement automatic verification logic here
  }

  next();
});

// Instance methods
OrganizationSchema.methods = {
  // Verify the organization
  verify: async function (
    this: IOrganization,
    verifiedBy: string,
  ): Promise<IOrganization> {
    this.verification.isVerified = true;
    this.verification.verifiedAt = new Date();
    this.auditModifiedBy = verifiedBy;

    return await this.save();
  },

  // Unverify the organization
  unverify: async function (
    this: IOrganization,
    unverifiedBy: string,
  ): Promise<IOrganization> {
    this.verification.isVerified = false;
    this.verification.verifiedAt = undefined;
    this.auditModifiedBy = unverifiedBy;

    return await this.save();
  },

  // Update contact information
  updateContact: async function (
    this: IOrganization,
    contactInfo: any,
    updatedBy: string,
  ): Promise<IOrganization> {
    if (contactInfo.phone) this.contact.phone = contactInfo.phone;
    if (contactInfo.email) this.contact.email = contactInfo.email;
    if (contactInfo.website) this.contact.website = contactInfo.website;

    this.auditModifiedBy = updatedBy;

    return await this.save();
  },
};

// Static methods
OrganizationSchema.statics = {
  // Find organizations by type
  findByType: function (type: OrganizationType) {
    return this.find({
      "organizationInfo.type": type,
      auditDeletedDateTime: { $exists: false },
    }).sort({ "organizationInfo.name": 1 });
  },

  // Find organization by registration number
  findByRegistrationNumber: function (registrationNumber: string) {
    return this.findOne({
      "organizationInfo.registrationNumber": registrationNumber,
      auditDeletedDateTime: { $exists: false },
    });
  },

  // Find verified organizations
  findVerified: function () {
    return this.find({
      "verification.isVerified": true,
      auditDeletedDateTime: { $exists: false },
    }).sort({ "organizationInfo.name": 1 });
  },

  // Find organizations nearby (requires coordinates)
  findNearby: function (latitude: number, longitude: number, radiusKm: number) {
    const radiusInRadians = radiusKm / 6371; // Earth's radius in km

    return this.find({
      "address.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude], // Note: MongoDB uses [lng, lat]
          },
          $maxDistance: radiusKm * 1000, // Convert to meters
        },
      },
      auditDeletedDateTime: { $exists: false },
    });
  },
};

// Create and export the model
const Organization: IOrganizationModel = (mongoose.models.Organization ||
  mongoose.model<IOrganization, IOrganizationModel>(
    "Organization",
    OrganizationSchema,
  )) as IOrganizationModel;

export default Organization;
