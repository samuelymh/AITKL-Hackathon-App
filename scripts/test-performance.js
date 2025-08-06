#!/usr/bin/env node

/**
 * Performance Test Script for N+1 Query Detection
 * This script tests API endpoints to identify potential N+1 query problems
 */

const https = require('https');
const http = require('http');

const API_BASE_URL = 'http://localhost:3000';

// Mock JWT token for testing (you'll need to replace this with a real token)
const TEST_TOKEN = process.env.TEST_JWT_TOKEN;

if (!TEST_TOKEN) {
  console.error('❌ TEST_JWT_TOKEN environment variable is required');
  console.log('💡 Get a token by logging in first, then set TEST_JWT_TOKEN=your_token');
  process.exit(1);
}

async function makeAPIRequest(endpoint, token) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(endpoint, API_BASE_URL);
    const isHttps = fullUrl.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    const startTime = Date.now();

    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || (isHttps ? 443 : 80),
      path: fullUrl.pathname + fullUrl.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    const req = requestModule.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          const json = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: json,
            duration,
            headers: res.headers
          });
        } catch (parseError) {
          resolve({
            status: res.statusCode,
            data,
            duration,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testEndpointPerformance(endpoint, description, expectedItems = 10) {
  console.log(`\n📊 Testing: ${description}`);
  console.log(`   Endpoint: ${endpoint}`);
  
  try {
    const result = await makeAPIRequest(endpoint, TEST_TOKEN);
    
    if (result.status !== 200) {
      console.log(`❌ Failed: HTTP ${result.status}`);
      console.log(`   Response: ${JSON.stringify(result.data).substring(0, 200)}...`);
      return null;
    }

    const itemCount = result.data?.data?.length || 
                     result.data?.data?.grants?.length || 
                     result.data?.data?.prescriptions?.length || 0;
    
    const avgTimePerItem = itemCount > 0 ? result.duration / itemCount : result.duration;
    
    console.log(`✅ Success: ${result.duration}ms total`);
    console.log(`   Items: ${itemCount}`);
    console.log(`   Avg time per item: ${avgTimePerItem.toFixed(2)}ms`);
    
    // Alert if performance is poor
    if (avgTimePerItem > 50) {
      console.log(`⚠️  PERFORMANCE WARNING: ${avgTimePerItem.toFixed(2)}ms per item is high!`);
      console.log(`   This might indicate N+1 query problems`);
    }
    
    if (result.duration > 2000) {
      console.log(`⚠️  SLOW ENDPOINT: ${result.duration}ms total response time`);
    }

    return {
      endpoint,
      duration: result.duration,
      itemCount,
      avgTimePerItem,
      status: result.status
    };

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function runPerformanceTests() {
  console.log('🚀 Performance Testing for N+1 Query Detection');
  console.log('================================================\n');

  const tests = [
    {
      endpoint: '/api/patient/authorization-history?limit=20',
      description: 'Patient Authorization History (20 items)',
      expectedItems: 20
    },
    {
      endpoint: '/api/pharmacist/prescriptions?limit=20',
      description: 'Pharmacist Prescriptions (20 items)',
      expectedItems: 20
    },
    {
      endpoint: '/api/pharmacist/prescriptions?status=pending&limit=20',
      description: 'Pharmacist Pending Prescriptions (20 items)',
      expectedItems: 20
    },
    {
      endpoint: '/api/pharmacist/stats',
      description: 'Pharmacist Dashboard Stats',
      expectedItems: 1
    },
    {
      endpoint: '/api/notifications?limit=20',
      description: 'User Notifications (20 items)',
      expectedItems: 20
    }
  ];

  const results = [];

  for (const test of tests) {
    const result = await testEndpointPerformance(
      test.endpoint, 
      test.description, 
      test.expectedItems
    );
    
    if (result) {
      results.push(result);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📈 Performance Summary');
  console.log('=====================');
  
  results.forEach(result => {
    const status = result.avgTimePerItem > 50 ? '⚠️' : 
                   result.avgTimePerItem > 20 ? '⚡' : '✅';
    console.log(`${status} ${result.endpoint}: ${result.duration}ms (${result.avgTimePerItem.toFixed(2)}ms/item)`);
  });

  // Identify potentially problematic endpoints
  const slowEndpoints = results.filter(r => r.avgTimePerItem > 50);
  if (slowEndpoints.length > 0) {
    console.log('\n🔍 Potential N+1 Query Issues:');
    slowEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint.endpoint}: ${endpoint.avgTimePerItem.toFixed(2)}ms per item`);
    });
    
    console.log('\n💡 Recommendations:');
    console.log('   - Use aggregation pipelines with $lookup for joins');
    console.log('   - Implement proper populate() with select fields');
    console.log('   - Consider pagination for large datasets');
    console.log('   - Add database indexes for frequently queried fields');
  } else {
    console.log('\n🎉 No obvious N+1 query issues detected!');
  }
}

runPerformanceTests().catch(console.error);
