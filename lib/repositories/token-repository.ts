import { StoredToken, TokenValidationResult } from "../services/token-storage-service";
import { Token, ITokenDocument } from "../models/Token";

/**
 * Interface for token repository implementations
 * Supports different storage backends (MongoDB, Redis, etc.)
 */
export interface ITokenRepository {
  /**
   * Store a token with all metadata
   */
  storeToken(token: StoredToken): Promise<void>;

  /**
   * Validate and retrieve a token by its value
   */
  validateToken(tokenValue: string): Promise<TokenValidationResult>;

  /**
   * Revoke a specific token
   */
  revokeToken(tokenValue: string, revokedBy: string, reason?: string): Promise<boolean>;

  /**
   * Revoke all tokens for a specific grant
   */
  revokeTokensForGrant(grantId: string, revokedBy: string, reason?: string): Promise<number>;

  /**
   * Revoke all tokens for a specific user
   */
  revokeTokensForUser(userId: string, revokedBy: string, reason?: string): Promise<number>;

  /**
   * Get all tokens for a grant (for audit purposes)
   */
  getTokensForGrant(grantId: string): Promise<StoredToken[]>;

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens(): Promise<number>;

  /**
   * Get token statistics
   */
  getTokenStats(): Promise<{
    total: number;
    active: number;
    revoked: number;
    expired: number;
    byType: Record<StoredToken["tokenType"], number>;
  }>;

  /**
   * Clear all tokens (for testing)
   */
  clearAllTokens(): Promise<void>;
}

/**
 * MongoDB implementation of token repository
 * Provides persistent, scalable token storage
 */
export class MongoTokenRepository implements ITokenRepository {
  async storeToken(token: StoredToken): Promise<void> {
    const tokenDoc = new Token({
      token: token.token,
      grantId: token.grantId,
      userId: token.userId,
      organizationId: token.organizationId,
      tokenType: token.tokenType,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      isRevoked: token.isRevoked,
      revokedAt: token.revokedAt,
      revokedBy: token.revokedBy,
      metadata: token.metadata,
    });

    await tokenDoc.save();
  }

  async validateToken(tokenValue: string): Promise<TokenValidationResult> {
    const tokenDoc = await Token.findOne({ token: tokenValue });

    if (!tokenDoc) {
      return {
        isValid: false,
        error: "Token not found",
      };
    }

    if (tokenDoc.isRevoked) {
      return {
        isValid: false,
        error: "Token has been revoked",
      };
    }

    if (new Date() > tokenDoc.expiresAt) {
      // Auto-revoke expired token atomically
      await tokenDoc.revoke("system", "Token expired");
      return {
        isValid: false,
        error: "Token has expired",
      };
    }

    return {
      isValid: true,
      token: this.mapDocumentToStoredToken(tokenDoc),
    };
  }

  async revokeToken(tokenValue: string, revokedBy: string, reason?: string): Promise<boolean> {
    const tokenDoc = await Token.findOne({ token: tokenValue });

    if (!tokenDoc) {
      return false;
    }

    await tokenDoc.revoke(revokedBy, reason);
    return true;
  }

  async revokeTokensForGrant(grantId: string, revokedBy: string, reason?: string): Promise<number> {
    const tokens = await Token.find({
      grantId,
      isRevoked: false,
    });

    let revokedCount = 0;
    for (const token of tokens) {
      await token.revoke(revokedBy, reason);
      revokedCount++;
    }

    return revokedCount;
  }

  async revokeTokensForUser(userId: string, revokedBy: string, reason?: string): Promise<number> {
    const tokens = await Token.find({
      userId,
      isRevoked: false,
    });

    let revokedCount = 0;
    for (const token of tokens) {
      await token.revoke(revokedBy, reason);
      revokedCount++;
    }

    return revokedCount;
  }

  async getTokensForGrant(grantId: string): Promise<StoredToken[]> {
    const tokens = await Token.find({ grantId });
    return tokens.map(this.mapDocumentToStoredToken);
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await Token.deleteMany({
      expiresAt: { $lte: new Date() },
      isRevoked: false,
    });

    return result.deletedCount || 0;
  }

