#!/usr/bin/env node

/**
 * Admin Password Reset Script
 * Resets passwords for admin users securely
 *
 * Usage:
 *   node scripts/reset-admin-password.js <adminId> <newPassword>
 *   node scripts/reset-admin-password.js <email> <newPassword>
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

async function resetAdminPassword(identifier, newPassword) {
  let client;

  try {
    console.log("\n🔐 Admin Password Reset Tool\n");

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
      searchCriteria = { _id: new ObjectId(identifier), role: "admin" };
      console.log(`🔍 Searching for admin by ID: ${identifier}`);
    } else if (isValidEmail(identifier)) {
      searchCriteria = {
        $and: [
          { role: "admin" },
          {
            $or: [
              { "auth.email": identifier.toLowerCase().trim() },
              { "personalInfo.contact.email": identifier.toLowerCase().trim() },
            ],
          },
        ],
      };
      console.log(`🔍 Searching for admin by email: ${identifier}`);
    } else {
      console.log("❌ Invalid identifier. Use admin ID (ObjectId) or email address");
      return;
    }

    // Find the admin user
    const admin = await usersCollection.findOne(searchCriteria);

    if (!admin) {
      console.log("❌ Admin user not found");
      return;
    }

    console.log(`📋 Admin found: ${admin.personalInfo?.firstName} ${admin.personalInfo?.lastName}`);
    console.log(`📧 Email: ${admin.auth?.email || admin.personalInfo?.contact?.email}`);

    // Hash the new password
    console.log("🔒 Hashing new password...");
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update the password
    const result = await usersCollection.updateOne(
      { _id: admin._id },
      {
        $set: {
          "auth.passwordHash": passwordHash,
          "metadata.updatedAt": new Date(),
          "metadata.passwordChangedAt": new Date(),
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log("\n✅ Password reset successfully!");
      console.log(`- Admin ID: ${admin._id}`);
      console.log(`- Email: ${admin.auth?.email || admin.personalInfo?.contact?.email}`);
      console.log(`- Name: ${admin.personalInfo?.firstName} ${admin.personalInfo?.lastName}`);
      console.log(`- Password Changed: ${new Date().toISOString()}`);

      // Create audit log
      try {
        const auditCollection = db.collection("auditlogs");
        await auditCollection.insertOne({
          action: "ADMIN_PASSWORD_RESET",
          targetType: "USER",
          targetId: admin._id.toString(),
          actor: {
            type: "SYSTEM",
            identifier: "password-reset-script",
          },
          details: {
            email: admin.auth?.email || admin.personalInfo?.contact?.email,
            resetBy: "password-reset-script",
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date(),
          metadata: {
            source: "password-reset-script",
            method: "direct-database-update",
          },
        });
        console.log("✅ Audit log created");
      } catch (auditError) {
        console.log("⚠️ Audit logging failed (non-critical):", auditError.message);
      }
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
    console.log("\n🔐 Admin Password Reset Tool\n");
    console.log("Usage:");
    console.log("  node scripts/reset-admin-password.js <adminId> <newPassword>");
    console.log("  node scripts/reset-admin-password.js <email> <newPassword>");
    console.log("\nExamples:");
    console.log("  node scripts/reset-admin-password.js 689190d3b4703104dd538c23 newSecurePass123");
    console.log("  node scripts/reset-admin-password.js admin@test.com newSecurePass123");
    console.log("\nNote: Password must be between 8-128 characters");
    process.exit(1);
  }

  if (args.length < 2) {
    console.log("❌ Missing arguments. Need: <identifier> <newPassword>");
    console.log("Usage: node scripts/reset-admin-password.js <adminId|email> <newPassword>");
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
  resetAdminPassword(identifier, newPassword).catch(console.error);
}
