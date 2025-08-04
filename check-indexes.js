const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function checkIndexes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully");

    const db = mongoose.connection.db;
    const collection = db.collection("users");
    const indexes = await collection.indexes();

    console.log("Current indexes on users collection:");
    indexes.forEach((index, i) => {
      console.log(`${i + 1}.`, JSON.stringify(index, null, 2));
    });

    // Also check for problematic documents
    const count = await collection.countDocuments();
    console.log(`\nTotal documents in users collection: ${count}`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
  }
}

checkIndexes();
