#!/usr/bin/env node

const { runMigration } = require("../lib/services/encryption-migration");

/**
 * CLI script for running encryption migrations
 * Usage:
 *   node scripts/run-migration.js migrate [--dry-run] [--batch-size=100]
 *   node scripts/run-migration.js verify
 *   node scripts/run-migration.js rollback [--dry-run]
 */

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || !["migrate", "verify", "rollback"].includes(command)) {
    console.error("Usage: node run-migration.js <migrate|verify|rollback> [options]");
    console.error("");
    console.error("Commands:");
    console.error("  migrate   - Encrypt existing user data");
    console.error("  verify    - Verify migration integrity");
    console.error("  rollback  - Rollback encryption (dev only)");
    console.error("");
    console.error("Options:");
    console.error("  --dry-run     - Show what would be done without making changes");
    console.error("  --batch-size  - Number of records to process at once (default: 100)");
    process.exit(1);
  }

  // Parse options
  const options = {
    dryRun: args.includes("--dry-run"),
    batchSize: 100,
  };

  // Parse batch size
  const batchSizeArg = args.find((arg) => arg.startsWith("--batch-size="));
  if (batchSizeArg) {
    options.batchSize = parseInt(batchSizeArg.split("=")[1], 10);
    if (isNaN(options.batchSize) || options.batchSize < 1) {
      console.error("Invalid batch size. Must be a positive integer.");
      process.exit(1);
    }
  }

  console.log(`Running ${command} with options:`, options);
  console.log("");

  try {
    await runMigration(command, options);
    console.log(`\n✅ ${command} completed successfully`);
  } catch (error) {
    console.error(`\n❌ ${command} failed:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
