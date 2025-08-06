#!/usr/bin/env node

const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0";

async function findOrganizations() {
  let client;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = client.db();
    const orgsCollection = db.collection("organizations");

    const orgs = await orgsCollection.find({}).limit(3).toArray();

    console.log(`Found ${orgs.length} organizations:`);

    orgs.forEach((org, index) => {
      console.log(`${index + 1}. ID: ${org._id}`);
      console.log(`   Name: ${org.name}`);
      console.log(`   Status: ${org.status || "N/A"}`);
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

findOrganizations();
