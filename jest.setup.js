require("@testing-library/jest-dom");

// Global test setup
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.JWT_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.JWT_ISSUER = "health-app";
process.env.JWT_AUDIENCE = "health-app-users";

// Encryption Configuration for tests
process.env.ENCRYPTION_SALT = "test-salt-32-chars-long-for-testing";
process.env.ENCRYPTION_MASTER_KEY = "test-master-key-32-chars-long-test";
process.env.KEY_ROTATION_ENABLED = "false";
process.env.CURRENT_KEY_VERSION = "1";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: "/",
  }),
  usePathname: () => "/",
}));

// Mock the QR scanner library for tests
jest.mock("@yudiel/react-qr-scanner", () => ({
  Scanner: jest.fn(),
}));
