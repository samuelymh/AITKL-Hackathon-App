#!/usr/bin/env node

// Simple API test with authentication
const LOGIN_URL = "http://localhost:3000/api/auth/login";
const PROFILE_URL = "http://localhost:3000/api/pharmacist/professional-info";
const ORG_URL = "http://localhost:3000/api/pharmacist/organizations";

// Secure credential handling
const testEmail = process.env.PHARMACIST_TEST_EMAIL || process.env.TEST_EMAIL;
const testPassword = process.env.PHARMACIST_TEST_PASSWORD || process.env.TEST_PASSWORD;

async function testWithAuth() {
  console.log("🧪 Testing Pharmacist Professional Profile APIs with Authentication");
  console.log("=".repeat(70));

  // Validate required environment variables
  if (!testEmail || !testPassword) {
    console.log("❌ Missing required environment variables:");
    console.log("   Please set PHARMACIST_TEST_EMAIL and PHARMACIST_TEST_PASSWORD");
    console.log("   Or set TEST_EMAIL and TEST_PASSWORD");
    console.log("\n   Example:");
    console.log("   export PHARMACIST_TEST_EMAIL='pharmhana@gmail.com'");
    console.log("   export PHARMACIST_TEST_PASSWORD='your-password'");
    console.log("   node scripts/test-pharmacist-api-with-auth.js");
    process.exit(1);
  }

  try {
    // Step 1: Login to get auth token
    console.log("\n🔐 Step 1: Logging in as pharmacist...");
    console.log(`   Email: ${testEmail}`);

    const loginResponse = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    if (!loginResponse.ok) {
      console.log("❌ Login failed. You may need to reset the password first.");
      console.log("   Response status:", loginResponse.status);
      const errorData = await loginResponse.json().catch(() => ({}));
      console.log("   Error:", errorData.error || "Unknown error");
      console.log("\n   💡 To reset password, run:");
      console.log(`   node scripts/reset-pharmacist-password.js ${testEmail}`);
      return;
    }

    const loginData = await loginResponse.json();
    const authToken = loginData.token;

    if (!authToken) {
      console.log("❌ No auth token received from login");
      return;
    }

    console.log("✅ Login successful! Auth token received.");

    // Step 2: Test Organizations API
    console.log("\n🏥 Step 2: Testing Organizations API...");
    const orgResponse = await fetch(`${ORG_URL}?verified=true&limit=5`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (orgResponse.ok) {
      const orgData = await orgResponse.json();
      console.log("✅ Organizations API working!");
      console.log(`   Found ${orgData.data?.organizations?.length || 0} organizations`);
      if (orgData.data?.organizations?.length > 0) {
        console.log(`   Sample: ${orgData.data.organizations[0].name} (${orgData.data.organizations[0].type})`);
      }
    } else {
      console.log("❌ Organizations API failed:", orgResponse.status);
    }

    // Step 3: Test Professional Info GET API
    console.log("\n👨‍⚕️ Step 3: Testing Professional Info GET API...");
    const profileGetResponse = await fetch(PROFILE_URL, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (profileGetResponse.ok) {
      const profileData = await profileGetResponse.json();
      console.log("✅ Professional Info GET API working!");
      console.log(`   Profile exists: ${profileData.data ? "Yes" : "No"}`);
      if (profileData.data) {
        console.log(`   License: ${profileData.data.licenseNumber || "Not set"}`);
        console.log(`   Specialty: ${profileData.data.specialty || "Not set"}`);
        console.log(`   Completion: ${profileData.data.completionPercentage || 0}%`);
      }
    } else {
      console.log("❌ Professional Info GET API failed:", profileGetResponse.status);
    }

    // Step 4: Test Professional Info POST API (create/update)
    console.log("\n💾 Step 4: Testing Professional Info POST API...");
    const testProfileData = {
      licenseNumber: "PH123456789",
      specialty: "Community Pharmacy",
      practitionerType: "pharmacist",
      yearsOfExperience: 5,
      currentPosition: "Staff Pharmacist",
      department: "Outpatient Pharmacy",
      certifications: [
        {
          name: "Board Certified Pharmacist",
          issuingBody: "Board of Pharmacy",
          issueDate: "2020-01-01",
          expiryDate: "2025-01-01",
          verificationStatus: "verified",
        },
      ],
      specializations: ["Community Pharmacy", "Medication Therapy Management"],
      languages: ["English", "Spanish"],
      continuingEducation: {
        totalHours: 30,
        lastCompletedDate: "2024-12-01",
        certifyingBody: "ACPE",
      },
      emergencyContact: {
        name: "John Doe",
        relationship: "Spouse",
        phone: "+1-555-123-4567",
        email: "john.doe@example.com",
      },
    };

    const profilePostResponse = await fetch(PROFILE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testProfileData),
    });

    if (profilePostResponse.ok) {
      const saveData = await profilePostResponse.json();
      console.log("✅ Professional Info POST API working!");
      console.log(`   Profile saved successfully`);
      console.log(`   Completion: ${saveData.data?.completionPercentage || 0}%`);
    } else {
      const errorData = await profilePostResponse.json().catch(() => ({}));
      console.log("❌ Professional Info POST API failed:", profilePostResponse.status);
      console.log("   Error:", errorData.error || "Unknown error");
    }
  } catch (error) {
    console.log("❌ Test failed with error:", error.message);
  }

  console.log("\n" + "=".repeat(70));
  console.log("🏁 API Tests completed!");
  console.log("\nTo access the web interface:");
  console.log("1. Go to: http://localhost:3000/login");
  console.log("2. Login with: pharmhana@gmail.com");
  console.log("3. Navigate to: http://localhost:3000/dashboard/pharmacist/professional-profile");
}

// Run the test
testWithAuth().catch(console.error);
