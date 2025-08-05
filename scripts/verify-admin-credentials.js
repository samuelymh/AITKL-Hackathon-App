#!/usr/bin/env node

/**
 * Admin Credentials Verification Script
 * Verifies admin login credentials without requiring the web server
 *
 * Usage: node scripts/verify-admin-credentials.js <email> <password>
 */

const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/healthcare-app";

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

async function verifyCredentials(email, password) {
  let client;

  try {
    console.log("\n🔐 Admin Credentials Verification\n");

    if (!isValidEmail(email)) {
      console.log("❌ Invalid email format");
      return;
    }

    if (!password) {
      console.log("❌ Password is required");
      return;
    }

    console.log(`🔍 Verifying credentials for: ${email}`);

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Find the admin user
    const admin = await usersCollection.findOne({
      $and: [
        { role: "admin" },
        {
          $or: [
            { "auth.email": email.toLowerCase().trim() },
            { "personalInfo.contact.email": email.toLowerCase().trim() },
          ],
        },
      ],
    });

    if (!admin) {
      console.log("❌ Admin user not found");
      return;
    }

    // Check if admin is active
    if (admin.metadata?.isActive === false) {
      console.log("⚠️ Admin account is deactivated");
      return;
    }

    console.log(`📋 Admin found: ${admin.personalInfo?.firstName} ${admin.personalInfo?.lastName}`);

    // Verify password
    const passwordHash = admin.auth?.passwordHash;
    if (!passwordHash) {
      console.log("❌ No password hash found for this admin");
      return;
    }

    console.log("🔒 Verifying password...");
    const isValid = await bcrypt.compare(password, passwordHash);

    if (isValid) {
      console.log("\n✅ Credentials are VALID!\n");
      console.log("Admin Details:");
      console.log(`- ID: ${admin._id}`);
      console.log(`- Email: ${admin.auth?.email || admin.personalInfo?.contact?.email}`);
      console.log(`- Name: ${admin.personalInfo?.firstName} ${admin.personalInfo?.lastName}`);
      console.log(`- Phone: ${admin.personalInfo?.contact?.phone || "N/A"}`);
      console.log(`- Role: ${admin.role}`);
      console.log(`- Active: ${admin.metadata?.isActive !== false ? "Yes" : "No"}`);
      console.log(`- Created: ${admin.metadata?.createdAt ? new Date(admin.metadata.createdAt).toISOString() : "N/A"}`);
      console.log(`- Digital ID: ${admin.digitalIdentifier || "N/A"}`);

      console.log("\n🎯 This admin can login to the application!");
    } else {
      console.log("\n❌ Invalid password!");
      console.log("The password provided does not match the stored hash.");
    }
  } catch (error) {
    console.error("❌ Error verifying credentials:", error.message);
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
    console.log("\n🔐 Admin Credentials Verification Tool\n");
    console.log("Usage:");
    console.log("  node scripts/verify-admin-credentials.js <email> <password>");
    console.log("\nExamples:");
    console.log("  node scripts/verify-admin-credentials.js admin@test.com myPassword123");
    console.log("  node scripts/verify-admin-credentials.js admin2@healthcare.com SecurePass789");
    console.log("\nThis tool verifies if admin login credentials are correct.");
    process.exit(1);
  }

  if (args.length < 2) {
    console.log("❌ Missing arguments. Need: <email> <password>");
    console.log("Usage: node scripts/verify-admin-credentials.js <email> <password>");
    process.exit(1);
  }

  return {
    email: args[0],
    password: args[1],
  };
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Verification cancelled");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  const { email, password } = parseArguments();
  verifyCredentials(email, password).catch(console.error);
}
