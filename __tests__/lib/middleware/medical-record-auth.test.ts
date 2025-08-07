/**
 * Tests for Medical Record Authorization Middleware
 * Tests the middleware that validates authorization grants for medical record access
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { NextRequest, NextResponse } from "next/server";
import { MedicalRecordAuthMiddleware } from "@/lib/middleware/medical-record-auth";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import { getAuthContext } from "@/lib/auth";

// Mock external dependencies
jest.mock("@/lib/mongodb");
jest.mock("@/lib/models/AuthorizationGrant");
jest.mock("@/lib/auth");

describe("Medical Record Authorization Middleware", () => {
  let mockRequest: NextRequest;
  let mockAuthGrant: any;

  beforeEach(() => {
    // Mock database connection
    (connectToDatabase as jest.Mock).mockResolvedValue(true);

    // Create mock request
    mockRequest = {
      url: "https://example.com/api/patients/patient123/records?organizationId=org123",
      headers: new Map([["authorization", "Bearer valid_token"]]),
    } as any;

    // Create mock authorization grant
    mockAuthGrant = {
      _id: "grant123",
      userId: "patient123",
      organizationId: "org123",
      grantDetails: {
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
      isExpired: jest.fn().mockReturnValue(false),
      hasPermission: jest.fn().mockReturnValue(true),
    };

    // Mock auth context
    (getAuthContext as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      userId: "practitioner123",
      role: "PRACTITIONER",
    });

    // Mock AuthorizationGrant.findOne
    (AuthorizationGrant.findOne as jest.Mock).mockResolvedValue(mockAuthGrant);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validateMedicalRecordAccess", () => {
    test("should authorize valid request with active grant", async () => {
      const result =
        await MedicalRecordAuthMiddleware.validateMedicalRecordAccess(
          mockRequest,
          "patient123",
          "org123",
          "viewMedicalHistory",
        );

      expect(result.isAuthorized).toBe(true);
      expect(result.authGrant).toEqual(mockAuthGrant);
      expect(result.error).toBeUndefined();
    });

    test("should deny access when not authenticated", async () => {
      (getAuthContext as jest.Mock).mockReturnValue({
        isAuthenticated: false,
      });

      const result =
        await MedicalRecordAuthMiddleware.validateMedicalRecordAccess(
          mockRequest,
          "patient123",
          "org123",
          "viewMedicalHistory",
        );

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe("Authentication required");
    });

    test("should deny access when no grant found", async () => {
      (AuthorizationGrant.findOne as jest.Mock).mockResolvedValue(null);

      const result =
        await MedicalRecordAuthMiddleware.validateMedicalRecordAccess(
          mockRequest,
          "patient123",
          "org123",
          "viewMedicalHistory",
        );

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe(
        "No active authorization grant found for this patient and organization",
      );
    });

    test("should deny access when grant is expired", async () => {
      mockAuthGrant.isExpired.mockReturnValue(true);

      const result =
        await MedicalRecordAuthMiddleware.validateMedicalRecordAccess(
          mockRequest,
          "patient123",
          "org123",
          "viewMedicalHistory",
        );

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe("Authorization grant has expired");
    });

    test("should deny access when grant lacks required permission", async () => {
      mockAuthGrant.hasPermission.mockReturnValue(false);

      const result =
        await MedicalRecordAuthMiddleware.validateMedicalRecordAccess(
          mockRequest,
          "patient123",
          "org123",
          "createEncounters",
        );

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe(
        "Authorization grant does not include permission: createEncounters",
      );
    });

    test("should handle database errors gracefully", async () => {
      (AuthorizationGrant.findOne as jest.Mock).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result =
        await MedicalRecordAuthMiddleware.validateMedicalRecordAccess(
          mockRequest,
          "patient123",
          "org123",
          "viewMedicalHistory",
        );

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toContain(
        "Failed to validate authorization: Database connection failed",
      );
    });
  });

  describe("extractAuthParams", () => {
    test("should extract parameters from query string", async () => {
      const request = {
        url: "https://example.com/api/records?patientId=patient123&organizationId=org123",
      } as NextRequest;

      // Use reflection to access private method for testing
      const extractAuthParams = (MedicalRecordAuthMiddleware as any)
        .extractAuthParams;
      const result = await extractAuthParams(request);

      expect(result.patientId).toBe("patient123");
      expect(result.organizationId).toBe("org123");
    });

    test("should handle missing parameters gracefully", async () => {
      const request = {
        url: "https://example.com/api/records",
      } as NextRequest;

      const extractAuthParams = (MedicalRecordAuthMiddleware as any)
        .extractAuthParams;
      const result = await extractAuthParams(request);

      expect(result.patientId).toBeUndefined();
      expect(result.organizationId).toBeUndefined();
    });

    test("should handle alternative parameter names", async () => {
      const request = {
        url: "https://example.com/api/records?userId=patient123&organizationId=org123",
      } as NextRequest;

      const extractAuthParams = (MedicalRecordAuthMiddleware as any)
        .extractAuthParams;
      const result = await extractAuthParams(request);

      expect(result.patientId).toBe("patient123");
      expect(result.organizationId).toBe("org123");
    });
  });

  describe("withMedicalRecordAuth wrapper", () => {
    test("should call handler with valid authorization", async () => {
      const mockHandler = jest
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = MedicalRecordAuthMiddleware.withMedicalRecordAuth(
        mockHandler,
        "viewMedicalHistory",
      );

      const request = {
        url: "https://example.com/api/records?patientId=patient123&organizationId=org123",
      } as NextRequest;

      const result = await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request, mockAuthGrant);
      expect(result).toBeDefined();
    });

    test("should return 400 when required parameters missing", async () => {
      const mockHandler = jest.fn();
      const wrappedHandler = MedicalRecordAuthMiddleware.withMedicalRecordAuth(
        mockHandler,
        "viewMedicalHistory",
      );

      const request = {
        url: "https://example.com/api/records",
      } as NextRequest;

      const result = await wrappedHandler(request);
      const response = await result.json();

      expect(response.error).toBe(
        "Patient ID and Organization ID are required",
      );
      expect(mockHandler).not.toHaveBeenCalled();
    });

    test("should return 403 when authorization fails", async () => {
      (AuthorizationGrant.findOne as jest.Mock).mockResolvedValue(null);

      const mockHandler = jest.fn();
      const wrappedHandler = MedicalRecordAuthMiddleware.withMedicalRecordAuth(
        mockHandler,
        "viewMedicalHistory",
      );

      const request = {
        url: "https://example.com/api/records?patientId=patient123&organizationId=org123",
      } as NextRequest;

      const result = await wrappedHandler(request);
      const response = await result.json();

      expect(response.error).toBe(
        "No active authorization grant found for this patient and organization",
      );
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe("hasActiveGrant utility", () => {
    test("should return true for active non-expired grant", async () => {
      const hasGrant = await MedicalRecordAuthMiddleware.hasActiveGrant(
        "patient123",
        "org123",
      );
      expect(hasGrant).toBe(true);
    });

    test("should return false when no grant exists", async () => {
      (AuthorizationGrant.findOne as jest.Mock).mockResolvedValue(null);

      const hasGrant = await MedicalRecordAuthMiddleware.hasActiveGrant(
        "patient123",
        "org123",
      );
      expect(hasGrant).toBe(false);
    });

    test("should return false for expired grant", async () => {
      mockAuthGrant.isExpired.mockReturnValue(true);

      const hasGrant = await MedicalRecordAuthMiddleware.hasActiveGrant(
        "patient123",
        "org123",
      );
      expect(hasGrant).toBe(false);
    });

    test("should handle database errors gracefully", async () => {
      (AuthorizationGrant.findOne as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const hasGrant = await MedicalRecordAuthMiddleware.hasActiveGrant(
        "patient123",
        "org123",
      );
      expect(hasGrant).toBe(false);
    });
  });

  describe("Permission-specific wrappers", () => {
    test("should create wrapper for viewMedicalHistory", () => {
      const {
        withViewMedicalHistory,
      } = require("@/lib/middleware/medical-record-auth");
      const mockHandler = jest.fn();

      const wrapper = withViewMedicalHistory(mockHandler);
      expect(wrapper).toBeDefined();
      expect(typeof wrapper).toBe("function");
    });

    test("should create wrapper for viewPrescriptions", () => {
      const {
        withViewPrescriptions,
      } = require("@/lib/middleware/medical-record-auth");
      const mockHandler = jest.fn();

      const wrapper = withViewPrescriptions(mockHandler);
      expect(wrapper).toBeDefined();
      expect(typeof wrapper).toBe("function");
    });

    test("should create wrapper for createEncounters", () => {
      const {
        withCreateEncounters,
      } = require("@/lib/middleware/medical-record-auth");
      const mockHandler = jest.fn();

      const wrapper = withCreateEncounters(mockHandler);
      expect(wrapper).toBeDefined();
      expect(typeof wrapper).toBe("function");
    });

    test("should create wrapper for viewAuditLogs", () => {
      const {
        withViewAuditLogs,
      } = require("@/lib/middleware/medical-record-auth");
      const mockHandler = jest.fn();

      const wrapper = withViewAuditLogs(mockHandler);
      expect(wrapper).toBeDefined();
      expect(typeof wrapper).toBe("function");
    });
  });
});
