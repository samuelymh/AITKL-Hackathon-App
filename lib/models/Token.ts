import { Schema, model, Model } from "mongoose";
import { IBaseDocument } from "./BaseSchema";

/**
 * Interface for Token document in MongoDB
 */
export interface ITokenDocument extends IBaseDocument {
  token: string;
  grantId: string;
  userId: string;
  organizationId: string;
  tokenType: "access" | "qr" | "scan";
  createdAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedBy?: string;
  metadata?: Record<string, any>;
  
  // Instance methods
  revoke(revokedBy: string, reason?: string): Promise<ITokenDocument>;
  isValid(): boolean;
  isExpired(): boolean;
}

/**
 * Token schema with audit logging
 */
const TokenSchema = new Schema<ITokenDocument>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    grantId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    tokenType: {
      type: String,
      required: true,
      enum: ["access", "qr", "scan"],
      index: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
      required: false,
    },
    revokedBy: {
      type: String,
      required: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: false, // We manage our own timestamps
    versionKey: false,
  }
);

// Compound indexes for efficient queries
TokenSchema.index({ grantId: 1, isRevoked: 1 });
TokenSchema.index({ userId: 1, isRevoked: 1 });
TokenSchema.index({ organizationId: 1, tokenType: 1 });
TokenSchema.index({ expiresAt: 1, isRevoked: 1 });
TokenSchema.index({ tokenType: 1, isRevoked: 1 });

// TTL index to automatically remove expired tokens after 7 days
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// Static methods for common queries
TokenSchema.statics.findActiveTokens = function () {
  return this.find({
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });
};

TokenSchema.statics.findExpiredTokens = function () {
  return this.find({
    expiresAt: { $lte: new Date() },
    isRevoked: false,
  });
};

TokenSchema.statics.findTokensByGrant = function (grantId: string) {
  return this.find({ grantId });
};

TokenSchema.statics.findTokensByUser = function (userId: string) {
  return this.find({ userId });
};

// Instance methods
TokenSchema.methods.revoke = function (revokedBy: string, reason?: string) {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  
  if (reason) {
    if (!this.metadata) this.metadata = {};
    this.metadata.revocationReason = reason;
  }
  
  return this.save();
};

TokenSchema.methods.isValid = function () {
  return !this.isRevoked && new Date() <= this.expiresAt;
};

TokenSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

// Virtual for human-readable status
TokenSchema.virtual("status").get(function (this: ITokenDocument) {
  if (this.isRevoked) return "revoked";
  if (new Date() > this.expiresAt) return "expired";
  return "active";
});

// Ensure virtual fields are serialized
TokenSchema.set("toJSON", { virtuals: true });
TokenSchema.set("toObject", { virtuals: true });

/**
 * Token model interface with static methods
 */
export interface ITokenModel extends Model<ITokenDocument> {
  findActiveTokens(): Promise<ITokenDocument[]>;
  findExpiredTokens(): Promise<ITokenDocument[]>;
  findTokensByGrant(grantId: string): Promise<ITokenDocument[]>;
  findTokensByUser(userId: string): Promise<ITokenDocument[]>;
}

/**
 * Token model
 */
export const Token = model<ITokenDocument, ITokenModel>("Token", TokenSchema);

export default Token;
