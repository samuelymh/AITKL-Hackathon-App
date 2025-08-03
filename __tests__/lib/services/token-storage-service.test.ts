import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { TokenStorageService } from "../../../lib/services/token-storage-service";

describe("TokenStorageService", () => {
  const mockToken = "test-token-12345";
  const mockGrantId = "507f1f77bcf86cd799439011";
  const mockUserId = "507f1f77bcf86cd799439012";
  const mockOrganizationId = "507f1f77bcf86cd799439013";

  beforeEach(() => {
    // Clear all tokens before each test
    TokenStorageService.clearAllTokens();
    jest.clearAllMocks();
  });

  describe("storeToken", () => {
    it("should store a token successfully", async () => {
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      await TokenStorageService.storeToken(
        mockToken,
        mockGrantId,
        mockUserId,
        mockOrganizationId,
        "access",
        expiresAt,
        { source: "test" }
      );

      const validation = await TokenStorageService.validateToken(mockToken);

      expect(validation.isValid).toBe(true);
      expect(validation.token).toBeDefined();
      expect(validation.token?.grantId).toBe(mockGrantId);
      expect(validation.token?.tokenType).toBe("access");
      expect(validation.token?.metadata?.source).toBe("test");
    });

    it("should handle multiple tokens for different grants", async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const token1 = "token-1";
      const token2 = "token-2";
      const grantId1 = "grant-1";
      const grantId2 = "grant-2";

      await TokenStorageService.storeToken(token1, grantId1, mockUserId, mockOrganizationId, "access", expiresAt);
      await TokenStorageService.storeToken(token2, grantId2, mockUserId, mockOrganizationId, "qr", expiresAt);

      const validation1 = await TokenStorageService.validateToken(token1);
      const validation2 = await TokenStorageService.validateToken(token2);

      expect(validation1.isValid).toBe(true);
      expect(validation2.isValid).toBe(true);
      expect(validation1.token?.grantId).toBe(grantId1);
      expect(validation2.token?.grantId).toBe(grantId2);
      expect(validation1.token?.tokenType).toBe("access");
      expect(validation2.token?.tokenType).toBe("qr");
    });
  });

  describe("validateToken", () => {
    it("should return invalid for non-existent token", async () => {
      const validation = await TokenStorageService.validateToken("non-existent-token");

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Token not found");
    });

    it("should return invalid for expired token", async () => {
      const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

      await TokenStorageService.storeToken(mockToken, mockGrantId, mockUserId, mockOrganizationId, "access", expiresAt);

      const validation = await TokenStorageService.validateToken(mockToken);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Token has expired");
    });

    it("should return invalid for revoked token", async () => {
      const expiresAt = new Date(Date.now() + 3600000);

      await TokenStorageService.storeToken(mockToken, mockGrantId, mockUserId, mockOrganizationId, "access", expiresAt);

      await TokenStorageService.revokeToken(mockToken, "admin", "Manual revocation");

      const validation = await TokenStorageService.validateToken(mockToken);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Token has been revoked");
    });

    it("should return valid for active token", async () => {
      const expiresAt = new Date(Date.now() + 3600000);

      await TokenStorageService.storeToken(mockToken, mockGrantId, mockUserId, mockOrganizationId, "access", expiresAt);

      const validation = await TokenStorageService.validateToken(mockToken);

      expect(validation.isValid).toBe(true);
      expect(validation.token?.isRevoked).toBe(false);
      expect(validation.token?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("revokeToken", () => {
    it("should revoke a token successfully", async () => {
      const expiresAt = new Date(Date.now() + 3600000);

      await TokenStorageService.storeToken(mockToken, mockGrantId, mockUserId, mockOrganizationId, "access", expiresAt);

      const revoked = await TokenStorageService.revokeToken(mockToken, "admin", "Security audit");

      expect(revoked).toBe(true);

      const validation = await TokenStorageService.validateToken(mockToken);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Token has been revoked");
    });

    it("should return false for non-existent token", async () => {
      const revoked = await TokenStorageService.revokeToken("non-existent", "admin");
      expect(revoked).toBe(false);
    });
  });

  describe("revokeTokensForGrant", () => {
    it("should revoke all tokens for a specific grant", async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const token1 = "token-1";
      const token2 = "token-2";
      const token3 = "token-3";

      // Store tokens for two different grants
      await TokenStorageService.storeToken(token1, mockGrantId, mockUserId, mockOrganizationId, "access", expiresAt);
      await TokenStorageService.storeToken(token2, mockGrantId, mockUserId, mockOrganizationId, "qr", expiresAt);
      await TokenStorageService.storeToken(
        token3,
        "different-grant",
        mockUserId,
        mockOrganizationId,
        "access",
        expiresAt
      );

      const revokedCount = await TokenStorageService.revokeTokensForGrant(mockGrantId, "admin");

      expect(revokedCount).toBe(2);

      // Check that tokens for the grant are revoked
      const validation1 = await TokenStorageService.validateToken(token1);
      const validation2 = await TokenStorageService.validateToken(token2);
      const validation3 = await TokenStorageService.validateToken(token3);

      expect(validation1.isValid).toBe(false);
      expect(validation2.isValid).toBe(false);
      expect(validation3.isValid).toBe(true); // Different grant, should still be valid
    });
  });

  describe("revokeTokensForUser", () => {
    it("should revoke all tokens for a specific user", async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const token1 = "token-1";
      const token2 = "token-2";
      const token3 = "token-3";
      const differentUserId = "different-user";

      // Store tokens for two different users
      await TokenStorageService.storeToken(token1, mockGrantId, mockUserId, mockOrganizationId, "access", expiresAt);
      await TokenStorageService.storeToken(token2, "grant-2", mockUserId, mockOrganizationId, "qr", expiresAt);
      await TokenStorageService.storeToken(token3, "grant-3", differentUserId, mockOrganizationId, "access", expiresAt);

      const revokedCount = await TokenStorageService.revokeTokensForUser(mockUserId, "admin");

      expect(revokedCount).toBe(2);

      // Check that tokens for the user are revoked
      const validation1 = await TokenStorageService.validateToken(token1);
      const validation2 = await TokenStorageService.validateToken(token2);
      const validation3 = await TokenStorageService.validateToken(token3);

      expect(validation1.isValid).toBe(false);
      expect(validation2.isValid).toBe(false);
      expect(validation3.isValid).toBe(true); // Different user, should still be valid
    });
  });

  describe("getTokensForGrant", () => {
    it("should return all tokens for a specific grant", async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const token1 = "token-1";
      const token2 = "token-2";

      await TokenStorageService.storeToken(token1, mockGrantId, mockUserId, mockOrganizationId, "access", expiresAt);
      await TokenStorageService.storeToken(token2, mockGrantId, mockUserId, mockOrganizationId, "qr", expiresAt);
      await TokenStorageService.storeToken(
        "token-3",
        "different-grant",
        mockUserId,
        mockOrganizationId,
        "access",
        expiresAt
      );

      const grantTokens = await TokenStorageService.getTokensForGrant(mockGrantId);

      expect(grantTokens).toHaveLength(2);
      expect(grantTokens.map((t) => t.token)).toContain(token1);
      expect(grantTokens.map((t) => t.token)).toContain(token2);
    });
  });

  describe("cleanupExpiredTokens", () => {
    it("should clean up expired tokens", async () => {
      const expiredTime = new Date(Date.now() - 1000);
      const futureTime = new Date(Date.now() + 3600000);

      await TokenStorageService.storeToken(
        "expired-token",
        mockGrantId,
        mockUserId,
        mockOrganizationId,
        "access",
        expiredTime
      );
      await TokenStorageService.storeToken(
        "valid-token",
        mockGrantId,
        mockUserId,
        mockOrganizationId,
        "access",
        futureTime
      );

      const cleanedCount = await TokenStorageService.cleanupExpiredTokens();

      expect(cleanedCount).toBe(1);

      // Expired token should be completely removed
      const expiredValidation = await TokenStorageService.validateToken("expired-token");
      const validValidation = await TokenStorageService.validateToken("valid-token");

      expect(expiredValidation.isValid).toBe(false);
      expect(expiredValidation.error).toBe("Token not found"); // Completely removed
      expect(validValidation.isValid).toBe(true);
    });
  });

  describe("getTokenStats", () => {
    it("should return correct token statistics", async () => {
      const futureTime = new Date(Date.now() + 3600000);
      const expiredTime = new Date(Date.now() - 1000);

      // Create tokens with different states
      await TokenStorageService.storeToken(
        "active-access",
        mockGrantId,
        mockUserId,
        mockOrganizationId,
        "access",
        futureTime
      );
      await TokenStorageService.storeToken("active-qr", mockGrantId, mockUserId, mockOrganizationId, "qr", futureTime);
      await TokenStorageService.storeToken(
        "revoked-token",
        mockGrantId,
        mockUserId,
        mockOrganizationId,
        "access",
        futureTime
      );
      await TokenStorageService.storeToken(
        "expired-token",
        mockGrantId,
        mockUserId,
        mockOrganizationId,
        "scan",
        expiredTime
      );

      // Revoke one token
      await TokenStorageService.revokeToken("revoked-token", "admin");

      const stats = await TokenStorageService.getTokenStats();

      expect(stats.total).toBe(4);
      expect(stats.active).toBe(2);
      expect(stats.revoked).toBe(1);
      expect(stats.expired).toBe(1);
      expect(stats.byType.access).toBe(2);
      expect(stats.byType.qr).toBe(1);
      expect(stats.byType.scan).toBe(1);
    });
  });
});
