const { MongoClient } = require('mongodb');

async function verify() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  console.log('=== Verification Results ===');
  const count = await db.collection('organizationMembers').countDocuments();
  console.log('organizationMembers (camelCase) count:', count);
  
  const sample = await db.collection('organizationMembers').findOne({});
  if (sample) {
    console.log('Sample role:', sample.membershipDetails?.role);
    console.log('Sample status:', sample.status);
    console.log('Has permissions:', !!sample.permissions);
    console.log('Is verified:', sample.verificationInfo?.isVerified);
  }
  
  await client.close();
}

verify().catch(console.error);
