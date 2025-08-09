const { MongoClient } = require("mongodb");

async function checkUserCount() {
  // Use the MongoDB URI from your .env.local file
  const uri =
    "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0";

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("healthapp");
    const usersCollection = db.collection("users");

    // Count total users (not deleted)
    const totalUsers = await usersCollection.countDocuments({
      auditDeletedDateTime: { $exists: false },
    });

    // Count users by role
    const usersByRole = await usersCollection
      .aggregate([
        { $match: { auditDeletedDateTime: { $exists: false } } },
        { $group: { _id: "$auth.role", count: { $sum: 1 } } },
      ])
      .toArray();

    // Count active users (logged in within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeUsers = await usersCollection.countDocuments({
      "auth.lastLogin": { $gte: sevenDaysAgo },
      auditDeletedDateTime: { $exists: false },
    });

    // Count verified emails
    const verifiedEmails = await usersCollection.countDocuments({
      "auth.emailVerified": true,
      auditDeletedDateTime: { $exists: false },
    });

    console.log("\n=== ACTUAL DATABASE STATISTICS ===");
    console.log("Total users in DB:", totalUsers);
    console.log("Active users (7 days):", activeUsers);
    console.log("Verified emails:", verifiedEmails);
    console.log("\nUsers by role:");
    usersByRole.forEach((role) => {
      console.log(`  ${role._id}: ${role.count}`);
    });

    console.log("\n=== COMPARISON ===");
    console.log("Dashboard shows 2,847 users");
    console.log("Actual DB has:", totalUsers, "users");
    console.log("Difference:", Math.abs(2847 - totalUsers));

    if (totalUsers !== 2847) {
      console.log("\n⚠️  WARNING: Dashboard is NOT showing real data!");
    } else {
      console.log("\n✅ Dashboard matches database");
    }
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  } finally {
    await client.close();
  }
}

checkUserCount();
