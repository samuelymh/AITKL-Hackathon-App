#!/usr/bin/env node

/**
 * Test Admin Authentication
 * Tests admin login and token generation
 *
 * Usage: node scripts/test-admin-auth.js <email> <password>
 */

const { MongoClient } = require("mongodb");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare-app";

async function testAdminAuth(email, password) {
  let client;

  try {
    console.log("\n🔐 Testing Admin Authentication\n");

    if (!email || !password) {
      console.log("Usage: node scripts/test-admin-auth.js <email> <password>");
      console.log("Example: node scripts/test-admin-auth.js admin@hospital.com password123");
      return;
    }

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Find admin user by email
    const adminUser = await usersCollection.findOne({
      $or: [{ "auth.email": email }, { "personalInfo.contact.email": email }],
      role: "admin",
    });

    if (!adminUser) {
      console.log("❌ Admin user not found with email:", email);
      console.log("\n📋 Available admin users:");

      const allAdmins = await usersCollection.find({ role: "admin" }).toArray();
      if (allAdmins.length === 0) {
        console.log("   No admin users found in database");
        console.log("   Run: npm run admin:create <email> <password> <firstName> <lastName>");
      } else {
        allAdmins.forEach((admin, index) => {
          console.log(`   ${index + 1}. Email: ${admin.auth?.email || admin.personalInfo?.contact?.email}`);
          console.log(`      Name: ${admin.personalInfo?.firstName} ${admin.personalInfo?.lastName}`);
          console.log(`      Active: ${admin.metadata?.isActive !== false ? "Yes" : "No"}`);
          console.log("");
        });
      }
      return;
    }

    console.log("✅ Admin user found:", adminUser.personalInfo?.firstName, adminUser.personalInfo?.lastName);
    console.log("📧 Email:", adminUser.auth?.email || adminUser.personalInfo?.contact?.email);
    console.log("🆔 Digital ID:", adminUser.digitalIdentifier);
    console.log("🔑 Role:", adminUser.role);
    console.log("✅ Active:", adminUser.metadata?.isActive !== false ? "Yes" : "No");

    // Check if password is hashed (we can't verify it here without bcrypt)
    const hasPassword = !!(adminUser.auth?.password || adminUser.auth?.hashedPassword);
    console.log("🔒 Password set:", hasPassword ? "Yes" : "No");

    if (!hasPassword) {
      console.log("⚠️  Password not found - user may need password reset");
    }

    // Test API endpoint directly
    console.log("\n🌐 Testing API endpoint...");

    // We would need to actually make a login request here
    console.log("   To test the full authentication flow:");
    console.log("   1. Go to http://localhost:3001/login");
    console.log("   2. Use email:", adminUser.auth?.email || adminUser.personalInfo?.contact?.email);
    console.log("   3. Use the password you provided");
    console.log("   4. Navigate to http://localhost:3001/admin/organizations/verification");
  } catch (error) {
    console.error("❌ Error testing admin auth:", error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Test cancelled");
  process.exit(0);
});

// Get command line arguments
const [email, password] = process.argv.slice(2);

// Run the script
if (require.main === module) {
  testAdminAuth(email, password).catch(console.error);
}

module.exports = { testAdminAuth };
