import { Schema, Document } from "mongoose";
import { encryptionService, encryptionUtils, EncryptedField } from "./encryption-service";

export interface EncryptionOptions {
  encryptedFields: string[];
  encryptedPaths?: string[];
  skipDecryptionOnFind?: boolean;
}

/**
 * Mongoose plugin for automatic field encryption/decryption
 * Supports both flat fields and nested object paths
 */
export function encryptionPlugin(schema: Schema, options: EncryptionOptions) {
  const { encryptedFields, encryptedPaths = [], skipDecryptionOnFind = false } = options;

  // Combine flat fields and paths for processing
  const allEncryptedPaths = [...encryptedFields, ...encryptedPaths];

  /**
   * Get nested value from object using dot notation
   */
  function getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  function setNestedValue(obj: any, path: string, value: any): void {
    const pathArray = path.split(".");
    const lastKey = pathArray.pop()!;
    const target = pathArray.reduce((current, prop) => {
      if (!current[prop]) current[prop] = {};
      return current[prop];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Pre-save middleware: Encrypt specified fields
   */
  schema.pre("save", async function (this: Document) {
    if (!this.isModified()) return;

    const encryptionPromises: Promise<void>[] = [];

    for (const fieldPath of allEncryptedPaths) {
      // Check if this field was modified
      if (this.isModified(fieldPath)) {
        const currentValue = getNestedValue(this.toObject(), fieldPath);

        if (currentValue && typeof currentValue === "string") {
          encryptionPromises.push(
            (async () => {
              try {
                const encrypted = await encryptionUtils.safeEncrypt(currentValue);
                setNestedValue(this, fieldPath, encrypted);
              } catch (error) {
                throw new Error(`Failed to encrypt field ${fieldPath}: ${error}`);
              }
            })()
          );
        }
      }
    }

    // Wait for all encryption operations to complete
    await Promise.all(encryptionPromises);
  });

  /**
   * Pre-update middleware: Encrypt fields in update operations
   */
  schema.pre(["updateOne", "updateMany", "findOneAndUpdate"], async function () {
    const update = this.getUpdate() as any;
    if (!update) return;

    // Handle $set operations
    if (update.$set) {
      await encryptUpdateFields(update.$set);
    }

    // Handle direct field updates
    await encryptUpdateFields(update);

    async function encryptUpdateFields(updateObj: any) {
      const encryptionPromises: Promise<void>[] = [];

      for (const fieldPath of allEncryptedPaths) {
        const value = getNestedValue(updateObj, fieldPath);

        if (value && typeof value === "string") {
          encryptionPromises.push(
            (async () => {
              try {
                const encrypted = await encryptionUtils.safeEncrypt(value);
                setNestedValue(updateObj, fieldPath, encrypted);
              } catch (error) {
                throw new Error(`Failed to encrypt field ${fieldPath} in update: ${error}`);
              }
            })()
          );
        }
      }

      await Promise.all(encryptionPromises);
    }
  });

  /**
   * Post-find middleware: Decrypt specified fields
   * Handles single documents and arrays
   */
  if (!skipDecryptionOnFind) {
    schema.post(["find", "findOne", "findOneAndUpdate"], async function (docs: Document | Document[] | null) {
      if (!docs) return;

      const docsArray = Array.isArray(docs) ? docs : [docs];

      const decryptionPromises: Promise<void>[] = [];

      for (const doc of docsArray) {
        if (!doc) continue;

        for (const fieldPath of allEncryptedPaths) {
          const encryptedValue = getNestedValue(doc.toObject(), fieldPath);

          if (encryptionUtils.isEncrypted(encryptedValue)) {
            decryptionPromises.push(
              (async () => {
                try {
                  const decrypted = await encryptionService.decryptField(encryptedValue);
                  setNestedValue(doc, fieldPath, decrypted);
                } catch (error) {
                  console.error(`Failed to decrypt field ${fieldPath}:`, error);
                  // Don't throw error to prevent app crashes, but log the issue
                  setNestedValue(doc, fieldPath, "[DECRYPTION_ERROR]");
                }
              })()
            );
          }
        }
      }

      await Promise.all(decryptionPromises);
    });
  }

  /**
   * Instance method: Decrypt specific field manually
   */
  schema.methods.decryptField = async function (fieldPath: string): Promise<string | null> {
    const encryptedValue = getNestedValue(this.toObject(), fieldPath);

    if (!encryptionUtils.isEncrypted(encryptedValue)) {
      return encryptedValue || null;
    }

    try {
      return await encryptionService.decryptField(encryptedValue);
    } catch (error) {
      console.error(`Failed to decrypt field ${fieldPath}:`, error);
      return null;
    }
  };

  /**
   * Instance method: Check if field needs re-encryption
   */
  schema.methods.needsReEncryption = function (fieldPath: string): boolean {
    const encryptedValue = getNestedValue(this.toObject(), fieldPath);

    if (!encryptionUtils.isEncrypted(encryptedValue)) {
      return false;
    }

    return encryptionService.needsReEncryption(encryptedValue);
  };

  /**
   * Instance method: Re-encrypt field with latest key
   */
  schema.methods.reEncryptField = async function (fieldPath: string): Promise<void> {
    const encryptedValue = getNestedValue(this.toObject(), fieldPath);

    if (!encryptionUtils.isEncrypted(encryptedValue)) {
      throw new Error(`Field ${fieldPath} is not encrypted`);
    }

    try {
      const reEncrypted = await encryptionService.reEncryptField(encryptedValue);
      setNestedValue(this, fieldPath, reEncrypted);
      await this.save();
    } catch (error) {
      throw new Error(`Failed to re-encrypt field ${fieldPath}: ${error}`);
    }
  };

  /**
   * Static method: Bulk re-encryption for key rotation
   */
  schema.statics.bulkReEncrypt = async function (batchSize: number = 100): Promise<number> {
    let processedCount = 0;
    let hasMore = true;

    while (hasMore) {
      const docs = await this.find({}).limit(batchSize).lean();

      if (docs.length === 0) {
        hasMore = false;
        break;
      }

      const updatePromises: Promise<void>[] = [];

      for (const doc of docs) {
        let needsUpdate = false;
        const updates: any = {};

        for (const fieldPath of allEncryptedPaths) {
          const encryptedValue = getNestedValue(doc, fieldPath);

          if (encryptionUtils.isEncrypted(encryptedValue) && encryptionService.needsReEncryption(encryptedValue)) {
            needsUpdate = true;

            updatePromises.push(
              (async () => {
                try {
                  const reEncrypted = await encryptionService.reEncryptField(encryptedValue);
                  setNestedValue(updates, fieldPath, reEncrypted);
                } catch (error) {
                  console.error(`Failed to re-encrypt ${fieldPath} for doc ${doc._id}:`, error);
                }
              })()
            );
          }
        }

        if (needsUpdate) {
          await Promise.all(updatePromises);
          await this.updateOne({ _id: doc._id }, { $set: updates });
          processedCount++;
        }
      }

      if (docs.length < batchSize) {
        hasMore = false;
      }
    }

    return processedCount;
  };
}

// Export type for encrypted fields in schemas
export type EncryptedFieldType = EncryptedField | string;
