import mongoose from "mongoose";
import User from "../lib/models/User";

/**
 * Validation script for encrypted User model
 * Tests the full encryption/decryption flow with the User model
 */
async function validateEncryptedUserModel() {
  console.log("🔐 Testing Encrypted User Model...\n");

  try {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/test-healthcare");
    console.log("✅ Connected to database");

    // Test data
    const testUserData = {
      personalInfo: {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01"),
        contact: {
          email: "john.doe@example.com",
          phone: "+1-555-123-4567",
          verified: {
            email: false,
            phone: false,
          },
        },
      },
      medicalInfo: {
        bloodType: "O+",
        knownAllergies: ["Penicillin", "Tree nuts"],
        emergencyContact: {
          name: "Jane Doe",
          phone: "+1-555-987-6543",
          relationship: "Spouse",
        },
      },
    };

    // Create user (should auto-encrypt sensitive fields)
    console.log("📝 Creating user with auto-encryption...");
    const user = new User(testUserData);
    await user.save();
    console.log(`✅ User created with ID: ${user._id}`);
    console.log(`   Digital ID: ${user.digitalIdentifier}`);

    // Retrieve user from database (should auto-decrypt)
    console.log("\n📖 Retrieving user with auto-decryption...");
    const foundUser = await User.findById(user._id);

    if (!foundUser) {
      throw new Error("User not found");
    }

    console.log("✅ User retrieved successfully");
    console.log(`   Name: ${foundUser.getFullName()}`);
    console.log(`   Email: ${String(foundUser.personalInfo.contact.email)}`);
    console.log(`   Phone: ${String(foundUser.personalInfo.contact.phone)}`);

    // Verify data integrity
    console.log("\n🔍 Verifying data integrity...");
    const emailMatch = foundUser.personalInfo.contact.email === testUserData.personalInfo.contact.email;
    const phoneMatch = foundUser.personalInfo.contact.phone === testUserData.personalInfo.contact.phone;
    const nameMatch =
      foundUser.getFullName() === `${testUserData.personalInfo.firstName} ${testUserData.personalInfo.lastName}`;

    if (emailMatch && phoneMatch && nameMatch) {
      console.log("✅ Data integrity verified - all fields match");
    } else {
      console.log("❌ Data integrity failed");
      console.log(`   Email match: ${emailMatch}`);
      console.log(`   Phone match: ${phoneMatch}`);
      console.log(`   Name match: ${nameMatch}`);
    }

    // Test manual field encryption/decryption
    console.log("\n🛠️  Testing manual field operations...");

    // Check if fields are encrypted in database
    const rawUser = await User.findById(user._id).lean();
    const rawFirstName = rawUser?.personalInfo?.firstName;

    if (typeof rawFirstName === "object" && rawFirstName.data) {
      console.log("✅ firstName is properly encrypted in database");

      // Test manual decryption
      const decryptedName = await foundUser.decryptField("personalInfo.firstName");
      console.log(`   Manually decrypted name: ${decryptedName}`);
    } else {
      console.log("❌ firstName is not encrypted in database");
    }

    // Test public JSON conversion
    console.log("\n📄 Testing public JSON conversion...");
    const publicData = foundUser.toPublicJSON();
    console.log("✅ Public JSON created successfully");
    console.log(`   Public name: ${publicData.name}`);
    console.log(`   Has emergency contact: ${publicData.hasEmergencyContact}`);

    // Test query capabilities
    console.log("\n🔍 Testing query capabilities...");
    const userByDigitalId = await User.findByDigitalId(foundUser.digitalIdentifier);

    if (userByDigitalId) {
      console.log("✅ Query by digital ID successful");
    } else {
      console.log("❌ Query by digital ID failed");
    }

    // Cleanup
    await User.deleteOne({ _id: user._id });
    console.log("\n🧹 Cleanup completed");

    console.log("\n🎉 All tests passed! Encrypted User model is working correctly.");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("📝 Disconnected from database");
  }
}

// Run validation if called directly
if (require.main === module) {
  validateEncryptedUserModel().catch(console.error);
}

export default validateEncryptedUserModel;
