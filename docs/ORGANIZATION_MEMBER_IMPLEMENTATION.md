# Organization-Practitioner Linkage Implementation

## Problem Analysis

The existing system had practitioners directly linked to a single organization via an `organizationId` field in the Practitioner model. This approach created "orphaned" practitioners who weren't properly associated with organizations and didn't support real-world scenarios where healthcare professionals work at multiple organizations.

## Solution: OrganizationMember Model

Based on the centralized health app knowledge base, we've implemented a proper many-to-many relationship using an `OrganizationMember` model that serves as a junction table between practitioners and organizations.

### Key Changes

#### 1. New OrganizationMember Model (`lib/models/OrganizationMember.ts`)

**Features:**
- Many-to-many relationship between practitioners and organizations
- Role-based permissions per organization
- Organization-specific schedules and availability
- Membership status tracking (pending, active, inactive, suspended, terminated)
- Primary organization designation
- Verification and approval workflow

**Schema Structure:**
```typescript
{
  organizationId: ObjectId,
  practitionerId: ObjectId,
  membershipDetails: {
    role: "admin" | "doctor" | "nurse" | "pharmacist" | "technician" | "coordinator" | "staff" | "guest",
    accessLevel: "full" | "limited" | "read-only" | "emergency-only",
    department: String,
    position: String,
    employeeId: String,
    startDate: Date,
    endDate: Date,
    isPrimary: Boolean
  },
  permissions: {
    canAccessPatientRecords: Boolean,
    canModifyPatientRecords: Boolean,
    canPrescribeMedications: Boolean,
    canViewAuditLogs: Boolean,
    canManageMembers: Boolean,
    canManageOrganization: Boolean,
    canRequestAuthorizationGrants: Boolean,
    canApproveAuthorizationGrants: Boolean,
    canRevokeAuthorizationGrants: Boolean,
    specialPermissions: [String]
  },
  schedule: {
    workingHours: Object,
    timeZone: String,
    availability: "available" | "busy" | "unavailable" | "on-call"
  },
  status: "active" | "inactive" | "pending" | "suspended" | "terminated",
  verificationInfo: {
    isVerified: Boolean,
    verifiedBy: String,
    verificationDate: Date,
    verificationMethod: String,
    notes: String
  }
}
```

#### 2. Updated Practitioner Model

**Removed:**
- Direct `organizationId` field
- Organization-specific permissions (moved to OrganizationMember)
- Organization-specific schedule (moved to OrganizationMember)

**Added:**
- `getOrganizationMemberships()` method to retrieve all organization affiliations

#### 3. New API Endpoints

**Organization Members Management:**
- `POST /api/organization/members` - Invite/add practitioner to organization
- `GET /api/organization/members` - List organization memberships
- `PATCH /api/organization/members/[id]` - Update membership (activate, verify, modify)
- `DELETE /api/organization/members/[id]` - Remove membership

**Updated Professional Info API:**
- Now creates OrganizationMember records when practitioner provides organizationId
- Returns both practitioner info and organization memberships
- Supports multiple organization affiliations

#### 4. Migration Strategy

**Migration Script:** `scripts/migrate-to-organization-members.js`
- Converts existing practitioner-organization relationships to OrganizationMember records
- Sets appropriate permissions based on practitioner type
- Designates first organization as primary
- Optionally removes old organizationId field

## Implementation Benefits

### 1. Real-World Flexibility
- Practitioners can work at multiple organizations (hospitals, clinics, private practice)
- Different roles and permissions per organization
- Organization-specific schedules and availability

### 2. Proper Authorization
- Granular permissions per organization membership
- Role-based access control (RBAC) implementation
- Verification workflow for new memberships

### 3. Audit and Compliance
- Complete audit trail of membership changes
- Verification and approval process
- Proper data governance per organization

### 4. Scalability
- Supports complex healthcare networks
- Easy to add new organizations and practitioners
- Flexible membership management

## Data Flow

### 1. Practitioner Registration
```
User Registration → Practitioner Profile → Organization Membership Request → Admin Approval → Active Membership
```

### 2. Multi-Organization Support
```
Practitioner → Multiple OrganizationMember records → Different permissions per organization
```

### 3. Permission Resolution
```
User Action → Check OrganizationMember permissions for specific organization → Allow/Deny
```

## API Usage Examples

### 1. Create Organization Membership
```javascript
POST /api/organization/members
{
  "practitionerId": "practitioner_id",
  "organizationId": "organization_id",
  "role": "doctor",
  "accessLevel": "full",
  "department": "Cardiology",
  "position": "Senior Physician",
  "isPrimary": true
}
```

### 2. Get Practitioner's Memberships
```javascript
GET /api/organization/members?practitionerId=practitioner_id
```

### 3. Activate Membership
```javascript
PATCH /api/organization/members/membership_id
{
  "action": "activate"
}
```

### 4. Update Professional Info (with Organization)
```javascript
POST /api/doctor/professional-info
{
  "licenseNumber": "MD123456",
  "specialty": "Cardiology",
  "practitionerType": "doctor",
  "yearsOfExperience": 10,
  "organizationId": "organization_id"  // Creates membership if needed
}
```

## Database Indexes

**OrganizationMember Indexes:**
- `{ organizationId: 1, practitionerId: 1 }` (unique)
- `{ organizationId: 1, status: 1 }`
- `{ practitionerId: 1, status: 1 }`
- `{ practitionerId: 1, "membershipDetails.isPrimary": 1 }`
- Text search on position, department, notes

## Security Considerations

1. **Membership Verification**: All memberships require verification by organization admins
2. **Permission Inheritance**: Permissions are organization-specific, not global
3. **Audit Logging**: All membership changes are logged for compliance
4. **Role Validation**: Roles and permissions are validated based on organization policies

## Migration Process

### Step 1: Deploy New Models
Deploy the OrganizationMember model alongside the updated Practitioner model.

### Step 2: Run Migration Script
```bash
node scripts/migrate-to-organization-members.js
```

### Step 3: Update Frontend
Update UI components to handle multiple organization memberships and new permission structure.

### Step 4: Remove Old Fields (Optional)
```bash
node scripts/migrate-to-organization-members.js --remove-old-field
```

## Testing Considerations

1. **Unit Tests**: Test OrganizationMember model methods and validations
2. **Integration Tests**: Test API endpoints for membership management
3. **Migration Tests**: Verify data integrity after migration
4. **Permission Tests**: Ensure role-based permissions work correctly

## Future Enhancements

1. **Organization Hierarchy**: Support for multi-level organizations (hospital systems)
2. **Temporary Memberships**: Time-limited access for locum tenens
3. **Bulk Operations**: Batch membership management for large organizations
4. **Advanced Scheduling**: Integration with shift management systems
5. **Membership Analytics**: Usage patterns and access analytics per organization

This implementation properly addresses the orphaned practitioner issue while providing a robust, scalable foundation for healthcare organization management that aligns with real-world healthcare industry practices.
