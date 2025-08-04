const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function fixIndexes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully");

    const db = mongoose.connection.db;
    const collection = db.collection("users");

    // List current indexes
    console.log("Current indexes:");
    const indexes = await collection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}.`, index.name, JSON.stringify(index.key));
    });

    // Drop the problematic searchableEmail index if it exists
    try {
      await collection.dropIndex("personalInfo.contact.searchableEmail_1");
      console.log("Dropped personalInfo.contact.searchableEmail_1 index");
    } catch (error) {
      console.log(
        "Index personalInfo.contact.searchableEmail_1 does not exist or could not be dropped:",
        error.message
      );
    }

    // Also try to drop any email-related unique indexes
    try {
      await collection.dropIndex("personalInfo.contact.email_1");
      console.log("Dropped personalInfo.contact.email_1 index");
    } catch (error) {
      console.log("Index personalInfo.contact.email_1 does not exist or could not be dropped:", error.message);
    }

    console.log("Index cleanup completed");
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
  }
}

fixIndexes();
