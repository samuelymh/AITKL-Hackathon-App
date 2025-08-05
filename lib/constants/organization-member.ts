/**
 * Constants for Organization Member functionality
 */

// Organization Member Actions
export const ORGANIZATION_MEMBER_ACTIONS = {
  ACTIVATE: "activate",
  DEACTIVATE: "deactivate",
  VERIFY: "verify",
  UPDATE: "update",
} as const;

// Organization Member Roles
export const ORGANIZATION_MEMBER_ROLES = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  NURSE: "nurse",
  PHARMACIST: "pharmacist",
  TECHNICIAN: "technician",
  COORDINATOR: "coordinator",
  STAFF: "staff",
  GUEST: "guest",
} as const;

// Organization Member Status
export const ORGANIZATION_MEMBER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
  SUSPENDED: "suspended",
  TERMINATED: "terminated",
} as const;

// Access Levels
export const ACCESS_LEVELS = {
  FULL: "full",
  LIMITED: "limited",
  READ_ONLY: "read-only",
  EMERGENCY_ONLY: "emergency-only",
} as const;

// Practitioner Types
export const PRACTITIONER_TYPES = {
  DOCTOR: "doctor",
  NURSE: "nurse",
  PHARMACIST: "pharmacist",
  TECHNICIAN: "technician",
  ADMIN: "admin",
  OTHER: "other",
} as const;

// Practitioner Status
export const PRACTITIONER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  PENDING_VERIFICATION: "pending_verification",
} as const;

// Availability Status
export const AVAILABILITY_STATUS = {
  AVAILABLE: "available",
  BUSY: "busy",
  UNAVAILABLE: "unavailable",
  ON_CALL: "on-call",
} as const;

// Verification Status
export const VERIFICATION_STATUS = {
  VERIFIED: "verified",
  PENDING: "pending",
  EXPIRED: "expired",
  REVOKED: "revoked",
} as const;

// API Error Messages
export const API_ERROR_MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  AUTHENTICATION_REQUIRED: "Authentication required",
  INVALID_TOKEN: "Invalid token",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
  USER_NOT_FOUND: "User not found",
  PRACTITIONER_NOT_FOUND: "Practitioner not found",
  ORGANIZATION_NOT_FOUND: "Organization not found",
  MEMBERSHIP_NOT_FOUND: "Organization membership not found",
  MEMBERSHIP_EXISTS: "Practitioner is already a member of this organization",
  INVALID_OBJECT_ID: "Invalid object ID",
  INVALID_ACTION: "Invalid action",
  MISSING_REQUIRED_FIELDS: "Missing required fields",
  VALIDATION_ERROR: "Validation error",
} as const;

// Validation Constants
export const VALIDATION_LIMITS = {
  MIN_YEARS_EXPERIENCE: 0,
  MAX_YEARS_EXPERIENCE: 70,
  MIN_LICENSE_LENGTH: 3,
  MIN_SPECIALTY_LENGTH: 2,
  MAX_ITEMS_PER_PAGE: 100,
  DEFAULT_ITEMS_PER_PAGE: 10,
} as const;

// Database Collection Names
export const COLLECTIONS = {
  PRACTITIONERS: "practitioners",
  ORGANIZATION_MEMBERS: "organizationMembers",
  ORGANIZATIONS: "organizations",
  USERS: "users",
} as const;

// Permission Names
export const PERMISSIONS = {
  CAN_ACCESS_PATIENT_RECORDS: "canAccessPatientRecords",
  CAN_MODIFY_PATIENT_RECORDS: "canModifyPatientRecords",
  CAN_PRESCRIBE_MEDICATIONS: "canPrescribeMedications",
  CAN_VIEW_AUDIT_LOGS: "canViewAuditLogs",
  CAN_MANAGE_MEMBERS: "canManageMembers",
  CAN_MANAGE_ORGANIZATION: "canManageOrganization",
  CAN_REQUEST_AUTHORIZATION_GRANTS: "canRequestAuthorizationGrants",
  CAN_APPROVE_AUTHORIZATION_GRANTS: "canApproveAuthorizationGrants",
  CAN_REVOKE_AUTHORIZATION_GRANTS: "canRevokeAuthorizationGrants",
} as const;

