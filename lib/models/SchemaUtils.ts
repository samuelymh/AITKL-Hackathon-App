import { Schema, SchemaDefinition, SchemaOptions } from "mongoose";
import BaseSchema from "./BaseSchema";
import { getCurrentUserId } from "@/lib/auth";

/**
 * Utility function to create a schema that extends the BaseSchema
 * @param definition - The schema definition for the specific model
 * @param options - Additional schema options
 * @returns A new schema that includes base audit fields
 */
export function createExtendedSchema(definition: SchemaDefinition, options: SchemaOptions = {}): Schema {
  // Create a new schema with the provided definition
  const extendedSchema = new Schema(definition, {
    timestamps: false, // We handle our own audit fields
    versionKey: false,
    ...options,
  });

  // Add the base schema fields to the extended schema
  extendedSchema.add(BaseSchema);

  return extendedSchema;
}

/**
 * Helper function to set audit fields when creating or updating documents
 */
export class AuditHelper {
  /**
   * Set audit fields for a new document
   */
  static setCreatedAudit(doc: any, createdBy: string): void {
    doc.auditCreatedBy = createdBy;
    doc.auditCreatedDateTime = new Date().toISOString();
  }

  /**
   * Set audit fields for an updated document
   */
  static setModifiedAudit(doc: any, modifiedBy: string): void {
    doc.auditModifiedBy = modifiedBy;
    doc.auditModifiedDateTime = new Date().toISOString();
  }

  /**
   * Set audit fields for a deleted document (soft delete)
   */
  static setDeletedAudit(doc: any, deletedBy: string): void {
    doc.auditDeletedBy = deletedBy;
    doc.auditDeletedDateTime = new Date().toISOString();
  }

  /**
   * Clear deleted audit fields (restore)
   */
  static clearDeletedAudit(doc: any): void {
    doc.auditDeletedBy = undefined;
    doc.auditDeletedDateTime = undefined;
  }

  /**
   * Get current user ID from context (should be implemented based on your auth system)
   * This is a placeholder implementation
   */
  static getCurrentUserId(context?: any): string {
    // If context contains a request object, try to extract user ID from it
    if (context?.request) {
      const authHeader = context.request.headers.get?.("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const token = authHeader.split(" ")[1];
          // In a real implementation, you'd verify the JWT here
          // For now, return the context user ID or fallback
          return context.userId || "authenticated-user";
        } catch (error) {
          console.error("Token verification failed:", error);
          return "anonymous";
        }
      }
    }

    // Fallback to context properties or default
    return context?.userId || context?.user?._id || "system";
  }

  /**
   * Apply audit fields based on operation type
   */
  static applyAudit(doc: any, operation: "create" | "update" | "delete" | "restore", userId?: string): void {
    const currentUserId = userId || this.getCurrentUserId();

    switch (operation) {
      case "create":
        this.setCreatedAudit(doc, currentUserId);
        break;
      case "update":
        this.setModifiedAudit(doc, currentUserId);
        break;
      case "delete":
        this.setDeletedAudit(doc, currentUserId);
        break;
      case "restore":
        this.clearDeletedAudit(doc);
        this.setModifiedAudit(doc, currentUserId);
        break;
    }
  }
}

/**
 * Middleware factory for automatic audit field management
 */
export function createAuditMiddleware(getUserId?: () => string) {
  return {
    /**
     * Pre-save middleware for handling audit fields
     */
    preSave: function (this: any, next: () => void) {
      const userId = getUserId?.() || AuditHelper.getCurrentUserId();

      if (this.isNew) {
        AuditHelper.setCreatedAudit(this, userId);
      } else if (this.isModified() && !this.auditDeletedDateTime) {
        AuditHelper.setModifiedAudit(this, userId);
      }

      next();
    },

    /**
     * Pre-update middleware for handling audit fields
     */
    preUpdate: function (this: any, next: () => void) {
      const userId = getUserId?.() || AuditHelper.getCurrentUserId();

      this.set({
        auditModifiedBy: userId,
        auditModifiedDateTime: new Date().toISOString(),
      });

      next();
    },

    /**
     * Pre-findOneAndUpdate middleware for handling audit fields
     */
    preFindOneAndUpdate: function (this: any, next: () => void) {
      const userId = getUserId?.() || AuditHelper.getCurrentUserId();

      this.set({
        auditModifiedBy: userId,
        auditModifiedDateTime: new Date().toISOString(),
      });

      next();
    },
  };
}

export default createExtendedSchema;
