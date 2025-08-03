import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export interface EncryptionConfig {
  algorithm: string;
  keyDerivationSalt: string;
  masterKey: string;
  keyRotationEnabled: boolean;
  keyVersion: number;
}

export interface EncryptedField {
  data: string;
  iv: string;
  keyVersion: number;
  algorithm: string;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private readonly config: EncryptionConfig;
  private readonly derivedKeys: Map<number, Buffer> = new Map();

  private constructor() {
    this.config = {
      algorithm: "aes-256-gcm",
      keyDerivationSalt: process.env.ENCRYPTION_SALT || "default-salt-change-in-production",
      masterKey: process.env.ENCRYPTION_MASTER_KEY || "default-key-change-in-production-must-be-32-chars-long",
      keyRotationEnabled: process.env.KEY_ROTATION_ENABLED === "true",
      keyVersion: parseInt(process.env.CURRENT_KEY_VERSION || "1"),
    };

    if (
      process.env.NODE_ENV === "production" &&
      (this.config.masterKey.includes("default") || this.config.keyDerivationSalt.includes("default"))
    ) {
      throw new Error("Production encryption keys must be properly configured");
    }
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Derive encryption key for a specific version
   * Uses PBKDF2-like key derivation for security
   */
  private async deriveKey(keyVersion: number): Promise<Buffer> {
    if (this.derivedKeys.has(keyVersion)) {
      return this.derivedKeys.get(keyVersion)!;
    }

    const keyMaterial = `${this.config.masterKey}-v${keyVersion}`;
    const derivedKey = (await scryptAsync(keyMaterial, this.config.keyDerivationSalt, 32)) as Buffer;

    this.derivedKeys.set(keyVersion, derivedKey);
    return derivedKey;
  }

  /**
   * Encrypt a string value
   * Returns an object containing encrypted data, IV, and metadata
   */
  public async encryptField(plaintext: string): Promise<EncryptedField> {
    if (!plaintext || typeof plaintext !== "string") {
      throw new Error("Invalid input: plaintext must be a non-empty string");
    }

    const keyVersion = this.config.keyVersion;
    const key = await this.deriveKey(keyVersion);
    const iv = randomBytes(16); // 128-bit IV for AES

    const cipher = createCipheriv(this.config.algorithm, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get the authentication tag for GCM mode
    const authTag = (cipher as any).getAuthTag();

    return {
      data: encrypted + ":" + authTag.toString("hex"),
      iv: iv.toString("hex"),
      keyVersion,
      algorithm: this.config.algorithm,
    };
  }

  /**
   * Decrypt an encrypted field
   * Handles key version compatibility for rotation
   */
  public async decryptField(encryptedField: EncryptedField): Promise<string> {
    if (!encryptedField?.data || !encryptedField.iv) {
      throw new Error("Invalid encrypted field format");
    }

    const key = await this.deriveKey(encryptedField.keyVersion);
    const iv = Buffer.from(encryptedField.iv, "hex");

    // Split encrypted data and auth tag
    const [encryptedData, authTagHex] = encryptedField.data.split(":");
    if (!authTagHex) {
      throw new Error("Invalid encrypted data format: missing auth tag");
    }

    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = createDecipheriv(encryptedField.algorithm, key, iv);
    (decipher as any).setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Encrypt multiple fields in a batch operation
   * More efficient for encrypting entire documents
   */
  public async encryptFields(fields: Record<string, string>): Promise<Record<string, EncryptedField>> {
    const encrypted: Record<string, EncryptedField> = {};

    for (const [fieldName, value] of Object.entries(fields)) {
      if (value && typeof value === "string") {
        encrypted[fieldName] = await this.encryptField(value);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt multiple fields in a batch operation
   */
  public async decryptFields(encryptedFields: Record<string, EncryptedField>): Promise<Record<string, string>> {
    const decrypted: Record<string, string> = {};

    for (const [fieldName, encryptedField] of Object.entries(encryptedFields)) {
      if (encryptedField && typeof encryptedField === "object") {
        decrypted[fieldName] = await this.decryptField(encryptedField);
      }
    }

    return decrypted;
  }

  /**
   * Check if a field needs re-encryption (key rotation)
   */
  public needsReEncryption(encryptedField: EncryptedField): boolean {
    return this.config.keyRotationEnabled && encryptedField.keyVersion < this.config.keyVersion;
  }

  /**
   * Re-encrypt a field with the current key version
   */
  public async reEncryptField(encryptedField: EncryptedField): Promise<EncryptedField> {
    const decrypted = await this.decryptField(encryptedField);
    return await this.encryptField(decrypted);
  }

  /**
   * Get current encryption metadata
   */
  public getEncryptionMetadata() {
    return {
      algorithm: this.config.algorithm,
      keyVersion: this.config.keyVersion,
      keyRotationEnabled: this.config.keyRotationEnabled,
    };
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();

// Utility functions for common encryption patterns
export const encryptionUtils = {
  /**
   * Check if a value is encrypted (has the encrypted field structure)
   */
  isEncrypted(value: any): value is EncryptedField {
    return !!(
      value &&
      typeof value === "object" &&
      "data" in value &&
      "iv" in value &&
      "keyVersion" in value &&
      "algorithm" in value
    );
  },

  /**
   * Safely encrypt a field that might already be encrypted
   */
  async safeEncrypt(value: string | EncryptedField): Promise<EncryptedField> {
    if (encryptionUtils.isEncrypted(value)) {
      // Check if re-encryption is needed
      if (encryptionService.needsReEncryption(value)) {
        return await encryptionService.reEncryptField(value);
      }
      return value;
    }
    return await encryptionService.encryptField(value);
  },

  /**
   * Safely decrypt a field that might be plaintext (for migration scenarios)
   */
  async safeDecrypt(value: string | EncryptedField): Promise<string> {
    if (encryptionUtils.isEncrypted(value)) {
      return await encryptionService.decryptField(value);
    }
    // Assume it's already plaintext (for backward compatibility)
    return value;
  },
};
