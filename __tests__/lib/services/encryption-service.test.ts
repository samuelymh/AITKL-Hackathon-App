import { encryptionService, encryptionUtils } from "../../../lib/services/encryption-service";

// Mock environment variables for testing
const originalEnv = process.env;

beforeAll(() => {
  process.env = {
    ...originalEnv,
    ENCRYPTION_MASTER_KEY: "test-master-key-32-characters-!!",
    ENCRYPTION_SALT: "test-salt-for-key-derivation",
    CURRENT_KEY_VERSION: "1",
    KEY_ROTATION_ENABLED: "false",
    NODE_ENV: "test",
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe("EncryptionService", () => {
  const testData = {
    plaintext: "John Doe",
    sensitiveData: "john.doe@example.com",
    medicalInfo: "Allergic to penicillin",
  };

  describe("Field Encryption and Decryption", () => {
    test("should encrypt a string field", async () => {
      const encrypted = await encryptionService.encryptField(testData.plaintext);

      expect(encrypted).toHaveProperty("data");
      expect(encrypted).toHaveProperty("iv");
      expect(encrypted).toHaveProperty("keyVersion");
      expect(encrypted).toHaveProperty("algorithm");
      expect(encrypted.keyVersion).toBe(1);
      expect(encrypted.algorithm).toBe("aes-256-gcm");
      expect(encrypted.data).not.toBe(testData.plaintext);
    });

    test("should decrypt an encrypted field back to original", async () => {
      const encrypted = await encryptionService.encryptField(testData.plaintext);
      const decrypted = await encryptionService.decryptField(encrypted);

      expect(decrypted).toBe(testData.plaintext);
    });

    test("should handle email encryption/decryption", async () => {
      const encrypted = await encryptionService.encryptField(testData.sensitiveData);
      const decrypted = await encryptionService.decryptField(encrypted);

      expect(decrypted).toBe(testData.sensitiveData);
      expect(encrypted.data).not.toContain("@");
    });

    test("should handle medical information encryption", async () => {
      const encrypted = await encryptionService.encryptField(testData.medicalInfo);
      const decrypted = await encryptionService.decryptField(encrypted);

      expect(decrypted).toBe(testData.medicalInfo);
      expect(encrypted.data).not.toContain("penicillin");
    });

    test("should produce different encrypted values for same input (due to random IV)", async () => {
      const encrypted1 = await encryptionService.encryptField(testData.plaintext);
      const encrypted2 = await encryptionService.encryptField(testData.plaintext);

      expect(encrypted1.data).not.toBe(encrypted2.data);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);

      const decrypted1 = await encryptionService.decryptField(encrypted1);
      const decrypted2 = await encryptionService.decryptField(encrypted2);

      expect(decrypted1).toBe(testData.plaintext);
      expect(decrypted2).toBe(testData.plaintext);
    });
  });

  describe("Batch Operations", () => {
    test("should encrypt multiple fields", async () => {
      const fields = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };

      const encrypted = await encryptionService.encryptFields(fields);

      expect(Object.keys(encrypted)).toEqual(["firstName", "lastName", "email"]);
      expect(encrypted.firstName).toHaveProperty("data");
      expect(encrypted.lastName).toHaveProperty("data");
      expect(encrypted.email).toHaveProperty("data");
    });

    test("should decrypt multiple fields", async () => {
      const fields = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };

      const encrypted = await encryptionService.encryptFields(fields);
      const decrypted = await encryptionService.decryptFields(encrypted);

      expect(decrypted).toEqual(fields);
    });

    test("should handle empty fields gracefully", async () => {
      const fields = {
        firstName: "John",
        lastName: "",
        email: "john@example.com",
      };

      const encrypted = await encryptionService.encryptFields(fields);

      expect(encrypted).toHaveProperty("firstName");
      expect(encrypted).not.toHaveProperty("lastName"); // Empty string should be skipped
      expect(encrypted).toHaveProperty("email");
    });
  });

  describe("Error Handling", () => {
    test("should throw error for empty plaintext", async () => {
      await expect(encryptionService.encryptField("")).rejects.toThrow("Invalid input");
      await expect(encryptionService.encryptField(null as any)).rejects.toThrow("Invalid input");
      await expect(encryptionService.encryptField(undefined as any)).rejects.toThrow("Invalid input");
    });

    test("should throw error for invalid encrypted field", async () => {
      const invalidField = {
        data: "invalid",
        iv: "invalid",
        keyVersion: 1,
        algorithm: "aes-256-gcm",
      };

      await expect(encryptionService.decryptField(invalidField)).rejects.toThrow();
    });

    test("should throw error for missing auth tag", async () => {
      const invalidField = {
        data: "no-auth-tag",
        iv: "1234567890abcdef1234567890abcdef",
        keyVersion: 1,
        algorithm: "aes-256-gcm",
      };

      await expect(encryptionService.decryptField(invalidField)).rejects.toThrow("missing auth tag");
    });
  });

  describe("Key Management", () => {
    test("should get encryption metadata", () => {
      const metadata = encryptionService.getEncryptionMetadata();

      expect(metadata).toHaveProperty("algorithm");
      expect(metadata).toHaveProperty("keyVersion");
      expect(metadata).toHaveProperty("keyRotationEnabled");
      expect(metadata.algorithm).toBe("aes-256-gcm");
      expect(metadata.keyVersion).toBe(1);
    });

    test("should check if field needs re-encryption", async () => {
      const encrypted = await encryptionService.encryptField(testData.plaintext);

      // With same key version, should not need re-encryption
      expect(encryptionService.needsReEncryption(encrypted)).toBe(false);

      // Simulate older key version
      const olderEncrypted = { ...encrypted, keyVersion: 0 };
      expect(encryptionService.needsReEncryption(olderEncrypted)).toBe(false); // rotation disabled
    });
  });

  describe("EncryptionUtils", () => {
    test("should identify encrypted values", async () => {
      const plaintext = "test string";
      const encrypted = await encryptionService.encryptField(plaintext);

      expect(encryptionUtils.isEncrypted(plaintext)).toBe(false);
      expect(encryptionUtils.isEncrypted(encrypted)).toBe(true);
      expect(encryptionUtils.isEncrypted(null)).toBe(false);
      expect(encryptionUtils.isEncrypted(undefined)).toBe(false);
      expect(encryptionUtils.isEncrypted({})).toBe(false);
    });

    test("should safely encrypt already encrypted values", async () => {
      const plaintext = "test string";
      const encrypted = await encryptionService.encryptField(plaintext);

      // Should return the same encrypted value if already encrypted
      const safeEncrypted = await encryptionUtils.safeEncrypt(encrypted);
      expect(safeEncrypted).toEqual(encrypted);

      // Should encrypt if plaintext
      const safeEncrypted2 = await encryptionUtils.safeEncrypt(plaintext);
      expect(encryptionUtils.isEncrypted(safeEncrypted2)).toBe(true);
    });

    test("should safely decrypt mixed values", async () => {
      const plaintext = "test string";
      const encrypted = await encryptionService.encryptField(plaintext);

      // Should decrypt encrypted values
      const decrypted1 = await encryptionUtils.safeDecrypt(encrypted);
      expect(decrypted1).toBe(plaintext);

      // Should return plaintext as-is
      const decrypted2 = await encryptionUtils.safeDecrypt(plaintext);
      expect(decrypted2).toBe(plaintext);
    });
  });

  describe("Healthcare-Specific Scenarios", () => {
    test("should handle patient name encryption", async () => {
      const patientNames = ["John Doe", "María García", "李小明", "محمد أحمد"];

      for (const name of patientNames) {
        const encrypted = await encryptionService.encryptField(name);
        const decrypted = await encryptionService.decryptField(encrypted);
        expect(decrypted).toBe(name);
      }
    });

    test("should handle medical allergy information", async () => {
      const allergies = ["Penicillin", "Tree nuts", "Shellfish", "Latex", "Sulfa drugs"];

      const encryptedAllergies = await encryptionService.encryptFields(
        allergies.reduce(
          (acc, allergy, index) => {
            acc[`allergy_${index}`] = allergy;
            return acc;
          },
          {} as Record<string, string>
        )
      );

      const decryptedAllergies = await encryptionService.decryptFields(encryptedAllergies);

      Object.values(decryptedAllergies).forEach((allergy, index) => {
        expect(allergy).toBe(allergies[index]);
      });
    });

    test("should handle emergency contact information", async () => {
      const emergencyContact = {
        name: "Jane Doe",
        phone: "+1-555-123-4567",
        relationship: "Spouse",
      };

      const encrypted = await encryptionService.encryptFields({
        name: emergencyContact.name,
        phone: emergencyContact.phone,
      });

      const decrypted = await encryptionService.decryptFields(encrypted);

      expect(decrypted.name).toBe(emergencyContact.name);
      expect(decrypted.phone).toBe(emergencyContact.phone);
    });
  });

  describe("Performance", () => {
    test("should handle concurrent encryption operations", async () => {
      const testValues = Array.from({ length: 10 }, (_, i) => `test-value-${i}`);

      const encryptionPromises = testValues.map((value) => encryptionService.encryptField(value));

      const encrypted = await Promise.all(encryptionPromises);

      expect(encrypted).toHaveLength(10);
      encrypted.forEach((enc: any, index: number) => {
        expect(enc).toHaveProperty("data");
        expect(enc.keyVersion).toBe(1);
      });

      const decryptionPromises = encrypted.map((enc: any) => encryptionService.decryptField(enc));

      const decrypted = await Promise.all(decryptionPromises);

      decrypted.forEach((dec: string, index: number) => {
        expect(dec).toBe(testValues[index]);
      });
    });

    test("should maintain performance for batch operations", async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        [`field_${i}`]: `value_${i}_with_some_longer_content_to_test_performance`,
      })).reduce((acc, obj) => ({ ...acc, ...obj }), {});

      const startTime = Date.now();
      const encrypted = await encryptionService.encryptFields(largeDataset);
      const encryptionTime = Date.now() - startTime;

      const decryptStartTime = Date.now();
      const decrypted = await encryptionService.decryptFields(encrypted);
      const decryptionTime = Date.now() - decryptStartTime;

      expect(Object.keys(encrypted)).toHaveLength(100);
      expect(Object.keys(decrypted)).toHaveLength(100);

      // Performance check - should complete within reasonable time
      expect(encryptionTime).toBeLessThan(5000); // 5 seconds
      expect(decryptionTime).toBeLessThan(5000); // 5 seconds
    });
  });
});
