import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { AuthorizationPermissions } from "../../../lib/utils/authorization-permissions";

// Mock the Practitioner model
jest.mock("../../../lib/models/Practitioner", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

// Mock the PermissionMapper
jest.mock("../../../lib/services/permission-mapper", () => ({
  PermissionMapper: {
    validateAccessScopes: jest.fn(),
    validateGrantAction: jest.fn(),
  },
}));

// Import mocked functions after they're mocked
import Practitioner from "../../../lib/models/Practitioner";
import { PermissionMapper } from "../../../lib/services/permission-mapper";

const mockFindById = Practitioner.findById as jest.MockedFunction<
  typeof Practitioner.findById
>;
const mockValidateAccessScopes =
  PermissionMapper.validateAccessScopes as jest.MockedFunction<
    typeof PermissionMapper.validateAccessScopes
  >;
const mockValidateGrantAction =
  PermissionMapper.validateGrantAction as jest.MockedFunction<
    typeof PermissionMapper.validateGrantAction
  >;

describe("AuthorizationPermissions", () => {
  const mockPractitionerId = "507f1f77bcf86cd799439011";
  const mockOrganizationId = "507f1f77bcf86cd799439012";
  const mockGrantOrganizationId = "507f1f77bcf86cd799439013";

  const createMockPractitioner = (overrides: any = {}) => ({
    _id: mockPractitionerId,
    organizationId: { toString: () => mockOrganizationId },
    userId: "507f1f77bcf86cd799439014",
    professionalInfo: {
      licenseNumber: "LIC123456",
      specialty: "Internal Medicine",
      practitionerType: "doctor",
      yearsOfExperience: 5,
    },
    verification: {
      isLicenseVerified: true,
      isOrganizationVerified: true,
    },
    permissions: {
      canRequestAuthorizationGrants: true,
      canApproveAuthorizationGrants: true,
      canRevokeAuthorizationGrants: true,
      canAccessPatientRecords: true,
      canModifyPatientRecords: true,
      canViewAuditLogs: true,
      canPrescribeMedications: false,
      canManageOrganization: false,
      specialPermissions: [],
      ...overrides,
    },
    status: "active",
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("canRequestGrant", () => {
    it("should allow request when practitioner has all required permissions", async () => {
      const mockPractitioner = createMockPractitioner();
      mockFindById.mockResolvedValue(mockPractitioner);
      mockValidateAccessScopes.mockReturnValue({
        valid: true,
        missingPermissions: [],
        invalidScopes: [],
      });

      const result = await AuthorizationPermissions.canRequestGrant(
        mockPractitionerId,
        mockOrganizationId,
        ["canViewMedicalHistory", "canCreateEncounters"],
      );

      expect(result.allowed).toBe(true);
      expect(mockValidateAccessScopes).toHaveBeenCalledWith(
        mockPractitioner as any,
        ["canViewMedicalHistory", "canCreateEncounters"],
      );
    });

    it("should deny request when practitioner not found", async () => {
      mockFindById.mockResolvedValue(null);

      const result = await AuthorizationPermissions.canRequestGrant(
        mockPractitionerId,
        mockOrganizationId,
        ["canViewMedicalHistory"],
      );

      expect(result.allowed).toBe(false);
      expect(result.error).toBe("Practitioner not found");
    });

    it("should deny request when practitioner belongs to different organization", async () => {
      const mockPractitioner = createMockPractitioner();
      mockPractitioner.organizationId.toString = () => "different-org-id";
      mockFindById.mockResolvedValue(mockPractitioner);

      const result = await AuthorizationPermissions.canRequestGrant(
        mockPractitionerId,
        mockOrganizationId,
        ["canViewMedicalHistory"],
      );

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(
        "Practitioner does not belong to the specified organization",
      );
    });

    it("should deny request when practitioner cannot request grants", async () => {
      const mockPractitioner = createMockPractitioner({
        canRequestAuthorizationGrants: false,
      });
      mockFindById.mockResolvedValue(mockPractitioner);

      const result = await AuthorizationPermissions.canRequestGrant(
        mockPractitionerId,
        mockOrganizationId,
        ["canViewMedicalHistory"],
      );

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(
        "Practitioner cannot request authorization grants",
      );
    });

    it("should deny request when access scope validation fails with invalid scopes", async () => {
      const mockPractitioner = createMockPractitioner();
      mockFindById.mockResolvedValue(mockPractitioner);
      mockValidateAccessScopes.mockReturnValue({
        valid: false,
        missingPermissions: [],
        invalidScopes: ["invalidScope1", "invalidScope2"],
      });

      const result = await AuthorizationPermissions.canRequestGrant(
        mockPractitionerId,
        mockOrganizationId,
        ["canViewMedicalHistory", "invalidScope1", "invalidScope2"],
      );

      expect(result.allowed).toBe(false);
      expect(result.error).toContain(
        "Invalid access scopes: invalidScope1, invalidScope2",
      );
    });

    it("should deny request when access scope validation fails with missing permissions", async () => {
      const mockPractitioner = createMockPractitioner();
      mockFindById.mockResolvedValue(mockPractitioner);
      mockValidateAccessScopes.mockReturnValue({
        valid: false,
        missingPermissions: ["canCreateEncounters", "canViewAuditLogs"],
        invalidScopes: [],
      });

      const result = await AuthorizationPermissions.canRequestGrant(
        mockPractitionerId,
        mockOrganizationId,
        ["canViewMedicalHistory", "canCreateEncounters", "canViewAuditLogs"],
      );

      expect(result.allowed).toBe(false);
      expect(result.error).toContain(
        "Missing permissions for scopes: canCreateEncounters, canViewAuditLogs",
      );
    });

    it("should deny request with combined invalid scopes and missing permissions", async () => {
      const mockPractitioner = createMockPractitioner();
      mockFindById.mockResolvedValue(mockPractitioner);
      mockValidateAccessScopes.mockReturnValue({
        valid: false,
        missingPermissions: ["canCreateEncounters"],
        invalidScopes: ["invalidScope"],
      });

      const result = await AuthorizationPermissions.canRequestGrant(
        mockPractitionerId,
        mockOrganizationId,
        ["canViewMedicalHistory", "canCreateEncounters", "invalidScope"],
      );

      expect(result.allowed).toBe(false);
      expect(result.error).toContain("Invalid access scopes: invalidScope");
      expect(result.error).toContain(
        "Missing permissions for scopes: canCreateEncounters",
      );
    });
  });

  describe("canPerformAction", () => {
    it("should allow action when practitioner has required permissions", async () => {
      const mockPractitioner = createMockPractitioner();
      mockPractitioner.organizationId.toString = () => mockGrantOrganizationId;
      mockFindById.mockResolvedValue(mockPractitioner);
      mockValidateGrantAction.mockReturnValue({
        allowed: true,
      });

      const result = await AuthorizationPermissions.canPerformAction(
        mockPractitionerId,
        "approve",
        mockGrantOrganizationId,
      );

      expect(result.allowed).toBe(true);
      expect(mockValidateGrantAction).toHaveBeenCalledWith(
        mockPractitioner as any,
        "approve",
      );
    });

    it("should deny action when practitioner not found", async () => {
      mockFindById.mockResolvedValue(null);

      const result = await AuthorizationPermissions.canPerformAction(
        mockPractitionerId,
        "approve",
        mockGrantOrganizationId,
      );

      expect(result.allowed).toBe(false);
      expect(result.error).toBe("Actor not found or not a practitioner");
    });

    it("should deny action when practitioner belongs to different organization", async () => {
      const mockPractitioner = createMockPractitioner();
      // organizationId returns different value than grantOrganizationId
      mockFindById.mockResolvedValue(mockPractitioner);

      const result = await AuthorizationPermissions.canPerformAction(
        mockPractitionerId,
        "approve",
        mockGrantOrganizationId,
      );

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(
        "Practitioner does not belong to the grant's organization",
      );
    });

    it("should deny action when permission validation fails", async () => {
      const mockPractitioner = createMockPractitioner();
      mockPractitioner.organizationId.toString = () => mockGrantOrganizationId;
      mockFindById.mockResolvedValue(mockPractitioner);
      mockValidateGrantAction.mockReturnValue({
        allowed: false,
        error: "Practitioner lacks permission to approve authorization grants",
      });

      const result = await AuthorizationPermissions.canPerformAction(
        mockPractitionerId,
        "approve",
        mockGrantOrganizationId,
      );

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(
        "Practitioner lacks permission to approve authorization grants",
      );
    });

    it("should test all grant actions", async () => {
      const mockPractitioner = createMockPractitioner();
      mockPractitioner.organizationId.toString = () => mockGrantOrganizationId;
      mockFindById.mockResolvedValue(mockPractitioner);
      mockValidateGrantAction.mockReturnValue({
        allowed: true,
      });

      const actions = ["approve", "deny", "revoke"] as const;

      for (const action of actions) {
        const result = await AuthorizationPermissions.canPerformAction(
          mockPractitionerId,
          action,
          mockGrantOrganizationId,
        );

        expect(result.allowed).toBe(true);
        expect(mockValidateGrantAction).toHaveBeenCalledWith(
          mockPractitioner as any,
          action,
        );
      }
    });
  });

  describe("Integration with PermissionMapper", () => {
    it("should call PermissionMapper with correct parameters", async () => {
      const mockPractitioner = createMockPractitioner();
      mockFindById.mockResolvedValue(mockPractitioner);
      mockValidateAccessScopes.mockReturnValue({
        valid: true,
        missingPermissions: [],
        invalidScopes: [],
      });

      await AuthorizationPermissions.canRequestGrant(
        mockPractitionerId,
        mockOrganizationId,
        ["canViewMedicalHistory", "canCreateEncounters"],
      );

      expect(mockValidateAccessScopes).toHaveBeenCalledTimes(1);
      expect(mockValidateAccessScopes).toHaveBeenCalledWith(
        mockPractitioner as any,
        ["canViewMedicalHistory", "canCreateEncounters"],
      );
    });

    it("should properly delegate grant action validation", async () => {
      const mockPractitioner = createMockPractitioner();
      mockPractitioner.organizationId.toString = () => mockGrantOrganizationId;
      mockFindById.mockResolvedValue(mockPractitioner);
      mockValidateGrantAction.mockReturnValue({
        allowed: true,
      });

      await AuthorizationPermissions.canPerformAction(
        mockPractitionerId,
        "revoke",
        mockGrantOrganizationId,
      );

      expect(mockValidateGrantAction).toHaveBeenCalledTimes(1);
      expect(mockValidateGrantAction).toHaveBeenCalledWith(
        mockPractitioner as any,
        "revoke",
      );
    });
  });
});
