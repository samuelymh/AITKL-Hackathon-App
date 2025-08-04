import {
  TokenStorageService,
  TokenStorageConfig,
} from "../services/token-storage-service";

/**
 * Service initialization configuration
 */
export interface ServiceConfig {
  tokenStorage: TokenStorageConfig;
  database?: {
    uri?: string;
    options?: Record<string, any>;
  };
}

/**
 * Default configuration for different environments
 */
const DEFAULT_CONFIGS: Record<string, ServiceConfig> = {
  development: {
    tokenStorage: {
      backend: "memory",
      enablePeriodicCleanup: true,
      cleanupIntervalMinutes: 5, // More frequent cleanup in dev
    },
  },
  test: {
    tokenStorage: {
      backend: "memory",
      enablePeriodicCleanup: false, // No background jobs in tests
    },
  },
  production: {
    tokenStorage: {
      backend: "mongodb",
      enablePeriodicCleanup: true,
      cleanupIntervalMinutes: 60,
    },
  },
};

/**
 * Service configuration and initialization manager
 */
export class ServiceConfigManager {
  private static isInitialized = false;
  private static currentConfig: ServiceConfig;

  /**
   * Initialize all services with environment-specific configuration
   */
  static initialize(
    config?: Partial<ServiceConfig>,
    environment?: string,
  ): void {
    if (this.isInitialized) {
      console.warn("ServiceConfigManager: Services already initialized");
      return;
    }

    const env = environment || process.env.NODE_ENV || "development";
    const defaultConfig = DEFAULT_CONFIGS[env] || DEFAULT_CONFIGS.development;

    this.currentConfig = {
      ...defaultConfig,
      ...config,
      tokenStorage: {
        ...defaultConfig.tokenStorage,
        ...config?.tokenStorage,
      },
    };

    // Initialize token storage service
    TokenStorageService.initialize(this.currentConfig.tokenStorage);

    this.isInitialized = true;
    console.log(
      `ServiceConfigManager: Initialized services for ${env} environment`,
    );
  }

  /**
   * Get current configuration
   */
  static getConfig(): ServiceConfig {
    if (!this.isInitialized) {
      this.initialize();
    }
    return { ...this.currentConfig };
  }

  /**
   * Check if services are initialized
   */
  static isServicesInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Reset initialization state (for testing)
   */
  static reset(): void {
    this.isInitialized = false;
  }

  /**
   * Get environment-specific configuration
   */
  static getEnvironmentConfig(environment: string): ServiceConfig {
    return DEFAULT_CONFIGS[environment] || DEFAULT_CONFIGS.development;
  }
}

export default ServiceConfigManager;
