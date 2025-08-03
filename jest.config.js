/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/__tests__/**/*.+(ts|tsx|js)", "**/*.(test|spec).+(ts|tsx|js)"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  collectCoverageFrom: ["lib/**/*.{ts,tsx}", "app/**/*.{ts,tsx}", "!**/*.d.ts", "!**/node_modules/**"],
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
};

module.exports = config;
