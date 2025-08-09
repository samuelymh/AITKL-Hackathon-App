const mongoose = require("mongoose");

// MongoDB connection
async function connectToDatabase() {
  if (mongoose.connections[0].readyState) {
    return;
  }

  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb+srv://hackathon-user:hackathon123@cluster0.mongodb.net/healthcare_platform?retryWrites=true&w=majority"
    );
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

// Test script to debug authorization grant query
async function debugGrantQuery() {
  try {
    await connectToDatabase();

    // The patient's ObjectId from your grant document
    const patientUserId = new mongoose.Types.ObjectId("68968272ee09d779cbab284a");
    const organizationId = new mongoose.Types.ObjectId("6891d7c43527d8696402570c");

    console.log("Searching for grant with:");
    console.log("userId:", patientUserId);
    console.log("organizationId:", organizationId);
    console.log("Current date:", new Date());

    // Query the collection directly using the same logic as the API
    const db = mongoose.connection.db;
    const collection = db.collection("authorization_grants");

    // Check if collection exists and has documents
    const totalCount = await collection.countDocuments();
    console.log("\nTotal documents in authorization_grants collection:", totalCount);

    // Query using the exact same logic as the API
    const query1 = {
      userId: patientUserId,
      organizationId: organizationId,
      $or: [
        { "grantDetails.status": "ACTIVE", "grantDetails.expiresAt": { $gt: new Date() } },
        { status: "approved", expiresAt: { $gt: new Date() } },
      ],
    };

    console.log("\nQuery 1 (API logic):");
    console.log(JSON.stringify(query1, null, 2));

    const result1 = await collection.findOne(query1);
    console.log("Result 1:", result1 ? "FOUND" : "NOT FOUND");
    if (result1) {
      console.log("Grant details:", {
        status: result1.grantDetails?.status,
        expiresAt: result1.grantDetails?.expiresAt,
        accessScope: result1.accessScope,
      });
    }

    // Try a simpler query to see if the grant exists at all
    const query2 = {
      userId: patientUserId,
      organizationId: organizationId,
    };

    console.log("\nQuery 2 (simple userId + organizationId):");
    const result2 = await collection.findOne(query2);
    console.log("Result 2:", result2 ? "FOUND" : "NOT FOUND");
    if (result2) {
      console.log("Grant details:", {
        status: result2.grantDetails?.status,
        expiresAt: result2.grantDetails?.expiresAt,
        expired: new Date() > new Date(result2.grantDetails?.expiresAt),
        accessScope: result2.accessScope,
      });
    }

    // Check if there are any grants for this user at all
    const query3 = { userId: patientUserId };
    const result3 = await collection.findOne(query3);
    console.log("\nQuery 3 (any grant for this user):", result3 ? "FOUND" : "NOT FOUND");

    // Check if there are any grants for this organization
    const query4 = { organizationId: organizationId };
    const result4 = await collection.findOne(query4);
    console.log("Query 4 (any grant for this org):", result4 ? "FOUND" : "NOT FOUND");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

debugGrantQuery();