// Default Permissions by Role
export const DEFAULT_ROLE_PERMISSIONS = {
  [ORGANIZATION_MEMBER_ROLES.ADMIN]: {
    [PERMISSIONS.CAN_ACCESS_PATIENT_RECORDS]: true,
    [PERMISSIONS.CAN_MODIFY_PATIENT_RECORDS]: true,
    [PERMISSIONS.CAN_VIEW_AUDIT_LOGS]: true,
    [PERMISSIONS.CAN_MANAGE_MEMBERS]: true,
    [PERMISSIONS.CAN_MANAGE_ORGANIZATION]: true,
    [PERMISSIONS.CAN_REQUEST_AUTHORIZATION_GRANTS]: true,
    [PERMISSIONS.CAN_APPROVE_AUTHORIZATION_GRANTS]: true,
    [PERMISSIONS.CAN_REVOKE_AUTHORIZATION_GRANTS]: true,
  },
  [ORGANIZATION_MEMBER_ROLES.DOCTOR]: {
    [PERMISSIONS.CAN_ACCESS_PATIENT_RECORDS]: true,
    [PERMISSIONS.CAN_MODIFY_PATIENT_RECORDS]: true,
    [PERMISSIONS.CAN_PRESCRIBE_MEDICATIONS]: true,
    [PERMISSIONS.CAN_REQUEST_AUTHORIZATION_GRANTS]: true,
    [PERMISSIONS.CAN_APPROVE_AUTHORIZATION_GRANTS]: true,
  },
  [ORGANIZATION_MEMBER_ROLES.NURSE]: {
    [PERMISSIONS.CAN_ACCESS_PATIENT_RECORDS]: true,
    [PERMISSIONS.CAN_MODIFY_PATIENT_RECORDS]: true,
    [PERMISSIONS.CAN_REQUEST_AUTHORIZATION_GRANTS]: true,
  },
  [ORGANIZATION_MEMBER_ROLES.PHARMACIST]: {
    [PERMISSIONS.CAN_ACCESS_PATIENT_RECORDS]: true,
    [PERMISSIONS.CAN_PRESCRIBE_MEDICATIONS]: true,
    [PERMISSIONS.CAN_REQUEST_AUTHORIZATION_GRANTS]: true,
  },
  [ORGANIZATION_MEMBER_ROLES.TECHNICIAN]: {
    [PERMISSIONS.CAN_ACCESS_PATIENT_RECORDS]: true,
  },
  [ORGANIZATION_MEMBER_ROLES.COORDINATOR]: {
    [PERMISSIONS.CAN_ACCESS_PATIENT_RECORDS]: true,
    [PERMISSIONS.CAN_REQUEST_AUTHORIZATION_GRANTS]: true,
  },
  [ORGANIZATION_MEMBER_ROLES.STAFF]: {
    [PERMISSIONS.CAN_ACCESS_PATIENT_RECORDS]: true,
  },
  [ORGANIZATION_MEMBER_ROLES.GUEST]: {},
} as const;

// Type exports for better type safety
export type OrganizationMemberAction = (typeof ORGANIZATION_MEMBER_ACTIONS)[keyof typeof ORGANIZATION_MEMBER_ACTIONS];
export type OrganizationMemberRole = (typeof ORGANIZATION_MEMBER_ROLES)[keyof typeof ORGANIZATION_MEMBER_ROLES];
export type OrganizationMemberStatus = (typeof ORGANIZATION_MEMBER_STATUS)[keyof typeof ORGANIZATION_MEMBER_STATUS];
export type AccessLevel = (typeof ACCESS_LEVELS)[keyof typeof ACCESS_LEVELS];
export type PractitionerType = (typeof PRACTITIONER_TYPES)[keyof typeof PRACTITIONER_TYPES];
export type PractitionerStatus = (typeof PRACTITIONER_STATUS)[keyof typeof PRACTITIONER_STATUS];
export type AvailabilityStatus = (typeof AVAILABILITY_STATUS)[keyof typeof AVAILABILITY_STATUS];
export type VerificationStatus = (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
