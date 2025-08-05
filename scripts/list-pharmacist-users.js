#!/usr/bin/env node

/**
 * List Pharmacist Users Script
 * Lists all pharmacist users in the database with their authentication details
 *
 * Usage: node scripts/list-pharmacist-users.js
 * Usage: MONGODB_URI="your-connection-string" node scripts/list-pharmacist-users.js
 */

const { MongoClient } = require("mongodb");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/healthcare-app";

async function listPharmacistUsers() {
  let client;

  try {
    console.log("\n💊 Pharmacist Users List\n");

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Find all pharmacist users
    const pharmacistUsers = await usersCollection
      .find({
        $or: [{ role: "pharmacist" }, { "auth.role": "pharmacist" }],
      })
      .toArray();

    if (pharmacistUsers.length === 0) {
      console.log("📭 No pharmacist users found in the database");

      // Check if there are any users with pharmacy-related roles or info
      const pharmacyRelatedUsers = await usersCollection
        .find({
          $or: [
            { role: /pharma/i },
            { "personalInfo.contact.email": /pharma/i },
            { "auth.email": /pharma/i },
            { searchableEmail: /pharma/i },
            { "personalInfo.firstName": /pharma/i },
            { "personalInfo.lastName": /pharma/i },
          ],
        })
        .toArray();

      if (pharmacyRelatedUsers.length > 0) {
        console.log(
          `\n⚠️ Found ${pharmacyRelatedUsers.length} user(s) with pharmacy-related info but not pharmacist role:\n`
        );
        pharmacyRelatedUsers.forEach((user, index) => {
          console.log(`${index + 1}. User:`);
          console.log(`   - ID: ${user._id}`);
          console.log(`   - Role: ${user.role}`);
          console.log(`   - Email: ${user.auth?.email || user.personalInfo?.contact?.email || "N/A"}`);
          console.log(`   - Name: ${user.personalInfo?.firstName || "N/A"} ${user.personalInfo?.lastName || "N/A"}`);
          console.log("");
        });
      }

      console.log("\n📝 To create a pharmacist user, you can:");
      console.log("   1. Register at /register with role 'pharmacist'");
      console.log("   2. Or create one directly in the database");
      return;
    }

    console.log(`📊 Found ${pharmacistUsers.length} pharmacist user(s):\n`);

    pharmacistUsers.forEach((pharmacist, index) => {
      console.log(`${index + 1}. Pharmacist User:`);
      console.log(`   - ID: ${pharmacist._id}`);
      console.log(`   - Digital ID: ${pharmacist.digitalIdentifier || "N/A"}`);
      console.log(
        `   - Email: ${pharmacist.auth?.email || pharmacist.personalInfo?.contact?.email || pharmacist.personalInfo?.contact?.searchableEmail || "N/A"}`
      );
      console.log(
        `   - Name: ${pharmacist.personalInfo?.firstName || "N/A"} ${pharmacist.personalInfo?.lastName || "N/A"}`
      );
      console.log(`   - Phone: ${pharmacist.personalInfo?.contact?.phone || "N/A"}`);
      console.log(`   - Role: ${pharmacist.role || pharmacist.auth?.role}`);
      console.log(`   - Active: ${pharmacist.metadata?.isActive !== false ? "Yes" : "No"}`);
      console.log(`   - Email Verified: ${pharmacist.auth?.emailVerified ? "Yes" : "No"}`);
      console.log(`   - Phone Verified: ${pharmacist.auth?.phoneVerified ? "Yes" : "No"}`);

      // Check if password is set (we can't show the actual password for security)
      const hasPassword = !!(pharmacist.auth?.passwordHash || pharmacist.auth?.password);
      console.log(`   - Password Set: ${hasPassword ? "Yes" : "No"}`);

      // Show organization info if available
      if (pharmacist.organizationId) {
        console.log(`   - Organization ID: ${pharmacist.organizationId}`);
      }

      // Show professional info if available
      if (pharmacist.professionalInfo) {
        console.log(`   - License Number: ${pharmacist.professionalInfo.licenseNumber || "N/A"}`);
        console.log(`   - Specialty: ${pharmacist.professionalInfo.specialty || "N/A"}`);
        console.log(`   - Years of Experience: ${pharmacist.professionalInfo.yearsOfExperience || "N/A"}`);
      }

      console.log(
        `   - Created: ${pharmacist.metadata?.createdAt ? new Date(pharmacist.metadata.createdAt).toISOString() : pharmacist.auditCreatedDateTime ? new Date(pharmacist.auditCreatedDateTime).toISOString() : "N/A"}`
      );
      console.log(
        `   - Updated: ${pharmacist.metadata?.updatedAt ? new Date(pharmacist.metadata.updatedAt).toISOString() : pharmacist.auditUpdatedDateTime ? new Date(pharmacist.auditUpdatedDateTime).toISOString() : "N/A"}`
      );

      console.log("\n   🔑 Authentication Details:");
      console.log(
        `   - Login Email: ${pharmacist.auth?.email || pharmacist.personalInfo?.contact?.email || pharmacist.personalInfo?.contact?.searchableEmail || "N/A"}`
      );
      console.log(`   - Searchable Email: ${pharmacist.personalInfo?.contact?.searchableEmail || "N/A"}`);
      console.log(`   - Password Hash Present: ${!!pharmacist.auth?.passwordHash}`);
      console.log(`   - Account Locked: ${pharmacist.auth?.accountLocked ? "Yes" : "No"}`);
      console.log(
        `   - Failed Login Attempts: ${pharmacist.auth?.failedLoginAttempts || pharmacist.auth?.loginAttempts || 0}`
      );

      if (pharmacist.auth?.lastLoginAt) {
        console.log(`   - Last Login: ${new Date(pharmacist.auth.lastLoginAt).toISOString()}`);
      }

      console.log("");
    });

    // Show login instructions
    console.log("🔐 Login Instructions:");
    console.log("   1. Go to: http://localhost:3006/login");
    console.log("   2. Use the email address shown above");
    console.log("   3. Use the password that was set during registration");
    console.log("   4. After login, you'll see the pharmacy dashboard");
    console.log("\n📝 Note: For security reasons, actual passwords are not displayed.");
    console.log(
      "   If you need to reset a password, use: node scripts/reset-pharmacist-password.js <email> <newPassword>"
    );
  } catch (error) {
    console.error("❌ Error listing pharmacist users:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 List operation cancelled");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  listPharmacistUsers().catch(console.error);
}

module.exports = { listPharmacistUsers };
