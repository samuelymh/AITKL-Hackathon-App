const mongoose = require('mongoose');

// Import the models
const Organization = require('../lib/models/Organization.ts').default;
const { connectToDatabase } = require('../lib/db.connection.ts');

const sampleOrganizations = [
  {
    organizationInfo: {
      name: "General Hospital",
      type: "hospital",
      registrationNumber: "GH001",
      description: "A leading healthcare facility providing comprehensive medical services"
    },
    address: {
      street: "123 Medical Center Drive",
      city: "Houston",
      state: "Texas",
      postalCode: "77001",
      country: "United States"
    },
    contact: {
      phone: "+1-713-555-0100",
      email: "info@generalhospital.com",
      website: "https://www.generalhospital.com"
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin"
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date('2000-01-01')
    }
  },
  {
    organizationInfo: {
      name: "City Medical Center",
      type: "clinic",
      registrationNumber: "CMC002",
      description: "Community medical center serving the local area"
    },
    address: {
      street: "456 Healthcare Boulevard",
      city: "Austin",
      state: "Texas",
      postalCode: "73301",
      country: "United States"
    },
    contact: {
      phone: "+1-512-555-0200",
      email: "contact@citymedical.com",
      website: "https://www.citymedical.com"
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin"
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date('2010-06-15')
    }
  },
  {
    organizationInfo: {
      name: "MedPharm Pharmacy",
      type: "pharmacy",
      registrationNumber: "MP003",
      description: "Full-service pharmacy with prescription and OTC medications"
    },
    address: {
      street: "789 Pharmacy Lane",
      city: "Dallas",
      state: "Texas",
      postalCode: "75201",
      country: "United States"
    },
    contact: {
      phone: "+1-214-555-0300",
      email: "info@medpharm.com",
      website: "https://www.medpharm.com"
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin"
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date('2015-03-20')
    }
  },
  {
    organizationInfo: {
      name: "Wellness Clinic",
      type: "clinic",
      registrationNumber: "WC004",
      description: "Specialized wellness and preventive care clinic"
    },
    address: {
      street: "321 Wellness Way",
      city: "San Antonio",
      state: "Texas",
      postalCode: "78201",
      country: "United States"
    },
    contact: {
      phone: "+1-210-555-0400",
      email: "hello@wellnessclinic.com",
      website: "https://www.wellnessclinic.com"
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin"
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date('2018-09-10')
    }
  },
  {
    organizationInfo: {
      name: "Metro Pharmacy",
      type: "pharmacy",
      registrationNumber: "MP005",
      description: "Urban pharmacy serving downtown area"
    },
    address: {
      street: "555 Metro Street",
      city: "Houston",
      state: "Texas",
      postalCode: "77002",
      country: "United States"
    },
    contact: {
      phone: "+1-713-555-0500",
      email: "service@metropharmacy.com",
      website: "https://www.metropharmacy.com"
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin"
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date('2012-11-05')
    }
  }
];

async function seedOrganizations() {
  try {
    console.log('Connecting to database...');
    await connectToDatabase();
    
    console.log('Checking existing organizations...');
    const existingCount = await Organization.countDocuments();
    console.log(`Found ${existingCount} existing organizations`);
    
    if (existingCount === 0) {
      console.log('Seeding organizations...');
      
      for (const orgData of sampleOrganizations) {
        // Add audit fields
        orgData.auditCreatedBy = 'system-seed';
        orgData.auditCreatedDateTime = new Date();
        
        const organization = new Organization(orgData);
        await organization.save();
        console.log(`Created organization: ${orgData.organizationInfo.name}`);
      }
      
      console.log(`Successfully seeded ${sampleOrganizations.length} organizations`);
    } else {
      console.log('Organizations already exist, skipping seed');
    }
    
    // Verify organizations were created
    const finalCount = await Organization.countDocuments();
    const verifiedCount = await Organization.countDocuments({ 'verification.isVerified': true });
    console.log(`Total organizations: ${finalCount}`);
    console.log(`Verified organizations: ${verifiedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding organizations:', error);
    process.exit(1);
  }
}

seedOrganizations();
