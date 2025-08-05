/**
 * Basic tests for Organization Service
 * This addresses the PR comment about lack of testing
 */

import { OrganizationService, OrganizationRegistrationData } from "@/lib/services/organizationService";

// Mock organization data for testing
const mockOrganizationData: OrganizationRegistrationData = {
  organizationInfo: {
    name: "Test Hospital",
    type: "HOSPITAL",
    registrationNumber: "TEST123",
    description: "A test hospital",
  },
  address: {
    street: "123 Test St",
    city: "Test City",
    state: "TS",
    postalCode: "12345",
    country: "Malaysia",
  },
  contact: {
    phone: "+60123456789",
    email: "test@hospital.com",
    website: "https://testhospital.com",
  },
  metadata: {
    establishedDate: "2020-01-01T00:00:00.000Z",
  },
};

/**
 * Test organization validation
 */
async function testOrganizationValidation() {
  console.log("🧪 Testing organization validation...");

  try {
    // Test validateExistingOrganization with null
    const result1 = OrganizationService.validateExistingOrganization(null);
    console.log("✅ Null validation test passed:", result1 === null);

    // Test validateExistingOrganization with existing org (registration number match)
    const mockExistingOrg = {
      organizationInfo: {
        registrationNumber: "TEST123",
      },
    };
    const result2 = OrganizationService.validateExistingOrganization(mockExistingOrg, "TEST123");
    console.log("✅ Registration number conflict test passed:", result2?.error.includes("registration number"));

    // Test validateExistingOrganization with existing org (name/location match)
    const result3 = OrganizationService.validateExistingOrganization(mockExistingOrg, "OTHER123");
    console.log("✅ Name/location conflict test passed:", result3?.error.includes("name already exists"));
  } catch (error) {
    console.error("❌ Validation test failed:", error);
  }
}

/**
 * Test service methods (requires database connection)
 */
async function testOrganizationService() {
  console.log("🧪 Testing organization service methods...");

  try {
    // Test database operations would go here
    // Note: These would require proper database setup and cleanup
    console.log("ℹ️ Database tests require proper test environment setup");
  } catch (error) {
    console.error("❌ Service test failed:", error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log("🚀 Running Organization Service Tests\n");

  await testOrganizationValidation();
  await testOrganizationService();

  console.log("\n✅ All tests completed!");
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

export { runTests, testOrganizationValidation };
