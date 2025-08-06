#!/usr/bin/env node

const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0";

async function findPatients() {
  let client;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = client.db();
    const usersCollection = db.collection("users");

    // Find users with patient role or any user with digitalIdentifier
    const patients = await usersCollection
      .find({
        $or: [{ role: "patient" }, { digitalIdentifier: { $exists: true, $ne: null } }],
      })
      .limit(5)
      .toArray();

    console.log(`Found ${patients.length} patients/users:`);

    patients.forEach((patient, index) => {
      console.log(`${index + 1}. Digital ID: ${patient.digitalIdentifier}`);
      console.log(`   Role: ${patient.role}`);
      console.log(`   Name: ${patient.personalInfo?.firstName || "N/A"} ${patient.personalInfo?.lastName || "N/A"}`);
      console.log(`   ID: ${patient._id}`);
      console.log("");
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

findPatients();
