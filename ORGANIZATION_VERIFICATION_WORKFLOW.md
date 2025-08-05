# Organization Verification Workflow Design

## Current Gap
- Organizations can be registered but lack a verification workflow
- No clear role definition for who can verify organizations
- No admin interface for managing verification requests
- No notification system for verification status changes

## Proposed Solution

### 1. Verifier Roles and Responsibilities

#### **Primary Verifiers (ADMIN role)**
- **Platform Administrators**: System admins who can verify organizations
- **Authority**: Can approve/reject organization verification requests
- **Scope**: All organization types (hospitals, clinics, pharmacies, labs)

#### **Secondary Verifiers (Future Enhancement)**
- **Regulatory Authority Integration**: API integration with healthcare regulatory bodies
- **Super Admins**: Higher-level platform administrators
- **Regional Admins**: Geography-based verification authority

### 2. Verification Process Flow

```
Organization Registration
        ↓
   Pending Status
        ↓
Admin Review Process
        ↓
Document Verification
        ↓
Approval/Rejection
        ↓
Notification to Organization
        ↓
Status Update (Verified/Rejected)
```

### 3. Verification Requirements

#### **Documentation Checklist**
- [ ] Business Registration Certificate
- [ ] Healthcare License/Permit
- [ ] Tax Identification Number
- [ ] Professional Liability Insurance
- [ ] Facility Inspection Certificate (if applicable)
- [ ] Contact Person Authorization

#### **Verification Criteria**
- Legal business entity
- Valid healthcare license
- Physical address verification
- Contact information validation
- Compliance with local healthcare regulations

### 4. Implementation Components

#### **A. Admin Dashboard for Verification**
- List of pending organizations
- Document review interface
- Verification decision workflow
- Bulk actions for multiple organizations
- Search and filter capabilities

#### **B. Organization Status Management**
- Status tracking: `pending` → `under_review` → `verified`/`rejected`
- Reason codes for rejection
- Re-submission workflow for rejected organizations
- Status history and audit trail

#### **C. Notification System**
- Email notifications to organization contacts
- In-app notifications for status changes
- Admin alerts for new verification requests
- Reminder notifications for pending reviews

#### **D. Document Management**
- Secure file upload for verification documents
- Document categorization and tagging
- Version control for re-submitted documents
- Secure storage with access controls

### 5. Database Schema Enhancements

#### **Organization Model Updates**
```typescript
verification: {
  status: 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';
  submittedAt: Date;
  reviewedAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: string; // Admin user ID
  rejectionReason?: string;
  rejectionDetails?: string;
  documents: [
    {
      type: 'business_license' | 'healthcare_permit' | 'insurance' | 'other';
      fileName: string;
      fileId: string; // GridFS or cloud storage reference
      uploadedAt: Date;
      verified: boolean;
    }
  ];
  reviewHistory: [
    {
      action: 'submitted' | 'under_review' | 'verified' | 'rejected';
      performedBy: string;
      performedAt: Date;
      notes?: string;
    }
  ];
}
```

### 6. API Endpoints Design

#### **Admin Verification APIs**
- `GET /api/admin/organizations/pending` - List pending verifications
- `POST /api/admin/organizations/{id}/verify` - Approve organization
- `POST /api/admin/organizations/{id}/reject` - Reject organization
- `GET /api/admin/organizations/{id}/documents` - View documents
- `POST /api/admin/organizations/{id}/request-documents` - Request additional docs

#### **Organization APIs**
- `POST /api/organizations/{id}/documents` - Upload verification documents
- `GET /api/organizations/{id}/verification-status` - Check status
- `POST /api/organizations/{id}/resubmit` - Resubmit after rejection

### 7. Security Considerations

#### **Access Control**
- Only ADMIN role can access verification endpoints
- Document access restricted to organization owners and admins
- Audit logging for all verification actions
- Rate limiting on verification endpoints

#### **Data Protection**
- Encrypted document storage
- PII handling compliance
- Secure file upload validation
- Access logs for document viewing

### 8. User Experience Flow

#### **For Organizations**
1. Register organization (auto-status: pending)
2. Upload required documents
3. Receive confirmation email
4. Wait for admin review
5. Receive verification result notification
6. If rejected: review feedback and resubmit

#### **For Admins**
1. Access admin verification dashboard
2. Review pending organizations
3. Examine uploaded documents
4. Verify information against criteria
5. Approve or reject with reasons
6. Send notifications to organization

### 9. Implementation Priority

#### **Phase 1: Basic Verification (Immediate)**
- Admin verification API endpoints
- Simple approve/reject workflow
- Email notifications
- Status tracking

#### **Phase 2: Enhanced Features (Next Sprint)**
- Document upload system
- Admin dashboard UI
- Detailed verification criteria
- Audit trail and history

#### **Phase 3: Advanced Features (Future)**
- Regulatory authority integration
- Automated verification checks
- Bulk verification tools
- Analytics and reporting

### 10. Success Metrics

- **Verification Processing Time**: Target < 2 business days
- **Approval Rate**: Track % of organizations approved vs rejected
- **Document Completeness**: % of submissions with complete documentation
- **Admin Efficiency**: Average time per verification review
- **Organization Satisfaction**: Post-verification feedback scores

## Next Steps

1. **Create admin verification endpoints**
2. **Build basic admin UI for verification**
3. **Implement notification system**
4. **Add document upload capability**
5. **Create verification workflow documentation**

This comprehensive verification system ensures organizations are legitimate while providing a smooth user experience for both organizations and administrators.
