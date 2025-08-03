import Practitioner from "@/lib/models/Practitioner";

/**
 * Permission checking utilities for authorization grants
 */
export class AuthorizationPermissions {
  /**
   * Check if a practitioner has permission to request authorization grants
   */
  static async canRequestGrant(
    practitionerId: string,
    organizationId: string,
    accessScope: string[]
  ): Promise<{ allowed: boolean; error?: string }> {
    const practitioner = await Practitioner.findById(practitionerId);

    if (!practitioner) {
      return { allowed: false, error: "Practitioner not found" };
    }

    // Check organization membership
    if (practitioner.organizationId.toString() !== organizationId) {
      return {
        allowed: false,
        error: "Practitioner does not belong to the specified organization",
      };
    }

    // Check basic permission
    if (!practitioner.permissions.canRequestAuthorizationGrants) {
      return {
        allowed: false,
        error: "Practitioner cannot request authorization grants",
      };
    }

    // Validate access scope permissions
    const hasRequiredPermissions = accessScope.every((scope) => {
      switch (scope) {
        case "canViewMedicalHistory":
        case "canViewPrescriptions":
          return practitioner.permissions.canAccessPatientRecords;
        case "canCreateEncounters":
          return practitioner.permissions.canModifyPatientRecords;
        case "canViewAuditLogs":
          return practitioner.permissions.canViewAuditLogs;
        default:
          return false; // Unknown scope, deny by default
      }
    });

    if (!hasRequiredPermissions) {
      return {
        allowed: false,
        error: "Practitioner lacks required permissions for requested access scope",
      };
    }

    return { allowed: true };
  }

  /**
   * Check if a practitioner has permission to perform grant actions
   */
  static async canPerformAction(
    practitionerId: string,
    action: "approve" | "deny" | "revoke",
    grantOrganizationId: string
  ): Promise<{ allowed: boolean; error?: string }> {
    const practitioner = await Practitioner.findById(practitionerId);

    if (!practitioner) {
      return { allowed: false, error: "Actor not found or not a practitioner" };
    }

    // Check organization membership
    if (practitioner.organizationId.toString() !== grantOrganizationId) {
      return {
        allowed: false,
        error: "Practitioner does not belong to the grant's organization",
      };
    }

    // Check permissions based on action type
    let hasPermission = false;
    switch (action) {
      case "approve":
      case "deny":
        hasPermission = practitioner.permissions.canApproveAuthorizationGrants;
        break;
      case "revoke":
        hasPermission = practitioner.permissions.canRevokeAuthorizationGrants;
        break;
    }

    if (!hasPermission) {
      return {
        allowed: false,
        error: `Practitioner cannot ${action} authorization grants`,
      };
    }

    return { allowed: true };
  }
}

/**
 * Grant state transition utilities
 */
export class GrantStateManager {
  private static readonly ALLOWED_TRANSITIONS: { [key: string]: { [key: string]: string } } = {
    PENDING: { approve: "ACTIVE", deny: "REVOKED" },
    ACTIVE: { revoke: "REVOKED" },
  };

  /**
   * Get allowed actions for a given grant status
   */
  static getAllowedActions(status: string): string[] {
    return Object.keys(this.ALLOWED_TRANSITIONS[status] || {});
  }

  /**
   * Check if an action is valid for the current status
   */
  static isValidTransition(currentStatus: string, action: string): boolean {
    return this.ALLOWED_TRANSITIONS[currentStatus]?.[action] !== undefined;
  }

  /**
   * Get the new status after performing an action
   */
  static getNewStatus(currentStatus: string, action: string): string | null {
    return this.ALLOWED_TRANSITIONS[currentStatus]?.[action] || null;
  }
}
