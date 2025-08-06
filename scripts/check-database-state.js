#!/usr/bin/env node
/**
 * Check Current Database State
 * This script checks what data exists in the database
 */

const fetch = require("node-fetch");

const BASE_URL = "http://localhost:3000";

async function checkDatabaseState() {
  console.log("🔍 Checking Database State");
  console.log("=========================\n");

  try {
    // Check users
    console.log("👥 Checking Users...");
    const usersResponse = await fetch(`${BASE_URL}/api/test/check-users`);
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log("✅ Users found:", usersData.totalUsers);
      if (usersData.users && usersData.users.length > 0) {
        usersData.users.forEach((user) => {
          console.log(`   - ${user.email} (${user.role}) - ID: ${user._id}`);
        });
      }
    } else {
      console.log("❌ Failed to check users");
    }

    console.log("\n📋 Checking Prescriptions...");
    const presResponse = await fetch(`${BASE_URL}/api/test/check-prescriptions`);
    if (presResponse.ok) {
      const presData = await presResponse.json();
      console.log("✅ Prescriptions found:", presData.totalPrescriptions);
      if (presData.prescriptions && presData.prescriptions.length > 0) {
        presData.prescriptions.forEach((pres) => {
          console.log(`   - ID: ${pres._id}, Status: ${pres.status}, Patient: ${pres.patientId}`);
        });
      }
    } else {
      console.log("❌ Failed to check prescriptions");
    }

    console.log("\n👨‍⚕️ Checking Practitioners...");
    const practResponse = await fetch(`${BASE_URL}/api/test/check-practitioners`);
    if (practResponse.ok) {
      const practData = await practResponse.json();
      console.log("✅ Practitioners found:", practData.totalPractitioners);
      if (practData.practitioners && practData.practitioners.length > 0) {
        practData.practitioners.forEach((pract) => {
          console.log(`   - ID: ${pract._id}, User: ${pract.userId}, Name: ${pract.firstName} ${pract.lastName}`);
        });
      }
    } else {
      console.log("❌ Failed to check practitioners");
    }

    console.log("\n🏥 Checking Organizations...");
    const orgResponse = await fetch(`${BASE_URL}/api/test/check-organizations`);
    if (orgResponse.ok) {
      const orgData = await orgResponse.json();
      console.log("✅ Organizations found:", orgData.totalOrganizations);
      if (orgData.organizations && orgData.organizations.length > 0) {
        orgData.organizations.forEach((org) => {
          console.log(`   - ID: ${org._id}, Name: ${org.name}, Type: ${org.type}`);
        });
      }
    } else {
      console.log("❌ Failed to check organizations");
    }
  } catch (error) {
    console.error("❌ Error checking database state:", error.message);
  }
}

checkDatabaseState();
