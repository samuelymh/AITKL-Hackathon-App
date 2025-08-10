const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI;

async function checkUserStructure() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    // Get a sample user to see the full structure
    const sampleUser = await db.collection("users").findOne({
      _id: new ObjectId("6896828ff2f4b37047a1d85d"),
    });

    console.log("=== Sample User Structure ===");
    console.log(JSON.stringify(sampleUser, null, 2));

    // Check all users and their roles
    const allUsers = await db.collection("users").find({}).toArray();
    console.log("\n=== All Users Role Analysis ===");
    console.log("Total users:", allUsers.length);

    const roleCount = {};
    const usersWithoutRole = [];

    allUsers.forEach((user) => {
      if (user.role) {
        roleCount[user.role] = (roleCount[user.role] || 0) + 1;
      } else {
        usersWithoutRole.push(user._id.toString());
      }
    });

    console.log("Role distribution:", roleCount);
    console.log("Users without role:", usersWithoutRole.length);
    console.log("Sample users without role:", usersWithoutRole.slice(0, 5));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

checkUserStructure();
