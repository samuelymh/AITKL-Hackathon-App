const mongoose = require("mongoose");

// Define User schema inline
const userSchema = new mongoose.Schema(
  {
    auth: {
      role: { type: String, enum: ["patient", "doctor", "pharmacist", "admin"] },
    },
    personalInfo: {
      contact: {
        email: String,
      },
    },
    digitalIdentifier: String,
  },
  { collection: "users" }
);

const User = mongoose.model("User", userSchema);

mongoose
  .connect(
    "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(async () => {
    console.log("Connected to database");

    // Check all admin users with detailed info
    const adminUsers = await User.find({
      "auth.role": "admin",
    });

    console.log("All admin users found:");
    adminUsers.forEach((user, index) => {
      console.log(`Admin ${index + 1}:`);
      console.log("  ID:", user._id);
      console.log("  Digital ID:", user.digitalIdentifier);
      console.log("  Role:", user.auth?.role);
      console.log("  Email:", user.personalInfo?.contact?.email);
      console.log("  ---");
    });

    if (adminUsers.length === 0) {
      console.log("No admin users found in database");
    }

    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
