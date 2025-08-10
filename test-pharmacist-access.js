const connectToDatabase = require('./lib/mongodb').default;
const User = require('./lib/models/User').default;
const Practitioner = require('./lib/models/Practitioner').default;
const OrganizationMember = require('./lib/models/OrganizationMember').default;
const AuthorizationGrant = require('./lib/models/AuthorizationGrant').default;

async function testPharmacistAccess() {
  try {
    console.log('Connecting to database...');
    await connectToDatabase();
    
    // Find a pharmacist user
    console.log('Looking for pharmacist user...');
    const pharmacistUser = await User.findOne({ role: 'pharmacist' });
    if (!pharmacistUser) {
      console.log('❌ No pharmacist user found');
      return;
    }
    
    console.log('✅ Found pharmacist:', pharmacistUser.digitalIdentifier);
    
    // Find practitioner record
    console.log('Looking for practitioner record...');
    const practitioner = await Practitioner.findOne({ userId: pharmacistUser._id });
    if (!practitioner) {
      console.log('❌ No practitioner record found for pharmacist');
      return;
    }
    
    console.log('✅ Found practitioner record');
    
    // Find organization membership
    console.log('Looking for organization membership...');
    const orgMember = await OrganizationMember.findOne({ 
      practitionerId: practitioner._id, 
      status: 'active' 
    });
    if (!orgMember) {
      console.log('❌ No active organization membership found');
      return;
    }
    
    console.log('✅ Found organization membership for org:', orgMember.organizationId);
    
    // Find a patient with authorization
    console.log('Looking for patient with authorization...');
    const patientUser = await User.findOne({ role: 'patient' });
    if (!patientUser) {
      console.log('❌ No patient found');
      return;
    }
    
    console.log('✅ Found patient:', patientUser.digitalIdentifier);
    
    // Check for authorization grant
    console.log('Checking for authorization grant...');
    const grant = await AuthorizationGrant.findOne({
      userId: patientUser._id,
      organizationId: orgMember.organizationId,
      $or: [
        { 'grantDetails.status': 'ACTIVE', 'grantDetails.expiresAt': { $gt: new Date() } },
        { status: 'approved', expiresAt: { $gt: new Date() } }
      ]
    });
    
    if (!grant) {
      console.log('❌ No active authorization grant found');
      
      // Let's check what grants exist for this patient
      const allGrants = await AuthorizationGrant.find({ userId: patientUser._id });
      console.log('Found', allGrants.length, 'total grants for patient');
      allGrants.forEach((g, i) => {
        console.log(`Grant ${i + 1}:`, {
          status: g.status || g.grantDetails?.status,
          expiresAt: g.expiresAt || g.grantDetails?.expiresAt,
          organizationId: g.organizationId,
          accessScope: g.accessScope
        });
      });
      return;
    }
    
    console.log('✅ Found authorization grant:');
    console.log('  Status:', grant.status || grant.grantDetails?.status);
    console.log('  Expires:', grant.expiresAt || grant.grantDetails?.expiresAt);
    console.log('  Access scope:', JSON.stringify(grant.accessScope, null, 2));
    
    console.log('\n✅ All checks passed! Pharmacist should have access to patient data.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

testPharmacistAccess();
