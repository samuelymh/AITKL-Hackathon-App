#!/usr/bin/env node

/**
 * Show Admin User Structure Script
 * Displays the complete structure of an admin user for debugging
 *
 * Usage: node scripts/show-admin-structure.js <adminEmail>
 */

const { MongoClient } = require("mongodb");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/healthcare-app";

async function showAdminStructure(email) {
  let client;

  try {
    console.log(`\n🔍 Admin User Structure for: ${email}\n`);

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

    console.log("📋 Complete Admin User Document:");
    console.log("=====================================");
    console.log(JSON.stringify(admin, null, 2));

    console.log("\n🔍 Field Validation Check:");
    console.log("=====================================");

    // Check required fields
    const requiredFields = ["auditCreatedBy", "auditCreatedDateTime", "personalInfo.dateOfBirth"];

    requiredFields.forEach((field) => {
      const value = field.split(".").reduce((obj, key) => obj?.[key], admin);
      const exists = value !== undefined && value !== null;
      console.log(`${exists ? "✅" : "❌"} ${field}: ${exists ? value : "MISSING"}`);
    });

    // Check auth structure
    console.log("\n🔐 Auth Structure:");
    console.log("==================");
    if (admin.auth) {
      Object.keys(admin.auth).forEach((key) => {
        const value = admin.auth[key];
        console.log(`✅ auth.${key}: ${typeof value} ${key === "passwordHash" ? "(hidden)" : value}`);
      });
    } else {
      console.log("❌ No auth object found");
    }
  } catch (error) {
    console.error("❌ Error showing admin structure:", error.message);
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
    console.log("\n🔍 Admin User Structure Tool\n");
    console.log("Usage:");
    console.log("  node scripts/show-admin-structure.js <adminEmail>");
    console.log("\nExample:");
    console.log("  node scripts/show-admin-structure.js admin@test.com");
    process.exit(1);
  }

  return args[0];
}

// Run the script
if (require.main === module) {
  const email = parseArguments();
  showAdminStructure(email).catch(console.error);
}
