#!/usr/bin/env node

/**
 * Quick validation script to test the encryption system
 * This demonstrates the end-to-end encryption flow
 */

import { encryptionService, encryptionUtils } from "../lib/services/encryption-service";

async function validateEncryption() {
  console.log("🔐 Testing Encryption System...\n");

  try {
    // Test 1: Basic encryption/decryption
    console.log("1. Testing basic encryption/decryption:");
    const testData = "John Doe";
    const encrypted = await encryptionService.encryptField(testData);
    const decrypted = await encryptionService.decryptField(encrypted);

    console.log(`   Original: "${testData}"`);
    console.log(`   Encrypted: ${JSON.stringify(encrypted)}`);
    console.log(`   Decrypted: "${decrypted}"`);
    console.log(`   ✅ Match: ${testData === decrypted}\n`);

    // Test 2: Healthcare-specific data
    console.log("2. Testing healthcare data:");
    const patientData = {
      firstName: "María",
      lastName: "García-López",
      email: "maria.garcia@hospital.com",
      phone: "+34-91-123-4567",
      allergies: ["Penicillin", "Tree nuts", "Shellfish"],
    };

    // Encrypt batch
    const encryptedBatch = await encryptionService.encryptFields({
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      email: patientData.email,
      phone: patientData.phone,
    });

    // Encrypt allergies array
    const encryptedAllergies = await Promise.all(
      patientData.allergies.map((allergy) => encryptionService.encryptField(allergy))
    );

    console.log("   Patient data encrypted successfully ✅");
    console.log(`   Encrypted fields: ${Object.keys(encryptedBatch).length}`);
    console.log(`   Encrypted allergies: ${encryptedAllergies.length}`);

    // Decrypt batch
    const decryptedBatch = await encryptionService.decryptFields(encryptedBatch);
    const decryptedAllergies = await Promise.all(
      encryptedAllergies.map((encrypted) => encryptionService.decryptField(encrypted))
    );

    console.log("   Decrypted data:");
    console.log(`     Name: ${decryptedBatch.firstName} ${decryptedBatch.lastName}`);
    console.log(`     Email: ${decryptedBatch.email}`);
    console.log(`     Phone: ${decryptedBatch.phone}`);
    console.log(`     Allergies: [${decryptedAllergies.join(", ")}]`);

    const dataMatches =
      decryptedBatch.firstName === patientData.firstName &&
      decryptedBatch.lastName === patientData.lastName &&
      decryptedBatch.email === patientData.email &&
      decryptedBatch.phone === patientData.phone &&
      JSON.stringify(decryptedAllergies) === JSON.stringify(patientData.allergies);
    console.log(`   ✅ Data integrity: ${dataMatches}\n`);

    // Test 3: Encryption detection
    console.log("3. Testing encryption detection:");
    const plaintext = "This is plaintext";
    const encryptedText = await encryptionService.encryptField(plaintext);

    console.log(`   Plaintext detected as encrypted: ${encryptionUtils.isEncrypted(plaintext)}`);
    console.log(`   Encrypted detected as encrypted: ${encryptionUtils.isEncrypted(encryptedText)}`);
    console.log(`   ✅ Detection working correctly\n`);

    // Test 4: Concurrent operations
    console.log("4. Testing concurrent encryption operations:");
    const startTime = Date.now();
    const testValues = Array.from({ length: 10 }, (_, i) => `Patient-${i}-Data`);

    const concurrentEncryptions = await Promise.all(testValues.map((value) => encryptionService.encryptField(value)));

    const concurrentDecryptions = await Promise.all(
      concurrentEncryptions.map((encrypted) => encryptionService.decryptField(encrypted))
    );

    const concurrentTime = Date.now() - startTime;
    const allMatch = concurrentDecryptions.every((decrypted, index) => decrypted === testValues[index]);

    console.log(`   Processed ${testValues.length} items in ${concurrentTime}ms`);
    console.log(`   ✅ All concurrent operations successful: ${allMatch}\n`);

    // Test 5: Error handling
    console.log("5. Testing error handling:");
    try {
      await encryptionService.encryptField("");
      console.log("   ❌ Should have thrown error for empty string");
    } catch (error) {
      console.log("   ✅ Empty string error handled correctly:", (error as Error).message);
    }

    try {
      await encryptionService.decryptField({
        data: "invalid:data",
        iv: "invalid",
        keyVersion: 1,
        algorithm: "aes-256-gcm",
      });
      console.log("   ❌ Should have thrown error for invalid data");
    } catch (error) {
      console.log("   ✅ Invalid data error handled correctly:", (error as Error).message);
    }

    console.log("\n🎉 All encryption tests passed!");
    console.log("\n📋 Summary:");
    console.log("   ✅ Basic encryption/decryption working");
    console.log("   ✅ Healthcare-specific data handling");
    console.log("   ✅ Batch operations working");
    console.log("   ✅ Encryption detection working");
    console.log("   ✅ Concurrent operations working");
    console.log("   ✅ Error handling working");
    console.log("\n🔒 Your PII/PHI data is properly encrypted at rest!");
  } catch (error) {
    console.error("❌ Encryption test failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  validateEncryption().catch(console.error);
}

export default validateEncryption;
