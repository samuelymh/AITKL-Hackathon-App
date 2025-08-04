import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  ITokenRepository,
  InMemoryTokenRepository,
  MongoTokenRepository,
} from "../../../lib/repositories/token-repository";
import { StoredToken } from "../../../lib/services/token-storage-service";

// Mock MongoDB model
jest.mock("../../../lib/models/Token", () => ({
  Token: {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
    aggregate: jest.fn(),
  },
}));

const extractTokenValues = (tokens: StoredToken[]): string[] =>
  tokens.map((t) => t.token);

describe("Token Repositories", () => {
  const mockToken = "test-token-12345";
  const mockGrantId = "507f1f77bcf86cd799439011";
  const mockUserId = "507f1f77bcf86cd799439012";
  const mockOrganizationId = "507f1f77bcf86cd799439013";

  const createMockStoredToken = (
    overrides: Partial<StoredToken> = {},
  ): StoredToken => ({
    token: mockToken,
    grantId: mockGrantId,
    userId: mockUserId,
    organizationId: mockOrganizationId,
    tokenType: "access",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    isRevoked: false,
    ...overrides,
  });

  describe("InMemoryTokenRepository", () => {
    let repository: ITokenRepository;

    beforeEach(async () => {
      repository = new InMemoryTokenRepository();
      await repository.clearAllTokens();
    });

    describe("storeToken", () => {
      it("should store a token successfully", async () => {
        const token = createMockStoredToken();

        await repository.storeToken(token);

        const validation = await repository.validateToken(mockToken);
        expect(validation.isValid).toBe(true);
        expect(validation.token?.grantId).toBe(mockGrantId);
      });
    });

    describe("validateToken", () => {
      it("should return invalid for non-existent token", async () => {
        const validation = await repository.validateToken("non-existent");

        expect(validation.isValid).toBe(false);
        expect(validation.error).toBe("Token not found");
      });

      it("should return invalid for revoked token", async () => {
        const token = createMockStoredToken({ isRevoked: true });
        await repository.storeToken(token);

        const validation = await repository.validateToken(mockToken);

        expect(validation.isValid).toBe(false);
        expect(validation.error).toBe("Token has been revoked");
      });

      it("should auto-revoke expired token", async () => {
        const expiredToken = createMockStoredToken({
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        });
        await repository.storeToken(expiredToken);

        const validation = await repository.validateToken(mockToken);

        expect(validation.isValid).toBe(false);
        expect(validation.error).toBe("Token has expired");
      });

      it("should return valid token data for valid token", async () => {
        const token = createMockStoredToken({ metadata: { source: "test" } });
        await repository.storeToken(token);

        const validation = await repository.validateToken(mockToken);

        expect(validation.isValid).toBe(true);
        expect(validation.token?.metadata?.source).toBe("test");
      });
    });

    describe("revokeToken", () => {
      it("should revoke existing token", async () => {
        const token = createMockStoredToken();
        await repository.storeToken(token);

        const result = await repository.revokeToken(
          mockToken,
          "admin",
          "test revocation",
        );

        expect(result).toBe(true);

        const validation = await repository.validateToken(mockToken);
        expect(validation.isValid).toBe(false);
        expect(validation.error).toBe("Token has been revoked");
      });

      it("should return false for non-existent token", async () => {
        const result = await repository.revokeToken("non-existent", "admin");
        expect(result).toBe(false);
      });
    });

    describe("revokeTokensForGrant", () => {
      it("should revoke all tokens for a grant", async () => {
        const token1 = createMockStoredToken({ token: "token1" });
        const token2 = createMockStoredToken({ token: "token2" });
        const token3 = createMockStoredToken({
          token: "token3",
          grantId: "different-grant",
        });

        await repository.storeToken(token1);
        await repository.storeToken(token2);
        await repository.storeToken(token3);

        const revokedCount = await repository.revokeTokensForGrant(
          mockGrantId,
          "admin",
        );

        expect(revokedCount).toBe(2);

        // Check that tokens for the grant are revoked
        const validation1 = await repository.validateToken("token1");
        const validation2 = await repository.validateToken("token2");
        const validation3 = await repository.validateToken("token3");

        expect(validation1.isValid).toBe(false);
        expect(validation2.isValid).toBe(false);
        expect(validation3.isValid).toBe(true); // Different grant, should remain valid
      });
    });

    describe("revokeTokensForUser", () => {
      it("should revoke all tokens for a user", async () => {
        const token1 = createMockStoredToken({ token: "token1" });
        const token2 = createMockStoredToken({ token: "token2" });
        const token3 = createMockStoredToken({
          token: "token3",
          userId: "different-user",
        });

        await repository.storeToken(token1);
        await repository.storeToken(token2);
        await repository.storeToken(token3);

        const revokedCount = await repository.revokeTokensForUser(
          mockUserId,
          "admin",
        );

        expect(revokedCount).toBe(2);

        // Check that tokens for the user are revoked
        const validation1 = await repository.validateToken("token1");
        const validation2 = await repository.validateToken("token2");
        const validation3 = await repository.validateToken("token3");

        expect(validation1.isValid).toBe(false);
        expect(validation2.isValid).toBe(false);
        expect(validation3.isValid).toBe(true); // Different user, should remain valid
      });
    });

    describe("getTokensForGrant", () => {
      it("should return all tokens for a grant", async () => {
        const token1 = createMockStoredToken({ token: "token1" });
        const token2 = createMockStoredToken({ token: "token2" });
        const token3 = createMockStoredToken({
          token: "token3",
          grantId: "different-grant",
        });

        await repository.storeToken(token1);
        await repository.storeToken(token2);
        await repository.storeToken(token3);

        const grantTokens = await repository.getTokensForGrant(mockGrantId);
        const tokenValues = extractTokenValues(grantTokens);

        expect(grantTokens).toHaveLength(2);
        expect(tokenValues).toContain("token1");
        expect(tokenValues).toContain("token2");
        expect(tokenValues).not.toContain("token3");
      });
    });

    describe("cleanupExpiredTokens", () => {
      it("should remove expired tokens", async () => {
        const validToken = createMockStoredToken({ token: "valid" });
        const expiredToken = createMockStoredToken({
          token: "expired",
          expiresAt: new Date(Date.now() - 1000),
        });

        await repository.storeToken(validToken);
        await repository.storeToken(expiredToken);

        const cleanedCount = await repository.cleanupExpiredTokens();

        expect(cleanedCount).toBe(1);

        const validValidation = await repository.validateToken("valid");
        const expiredValidation = await repository.validateToken("expired");

        expect(validValidation.isValid).toBe(true);
        expect(expiredValidation.isValid).toBe(false);
        expect(expiredValidation.error).toBe("Token not found");
      });
    });

    describe("getTokenStats", () => {
      it("should return accurate token statistics", async () => {
        const activeToken = createMockStoredToken({
          token: "active",
          tokenType: "access",
        });
        const revokedToken = createMockStoredToken({
          token: "revoked",
          tokenType: "qr",
          isRevoked: true,
        });
        const expiredToken = createMockStoredToken({
          token: "expired",
          tokenType: "scan",
          expiresAt: new Date(Date.now() - 1000),
        });

        await repository.storeToken(activeToken);
        await repository.storeToken(revokedToken);
        await repository.storeToken(expiredToken);

        const stats = await repository.getTokenStats();

        expect(stats.total).toBe(3);
        expect(stats.active).toBe(1);
        expect(stats.revoked).toBe(1);
        expect(stats.expired).toBe(1);
        expect(stats.byType.access).toBe(1);
        expect(stats.byType.qr).toBe(1);
        expect(stats.byType.scan).toBe(1);
      });
    });

    describe("clearAllTokens", () => {
      it("should remove all tokens", async () => {
        const token1 = createMockStoredToken({ token: "token1" });
        const token2 = createMockStoredToken({ token: "token2" });

        await repository.storeToken(token1);
        await repository.storeToken(token2);

        await repository.clearAllTokens();

        const validation1 = await repository.validateToken("token1");
        const validation2 = await repository.validateToken("token2");

        expect(validation1.isValid).toBe(false);
        expect(validation2.isValid).toBe(false);
      });
    });
  });

  describe("MongoTokenRepository", () => {
    let repository: MongoTokenRepository;

    beforeEach(() => {
      repository = new MongoTokenRepository();
      jest.clearAllMocks();
    });

    // Note: These are basic structure tests since we're mocking MongoDB
    // In a real environment, you'd use a test database or MongoDB Memory Server

    it("should be instantiable", () => {
      expect(repository).toBeInstanceOf(MongoTokenRepository);
    });

    it("should implement ITokenRepository interface", () => {
      expect(typeof repository.storeToken).toBe("function");
      expect(typeof repository.validateToken).toBe("function");
      expect(typeof repository.revokeToken).toBe("function");
      expect(typeof repository.revokeTokensForGrant).toBe("function");
      expect(typeof repository.revokeTokensForUser).toBe("function");
      expect(typeof repository.getTokensForGrant).toBe("function");
      expect(typeof repository.cleanupExpiredTokens).toBe("function");
      expect(typeof repository.getTokenStats).toBe("function");
      expect(typeof repository.clearAllTokens).toBe("function");
    });
  });
});
