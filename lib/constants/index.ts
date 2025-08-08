/**
 * Prescription status constants
 * Eliminates magic strings throughout the codebase
 */
export enum PrescriptionStatus {
  ISSUED = "ISSUED",
  FILLED = "FILLED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

/**
 * Dispensation status constants
 */
export enum DispensationStatus {
  DISPENSED = "DISPENSED",
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  REFUND_REQUESTED = "REFUND_REQUESTED",
  REFUNDED = "REFUNDED",
}

/**
 * Authorization grant status constants
 */
export enum AuthGrantStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
  APPROVED = "approved",
}

/**
 * Organization member status constants
 */
export enum OrganizationMemberStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
}

/**
 * Encounter types
 */
export enum EncounterType {
  CONSULTATION = "CONSULTATION",
  FOLLOW_UP = "FOLLOW_UP",
  ROUTINE = "ROUTINE",
  EMERGENCY = "EMERGENCY",
}

/**
 * Encounter status
 */
export enum EncounterStatus {
  COMPLETED = "COMPLETED",
  IN_PROGRESS = "IN_PROGRESS",
  CANCELLED = "CANCELLED",
  SCHEDULED = "SCHEDULED",
}

/**
 * User roles
 */
export enum UserRole {
  PATIENT = "patient",
  DOCTOR = "doctor",
  PHARMACIST = "pharmacist",
  ADMIN = "admin",
}

/**
 * HTTP Status codes for better error handling
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

/**
 * Common error messages
 */
export const ErrorMessages = {
  UNAUTHORIZED: "Unauthorized",
  INVALID_REQUEST: "Invalid request",
  USER_NOT_FOUND: "User not found",
  PATIENT_NOT_FOUND: "Patient not found",
  PHARMACIST_NOT_FOUND: "Pharmacist not found",
  PRESCRIPTION_NOT_FOUND: "Prescription not found",
  ORGANIZATION_NOT_FOUND: "Organization not found",
  NO_AUTHORIZATION: "No active authorization found",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
  ALREADY_DISPENSED: "Prescription already dispensed",
  CANNOT_DISPENSE: "Cannot dispense this prescription",
} as const;

/**
 * Database operation limits
 */
export const Limits = {
  MAX_ENCOUNTERS_PER_QUERY: 100,
  MAX_MEDICATIONS_PER_QUERY: 50,
  TOKEN_EXPIRY_HOURS: 24,
} as const;
