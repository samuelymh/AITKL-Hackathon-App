export interface StoredToken {
  token: string;
  grantId: string;
  userId: string;
  organizationId: string;
  tokenType: "access" | "qr" | "scan";
  createdAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedBy?: string;
  metadata?: Record<string, any>;
}

export interface TokenValidationResult {
  isValid: boolean;
  token?: StoredToken;
  error?: string;
}

/**
 * Secure token storage and management service
 * Handles token lifecycle including creation, validation, and revocation
 */
export class TokenStorageService {
  private static readonly tokens: Map<string, StoredToken> = new Map();

  /**
   * Store a token securely with expiration and metadata
   */
  static async storeToken(
    token: string,
    grantId: string,
    userId: string,
    organizationId: string,
    tokenType: StoredToken["tokenType"],
    expiresAt: Date,
    metadata?: Record<string, any>
  ): Promise<void> {
    const storedToken: StoredToken = {
      token,
      grantId,
      userId,
      organizationId,
      tokenType,
      createdAt: new Date(),
      expiresAt,
      isRevoked: false,
      metadata,
    };

    this.tokens.set(token, storedToken);

    // Schedule automatic cleanup for expired tokens
    this.scheduleTokenCleanup(token, expiresAt);
  }

  /**
   * Validate a token and return its details if valid
   */
  static async validateToken(token: string): Promise<TokenValidationResult> {
    const storedToken = this.tokens.get(token);

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
      await this.revokeToken(token, "system", "Token expired");
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

  /**
   * Revoke a token manually
   */
  static async revokeToken(token: string, revokedBy: string, reason?: string): Promise<boolean> {
    const storedToken = this.tokens.get(token);

    if (!storedToken) {
      return false;
    }

    storedToken.isRevoked = true;
    storedToken.revokedAt = new Date();
    storedToken.revokedBy = revokedBy;

    if (reason && storedToken.metadata) {
      storedToken.metadata.revocationReason = reason;
    }

    this.tokens.set(token, storedToken);
    return true;
  }

  /**
   * Revoke all tokens for a specific grant
   */
  static async revokeTokensForGrant(grantId: string, revokedBy: string, reason?: string): Promise<number> {
    let revokedCount = 0;

    for (const [token, storedToken] of this.tokens.entries()) {
      if (storedToken.grantId === grantId && !storedToken.isRevoked) {
        await this.revokeToken(token, revokedBy, reason);
        revokedCount++;
      }
    }

    return revokedCount;
  }

  /**
   * Revoke all tokens for a specific user
   */
  static async revokeTokensForUser(userId: string, revokedBy: string, reason?: string): Promise<number> {
    let revokedCount = 0;

    for (const [token, storedToken] of this.tokens.entries()) {
      if (storedToken.userId === userId && !storedToken.isRevoked) {
        await this.revokeToken(token, revokedBy, reason);
        revokedCount++;
      }
    }

    return revokedCount;
  }

  /**
   * Get all tokens for a grant (for debugging/audit purposes)
   */
  static async getTokensForGrant(grantId: string): Promise<StoredToken[]> {
    const grantTokens: StoredToken[] = [];

    for (const storedToken of this.tokens.values()) {
      if (storedToken.grantId === grantId) {
        grantTokens.push(storedToken);
      }
    }

    return grantTokens;
  }

  /**
   * Clean up expired tokens
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [token, storedToken] of this.tokens.entries()) {
      if (now > storedToken.expiresAt) {
        this.tokens.delete(token);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get token statistics for monitoring
   */
  static async getTokenStats(): Promise<{
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

  /**
   * Schedule automatic cleanup for a token when it expires
   */
  private static scheduleTokenCleanup(token: string, expiresAt: Date): void {
    const timeoutMs = expiresAt.getTime() - Date.now();

    // Only schedule if expiration is within reasonable time (24 hours max)
    if (timeoutMs > 0 && timeoutMs <= 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        this.tokens.delete(token);
      }, timeoutMs);
    }
  }

  /**
   * Initialize periodic cleanup (call this on service startup)
   */
  static initializePeriodicCleanup(intervalMinutes: number = 60): void {
    setInterval(
      async () => {
        const cleaned = await this.cleanupExpiredTokens();
        if (cleaned > 0) {
          console.log(`TokenStorageService: Cleaned up ${cleaned} expired tokens`);
        }
      },
      intervalMinutes * 60 * 1000
    );
  }

  /**
   * Clear all tokens (for testing purposes)
   */
  static clearAllTokens(): void {
    this.tokens.clear();
  }
}

export default TokenStorageService;
