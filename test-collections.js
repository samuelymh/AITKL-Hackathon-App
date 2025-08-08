const { MongoClient } = require('mongodb');

async function testCollectionCount() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  console.log('=== Current Collection Counts ===');
  const orgMembersCount = await db.collection('organizationMembers').countDocuments();
  const practitionersCount = await db.collection('practitioners').countDocuments();
  
  console.log('Practitioners:', practitionersCount);
  console.log('Organization Members:', orgMembersCount);
  
  // Check if practitioners have organization memberships
  const practitionersWithOrgs = await db.collection('organizationMembers').distinct('practitionerId');
  console.log('Practitioners with organization memberships:', practitionersWithOrgs.length);
  
  if (practitionersCount > practitionersWithOrgs.length) {
    console.log('⚠️  Some practitioners are missing organization memberships');
    console.log('Missing:', practitionersCount - practitionersWithOrgs.length);
  } else {
    console.log('✅ All practitioners have organization memberships');
  }
  
  await client.close();
}

testCollectionCount().catch(console.error);
