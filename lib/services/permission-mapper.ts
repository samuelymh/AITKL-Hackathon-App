/**
 * Centralized permission mapping and validation service
 * Eliminates code duplication by providing a single source of truth for permission mappings
 */

import { IPractitioner } from "../models/Practitioner";

/**
 * Type for practitioner permissions
 */
type PractitionerPermissions = IPractitioner["permissions"];
type PermissionKey = keyof PractitionerPermissions;

/**
 * Access scope to permission mapping configuration
 * Maps specific access scopes to the required practitioner permissions
 */
export const ACCESS_SCOPE_PERMISSION_MAP: Record<string, PermissionKey> = {
  // Patient record access scopes
  canViewMedicalHistory: "canAccessPatientRecords",
  canViewPrescriptions: "canAccessPatientRecords",
  canViewPatientDocuments: "canAccessPatientRecords",
  canViewPatientHistory: "canAccessPatientRecords",

  // Patient record modification scopes
  canCreateEncounters: "canModifyPatientRecords",
  canUpdatePatientRecords: "canModifyPatientRecords",
  canCreatePrescriptions: "canPrescribeMedications",
  canModifyPrescriptions: "canPrescribeMedications",

  // Audit and administrative scopes
  canViewAuditLogs: "canViewAuditLogs",
  canManageUsers: "canManageOrganization",
  canManageSettings: "canManageOrganization",

  // Authorization management scopes
  canRequestGrants: "canRequestAuthorizationGrants",
  canApproveGrants: "canApproveAuthorizationGrants",
  canRevokeGrants: "canRevokeAuthorizationGrants",
} as const;

/**
 * Grant action to permission mapping
 * Maps grant actions to the required practitioner permissions
 */
export const GRANT_ACTION_PERMISSION_MAP: Record<string, PermissionKey> = {
  approve: "canApproveAuthorizationGrants",
  deny: "canApproveAuthorizationGrants",
  revoke: "canRevokeAuthorizationGrants",
} as const;

/**
 * Permission groups for easier management and validation
 */
export const PERMISSION_GROUPS = {
  PATIENT_READ: ["canViewMedicalHistory", "canViewPrescriptions", "canViewPatientDocuments", "canViewPatientHistory"],
  PATIENT_WRITE: ["canCreateEncounters", "canUpdatePatientRecords"],
  PRESCRIPTION: ["canCreatePrescriptions", "canModifyPrescriptions"],
  AUDIT: ["canViewAuditLogs"],
  ADMINISTRATION: ["canManageUsers", "canManageSettings"],
  AUTHORIZATION: ["canRequestGrants", "canApproveGrants", "canRevokeGrants"],
} as const;

/**
 * Permission validation and mapping service
 */
export class PermissionMapper {
  /**
   * Validate if a practitioner has the required permissions for given access scopes
   */
  static validateAccessScopes(
    practitioner: IPractitioner,
    accessScopes: string[]
  ): { valid: boolean; missingPermissions: string[]; invalidScopes: string[] } {
    const missingPermissions: string[] = [];
    const invalidScopes: string[] = [];

    for (const scope of accessScopes) {
      const requiredPermission = ACCESS_SCOPE_PERMISSION_MAP[scope];

      if (!requiredPermission) {
        invalidScopes.push(scope);
        continue;
      }

      if (!practitioner.permissions[requiredPermission]) {
        missingPermissions.push(scope);
      }
    }

    return {
      valid: missingPermissions.length === 0 && invalidScopes.length === 0,
      missingPermissions,
      invalidScopes,
    };
  }

  /**
   * Validate if a practitioner can perform a specific grant action
   */
  static validateGrantAction(practitioner: IPractitioner, action: string): { allowed: boolean; error?: string } {
    const requiredPermission = GRANT_ACTION_PERMISSION_MAP[action];

    if (!requiredPermission) {
      return {
        allowed: false,
        error: `Invalid grant action: ${action}`,
      };
    }

    if (!practitioner.permissions[requiredPermission]) {
      return {
        allowed: false,
        error: `Practitioner lacks permission to ${action} authorization grants`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get all access scopes that a practitioner is authorized for
   */
  static getAuthorizedScopes(practitioner: IPractitioner): string[] {
    const authorizedScopes: string[] = [];

    for (const [scope, requiredPermission] of Object.entries(ACCESS_SCOPE_PERMISSION_MAP)) {
      if (practitioner.permissions[requiredPermission]) {
        authorizedScopes.push(scope);
      }
    }

    return authorizedScopes;
  }

  /**
   * Get all grant actions that a practitioner is authorized to perform
   */
  static getAuthorizedGrantActions(practitioner: IPractitioner): string[] {
    const authorizedActions: string[] = [];

    for (const [action, requiredPermission] of Object.entries(GRANT_ACTION_PERMISSION_MAP)) {
      if (practitioner.permissions[requiredPermission]) {
        authorizedActions.push(action);
      }
    }

    return authorizedActions;
  }

  /**
   * Check if a practitioner has permissions for an entire permission group
   */
  static hasPermissionGroup(practitioner: IPractitioner, group: keyof typeof PERMISSION_GROUPS): boolean {
    const scopes = PERMISSION_GROUPS[group];
    return scopes.every((scope) => {
      const requiredPermission = ACCESS_SCOPE_PERMISSION_MAP[scope];
      return requiredPermission && practitioner.permissions[requiredPermission];
    });
  }

  /**
   * Get permission requirements for access scopes (useful for documentation/UI)
   */
  static getPermissionRequirements(accessScopes: string[]): Record<string, string> {
    const requirements: Record<string, string> = {};

    for (const scope of accessScopes) {
      const requiredPermission = ACCESS_SCOPE_PERMISSION_MAP[scope];
      if (requiredPermission) {
        requirements[scope] = String(requiredPermission);
      }
    }

    return requirements;
  }

  /**
   * Validate that all required permission keys exist in the practitioner permissions
   */
  static validatePermissionStructure(permissions: Partial<PractitionerPermissions>): string[] {
    const requiredPermissions = new Set(Object.values(ACCESS_SCOPE_PERMISSION_MAP));
    const missingKeys: string[] = [];

    for (const permission of requiredPermissions) {
      if (!(permission in permissions)) {
        missingKeys.push(String(permission));
      }
    }

    return missingKeys;
  }
}

/**
 * Helper function to create access scope arrays with validation
 */
export function createAccessScope(scopes: (keyof typeof ACCESS_SCOPE_PERMISSION_MAP)[]): string[] {
  return scopes.filter((scope) => scope in ACCESS_SCOPE_PERMISSION_MAP);
}

/**
 * Type guard to check if a string is a valid access scope
 */
export function isValidAccessScope(scope: string): scope is keyof typeof ACCESS_SCOPE_PERMISSION_MAP {
  return scope in ACCESS_SCOPE_PERMISSION_MAP;
}

/**
 * Type guard to check if a string is a valid grant action
 */
export function isValidGrantAction(action: string): action is keyof typeof GRANT_ACTION_PERMISSION_MAP {
  return action in GRANT_ACTION_PERMISSION_MAP;
}

export default PermissionMapper;
