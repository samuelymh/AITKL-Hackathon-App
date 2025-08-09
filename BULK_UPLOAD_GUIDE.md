# MongoDB Atlas Bulk Data Upload Guide

This guide explains how to upload bulk data to your MongoDB Atlas database using the provided scripts.

## 🚀 Quick Start

### 1. Environment Setup
Ensure your `.env.local` file has the MongoDB connection string:
```bash
MONGODB_URI=mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0
```

### 2. Install Dependencies
```bash
npm install bcryptjs mongodb
```

### 3. Choose Your Upload Method

#### Option A: Quick Essential Data (Recommended for Testing)
Uploads minimal data to get the app running quickly:
```bash
node scripts/quick-upload.js
```

**What it creates:**
- ✅ 2 Organizations (Hospital + Pharmacy)
- ✅ 3 Users (Doctor + Pharmacist + Patient)  
- ✅ Basic relationships and permissions
- ✅ Sample authorization grant

**Login credentials provided:**
- Doctor: `dr.ahmad@centralmed.com` / `Doctor123!`
- Pharmacist: `siti@citypharmacy.com` / `Pharmacist123!`
- Patient: `john.tan@email.com` / `Patient123!`

#### Option B: Comprehensive Data Upload
Uploads a complete dataset with multiple entities:
```bash
node scripts/bulk-upload-data.js
```

**What it creates:**
- ✅ 5 Organizations (Multiple hospitals, clinics, pharmacies, labs)
- ✅ 10+ Users (Multiple doctors, pharmacists, patients, admins)
- ✅ Professional profiles and organization memberships
- ✅ Sample authorization grants and relationships

**Options:**
```bash
# Upload only organizations
node scripts/bulk-upload-data.js --organizations

# Upload only users
node scripts/bulk-upload-data.js --users

# Upload everything
node scripts/bulk-upload-data.js --all

# Clean existing data first
node scripts/bulk-upload-data.js --clean --all
```

## 📊 Data Structure Overview

### Organizations
- **Hospitals**: Advanced medical facilities
- **Clinics**: Smaller medical practices
- **Pharmacies**: Medication dispensing facilities
- **Laboratories**: Diagnostic testing facilities

### Users & Roles
- **Patients**: End users with medical records
- **Doctors**: Licensed medical practitioners
- **Pharmacists**: Licensed medication dispensers
- **Admins**: System administrators

### Relationships
- **Practitioners**: Professional profiles for doctors
- **Organization Members**: Staff assignments to facilities
- **Authorization Grants**: Patient access permissions

## 🔧 Manual Data Upload

### Single Organization
```javascript
const organization = {
  organizationInfo: {
    name: "Your Hospital Name",
    type: "HOSPITAL", // HOSPITAL, CLINIC, PHARMACY, LABORATORY
    registrationNumber: "YOUR-REG-001",
    description: "Hospital description"
  },
  address: {
    street: "123 Hospital Street",
    city: "Your City",
    state: "Your State", 
    postalCode: "12345",
    country: "Malaysia"
  },
  contact: {
    phone: "+60-3-1234-5678",
    email: "info@yourhospital.com",
    website: "https://yourhospital.com"
  },
  verification: { isVerified: true, verifiedAt: new Date() },
  metadata: { isActive: true, memberCount: 0 }
};
```

### Single User (Doctor)
```javascript
const doctor = {
  digitalIdentifier: `HID_${randomUUID()}`,
  personalInfo: {
    firstName: "Dr. First",
    lastName: "Last",
    dateOfBirth: new Date("1980-01-01"),
    contact: {
      email: "doctor@hospital.com",
      searchableEmail: "doctor@hospital.com",
      phone: "+60-12-1234-5678",
      verified: { email: true, phone: true }
    }
  },
  auth: {
    email: "doctor@hospital.com",
    passwordHash: await bcrypt.hash("SecurePassword123!", 12),
    role: "doctor",
    emailVerified: true,
    phoneVerified: true
  }
};
```

## 🔍 Verification Commands

### Check Data Upload
```bash
# Check organizations
node -e "
const { MongoClient } = require('mongodb');
const client = new MongoClient('YOUR_MONGODB_URI');
client.connect().then(async () => {
  const db = client.db();
  const count = await db.collection('organizations').countDocuments();
  console.log('Organizations:', count);
  await client.close();
});
"

# Check users
node -e "
const { MongoClient } = require('mongodb');
const client = new MongoClient('YOUR_MONGODB_URI');
client.connect().then(async () => {
  const db = client.db();
  const users = await db.collection('users').find({}, {projection: {'personalInfo.firstName': 1, 'personalInfo.lastName': 1, 'auth.role': 1}}).toArray();
  console.log('Users:', users.length);
  users.forEach(u => console.log(` - ${u.personalInfo.firstName} ${u.personalInfo.lastName} (${u.auth.role})`));
  await client.close();
});
"
```

### Test Database Connection
```bash
node -e "
const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);
client.connect()
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ Connection failed:', err))
  .finally(() => client.close());
"
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Connection Failed
```
Error: MongoNetworkError: connection timed out
```
**Solution**: Check your internet connection and MongoDB Atlas network access settings.

#### 2. Authentication Failed
```
Error: MongoError: authentication failed
```
**Solution**: Verify the username/password in your connection string.

#### 3. Duplicate Key Error
```
Error: E11000 duplicate key error collection
```
**Solution**: Use `--clean` flag to clear existing data or check for existing records.

#### 4. Missing Dependencies
```
Error: Cannot find module 'bcryptjs'
```
**Solution**: Run `npm install bcryptjs mongodb`

### Advanced Debugging

#### Enable MongoDB Logging
```javascript
const client = new MongoClient(MONGODB_URI, {
  monitorCommands: true,
  loggerLevel: 'debug'
});
```

#### Check Collection Counts
```bash
node scripts/check-collections.js
```

#### Verify Data Integrity
```bash
node scripts/verify-database-state.js
```

## 📈 Performance Tips

### Large Dataset Upload
- Use `--clean` sparingly on production
- Upload in batches for very large datasets
- Monitor memory usage during upload
- Use indexes for better query performance

### Production Considerations
- Change default passwords before production
- Implement proper backup strategy
- Set up monitoring and alerts
- Use proper encryption keys

## 🔐 Security Notes

⚠️ **Important**: The sample data includes default passwords that should be changed in production:
- `Doctor123!`
- `Pharmacist123!` 
- `Patient123!`
- `Admin123!`

These are for development/testing only. Always use secure, unique passwords in production environments.

## 📞 Support

If you encounter issues:
1. Check the MongoDB Atlas connection string
2. Verify network access in Atlas dashboard
3. Ensure proper database permissions
4. Review the script output for specific error messages

## 🎯 Next Steps

After successful data upload:
1. Start your Next.js application: `npm run dev`
2. Test login with provided credentials
3. Verify dashboard functionality
4. Test QR code generation and scanning
5. Confirm data relationships work correctly
