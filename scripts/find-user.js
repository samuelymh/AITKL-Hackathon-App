#!/usr/bin/env node

/**
 * Find Specific User Script
 * Finds a specific user by email and shows their details
 *
 * Usage: node scripts/find-user.js <email>
 */

const { MongoClient } = require("mongodb");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/healthcare-app";

async function findUser(email) {
  let client;

  try {
    console.log(`\n🔍 Searching for User: ${email}\n`);

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Search for user by email in multiple fields
    const user = await usersCollection.findOne({
      $or: [
        { "auth.email": email.toLowerCase().trim() },
        { "personalInfo.contact.email": email.toLowerCase().trim() },
        { "personalInfo.contact.searchableEmail": email.toLowerCase().trim() },
        { email: email.toLowerCase().trim() }, // Legacy field
        { searchableEmail: email.toLowerCase().trim() }, // Searchable email field
      ],
    });

    if (!user) {
      console.log(`❌ User not found with email: ${email}`);

      // Try partial search
      console.log("\n🔍 Searching for similar emails...");
      const partialUsers = await usersCollection
        .find({
          $or: [
            { "auth.email": new RegExp(email.split("@")[0], "i") },
            { "personalInfo.contact.email": new RegExp(email.split("@")[0], "i") },
            { searchableEmail: new RegExp(email.split("@")[0], "i") },
          ],
        })
        .toArray();

      if (partialUsers.length > 0) {
        console.log(`\n📋 Found ${partialUsers.length} user(s) with similar email patterns:`);
        partialUsers.forEach((u, index) => {
          console.log(`${index + 1}. Email: ${u.auth?.email || u.personalInfo?.contact?.email}`);
          console.log(`   Role: ${u.role}`);
          console.log(`   Name: ${u.personalInfo?.firstName} ${u.personalInfo?.lastName}`);
          console.log("");
        });
      }
      return;
    }

    console.log("✅ User Found!\n");
    console.log("📋 User Details:");
    console.log(`   - ID: ${user._id}`);
    console.log(`   - Digital ID: ${user.digitalIdentifier || "N/A"}`);
    console.log(
      `   - Email: ${user.auth?.email || user.personalInfo?.contact?.email || user.personalInfo?.contact?.searchableEmail || user.email || "N/A"}`
    );
    console.log(`   - Name: ${user.personalInfo?.firstName || "N/A"} ${user.personalInfo?.lastName || "N/A"}`);
    console.log(`   - Phone: ${user.personalInfo?.contact?.phone || "N/A"}`);
    console.log(`   - Role: ${user.role || user.auth?.role}`);
    console.log(`   - Active: ${user.metadata?.isActive !== false ? "Yes" : "No"}`);
    console.log(`   - Email Verified: ${user.auth?.emailVerified ? "Yes" : "No"}`);
    console.log(`   - Phone Verified: ${user.auth?.phoneVerified ? "Yes" : "No"}`);

    // Check if password is set
    const hasPassword = !!(user.auth?.passwordHash || user.auth?.password);
    console.log(`   - Password Set: ${hasPassword ? "Yes" : "No"}`);

    // Show organization info if available
    if (user.organizationId) {
      console.log(`   - Organization ID: ${user.organizationId}`);
    }

    // Show professional info if available
    if (user.professionalInfo) {
      console.log("\n💼 Professional Information:");
      console.log(`   - License Number: ${user.professionalInfo.licenseNumber || "N/A"}`);
      console.log(`   - Specialty: ${user.professionalInfo.specialty || "N/A"}`);
      console.log(`   - Years of Experience: ${user.professionalInfo.yearsOfExperience || "N/A"}`);
      console.log(`   - Current Position: ${user.professionalInfo.currentPosition || "N/A"}`);
      console.log(`   - Department: ${user.professionalInfo.department || "N/A"}`);
    }

    console.log(`\n📅 Timestamps:`);
    console.log(
      `   - Created: ${user.metadata?.createdAt ? new Date(user.metadata.createdAt).toISOString() : user.auditCreatedDateTime ? new Date(user.auditCreatedDateTime).toISOString() : "N/A"}`
    );
    console.log(
      `   - Updated: ${user.metadata?.updatedAt ? new Date(user.metadata.updatedAt).toISOString() : user.auditUpdatedDateTime ? new Date(user.auditUpdatedDateTime).toISOString() : "N/A"}`
    );

    console.log("\n🔑 Authentication Details:");
    console.log(
      `   - Login Email: ${user.auth?.email || user.personalInfo?.contact?.email || user.personalInfo?.contact?.searchableEmail || user.email || "N/A"}`
    );
    console.log(`   - Searchable Email: ${user.personalInfo?.contact?.searchableEmail || "N/A"}`);
    console.log(`   - Password Hash Present: ${!!user.auth?.passwordHash}`);
    console.log(`   - Account Locked: ${user.auth?.accountLocked ? "Yes" : "No"}`);
    console.log(`   - Failed Login Attempts: ${user.auth?.failedLoginAttempts || user.auth?.loginAttempts || 0}`);

    if (user.auth?.lastLoginAt || user.auth?.lastLogin) {
      console.log(`   - Last Login: ${new Date(user.auth.lastLoginAt || user.auth.lastLogin).toISOString()}`);
    }

    // Show raw password hash for debugging (first 20 chars only)
    if (user.auth?.passwordHash) {
      console.log(`   - Password Hash (preview): ${user.auth.passwordHash.substring(0, 20)}...`);
    }

    console.log("\n🔐 Login Instructions:");
    console.log("   1. Go to: http://localhost:3006/login");
    console.log(`   2. Email: ${user.auth?.email || user.personalInfo?.contact?.email || user.email}`);
    console.log("   3. Use the password that was set during registration");

    if (user.role === "pharmacist") {
      console.log("   4. After login, you'll see the pharmacy dashboard");
    } else {
      console.log(`   4. After login, you'll see the ${user.role} dashboard`);
    }

    console.log("\n📝 Note: For security reasons, actual passwords are not displayed.");
    console.log("   If you need to reset the password, use the appropriate reset script.");
  } catch (error) {
    console.error("❌ Error finding user:", error.message);
    console.error("Full error:", error);
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
    console.log("\n🔍 Find User Tool\n");
    console.log("Usage:");
    console.log("  node scripts/find-user.js <email>");
    console.log("\nExamples:");
    console.log("  node scripts/find-user.js pharmhana@gmail.com");
    console.log("  node scripts/find-user.js admin@test.com");
    process.exit(1);
  }

  return args[0];
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Search cancelled");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  const email = parseArguments();
  findUser(email).catch(console.error);
}

module.exports = { findUser };
