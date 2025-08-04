import Practitioner from "@/lib/models/Practitioner";
import { PermissionMapper } from "../services/permission-mapper";

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
    accessScope: string[],
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

    // Validate access scope permissions using centralized permission mapper
    const validation = PermissionMapper.validateAccessScopes(
      practitioner,
      accessScope,
    );

    if (!validation.valid) {
      const errors = [];

      if (validation.invalidScopes.length > 0) {
        errors.push(
          `Invalid access scopes: ${validation.invalidScopes.join(", ")}`,
        );
      }

      if (validation.missingPermissions.length > 0) {
        errors.push(
          `Missing permissions for scopes: ${validation.missingPermissions.join(", ")}`,
        );
      }

      return {
        allowed: false,
        error: errors.join(". "),
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
    grantOrganizationId: string,
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

    // Validate grant action permission using centralized permission mapper
    const validation = PermissionMapper.validateGrantAction(
      practitioner,
      action,
    );

    if (!validation.allowed) {
      return validation;
    }

    return { allowed: true };
  }
}

/**
 * Grant state transition utilities
 */
export class GrantStateManager {
  private static readonly ALLOWED_TRANSITIONS: {
    [key: string]: { [key: string]: string };
  } = {
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
