#!/usr/bin/env node

/**
 * Test script to verify patient registration works without professional info validation errors
 */

const API_BASE_URL = "http://localhost:3001/api";

async function testPatientRegistration() {
  console.log("🧪 Testing Patient Registration Fix...\n");

  const testPatientData = {
    personalInfo: {
      firstName: "Test",
      lastName: "Patient",
      dateOfBirth: "1990-01-01",
      contact: {
        email: `test.patient.${Date.now()}@example.com`,
        phone: "+1234567890",
      },
    },
    password: "testpassword123",
    role: "patient",
    // Note: No professionalInfo or organizationId for patients
  };

  try {
    console.log("📤 Sending patient registration request...");
    console.log("Data:", JSON.stringify(testPatientData, null, 2));

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPatientData),
    });

    const result = await response.json();

    console.log(`\n📥 Response Status: ${response.status}`);
    console.log("Response:", JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log("\n✅ SUCCESS: Patient registration completed without errors!");
      console.log(`✅ User created with ID: ${result.data.user.digitalIdentifier}`);
      console.log(`✅ Role: ${result.data.user.role}`);
      return true;
    } else {
      console.log("\n❌ FAILED: Patient registration still has errors");
      if (result.details) {
        console.log("Validation errors:", result.details);
      }
      return false;
    }
  } catch (error) {
    console.error("\n💥 ERROR: Failed to test patient registration:", error.message);
    return false;
  }
}

async function testDoctorRegistration() {
  console.log("\n🧪 Testing Doctor Registration (should require professional info)...\n");

  const testDoctorData = {
    personalInfo: {
      firstName: "Test",
      lastName: "Doctor",
      dateOfBirth: "1980-01-01",
      contact: {
        email: `test.doctor.${Date.now()}@example.com`,
        phone: "+1234567891",
      },
    },
    password: "testpassword123",
    role: "doctor",
    // Missing organizationId and professionalInfo - should fail
  };

  try {
    console.log("📤 Sending doctor registration request (incomplete)...");

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testDoctorData),
    });

    const result = await response.json();

    console.log(`\n📥 Response Status: ${response.status}`);

    if (!response.ok && result.details) {
      console.log("\n✅ SUCCESS: Doctor registration correctly requires professional info!");
      console.log(
        "Expected validation errors:",
        result.details.map((e) => e.path.join("."))
      );
      return true;
    } else {
      console.log("\n❌ FAILED: Doctor registration should require professional info");
      return false;
    }
  } catch (error) {
    console.error("\n💥 ERROR: Failed to test doctor registration:", error.message);
    return false;
  }
}

async function runTests() {
  console.log("🚀 Starting Registration Validation Tests\n");
  console.log("=" * 60);

  const patientTest = await testPatientRegistration();
  const doctorTest = await testDoctorRegistration();

  console.log("\n" + "=" * 60);
  console.log("📊 TEST SUMMARY:");
  console.log(`Patient Registration: ${patientTest ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Doctor Validation: ${doctorTest ? "✅ PASS" : "❌ FAIL"}`);

  if (patientTest && doctorTest) {
    console.log("\n🎉 All tests passed! The patient registration fix is working correctly.");
  } else {
    console.log("\n⚠️  Some tests failed. Please check the implementation.");
  }
}

// Run the tests
runTests().catch(console.error);
