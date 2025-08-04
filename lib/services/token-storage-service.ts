import {
  ITokenRepository,
  MongoTokenRepository,
  InMemoryTokenRepository,
} from "../repositories/token-repository";

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
 * Configuration for token storage backend
 */
export interface TokenStorageConfig {
  backend: "memory" | "mongodb" | "redis";
  enablePeriodicCleanup?: boolean;
  cleanupIntervalMinutes?: number;
}

/**
 * Secure token storage and management service with pluggable repository backends
 * Handles token lifecycle including creation, validation, and revocation
 */
export class TokenStorageService {
  private static repository: ITokenRepository;
  private static config: TokenStorageConfig = {
    backend: "mongodb", // Default to MongoDB for production
    enablePeriodicCleanup: true,
    cleanupIntervalMinutes: 60,
  };

  /**
   * Initialize the service with a specific repository backend
   */
  static initialize(config?: Partial<TokenStorageConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize repository based on backend choice
    switch (this.config.backend) {
      case "mongodb":
        this.repository = new MongoTokenRepository();
        break;
      case "memory":
        this.repository = new InMemoryTokenRepository();
        break;
      default:
        throw new Error(
          `Unsupported token storage backend: ${this.config.backend}`,
        );
    }

    // Start periodic cleanup if enabled
    if (this.config.enablePeriodicCleanup) {
      this.initializePeriodicCleanup(this.config.cleanupIntervalMinutes);
    }
  }

  /**
   * Get the current repository (initialize with defaults if not set)
   */
  private static getRepository(): ITokenRepository {
    if (!this.repository) {
      this.initialize();
    }
    return this.repository;
  }

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
    metadata?: Record<string, any>,
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

    await this.getRepository().storeToken(storedToken);
  }

  /**
   * Validate a token and return its details if valid
   */
  static async validateToken(token: string): Promise<TokenValidationResult> {
    return await this.getRepository().validateToken(token);
  }

  /**
   * Revoke a token manually
   */
  static async revokeToken(
    token: string,
    revokedBy: string,
    reason?: string,
  ): Promise<boolean> {
    return await this.getRepository().revokeToken(token, revokedBy, reason);
  }

  /**
   * Revoke all tokens for a specific grant
   */
  static async revokeTokensForGrant(
    grantId: string,
    revokedBy: string,
    reason?: string,
  ): Promise<number> {
    return await this.getRepository().revokeTokensForGrant(
      grantId,
      revokedBy,
      reason,
    );
  }

  /**
   * Revoke all tokens for a specific user
   */
  static async revokeTokensForUser(
    userId: string,
    revokedBy: string,
    reason?: string,
  ): Promise<number> {
    return await this.getRepository().revokeTokensForUser(
      userId,
      revokedBy,
      reason,
    );
  }

  /**
   * Get all tokens for a grant (for debugging/audit purposes)
   */
  static async getTokensForGrant(grantId: string): Promise<StoredToken[]> {
    return await this.getRepository().getTokensForGrant(grantId);
  }

  /**
   * Clean up expired tokens
   */
  static async cleanupExpiredTokens(): Promise<number> {
    return await this.getRepository().cleanupExpiredTokens();
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
    return await this.getRepository().getTokenStats();
  }

  /**
   * Initialize periodic cleanup (call this on service startup)
   */
  static initializePeriodicCleanup(intervalMinutes: number = 60): void {
    setInterval(
      async () => {
        try {
          const cleaned = await this.cleanupExpiredTokens();
          if (cleaned > 0) {
            console.log(
              `TokenStorageService: Cleaned up ${cleaned} expired tokens`,
            );
          }
        } catch (error) {
          console.error(
            "TokenStorageService: Error during periodic cleanup:",
            error,
          );
        }
      },
      intervalMinutes * 60 * 1000,
    );
  }

  /**
   * Clear all tokens (for testing purposes)
   */
  static async clearAllTokens(): Promise<void> {
    await this.getRepository().clearAllTokens();
  }

  /**
   * Get current configuration
   */
  static getConfig(): TokenStorageConfig {
    return { ...this.config };
  }

  /**
   * Set repository for testing (dependency injection)
   */
  static setRepository(repository: ITokenRepository): void {
    this.repository = repository;
  }
}

export default TokenStorageService;
