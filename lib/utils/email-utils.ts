import { createHash } from "crypto";

/**
 * Creates a searchable hash of an email address for database lookups
 * This allows us to find users by email without storing the email in plain text
 */
export function createSearchableEmailHash(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}
