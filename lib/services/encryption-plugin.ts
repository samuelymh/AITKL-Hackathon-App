import { Schema, Document } from "mongoose";
import {
  encryptionService,
  encryptionUtils,
  EncryptedField,
} from "./encryption-service";
import { setNestedValue, getNestedValue } from "../utils/encryption-utils";

export type EncryptedFieldType = string | EncryptedField;

export interface EncryptionPluginOptions {
  encryptedFields: string[];
  encryptedPaths?: string[];
}

export interface EncryptionPluginDocument extends Document {
  decryptField(fieldPath: string): Promise<string | null>;
  needsReEncryption(fieldPath: string): boolean;
  reEncryptField(fieldPath: string): Promise<void>;
}

/**
 * Mongoose plugin for automatic field-level encryption
 * Handles transparent encryption/decryption of specified fields
 */
export function encryptionPlugin(
  schema: Schema,
  options: EncryptionPluginOptions,
) {
  const { encryptedFields = [], encryptedPaths = [] } = options;
  const allEncryptedPaths = [...encryptedFields, ...encryptedPaths];

  // Pre-save middleware: Encrypt fields before saving to database
  schema.pre("save", async function (next) {
    try {
      const doc = this;

      // Process regular encrypted fields
      for (const fieldPath of encryptedFields) {
        const currentValue = getNestedValue(doc, fieldPath);

        if (currentValue && typeof currentValue === "string") {
          // Only encrypt if it's a plain string (not already encrypted)
          if (!encryptionUtils.isEncrypted(currentValue)) {
            const encrypted =
              await encryptionService.encryptField(currentValue);
            setNestedValue(doc, fieldPath, encrypted);
          }
        }
      }

      // Process encrypted paths (arrays)
      for (const arrayPath of encryptedPaths) {
        const arrayValue = getNestedValue(doc, arrayPath);

        if (Array.isArray(arrayValue)) {
          const encryptedArray = await Promise.all(
            arrayValue.map(async (item) => {
              if (
                typeof item === "string" &&
                !encryptionUtils.isEncrypted(item)
              ) {
                return await encryptionService.encryptField(item);
              }
              return item;
            }),
          );
          setNestedValue(doc, arrayPath, encryptedArray);
        }
      }

      next();
    } catch (error) {
      next(
        error instanceof Error
          ? error
          : new Error("Encryption failed during save"),
      );
    }
  });

  // Post-find middleware: Decrypt fields after loading from database
  schema.post(["find", "findOne", "findOneAndUpdate"], async function (docs) {
    if (!docs) return;

    const documents = Array.isArray(docs) ? docs : [docs];

    for (const doc of documents) {
      if (!doc) continue;

      try {
        // Process regular encrypted fields
        for (const fieldPath of encryptedFields) {
          const encryptedValue = getNestedValue(doc, fieldPath);

          if (encryptedValue && encryptionUtils.isEncrypted(encryptedValue)) {
            try {
              const decrypted =
                await encryptionService.decryptField(encryptedValue);
              setNestedValue(doc, fieldPath, decrypted);
            } catch (decryptError) {
              // Improved error handling: retain encrypted value instead of throwing
              console.warn(
                `Failed to decrypt field ${fieldPath}:`,
                decryptError,
              );
              // Keep the encrypted value - don't replace with null or throw error
            }
          }
        }

        // Process encrypted paths (arrays)
        for (const arrayPath of encryptedPaths) {
          const arrayValue = getNestedValue(doc, arrayPath);

          if (Array.isArray(arrayValue)) {
            const decryptedArray = await Promise.all(
              arrayValue.map(async (item) => {
                if (encryptionUtils.isEncrypted(item)) {
                  try {
                    return await encryptionService.decryptField(item);
                  } catch (decryptError) {
                    console.warn(
                      `Failed to decrypt array item in ${arrayPath}:`,
                      decryptError,
                    );
                    return item; // Return encrypted value on failure
                  }
                }
                return item;
              }),
            );
            setNestedValue(doc, arrayPath, decryptedArray);
          }
        }
      } catch (error) {
        console.error("Error during field decryption:", error);
        // Continue without throwing to prevent breaking the query
      }
    }
  });

  // Instance methods for manual field operations
  schema.methods.decryptField = async function (
    fieldPath: string,
  ): Promise<string | null> {
    const encryptedValue = getNestedValue(this, fieldPath);

    if (!encryptedValue) return null;

    if (encryptionUtils.isEncrypted(encryptedValue)) {
      return await encryptionService.decryptField(encryptedValue);
    }

    // Already decrypted or plaintext
    return encryptedValue;
  };

  schema.methods.needsReEncryption = function (fieldPath: string): boolean {
    const encryptedValue = getNestedValue(this, fieldPath);

    if (encryptionUtils.isEncrypted(encryptedValue)) {
      return encryptionService.needsReEncryption(encryptedValue);
    }

    return false;
  };

  schema.methods.reEncryptField = async function (
    fieldPath: string,
  ): Promise<void> {
    const encryptedValue = getNestedValue(this, fieldPath);

    if (
      encryptionUtils.isEncrypted(encryptedValue) &&
      this.needsReEncryption(fieldPath)
    ) {
      const reEncrypted =
        await encryptionService.reEncryptField(encryptedValue);
      setNestedValue(this, fieldPath, reEncrypted);
    }
  };

  // Static method for bulk re-encryption (useful for key rotation)
  schema.statics.bulkReEncrypt = async function (
    batchSize: number = 100,
  ): Promise<number> {
    let processed = 0;
    let hasMore = true;

    while (hasMore) {
      const docs = await this.find({}).limit(batchSize).skip(processed);

      if (docs.length === 0) {
        hasMore = false;
        break;
      }

      for (const doc of docs) {
        let needsUpdate = false;

        // Check all encrypted fields for re-encryption needs
        for (const fieldPath of allEncryptedPaths) {
          if (doc.needsReEncryption && doc.needsReEncryption(fieldPath)) {
            await doc.reEncryptField(fieldPath);
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await doc.save();
        }
      }

      processed += docs.length;
    }

    return processed;
  };
}

export default encryptionPlugin;