  async getTokenStats(): Promise<{
    total: number;
    active: number;
    revoked: number;
    expired: number;
    byType: Record<StoredToken["tokenType"], number>;
  }> {
    const now = new Date();

    const [total, revoked, expired, byType] = await Promise.all([
      Token.countDocuments(),
      Token.countDocuments({ isRevoked: true }),
      Token.countDocuments({ expiresAt: { $lte: now }, isRevoked: false }),
      Token.aggregate([
        {
          $group: {
            _id: "$tokenType",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const active = total - revoked - expired;

    const typeStats = { access: 0, qr: 0, scan: 0 } as Record<StoredToken["tokenType"], number>;
    byType.forEach((item: { _id: StoredToken["tokenType"]; count: number }) => {
      typeStats[item._id] = item.count;
    });

    return {
      total,
      active,
      revoked,
      expired,
      byType: typeStats,
    };
  }

  async clearAllTokens(): Promise<void> {
    await Token.deleteMany({});
  }

  /**
   * Helper method to convert MongoDB document to StoredToken interface
   */
  private mapDocumentToStoredToken(doc: ITokenDocument): StoredToken {
    return {
      token: doc.token,
      grantId: doc.grantId,
      userId: doc.userId,
      organizationId: doc.organizationId,
      tokenType: doc.tokenType,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
      isRevoked: doc.isRevoked,
      revokedAt: doc.revokedAt,
      revokedBy: doc.revokedBy,
      metadata: doc.metadata,
    };
  }
}

/**
 * In-memory implementation for backward compatibility and testing
 */
export class InMemoryTokenRepository implements ITokenRepository {
  private readonly tokens: Map<string, StoredToken> = new Map();

  async storeToken(token: StoredToken): Promise<void> {
    this.tokens.set(token.token, token);
  }

  async validateToken(tokenValue: string): Promise<TokenValidationResult> {
    const storedToken = this.tokens.get(tokenValue);

    if (!storedToken) {
      return {
        isValid: false,
        error: "Token not found",
      };
    }

    if (storedToken.isRevoked) {
      return {
        isValid: false,
        error: "Token has been revoked",
      };
    }

    if (new Date() > storedToken.expiresAt) {
      // Auto-revoke expired token
      await this.revokeToken(tokenValue, "system", "Token expired");
      return {
        isValid: false,
        error: "Token has expired",
      };
    }

    return {
      isValid: true,
      token: storedToken,
    };
  }

  async revokeToken(tokenValue: string, revokedBy: string, reason?: string): Promise<boolean> {
    const storedToken = this.tokens.get(tokenValue);

    if (!storedToken) {
      return false;
    }

    storedToken.isRevoked = true;
    storedToken.revokedAt = new Date();
    storedToken.revokedBy = revokedBy;

    if (reason && storedToken.metadata) {
      storedToken.metadata.revocationReason = reason;
    }

    this.tokens.set(tokenValue, storedToken);
    return true;
  }

  async revokeTokensForGrant(grantId: string, revokedBy: string, reason?: string): Promise<number> {
    let revokedCount = 0;

    for (const [tokenValue, storedToken] of this.tokens.entries()) {
      if (storedToken.grantId === grantId && !storedToken.isRevoked) {
        await this.revokeToken(tokenValue, revokedBy, reason);
        revokedCount++;
      }
    }

    return revokedCount;
  }

  async revokeTokensForUser(userId: string, revokedBy: string, reason?: string): Promise<number> {
    let revokedCount = 0;

    for (const [tokenValue, storedToken] of this.tokens.entries()) {
      if (storedToken.userId === userId && !storedToken.isRevoked) {
        await this.revokeToken(tokenValue, revokedBy, reason);
        revokedCount++;
      }
    }

    return revokedCount;
  }

  async getTokensForGrant(grantId: string): Promise<StoredToken[]> {
    const grantTokens: StoredToken[] = [];

    for (const storedToken of this.tokens.values()) {
      if (storedToken.grantId === grantId) {
        grantTokens.push(storedToken);
      }
    }

    return grantTokens;
  }

  async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [tokenValue, storedToken] of this.tokens.entries()) {
      if (now > storedToken.expiresAt) {
        this.tokens.delete(tokenValue);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  async getTokenStats(): Promise<{
    total: number;
    active: number;
    revoked: number;
    expired: number;
    byType: Record<StoredToken["tokenType"], number>;
  }> {
    const now = new Date();
    const stats = {
      total: this.tokens.size,
      active: 0,
      revoked: 0,
      expired: 0,
      byType: { access: 0, qr: 0, scan: 0 } as Record<StoredToken["tokenType"], number>,
    };

    for (const storedToken of this.tokens.values()) {
      // Count by type
      stats.byType[storedToken.tokenType]++;

      // Count by status
      if (storedToken.isRevoked) {
        stats.revoked++;
      } else if (now > storedToken.expiresAt) {
        stats.expired++;
      } else {
        stats.active++;
      }
    }

    return stats;
  }

  async clearAllTokens(): Promise<void> {
    this.tokens.clear();
  }
}
