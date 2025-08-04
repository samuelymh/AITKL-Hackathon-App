import { connect, disconnect } from "mongoose";
import User from "../models/User";
import { encryptionService, encryptionUtils } from "./encryption-service";

export interface MigrationResult {
  totalProcessed: number;
  successfullyMigrated: number;
  errors: Array<{ userId: string; error: string }>;
  skipped: number;
}

export interface MigrationOptions {
  batchSize?: number;
  dryRun?: boolean;
  forceReEncrypt?: boolean;
  fields?: string[];
}

/**
 * Migration utility for encrypting existing user data
 * Handles the transition from plaintext to encrypted fields
 */
export class EncryptionMigration {
  private static readonly DEFAULT_BATCH_SIZE = 100;
  private static readonly ENCRYPTED_FIELDS = [
    "personalInfo.firstName",
    "personalInfo.lastName",
    "personalInfo.contact.email",
    "personalInfo.contact.phone",
    "medicalInfo.emergencyContact.name",
    "medicalInfo.emergencyContact.phone",
  ];

  /**
   * Migrate user data from plaintext to encrypted format
   */
  public static async migrateUserData(options: MigrationOptions = {}): Promise<MigrationResult> {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      dryRun = false,
      forceReEncrypt = false,
      fields = this.ENCRYPTED_FIELDS,
    } = options;

    const result: MigrationResult = {
      totalProcessed: 0,
      successfullyMigrated: 0,
      errors: [],
      skipped: 0,
    };

    console.log(`Starting user data encryption migration...`);
    console.log(`Batch size: ${batchSize}, Dry run: ${dryRun}, Force re-encrypt: ${forceReEncrypt}`);

