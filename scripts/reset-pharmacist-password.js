#!/usr/bin/env node

/**
 * Pharmacist Password Reset Script
 * Resets passwords for pharmacist users securely
 *
 * Usage:
 *   node scripts/reset-pharmacist-password.js <pharmacistId> <newPassword>
 *   node scripts/reset-pharmacist-password.js <email> <newPassword>
 */

const bcrypt = require("bcryptjs");
const { MongoClient, ObjectId } = require("mongodb");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/healthcare-app";

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const isValidPassword = (password) => {
  return password.length >= 8 && password.length <= 128;
};

// Validate ObjectId
const isValidObjectId = (id) => {
  return ObjectId.isValid(id);
};

async function resetPharmacistPassword(identifier, newPassword) {
  let client;

  try {
    console.log("\n💊 Pharmacist Password Reset Tool\n");

    // Validate password
    if (!isValidPassword(newPassword)) {
      console.log("❌ Password must be between 8 and 128 characters");
      return;
    }

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Determine search criteria
    let searchCriteria;
    if (isValidObjectId(identifier)) {
      searchCriteria = { _id: new ObjectId(identifier), role: "pharmacist" };
      console.log(`🔍 Searching for pharmacist by ID: ${identifier}`);
    } else if (isValidEmail(identifier)) {
      searchCriteria = {
        $and: [
          { role: "pharmacist" },
          {
            $or: [
              { "auth.email": identifier.toLowerCase().trim() },
              { "personalInfo.contact.email": identifier.toLowerCase().trim() },
            ],
          },
        ],
      };
      console.log(`🔍 Searching for pharmacist by email: ${identifier}`);
    } else {
      console.log("❌ Invalid identifier. Use pharmacist ID (ObjectId) or email address");
      return;
    }

    // Find the pharmacist user
    const pharmacist = await usersCollection.findOne(searchCriteria);

    if (!pharmacist) {
      console.log("❌ Pharmacist user not found");

      // Show available pharmacists
      const allPharmacists = await usersCollection.find({ role: "pharmacist" }).toArray();
      if (allPharmacists.length > 0) {
        console.log("\n📋 Available pharmacist users:");
        allPharmacists.forEach((user, index) => {
          console.log(`   ${index + 1}. Email: ${user.auth?.email || user.personalInfo?.contact?.email}`);
          console.log(`      Name: ${user.personalInfo?.firstName} ${user.personalInfo?.lastName}`);
          console.log(`      ID: ${user._id}`);
          console.log("");
        });
      } else {
        console.log("\n📭 No pharmacist users found in database");
        console.log("   Create one at: http://localhost:3006/register");
      }
      return;
    }

    console.log(`📋 Pharmacist found: ${pharmacist.personalInfo?.firstName} ${pharmacist.personalInfo?.lastName}`);
    console.log(`📧 Email: ${pharmacist.auth?.email || pharmacist.personalInfo?.contact?.email}`);
    console.log(`🆔 Digital ID: ${pharmacist.digitalIdentifier}`);

    // Hash the new password
    console.log("🔒 Hashing new password...");
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update the password
    const result = await usersCollection.updateOne(
      { _id: pharmacist._id },
      {
        $set: {
          "auth.passwordHash": passwordHash,
          "metadata.updatedAt": new Date(),
          "metadata.passwordChangedAt": new Date(),
          "auth.accountLocked": false, // Unlock account if it was locked
          "auth.failedLoginAttempts": 0, // Reset failed attempts
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log("\n✅ Password reset successfully!");
      console.log(`- Pharmacist ID: ${pharmacist._id}`);
      console.log(`- Email: ${pharmacist.auth?.email || pharmacist.personalInfo?.contact?.email}`);
      console.log(`- Name: ${pharmacist.personalInfo?.firstName} ${pharmacist.personalInfo?.lastName}`);
      console.log(`- Digital ID: ${pharmacist.digitalIdentifier}`);
      console.log(`- Password Changed: ${new Date().toISOString()}`);
      console.log(`- Account Status: Unlocked`);

      // Create audit log
      try {
        const auditCollection = db.collection("auditlogs");
        await auditCollection.insertOne({
          action: "PHARMACIST_PASSWORD_RESET",
          targetType: "USER",
          targetId: pharmacist._id.toString(),
          actor: {
            type: "SYSTEM",
            identifier: "password-reset-script",
          },
          details: {
            email: pharmacist.auth?.email || pharmacist.personalInfo?.contact?.email,
            digitalId: pharmacist.digitalIdentifier,
            resetBy: "password-reset-script",
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date(),
          metadata: {
            source: "password-reset-script",
            method: "direct-database-update",
            userRole: "pharmacist",
          },
        });
        console.log("✅ Audit log created");
      } catch (auditError) {
        console.log("⚠️ Audit logging failed (non-critical):", auditError.message);
      }

      console.log("\n🔐 Login Instructions:");
      console.log("   1. Go to: http://localhost:3006/login");
      console.log(`   2. Email: ${pharmacist.auth?.email || pharmacist.personalInfo?.contact?.email}`);
      console.log(`   3. Password: ${newPassword}`);
      console.log("   4. You'll be redirected to the pharmacy dashboard");
    } else {
      console.log("❌ Failed to reset password");
    }
  } catch (error) {
    console.error("❌ Error resetting password:", error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("\n💊 Pharmacist Password Reset Tool\n");
    console.log("Usage:");
    console.log("  node scripts/reset-pharmacist-password.js <pharmacistId> <newPassword>");
    console.log("  node scripts/reset-pharmacist-password.js <email> <newPassword>");
    console.log("\nExamples:");
    console.log("  node scripts/reset-pharmacist-password.js 689190d3b4703104dd538c23 newSecurePass123");
    console.log("  node scripts/reset-pharmacist-password.js pharmacist@hospital.com newSecurePass123");
    console.log("\nNote: Password must be between 8-128 characters");
    console.log("\nTo list all pharmacists first:");
    console.log("  node scripts/list-pharmacist-users.js");
    process.exit(1);
  }

  if (args.length < 2) {
    console.log("❌ Missing arguments. Need: <identifier> <newPassword>");
    console.log("Usage: node scripts/reset-pharmacist-password.js <pharmacistId|email> <newPassword>");
    process.exit(1);
  }

  return {
    identifier: args[0],
    newPassword: args[1],
  };
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Password reset cancelled");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  const { identifier, newPassword } = parseArguments();
  resetPharmacistPassword(identifier, newPassword).catch(console.error);
}

module.exports = { resetPharmacistPassword };
