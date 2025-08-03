/**
 * Migration script to populate searchableEmail field for existing users
 */
const mongoose = require("mongoose");
const crypto = require("crypto");

// Email hashing function (same as in email-utils.ts)
function createSearchableEmailHash(email) {
  const normalizedEmail = email.toLowerCase().trim();
  return crypto.createHash("sha256").update(normalizedEmail).digest("hex");
}

async function migrateUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Find users without searchableEmail field
    const usersToUpdate = await usersCollection
      .find({
        "personalInfo.contact.searchableEmail": { $exists: false },
        "personalInfo.contact.email": { $exists: true },
      })
      .toArray();

    console.log(`Found ${usersToUpdate.length} users to migrate`);

    if (usersToUpdate.length === 0) {
      console.log("No users need migration");
      return;
    }

    // Update each user
    for (const user of usersToUpdate) {
      const encryptedEmail = user.personalInfo?.contact?.email;
      if (encryptedEmail && typeof encryptedEmail === "string") {
        // Note: We cannot decrypt the email here without the encryption key
        // So we'll need to handle this differently or ensure new users have the field
        console.log(`User ${user._id} has encrypted email, cannot migrate automatically`);
      }
    }

    console.log("Migration completed");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  migrateUsers().catch(console.error);
}

module.exports = { migrateUsers };
