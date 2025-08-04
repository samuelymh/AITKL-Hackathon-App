import { describe, it, expect } from "@jest/globals";
import {
  PermissionMapper,
  ACCESS_SCOPE_PERMISSION_MAP,
  GRANT_ACTION_PERMISSION_MAP,
  PERMISSION_GROUPS,
  createAccessScope,
  isValidAccessScope,
  isValidGrantAction,
} from "../../../lib/services/permission-mapper";

describe("PermissionMapper", () => {
  const createMockPractitioner = (permissions: Partial<any> = {}) =>
    ({
      permissions: {
        canAccessPatientRecords: false,
        canModifyPatientRecords: false,
        canPrescribeMedications: false,
        canViewAuditLogs: false,
        canManageOrganization: false,
        canRequestAuthorizationGrants: false,
        canApproveAuthorizationGrants: false,
        canRevokeAuthorizationGrants: false,
        specialPermissions: [],
        ...permissions,
      },
    }) as any;

  describe("ACCESS_SCOPE_PERMISSION_MAP", () => {
    it("should contain all expected access scope mappings", () => {
      expect(ACCESS_SCOPE_PERMISSION_MAP.canViewMedicalHistory).toBe(
        "canAccessPatientRecords",
      );
      expect(ACCESS_SCOPE_PERMISSION_MAP.canViewPrescriptions).toBe(
        "canAccessPatientRecords",
      );
      expect(ACCESS_SCOPE_PERMISSION_MAP.canCreateEncounters).toBe(
        "canModifyPatientRecords",
      );
      expect(ACCESS_SCOPE_PERMISSION_MAP.canViewAuditLogs).toBe(
        "canViewAuditLogs",
      );
    });

    it("should have valid permission keys", () => {
      const allPermissions = Object.values(ACCESS_SCOPE_PERMISSION_MAP);
      const validPermissions = [
        "canAccessPatientRecords",
        "canModifyPatientRecords",
        "canPrescribeMedications",
        "canViewAuditLogs",
        "canManageOrganization",
        "canRequestAuthorizationGrants",
        "canApproveAuthorizationGrants",
        "canRevokeAuthorizationGrants",
      ];

      allPermissions.forEach((permission) => {
        expect(validPermissions).toContain(permission);
      });
    });
  });

  describe("GRANT_ACTION_PERMISSION_MAP", () => {
    it("should contain all expected grant action mappings", () => {
      expect(GRANT_ACTION_PERMISSION_MAP.approve).toBe(
        "canApproveAuthorizationGrants",
      );
      expect(GRANT_ACTION_PERMISSION_MAP.deny).toBe(
        "canApproveAuthorizationGrants",
      );
      expect(GRANT_ACTION_PERMISSION_MAP.revoke).toBe(
        "canRevokeAuthorizationGrants",
      );
    });
  });

  describe("validateAccessScopes", () => {
    it("should validate when practitioner has all required permissions", () => {
      const practitioner = createMockPractitioner({
        canAccessPatientRecords: true,
        canModifyPatientRecords: true,
      });

      const result = PermissionMapper.validateAccessScopes(practitioner, [
        "canViewMedicalHistory",
        "canViewPrescriptions",
        "canCreateEncounters",
      ]);

      expect(result.valid).toBe(true);
      expect(result.missingPermissions).toHaveLength(0);
      expect(result.invalidScopes).toHaveLength(0);
    });

    it("should identify missing permissions", () => {
      const practitioner = createMockPractitioner({
        canAccessPatientRecords: true,
        // canModifyPatientRecords: false (missing)
      });

      const result = PermissionMapper.validateAccessScopes(practitioner, [
        "canViewMedicalHistory",
        "canCreateEncounters", // requires canModifyPatientRecords
      ]);

      expect(result.valid).toBe(false);
      expect(result.missingPermissions).toContain("canCreateEncounters");
      expect(result.invalidScopes).toHaveLength(0);
    });

    it("should identify invalid scopes", () => {
      const practitioner = createMockPractitioner();

      const result = PermissionMapper.validateAccessScopes(practitioner, [
        "canViewMedicalHistory",
        "invalidScope",
        "anotherInvalidScope",
      ]);

      expect(result.valid).toBe(false);
      expect(result.invalidScopes).toContain("invalidScope");
      expect(result.invalidScopes).toContain("anotherInvalidScope");
    });

    it("should handle empty access scopes", () => {
      const practitioner = createMockPractitioner();

      const result = PermissionMapper.validateAccessScopes(practitioner, []);

      expect(result.valid).toBe(true);
      expect(result.missingPermissions).toHaveLength(0);
      expect(result.invalidScopes).toHaveLength(0);
    });
  });

  describe("validateGrantAction", () => {
    it("should allow valid grant actions with proper permissions", () => {
      const practitioner = createMockPractitioner({
        canApproveAuthorizationGrants: true,
        canRevokeAuthorizationGrants: true,
      });

      expect(
        PermissionMapper.validateGrantAction(practitioner, "approve").allowed,
      ).toBe(true);
      expect(
        PermissionMapper.validateGrantAction(practitioner, "deny").allowed,
      ).toBe(true);
      expect(
        PermissionMapper.validateGrantAction(practitioner, "revoke").allowed,
      ).toBe(true);
    });

    it("should deny grant actions without proper permissions", () => {
      const practitioner = createMockPractitioner({
        canApproveAuthorizationGrants: false,
        canRevokeAuthorizationGrants: false,
      });

      const approveResult = PermissionMapper.validateGrantAction(
        practitioner,
        "approve",
      );
      expect(approveResult.allowed).toBe(false);
      expect(approveResult.error).toContain("lacks permission to approve");

      const revokeResult = PermissionMapper.validateGrantAction(
        practitioner,
        "revoke",
      );
      expect(revokeResult.allowed).toBe(false);
      expect(revokeResult.error).toContain("lacks permission to revoke");
    });

    it("should reject invalid grant actions", () => {
      const practitioner = createMockPractitioner();

      const result = PermissionMapper.validateGrantAction(
        practitioner,
        "invalidAction",
      );

      expect(result.allowed).toBe(false);
      expect(result.error).toContain("Invalid grant action");
    });
  });

  describe("getAuthorizedScopes", () => {
    it("should return all scopes for which practitioner has permissions", () => {
      const practitioner = createMockPractitioner({
        canAccessPatientRecords: true,
        canViewAuditLogs: true,
      });

      const authorizedScopes =
        PermissionMapper.getAuthorizedScopes(practitioner);

      expect(authorizedScopes).toContain("canViewMedicalHistory");
      expect(authorizedScopes).toContain("canViewPrescriptions");
      expect(authorizedScopes).toContain("canViewAuditLogs");
      expect(authorizedScopes).not.toContain("canCreateEncounters");
    });

    it("should return empty array when practitioner has no permissions", () => {
      const practitioner = createMockPractitioner();

      const authorizedScopes =
        PermissionMapper.getAuthorizedScopes(practitioner);

      expect(authorizedScopes).toHaveLength(0);
    });
  });

  describe("getAuthorizedGrantActions", () => {
    it("should return grant actions for which practitioner has permissions", () => {
      const practitioner = createMockPractitioner({
        canApproveAuthorizationGrants: true,
      });

      const authorizedActions =
        PermissionMapper.getAuthorizedGrantActions(practitioner);

      expect(authorizedActions).toContain("approve");
      expect(authorizedActions).toContain("deny");
      expect(authorizedActions).not.toContain("revoke");
    });

    it("should return empty array when practitioner has no grant permissions", () => {
      const practitioner = createMockPractitioner();

      const authorizedActions =
        PermissionMapper.getAuthorizedGrantActions(practitioner);

      expect(authorizedActions).toHaveLength(0);
    });
  });

  describe("hasPermissionGroup", () => {
    it("should return true when practitioner has all permissions in group", () => {
      const practitioner = createMockPractitioner({
        canAccessPatientRecords: true,
      });

      const hasPatientRead = PermissionMapper.hasPermissionGroup(
        practitioner,
        "PATIENT_READ",
      );
      expect(hasPatientRead).toBe(true);
    });

    it("should return false when practitioner missing some permissions in group", () => {
      const practitioner = createMockPractitioner({
        canAccessPatientRecords: true,
        // missing canModifyPatientRecords
      });

      const hasPatientWrite = PermissionMapper.hasPermissionGroup(
        practitioner,
        "PATIENT_WRITE",
      );
      expect(hasPatientWrite).toBe(false);
    });
  });

  describe("getPermissionRequirements", () => {
    it("should return permission requirements for given scopes", () => {
      const requirements = PermissionMapper.getPermissionRequirements([
        "canViewMedicalHistory",
        "canCreateEncounters",
        "canViewAuditLogs",
      ]);

      expect(requirements.canViewMedicalHistory).toBe(
        "canAccessPatientRecords",
      );
      expect(requirements.canCreateEncounters).toBe("canModifyPatientRecords");
      expect(requirements.canViewAuditLogs).toBe("canViewAuditLogs");
    });

    it("should ignore invalid scopes", () => {
      const requirements = PermissionMapper.getPermissionRequirements([
        "canViewMedicalHistory",
        "invalidScope",
      ]);

      expect(requirements.canViewMedicalHistory).toBe(
        "canAccessPatientRecords",
      );
      expect(requirements.invalidScope).toBeUndefined();
    });
  });

  describe("validatePermissionStructure", () => {
    it("should return empty array for complete permission structure", () => {
      const permissions = {
        canAccessPatientRecords: true,
        canModifyPatientRecords: true,
        canPrescribeMedications: true,
        canViewAuditLogs: true,
        canManageOrganization: true,
        canRequestAuthorizationGrants: true,
        canApproveAuthorizationGrants: true,
        canRevokeAuthorizationGrants: true,
      };

      const missing = PermissionMapper.validatePermissionStructure(permissions);
      expect(missing).toHaveLength(0);
    });

    it("should identify missing permission keys", () => {
      const permissions = {
        canAccessPatientRecords: true,
        // missing other permissions
      };

      const missing = PermissionMapper.validatePermissionStructure(permissions);
      expect(missing.length).toBeGreaterThan(0);
    });
  });

  describe("Helper Functions", () => {
    describe("createAccessScope", () => {
      it("should filter valid access scopes", () => {
        const scopes = createAccessScope([
          "canViewMedicalHistory" as any,
          "invalidScope" as any,
          "canCreateEncounters" as any,
        ]);

        expect(scopes).toContain("canViewMedicalHistory");
        expect(scopes).toContain("canCreateEncounters");
        expect(scopes).not.toContain("invalidScope");
      });
    });

    describe("isValidAccessScope", () => {
      it("should validate access scopes", () => {
        expect(isValidAccessScope("canViewMedicalHistory")).toBe(true);
        expect(isValidAccessScope("canCreateEncounters")).toBe(true);
        expect(isValidAccessScope("invalidScope")).toBe(false);
      });
    });

    describe("isValidGrantAction", () => {
      it("should validate grant actions", () => {
        expect(isValidGrantAction("approve")).toBe(true);
        expect(isValidGrantAction("deny")).toBe(true);
        expect(isValidGrantAction("revoke")).toBe(true);
        expect(isValidGrantAction("invalidAction")).toBe(false);
      });
    });
  });

  const validateGroupScopes = (group: readonly string[]): boolean => {
    return group.every(
      (scope) => ACCESS_SCOPE_PERMISSION_MAP[scope] !== undefined,
    );
  };

  describe("PERMISSION_GROUPS", () => {
    it("should contain valid permission group definitions", () => {
      expect(PERMISSION_GROUPS.PATIENT_READ).toContain("canViewMedicalHistory");
      expect(PERMISSION_GROUPS.PATIENT_WRITE).toContain("canCreateEncounters");
      expect(PERMISSION_GROUPS.AUTHORIZATION).toContain("canApproveGrants");
    });

    it("should have all scopes in groups mapped to valid permissions", () => {
      const allGroupsValid =
        Object.values(PERMISSION_GROUPS).every(validateGroupScopes);
      expect(allGroupsValid).toBe(true);
    });
  });
});
