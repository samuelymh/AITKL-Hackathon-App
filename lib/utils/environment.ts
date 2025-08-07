/**
 * Environment Utility Functions
 * Centralized environment checks to avoid magic strings and repeated logic
 */

export class Environment {
  /**
   * Check if the application is running in production
   */
  static isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  }

  /**
   * Check if the application is running in development
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
  }

  /**
   * Check if the application is running in test mode
   */
  static isTest(): boolean {
    return process.env.NODE_ENV === "test";
  }

  /**
   * Get the current environment name
   */
  static getEnvironment(): string {
    return process.env.NODE_ENV || "development";
  }

  /**
   * Check if debug mode is enabled
   */
  static isDebugEnabled(): boolean {
    return process.env.DEBUG === "true" || this.isDevelopment();
  }

  /**
   * Check if audit logging is enabled
   */
  static isAuditEnabled(): boolean {
    return process.env.AUDIT_LOGGING !== "false"; // Enabled by default
  }

  /**
   * Check if field-level encryption is enabled
   */
  static isEncryptionEnabled(): boolean {
    return process.env.ENCRYPTION_ENABLED === "true" || this.isProduction();
  }

  /**
   * Get the maximum request body size
   */
  static getMaxRequestBodySize(): string {
    return process.env.MAX_REQUEST_BODY_SIZE || "10mb";
  }

  /**
   * Get the rate limit configuration
   */
  static getRateLimit(): { windowMs: number; max: number } {
    return {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"), // 100 requests per window
    };
  }

  /**
   * Validate that required environment variables are set
   */
  static validateRequiredEnvVars(): void {
    const required = ["DATABASE_URL", "NEXTAUTH_SECRET", "JWT_SECRET"];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`,
      );
    }

    // Production-specific validations
    if (this.isProduction()) {
      const productionRequired = ["ENCRYPTION_MASTER_KEY", "ENCRYPTION_SALT"];

      const missingProduction = productionRequired.filter(
        (key) => !process.env[key],
      );

      if (missingProduction.length > 0) {
        throw new Error(
          `Missing required production environment variables: ${missingProduction.join(", ")}`,
        );
      }

      // Validate encryption keys are not default values
      if (process.env.ENCRYPTION_MASTER_KEY?.includes("default")) {
        throw new Error(
          "Production encryption keys must not contain default values",
        );
      }
    }
  }
}
