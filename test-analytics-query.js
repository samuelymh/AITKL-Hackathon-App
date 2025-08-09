const { MongoClient } = require("mongodb");

async function testAnalyticsQuery() {
  const uri =
    "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0";

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("healthapp");

    // Test the same query the analytics API uses
    const usersCollection = db.collection("users");

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // This is exactly what the analytics API should run
    const userAnalytics = await usersCollection
      .aggregate([
        { $match: { auditDeletedDateTime: { $exists: false } } },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: {
                $cond: [{ $gte: ["$auth.lastLogin", sevenDaysAgo] }, 1, 0],
              },
            },
            verifiedEmails: {
              $sum: {
                $cond: [{ $eq: ["$auth.emailVerified", true] }, 1, 0],
              },
            },
            verifiedPhones: {
              $sum: {
                $cond: [{ $eq: ["$auth.phoneVerified", true] }, 1, 0],
              },
            },
            lockedAccounts: {
              $sum: {
                $cond: [{ $eq: ["$auth.accountLocked", true] }, 1, 0],
              },
            },
          },
        },
      ])
      .toArray();

    console.log("\n=== ANALYTICS QUERY RESULT ===");
    console.log("Query result:", JSON.stringify(userAnalytics[0], null, 2));

    console.log("\n=== EXPECTED VS DASHBOARD ===");
    console.log("Expected totalUsers:", userAnalytics[0]?.totalUsers || 0);
    console.log("Dashboard shows: 2,847 users");

    if (userAnalytics[0]?.totalUsers === 43) {
      console.log("✅ Analytics query is correct");
      console.log("🚨 Issue: Dashboard is NOT using real API data");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

testAnalyticsQuery();
