#!/usr/bin/env tsx

/**
 * Security Test Suite for Notification Queue API
 * Tests authentication, authorization, and input validation
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "test-admin-key";
const CRON_API_KEY = process.env.CRON_API_KEY || "test-cron-key";
const INVALID_API_KEY = "invalid-key-12345";

interface TestResult {
  name: string;
  passed: boolean;
  response?: any;
  error?: string;
}

async function makeRequest(
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<{ status: number; data: any }> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { method = "GET", headers = {}, body } = options;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    throw new Error(`Request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runSecurityTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log("🔐 Starting Notification Queue API Security Tests");
  console.log("=".repeat(60));

  // Test 1: No Authentication - Should Fail
  try {
    const response = await makeRequest("/api/admin/queue/process", { method: "POST" });
    results.push({
      name: "No Authentication",
      passed: response.status === 401,
      response: response.data,
    });
  } catch (error) {
    results.push({
      name: "No Authentication",
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Invalid API Key - Should Fail
  try {
    const response = await makeRequest("/api/admin/queue/process", {
      method: "POST",
      headers: { "x-api-key": INVALID_API_KEY },
    });
    results.push({
      name: "Invalid API Key",
      passed: response.status === 401,
      response: response.data,
    });
  } catch (error) {
    results.push({
      name: "Invalid API Key",
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 3: Valid Admin API Key - Should Succeed
  try {
    const response = await makeRequest("/api/admin/queue/process", {
      method: "GET",
      headers: { "x-api-key": ADMIN_API_KEY },
    });
    results.push({
      name: "Valid Admin API Key",
      passed: response.status === 200 && response.data.success === true,
      response: response.data,
    });
  } catch (error) {
    results.push({
      name: "Valid Admin API Key",
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 4: Valid Cron API Key - Should Succeed
  try {
    const response = await makeRequest("/api/admin/queue/process", {
      method: "GET",
      headers: { "x-api-key": CRON_API_KEY },
    });
    results.push({
      name: "Valid Cron API Key",
      passed: response.status === 200 && response.data.success === true,
      response: response.data,
    });
  } catch (error) {
    results.push({
      name: "Valid Cron API Key",
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 5: Invalid Batch Size - Should Fail
  try {
    const response = await makeRequest("/api/admin/queue/process", {
      method: "POST",
      headers: { "x-api-key": ADMIN_API_KEY },
      body: { batchSize: 150 }, // Invalid: > 100
    });
    results.push({
      name: "Invalid Batch Size (>100)",
      passed: response.status === 400,
      response: response.data,
    });
  } catch (error) {
    results.push({
      name: "Invalid Batch Size (>100)",
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 6: Valid Batch Size - Should Succeed
  try {
    const response = await makeRequest("/api/admin/queue/process", {
      method: "POST",
      headers: { "x-api-key": ADMIN_API_KEY },
      body: { batchSize: 5 },
    });
    results.push({
      name: "Valid Batch Size",
      passed: response.status === 200 && response.data.success === true,
      response: response.data,
    });
  } catch (error) {
    results.push({
      name: "Valid Batch Size",
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 7: Invalid Cleanup Hours - Should Fail
  try {
    const response = await makeRequest("/api/admin/queue/cleanup", {
      method: "POST",
      headers: { "x-api-key": ADMIN_API_KEY },
      body: { olderThanHours: 200 }, // Invalid: > 168
    });
    results.push({
      name: "Invalid Cleanup Hours (>168)",
      passed: response.status === 400,
      response: response.data,
    });
  } catch (error) {
    results.push({
      name: "Invalid Cleanup Hours (>168)",
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 8: Valid Cleanup Request - Should Succeed
  try {
    const response = await makeRequest("/api/admin/queue/cleanup", {
      method: "POST",
      headers: { "x-api-key": CRON_API_KEY },
      body: { olderThanHours: 48 },
    });
    results.push({
      name: "Valid Cleanup Request",
      passed: response.status === 200 && response.data.success === true,
      response: response.data,
    });
  } catch (error) {
    results.push({
      name: "Valid Cleanup Request",
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 9: Cleanup Info Request - Should Succeed
  try {
    const response = await makeRequest("/api/admin/queue/cleanup", {
      method: "GET",
      headers: { "x-api-key": ADMIN_API_KEY },
    });
    results.push({
      name: "Cleanup Info Request",
      passed: response.status === 200 && response.data.success === true,
      response: response.data,
    });
  } catch (error) {
    results.push({
      name: "Cleanup Info Request",
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 10: Malformed JSON - Should Fail Gracefully
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/queue/process`, {
      method: "POST",
      headers: {
        "x-api-key": ADMIN_API_KEY,
        "Content-Type": "application/json",
      },
      body: "{ invalid json }", // Malformed JSON
    });
    const data = await response.json();
    results.push({
      name: "Malformed JSON Handling",
      passed: response.status === 200, // Should use default values
      response: data,
    });
  } catch (error) {
    results.push({
      name: "Malformed JSON Handling",
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

function displayResults(results: TestResult[]): void {
  console.log("\n📊 Test Results");
  console.log("-".repeat(60));

  let passed = 0;
  let failed = 0;

  results.forEach((result, index) => {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${index + 1}. ${result.name}: ${status}`);

    if (!result.passed) {
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.response) {
        console.log(`   Response: ${JSON.stringify(result.response, null, 2)}`);
      }
    }

    if (result.passed) passed++;
    else failed++;
  });

  console.log("\n" + "=".repeat(60));
  console.log(`📈 Summary: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log("🎉 All security tests passed! The API is properly secured.");
  } else {
    console.log("⚠️  Some tests failed. Please review the security implementation.");
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runSecurityTests()
    .then(displayResults)
    .then(() => {
      console.log("🏁 Security testing completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Security testing failed:", error);
      process.exit(1);
    });
}

export { runSecurityTests, displayResults };
