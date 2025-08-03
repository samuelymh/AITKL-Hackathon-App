import { Schema, Document, Types } from "mongoose";

/**
 * Base interface for all documents with audit logging
 */
export interface IBaseDocument extends Document {
  _id: Types.ObjectId;
  auditCreatedDateTime: string;
  auditCreatedBy: string;
  auditModifiedBy?: string;
  auditModifiedDateTime?: string;
  auditDeletedBy?: string;
  auditDeletedDateTime?: string;
}

/**
 * Base schema with audit logging fields that all other schemas should extend
 */
export const BaseSchema = new Schema(
  {
    auditCreatedDateTime: {
      type: String,
      required: true,
      immutable: true,
      default: () => new Date().toISOString(),
    },
    auditCreatedBy: {
      type: String,
      required: true,
      immutable: true,
      default: "system", // Should be overridden with actual user ID
    },
    auditModifiedBy: {
      type: String,
      required: false,
    },
    auditModifiedDateTime: {
      type: String,
      required: false,
    },
    auditDeletedBy: {
      type: String,
      required: false,
    },
    auditDeletedDateTime: {
      type: String,
      required: false,
    },
  },
  {
    // Don't add timestamps as we're managing our own audit fields
    timestamps: false,
    versionKey: false,
  },
);

/**
 * Pre-save middleware to handle audit logging
 */
BaseSchema.pre("save", function (next) {
  const now = new Date().toISOString();

  // Set created fields only for new documents
  if (this.isNew) {
    if (!this.auditCreatedDateTime) {
      this.auditCreatedDateTime = now;
    }
    if (!this.auditCreatedBy) {
      this.auditCreatedBy = "system"; // Should be set by application logic
    }
  } else {
    // Update modification fields for existing documents
    this.auditModifiedDateTime = now;
    // auditModifiedBy should be set by application logic before save
  }

  next();
});

/**
 * Instance method to mark document as deleted (soft delete)
 */
BaseSchema.methods.softDelete = function (deletedBy: string) {
  this.auditDeletedBy = deletedBy;
  this.auditDeletedDateTime = new Date().toISOString();
  return this.save();
};

/**
 * Instance method to check if document is soft deleted
 */
BaseSchema.methods.isDeleted = function () {
  return !!this.auditDeletedDateTime;
};

/**
 * Instance method to restore soft deleted document
 */
BaseSchema.methods.restore = function () {
  this.auditDeletedBy = undefined;
  this.auditDeletedDateTime = undefined;
  return this.save();
};

/**
 * Instance method to update audit fields when document is modified
 */
BaseSchema.methods.updateAudit = function (modifiedBy: string) {
  this.auditModifiedBy = modifiedBy;
  this.auditModifiedDateTime = new Date().toISOString();
  return this;
};

/**
 * Static method to find all non-deleted documents
 */
BaseSchema.statics.findActive = function () {
  return this.find({ auditDeletedDateTime: { $exists: false } });
};

/**
 * Static method to find all soft-deleted documents
 */
BaseSchema.statics.findDeleted = function () {
  return this.find({ auditDeletedDateTime: { $exists: true } });
};

/**
 * Virtual for getting audit info in a structured format
 */
BaseSchema.virtual("auditInfo").get(function () {
  return {
    created: {
      by: this.auditCreatedBy,
      at: this.auditCreatedDateTime,
    },
    modified: this.auditModifiedDateTime
      ? {
          by: this.auditModifiedBy,
          at: this.auditModifiedDateTime,
        }
      : null,
    deleted: this.auditDeletedDateTime
      ? {
          by: this.auditDeletedBy,
          at: this.auditDeletedDateTime,
        }
      : null,
    isDeleted: !!this.auditDeletedDateTime,
  };
});

// Ensure virtual fields are serialized
BaseSchema.set("toJSON", { virtuals: true });
BaseSchema.set("toObject", { virtuals: true });

// Add indexes for audit fields for better query performance
BaseSchema.index({ auditCreatedDateTime: 1 });
BaseSchema.index({ auditCreatedBy: 1 });
BaseSchema.index({ auditModifiedDateTime: 1 });
BaseSchema.index({ auditDeletedDateTime: 1 });

export default BaseSchema;
