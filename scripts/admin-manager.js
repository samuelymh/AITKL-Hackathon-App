#!/usr/bin/env node

/**
 * Admin Management Script
 * Comprehensive admin user management tool
 *
 * Usage:
 *   node scripts/admin-manager.js list
 *   node scripts/admin-manager.js create <email> <password> <firstName> <lastName> [phone]
 *   node scripts/admin-manager.js deactivate <adminId>
 *   node scripts/admin-manager.js activate <adminId>
 *   node scripts/admin-manager.js delete <adminId>
 */

const bcrypt = require("bcryptjs");
const { MongoClient, ObjectId } = require("mongodb");
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

// Validate ObjectId
const isValidObjectId = (id) => {
  return ObjectId.isValid(id);
};

async function connectToDatabase() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log("✅ Connected to database");
  return client;
}

async function listAdmins() {
  let client;

  try {
    console.log("\n👥 Admin Users List\n");

    client = await connectToDatabase();
    const db = client.db();
    const usersCollection = db.collection("users");

    const adminUsers = await usersCollection
      .find({
        role: "admin",
      })
      .sort({ "metadata.createdAt": -1 })
      .toArray();

    if (adminUsers.length === 0) {
      console.log("📭 No admin users found");
      return;
    }

    console.log(`📊 Found ${adminUsers.length} admin user(s):\n`);

    adminUsers.forEach((admin, index) => {
      const status = admin.metadata?.isActive !== false ? "🟢 Active" : "🔴 Inactive";
      console.log(`${index + 1}. ${status}`);
      console.log(`   ID: ${admin._id}`);
      console.log(`   Email: ${admin.auth?.email || admin.personalInfo?.contact?.email || "N/A"}`);
      console.log(`   Name: ${admin.personalInfo?.firstName || "N/A"} ${admin.personalInfo?.lastName || "N/A"}`);
      console.log(`   Phone: ${admin.personalInfo?.contact?.phone || "N/A"}`);
      console.log(
        `   Created: ${admin.metadata?.createdAt ? new Date(admin.metadata.createdAt).toLocaleDateString() : "N/A"}`
      );
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error listing admins:", error.message);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

async function createAdmin(email, password, firstName, lastName, phone = "") {
  let client;

  try {
    console.log("\n🔧 Creating Admin User\n");

    // Validate inputs
    if (!isValidEmail(email)) {
      console.log("❌ Invalid email format");
      return;
    }

    if (!isValidPassword(password)) {
      console.log("❌ Password must be between 8 and 128 characters");
      return;
    }

    if (!firstName || !lastName) {
      console.log("❌ First name and last name are required");
      return;
    }

    console.log(`Creating admin: ${email}`);
    console.log(`Name: ${firstName} ${lastName}`);
    if (phone) console.log(`Phone: ${phone}`);

    client = await connectToDatabase();
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
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
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
      auditCreatedBy: "admin-manager-script",
      auditCreatedDateTime: now.toISOString(),
      
      // Metadata (legacy fields)
      metadata: {
        isActive: true,
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
    };

    const result = await usersCollection.insertOne(adminUser);

    if (result.insertedId) {
      console.log("\n✅ Admin user created successfully!");
      console.log(`- ID: ${result.insertedId}`);
      console.log(`- Email: ${email}`);
      console.log(`- Name: ${firstName} ${lastName}`);

      // Create audit log
      try {
        const auditCollection = db.collection("auditlogs");
        await auditCollection.insertOne({
          action: "ADMIN_USER_CREATED",
          targetType: "USER",
          targetId: result.insertedId.toString(),
          actor: { type: "SYSTEM", identifier: "admin-manager-script" },
          details: { email, role: "admin" },
          timestamp: new Date(),
          metadata: { source: "admin-manager-script" },
        });
      } catch (auditError) {
        console.log("⚠️ Audit logging failed (non-critical)");
      }
    }
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
  } finally {
    if (client) await client.close();
  }
}

async function deactivateAdmin(adminId) {
  let client;

  try {
    console.log(`\n🔒 Deactivating Admin: ${adminId}\n`);

    if (!isValidObjectId(adminId)) {
      console.log("❌ Invalid admin ID format");
      return;
    }

    client = await connectToDatabase();
    const db = client.db();
    const usersCollection = db.collection("users");

    const admin = await usersCollection.findOne({
      _id: new ObjectId(adminId),
      role: "admin",
    });

    if (!admin) {
      console.log("❌ Admin user not found");
      return;
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(adminId) },
      {
        $set: {
          "metadata.isActive": false,
          "metadata.updatedAt": new Date(),
          "metadata.deactivatedAt": new Date(),
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log("✅ Admin user deactivated successfully");
      console.log(`- Email: ${admin.auth?.email || admin.personalInfo?.contact?.email}`);
      console.log(`- Name: ${admin.personalInfo?.firstName} ${admin.personalInfo?.lastName}`);
    }
  } catch (error) {
    console.error("❌ Error deactivating admin:", error.message);
  } finally {
    if (client) await client.close();
  }
}

async function activateAdmin(adminId) {
  let client;

  try {
    console.log(`\n🔓 Activating Admin: ${adminId}\n`);

    if (!isValidObjectId(adminId)) {
      console.log("❌ Invalid admin ID format");
      return;
    }

    client = await connectToDatabase();
    const db = client.db();
    const usersCollection = db.collection("users");

    const admin = await usersCollection.findOne({
      _id: new ObjectId(adminId),
      role: "admin",
    });

    if (!admin) {
      console.log("❌ Admin user not found");
      return;
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(adminId) },
      {
        $set: {
          "metadata.isActive": true,
          "metadata.updatedAt": new Date(),
        },
        $unset: {
          "metadata.deactivatedAt": "",
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log("✅ Admin user activated successfully");
      console.log(`- Email: ${admin.auth?.email || admin.personalInfo?.contact?.email}`);
      console.log(`- Name: ${admin.personalInfo?.firstName} ${admin.personalInfo?.lastName}`);
    }
  } catch (error) {
    console.error("❌ Error activating admin:", error.message);
  } finally {
    if (client) await client.close();
  }
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("\n📋 Admin Management Tool\n");
    console.log("Usage:");
    console.log("  node scripts/admin-manager.js list");
    console.log("  node scripts/admin-manager.js create <email> <password> <firstName> <lastName> [phone]");
    console.log("  node scripts/admin-manager.js deactivate <adminId>");
    console.log("  node scripts/admin-manager.js activate <adminId>");
    console.log("\nExamples:");
    console.log("  node scripts/admin-manager.js list");
    console.log("  node scripts/admin-manager.js create admin@example.com password123 John Doe");
    console.log("  node scripts/admin-manager.js deactivate 689190d3b4703104dd538c23");
    console.log("  node scripts/admin-manager.js activate 689190d3b4703104dd538c23");
    process.exit(1);
  }

  return {
    command: args[0],
    args: args.slice(1),
  };
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Operation cancelled");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  const { command, args } = parseArguments();

  switch (command) {
    case "list":
      listAdmins().catch(console.error);
      break;

    case "create":
      if (args.length < 4) {
        console.log("❌ Missing arguments for create command");
        console.log("Usage: node scripts/admin-manager.js create <email> <password> <firstName> <lastName> [phone]");
        process.exit(1);
      }
      createAdmin(args[0], args[1], args[2], args[3], args[4]).catch(console.error);
      break;

    case "deactivate":
      if (args.length < 1) {
        console.log("❌ Missing admin ID for deactivate command");
        console.log("Usage: node scripts/admin-manager.js deactivate <adminId>");
        process.exit(1);
      }
      deactivateAdmin(args[0]).catch(console.error);
      break;

    case "activate":
      if (args.length < 1) {
        console.log("❌ Missing admin ID for activate command");
        console.log("Usage: node scripts/admin-manager.js activate <adminId>");
        process.exit(1);
      }
      activateAdmin(args[0]).catch(console.error);
      break;

    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log("Available commands: list, create, deactivate, activate");
      process.exit(1);
  }
}
