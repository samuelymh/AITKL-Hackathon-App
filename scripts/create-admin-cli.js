#!/usr/bin/env node

/**
 * Admin User Creation Script with CLI Arguments
 * Creates admin users directly in MongoDB
 *
 * Usage:
 *   Interactive: node scripts/create-admin-cli.js
 *   CLI Args: node scripts/create-admin-cli.js admin@test.com password123 John Doe "+1234567890"
 */

const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");
const { randomUUID } = require("crypto");

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

async function createAdminUser(email, password, firstName, lastName, phone = "") {
  let client;

  try {
    console.log("\n🔧 Admin User Creation Tool\n");

    // Validate inputs
    if (!isValidEmail(email)) {
      console.log("❌ Invalid email format");
      process.exit(1);
    }

    if (!isValidPassword(password)) {
      console.log("❌ Password must be between 8 and 128 characters");
      process.exit(1);
    }

    if (!firstName || !lastName) {
      console.log("❌ First name and last name are required");
      process.exit(1);
    }

    console.log(`Creating admin user for: ${email}`);
    console.log(`Name: ${firstName} ${lastName}`);
    if (phone) console.log(`Phone: ${phone}`);

    console.log("\n🔄 Creating admin user...");

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [
        { "auth.email": email.toLowerCase().trim() },
        { "personalInfo.contact.email": email.toLowerCase().trim() },
        { "personalInfo.contact.searchableEmail": email.toLowerCase().trim() },
      ],
    });

    if (existingUser) {
      console.log("❌ User with this email already exists");
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate digital identifier
    const digitalIdentifier = randomUUID();

    // Create admin user document
    const now = new Date();
    const adminUser = {
      digitalIdentifier,

      // Authentication
      auth: {
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "admin",
        emailVerified: true,
        phoneVerified: !!phone,
        lastLogin: null,
        loginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null,
        tokenVersion: 1,
      },

      // Personal Information
      personalInfo: {
        firstName,
        lastName,
        dateOfBirth: new Date("1990-01-01"), // Default birth date for admin users
        contact: {
          email: email.toLowerCase().trim(),
          searchableEmail: email.toLowerCase().trim(),
          ...(phone && { phone }),
          verified: {
            email: true,
            phone: !!phone,
          },
        },
      },

      // Medical Info (minimal for admin users)
      medicalInfo: {
        smokingStatus: "never",
      },

      // Role and permissions
      role: "admin",

      // Audit fields (required by BaseSchema)
      auditCreatedBy: "admin-creation-script",
      auditCreatedDateTime: now.toISOString(),

      // Metadata (legacy fields)
      metadata: {
        isActive: true,
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
    };

    // Insert admin user
    const result = await usersCollection.insertOne(adminUser);

    if (result.insertedId) {
      console.log("\n✅ Admin user created successfully!\n");
      console.log("Admin Details:");
      console.log(`- ID: ${result.insertedId}`);
      console.log(`- Email: ${email}`);
      console.log(`- Name: ${firstName} ${lastName}`);
      console.log(`- Role: admin`);
      console.log(`- Digital ID: ${digitalIdentifier}`);
      console.log(`- Created: ${new Date().toISOString()}`);

      // Log to audit collection if it exists
      try {
        const auditCollection = db.collection("auditlogs");
        await auditCollection.insertOne({
          action: "ADMIN_USER_CREATED",
          targetType: "USER",
          targetId: result.insertedId.toString(),
          actor: {
            type: "SYSTEM",
            identifier: "admin-creation-script",
          },
          details: {
            email,
            role: "admin",
            createdBy: "admin-creation-script",
          },
          timestamp: new Date(),
          metadata: {
            source: "admin-creation-script",
            method: "direct-database-insert",
          },
        });
        console.log("✅ Audit log created");
      } catch (auditError) {
        console.log("⚠️ Audit logging failed (non-critical):", auditError.message);
      }
    } else {
      console.log("❌ Failed to create admin user");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
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
    console.log("\n📋 Usage Examples:");
    console.log("node scripts/create-admin-cli.js admin@test.com password123 John Doe");
    console.log('node scripts/create-admin-cli.js admin@test.com password123 John Doe "+1234567890"');
    console.log("\n📋 Required arguments:");
    console.log("1. email - Valid email address");
    console.log("2. password - At least 8 characters");
    console.log("3. firstName - First name");
    console.log("4. lastName - Last name");
    console.log("5. phone - Phone number (optional)");
    process.exit(1);
  }

  if (args.length < 4) {
    console.log("❌ Missing required arguments. Need: email, password, firstName, lastName");
    console.log("Usage: node scripts/create-admin-cli.js <email> <password> <firstName> <lastName> [phone]");
    process.exit(1);
  }

  return {
    email: args[0],
    password: args[1],
    firstName: args[2],
    lastName: args[3],
    phone: args[4] || "",
  };
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Admin creation cancelled");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  const { email, password, firstName, lastName, phone } = parseArguments();
  createAdminUser(email, password, firstName, lastName, phone).catch(console.error);
}