    try {
      let hasMore = true;
      let skip = 0;

      while (hasMore) {
        // Fetch users in batches
        const users = await User.find({}).skip(skip).limit(batchSize).lean();

        if (users.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`Processing batch: ${skip} - ${skip + users.length}`);

        for (const user of users) {
          result.totalProcessed++;

          try {
            const updates: any = {};
            let needsUpdate = false;

            // Check each field for migration
            for (const fieldPath of fields) {
              const currentValue = this.getNestedValue(user, fieldPath);

              if (!currentValue) continue;

              // Skip if already encrypted and not forcing re-encryption
              if (encryptionUtils.isEncrypted(currentValue) && !forceReEncrypt) {
                continue;
              }

              // Skip if it's not a string (unexpected data type)
              if (!encryptionUtils.isEncrypted(currentValue) && typeof currentValue !== "string") {
                console.warn(`Field ${fieldPath} for user ${user._id} is not a string: ${typeof currentValue}`);
                continue;
              }

              needsUpdate = true;

              if (!dryRun) {
                try {
                  let encryptedValue;

                  if (encryptionUtils.isEncrypted(currentValue)) {
                    // Re-encrypt if forced
                    encryptedValue = await encryptionService.reEncryptField(currentValue);
                  } else {
                    // Encrypt plaintext
                    encryptedValue = await encryptionService.encryptField(currentValue);
                  }

                  this.setNestedValue(updates, fieldPath, encryptedValue);
                } catch (error) {
                  console.error(`Failed to encrypt field ${fieldPath} for user ${user._id}:`, error);
                  result.errors.push({
                    userId: user._id.toString(),
                    error: `Failed to encrypt ${fieldPath}: ${error}`,
                  });
                  needsUpdate = false;
                  break;
                }
              }
            }

            if (needsUpdate) {
              if (!dryRun) {
                // Update the user in database
                await User.updateOne(
                  { _id: user._id },
                  { $set: updates },
                  { runValidators: false } // Skip validation for encrypted data
                );
              }

              result.successfullyMigrated++;
              console.log(`${dryRun ? "[DRY RUN] " : ""}Migrated user: ${user._id}`);
            } else {
              result.skipped++;
            }
          } catch (error) {
            result.errors.push({
              userId: user._id.toString(),
              error: `Migration failed: ${error}`,
            });
            console.error(`Failed to migrate user ${user._id}:`, error);
          }
        }

        skip += batchSize;

        if (users.length < batchSize) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }

    console.log("\nMigration completed:");
    console.log(`Total processed: ${result.totalProcessed}`);
    console.log(`Successfully migrated: ${result.successfullyMigrated}`);
    console.log(`Skipped: ${result.skipped}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log("\nErrors encountered:");
      result.errors.forEach((error) => {
        console.log(`  - User ${error.userId}: ${error.error}`);
      });
    }

    return result;
  }

  /**
   * Verify migration integrity by checking encrypted data can be decrypted
   */
  public static async verifyMigration(options: { batchSize?: number } = {}): Promise<{
    totalChecked: number;
    successful: number;
    failed: Array<{ userId: string; field: string; error: string }>;
  }> {
    const { batchSize = this.DEFAULT_BATCH_SIZE } = options;

    const result = {
      totalChecked: 0,
      successful: 0,
      failed: [] as Array<{ userId: string; field: string; error: string }>,
    };

    console.log("Starting migration verification...");

    let hasMore = true;
    let skip = 0;

    while (hasMore) {
      const users = await User.find({}).skip(skip).limit(batchSize).lean();

      if (users.length === 0) {
        hasMore = false;
        break;
      }

      for (const user of users) {
        for (const fieldPath of this.ENCRYPTED_FIELDS) {
          const encryptedValue = this.getNestedValue(user, fieldPath);

          if (!encryptedValue) continue;

          result.totalChecked++;

          if (encryptionUtils.isEncrypted(encryptedValue)) {
            try {
              await encryptionService.decryptField(encryptedValue);
              result.successful++;
            } catch (error) {
              result.failed.push({
                userId: user._id.toString(),
                field: fieldPath,
                error: `Decryption failed: ${error}`,
              });
            }
          } else {
            result.failed.push({
              userId: user._id.toString(),
              field: fieldPath,
              error: "Field is not encrypted",
            });
          }
        }
      }

      skip += batchSize;

      if (users.length < batchSize) {
        hasMore = false;
      }
    }

    console.log("\nVerification completed:");
    console.log(`Total checked: ${result.totalChecked}`);
    console.log(`Successful: ${result.successful}`);
    console.log(`Failed: ${result.failed.length}`);

    return result;
  }

  /**
   * Rollback migration (decrypt all encrypted fields back to plaintext)
   * WARNING: This should only be used in development/testing
   */
  public static async rollbackMigration(options: MigrationOptions = {}): Promise<MigrationResult> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Rollback is not allowed in production environment");
    }

    const { batchSize = this.DEFAULT_BATCH_SIZE, dryRun = false, fields = this.ENCRYPTED_FIELDS } = options;

    const result: MigrationResult = {
      totalProcessed: 0,
      successfullyMigrated: 0,
      errors: [],
      skipped: 0,
    };

    console.log("Starting rollback migration (decrypt to plaintext)...");

    let hasMore = true;
    let skip = 0;

    while (hasMore) {
      const users = await User.find({}).skip(skip).limit(batchSize).lean();

      if (users.length === 0) {
        hasMore = false;
        break;
      }

      for (const user of users) {
        result.totalProcessed++;

        try {
          const updates: any = {};
          let needsUpdate = false;

          for (const fieldPath of fields) {
            const encryptedValue = this.getNestedValue(user, fieldPath);

            if (!encryptedValue) continue;

            if (encryptionUtils.isEncrypted(encryptedValue)) {
              needsUpdate = true;

              if (!dryRun) {
                try {
                  const decryptedValue = await encryptionService.decryptField(encryptedValue);
                  this.setNestedValue(updates, fieldPath, decryptedValue);
                } catch (error) {
                  result.errors.push({
                    userId: user._id.toString(),
                    error: `Failed to decrypt ${fieldPath}: ${error}`,
                  });
                  needsUpdate = false;
                  break;
                }
              }
            }
          }

          if (needsUpdate) {
            if (!dryRun) {
              await User.updateOne({ _id: user._id }, { $set: updates });
            }

            result.successfullyMigrated++;
          } else {
            result.skipped++;
          }
        } catch (error) {
          result.errors.push({
            userId: user._id.toString(),
            error: `Rollback failed: ${error}`,
          });
        }
      }

      skip += batchSize;

      if (users.length < batchSize) {
        hasMore = false;
      }
    }

    console.log("Rollback completed:");
    console.log(`Total processed: ${result.totalProcessed}`);
    console.log(`Successfully rolled back: ${result.successfullyMigrated}`);
    console.log(`Skipped: ${result.skipped}`);
    console.log(`Errors: ${result.errors.length}`);

    return result;
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, prop) => current?.[prop], obj);
  }

  private static setNestedValue(obj: any, path: string, value: any): void {
    const pathArray = path.split(".");
    const lastKey = pathArray.pop()!;
    const target = pathArray.reduce((current, prop) => {
      if (!current[prop]) current[prop] = {};
      return current[prop];
    }, obj);
    target[lastKey] = value;
  }
}

/**
 * CLI utility function for running migrations
 */
export async function runMigration(command: string, options: MigrationOptions = {}): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI environment variable is required");
  }

  try {
    await connect(mongoUri);
    console.log("Connected to database");

    switch (command) {
      case "migrate":
        await EncryptionMigration.migrateUserData(options);
        break;
      case "verify":
        await EncryptionMigration.verifyMigration(options);
        break;
      case "rollback":
        await EncryptionMigration.rollbackMigration(options);
        break;
      default:
        throw new Error(`Unknown command: ${command}. Available: migrate, verify, rollback`);
    }
  } finally {
    await disconnect();
    console.log("Disconnected from database");
  }
}

// Export for use in tests and scripts
export default EncryptionMigration;
