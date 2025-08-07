#!/usr/bin/env tsx

/**
 * Admin Management CLI
 *
 * Usage:
 *   npm run admin:create <email> <password> <firstName> <lastName>
 *   npm run admin:list
 *   npm run admin:deactivate <adminId>
 */

import { AdminCreationService } from "../lib/services/adminCreationService";

async function main() {
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case "create":
        await handleCreateAdmin(args);
        break;

      case "list":
        await handleListAdmins();
        break;

      case "deactivate":
        await handleDeactivateAdmin(args);
        break;

      default:
        showUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error(
      "❌ Error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  }
}

async function handleCreateAdmin(args: string[]) {
  if (args.length < 4) {
    console.log(
      "Usage: npm run admin:create <email> <password> <firstName> <lastName> [phone]",
    );
    process.exit(1);
  }

  const [email, password, firstName, lastName, phone] = args;

  console.log("🚀 Creating admin user...");

  const result = await AdminCreationService.createAdmin({
    email,
    password,
    firstName,
    lastName,
    phone,
  });

  if (result.success) {
    console.log("✅ Admin user created successfully!");
    console.log("📧 Email:", result.admin.email);
    console.log("👤 Name:", result.admin.name);
    console.log("🆔 Digital ID:", result.admin.digitalIdentifier);
    console.log("🔑 Role:", result.admin.role);
    console.log("📅 Created:", result.admin.createdAt);
    console.log("");
    console.log("🎯 Next steps:");
    console.log("1. Admin can now log in at /login");
    console.log("2. Access admin panel at /admin/organizations/verification");
    console.log("3. Start verifying organization registrations");
  }
}

async function handleListAdmins() {
  console.log("📋 Listing all admin users...");

  const admins = await AdminCreationService.listAdmins();

  if (admins.length === 0) {
    console.log("ℹ️  No admin users found");
    return;
  }

  console.log(`\n👥 Found ${admins.length} admin user(s):\n`);

  admins.forEach((admin, index) => {
    console.log(`${index + 1}. ${admin.name}`);
    console.log(`   📧 Email: ${admin.email}`);
    console.log(`   🆔 ID: ${admin.id}`);
    console.log(`   ✅ Verified: ${admin.emailVerified ? "Yes" : "No"}`);
    console.log(
      `   🕐 Last Login: ${admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : "Never"}`,
    );
    console.log(`   📅 Created: ${new Date(admin.createdAt).toLocaleString()}`);
    console.log("");
  });
}

async function handleDeactivateAdmin(args: string[]) {
  if (args.length < 1) {
    console.log("Usage: npm run admin:deactivate <adminId>");
    console.log('Use "npm run admin:list" to see admin IDs');
    process.exit(1);
  }

  const [adminId] = args;

  console.log("⚠️  Deactivating admin user...");

  const result = await AdminCreationService.deactivateAdmin(
    adminId,
    "system-cli",
  );

  if (result.success) {
    console.log("✅ Admin user deactivated successfully");
    console.log("ℹ️  The user account has been soft-deleted and locked");
  }
}

function showUsage() {
  console.log("Admin Management CLI\n");
  console.log("Available commands:");
  console.log(
    "  create <email> <password> <firstName> <lastName> [phone]  - Create new admin user",
  );
  console.log(
    "  list                                                      - List all admin users",
  );
  console.log(
    "  deactivate <adminId>                                      - Deactivate admin user",
  );
  console.log("");
  console.log("Examples:");
  console.log(
    "  npm run admin:create admin@hospital.com SecurePass123 John Doe",
  );
  console.log("  npm run admin:list");
  console.log("  npm run admin:deactivate 64a1b2c3d4e5f6789012345a");
}

main();
