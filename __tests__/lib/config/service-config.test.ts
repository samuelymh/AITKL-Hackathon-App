import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { ServiceConfigManager } from "../../../lib/config/service-config";
import { TokenStorageService } from "../../../lib/services/token-storage-service";

// Mock the TokenStorageService
jest.mock("../../../lib/services/token-storage-service", () => ({
  TokenStorageService: {
    initialize: jest.fn(),
  },
}));

describe("ServiceConfigManager", () => {
  beforeEach(() => {
    ServiceConfigManager.reset();
    jest.clearAllMocks();
  });

  describe("initialize", () => {
    it("should initialize with default development configuration", () => {
      ServiceConfigManager.initialize(undefined, "development");

      expect(TokenStorageService.initialize).toHaveBeenCalledWith({
        backend: "memory",
        enablePeriodicCleanup: true,
        cleanupIntervalMinutes: 5,
      });
    });

    it("should initialize with test configuration", () => {
      ServiceConfigManager.initialize(undefined, "test");

      expect(TokenStorageService.initialize).toHaveBeenCalledWith({
        backend: "memory",
        enablePeriodicCleanup: false,
      });
    });

    it("should initialize with production configuration", () => {
      ServiceConfigManager.initialize(undefined, "production");

      expect(TokenStorageService.initialize).toHaveBeenCalledWith({
        backend: "mongodb",
        enablePeriodicCleanup: true,
        cleanupIntervalMinutes: 60,
      });
    });

    it("should merge custom configuration with defaults", () => {
      ServiceConfigManager.initialize(
        {
          tokenStorage: {
            backend: "mongodb",
            cleanupIntervalMinutes: 30,
          },
        },
        "development",
      );

      expect(TokenStorageService.initialize).toHaveBeenCalledWith({
        backend: "mongodb",
        enablePeriodicCleanup: true,
        cleanupIntervalMinutes: 30,
      });
    });

    it("should not reinitialize if already initialized", () => {
      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      ServiceConfigManager.initialize(undefined, "development");
      ServiceConfigManager.initialize(undefined, "development");

      expect(TokenStorageService.initialize).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        "ServiceConfigManager: Services already initialized",
      );

      consoleSpy.mockRestore();
    });

    it("should fallback to development config for unknown environment", () => {
      ServiceConfigManager.initialize(undefined, "unknown");

      expect(TokenStorageService.initialize).toHaveBeenCalledWith({
        backend: "memory",
        enablePeriodicCleanup: true,
        cleanupIntervalMinutes: 5,
      });
    });
  });

  describe("getConfig", () => {
    it("should return current configuration", () => {
      ServiceConfigManager.initialize(undefined, "test");

      const config = ServiceConfigManager.getConfig();

      expect(config.tokenStorage.backend).toBe("memory");
      expect(config.tokenStorage.enablePeriodicCleanup).toBe(false);
    });

    it("should auto-initialize if not already initialized", () => {
      const config = ServiceConfigManager.getConfig();

      expect(config.tokenStorage.backend).toBe("memory");
      expect(TokenStorageService.initialize).toHaveBeenCalled();
    });
  });

  describe("isServicesInitialized", () => {
    it("should return false initially", () => {
      expect(ServiceConfigManager.isServicesInitialized()).toBe(false);
    });

    it("should return true after initialization", () => {
      ServiceConfigManager.initialize();
      expect(ServiceConfigManager.isServicesInitialized()).toBe(true);
    });
  });

  describe("getEnvironmentConfig", () => {
    it("should return development config for development environment", () => {
      const config = ServiceConfigManager.getEnvironmentConfig("development");

      expect(config.tokenStorage.backend).toBe("memory");
      expect(config.tokenStorage.cleanupIntervalMinutes).toBe(5);
    });

    it("should return production config for production environment", () => {
      const config = ServiceConfigManager.getEnvironmentConfig("production");

      expect(config.tokenStorage.backend).toBe("mongodb");
      expect(config.tokenStorage.cleanupIntervalMinutes).toBe(60);
    });

    it("should return development config for unknown environment", () => {
      const config = ServiceConfigManager.getEnvironmentConfig("unknown");

      expect(config.tokenStorage.backend).toBe("memory");
    });
  });

  describe("reset", () => {
    it("should reset initialization state", () => {
      ServiceConfigManager.initialize();
      expect(ServiceConfigManager.isServicesInitialized()).toBe(true);

      ServiceConfigManager.reset();
      expect(ServiceConfigManager.isServicesInitialized()).toBe(false);
    });
  });
});
