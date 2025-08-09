const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

async function testAdminAPIs() {
  try {
    // Read .env.local for JWT secret
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const jwtSecret = envContent.match(/JWT_SECRET=(.+)/)?.[1];

    if (!jwtSecret) {
      console.error('JWT_SECRET not found in .env.local');
      process.exit(1);
    }

    // Create admin token
    const token = jwt.sign(
      { 
        userId: 'admin-test', 
        userType: 'admin',
        role: 'admin'
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    console.log('🔑 Generated admin token for testing');
    console.log('📊 Testing analytics API...');

    // Test analytics API
    const analyticsRes = await fetch('http://localhost:3001/api/admin/analytics', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const analyticsData = await analyticsRes.json();
    console.log('✅ Analytics API Response:');
    console.log(JSON.stringify(analyticsData, null, 2));

    console.log('\n🚨 Testing alerts API...');

    // Test alerts API
    const alertsRes = await fetch('http://localhost:3001/api/admin/alerts', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const alertsData = await alertsRes.json();
    console.log('✅ Alerts API Response:');
    console.log(JSON.stringify(alertsData, null, 2));

    console.log('\n🔍 Testing alerts API with filters...');

    // Test alerts API with filters
    const filteredAlertsRes = await fetch('http://localhost:3001/api/admin/alerts?type=security&severity=high', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const filteredAlertsData = await filteredAlertsRes.json();
    console.log('✅ Filtered Alerts API Response:');
    console.log(JSON.stringify(filteredAlertsData, null, 2));

  } catch (error) {
    console.error('❌ API Test Error:', error);
  }
}

testAdminAPIs();
