import { describe, it, expect } from "@jest/globals";
import {
  ErrorHandler,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  GrantActionError,
  DatabaseError,
  TokenGenerationError,
  QRCodeGenerationError,
} from "../../../lib/errors/custom-errors";

describe("ErrorHandler", () => {
  describe("handleError", () => {
    it("should handle Zod validation errors", () => {
      const zodError = {
        name: "ZodError",
        errors: [
          { path: ["userId"], message: "Required", code: "invalid_type" },
          { path: ["organizationId"], message: "Required", code: "invalid_type" },
        ],
      };

      const result = ErrorHandler.handleError(zodError);

      expect(result.error).toBe("Validation failed");
      expect(result.statusCode).toBe(400);
      expect(result.details).toEqual(zodError.errors);
    });

    it("should handle Zod errors with errors array", () => {
      const zodError = {
        errors: [{ path: ["field"], message: "Invalid input" }],
      };

      const result = ErrorHandler.handleError(zodError);

      expect(result.error).toBe("Validation failed");
      expect(result.statusCode).toBe(400);
      expect(result.details).toEqual(zodError.errors);
    });

    it("should handle AuthorizationError", () => {
      const authError = new AuthorizationError("Insufficient permissions", 403);

      const result = ErrorHandler.handleError(authError);

      expect(result.error).toBe("Insufficient permissions");
      expect(result.statusCode).toBe(403);
    });

    it("should handle NotFoundError", () => {
      const notFoundError = new NotFoundError("User");

      const result = ErrorHandler.handleError(notFoundError);

      expect(result.error).toBe("User not found");
      expect(result.statusCode).toBe(404);
    });

    it("should handle ConflictError", () => {
      const conflictError = new ConflictError("Resource already exists");

      const result = ErrorHandler.handleError(conflictError);

      expect(result.error).toBe("Resource already exists");
      expect(result.statusCode).toBe(409);
    });

    it("should handle GrantActionError", () => {
      const grantError = new GrantActionError("Invalid action", "ACTIVE", ["revoke"]);

      const result = ErrorHandler.handleError(grantError);

      expect(result.error).toBe("Invalid action");
      expect(result.statusCode).toBe(400);
      expect(result.details).toEqual({
        currentStatus: "ACTIVE",
        allowedActions: ["revoke"],
      });
    });

    it("should handle ValidationError", () => {
      const validationError = new ValidationError("Validation failed", { field: "userId", issue: "required" });

      const result = ErrorHandler.handleError(validationError);

      expect(result.error).toBe("Validation failed");
      expect(result.statusCode).toBe(400);
      expect(result.details).toEqual({ field: "userId", issue: "required" });
    });

    it("should handle generic errors", () => {
      const genericError = new Error("Something went wrong");

      const result = ErrorHandler.handleError(genericError);

      expect(result.error).toBe("Something went wrong");
      expect(result.statusCode).toBe(500);
    });
  });

  describe("formatErrorResponse", () => {
    it("should format AuthorizationError correctly", () => {
      const error = new AuthorizationError("Access denied", 403);

      const result = ErrorHandler.formatErrorResponse(error);

      expect(result).toEqual({
        error: "Access denied",
        statusCode: 403,
      });
    });

    it("should format ValidationError with details", () => {
      const error = new ValidationError("Invalid data", { field: "email" });

      const result = ErrorHandler.formatErrorResponse(error);

      expect(result).toEqual({
        error: "Invalid data",
        statusCode: 400,
        details: { field: "email" },
      });
    });

    it("should format GrantActionError with context", () => {
      const error = new GrantActionError("Cannot approve revoked grant", "REVOKED", []);

      const result = ErrorHandler.formatErrorResponse(error);

      expect(result).toEqual({
        error: "Cannot approve revoked grant",
        statusCode: 400,
        details: {
          currentStatus: "REVOKED",
          allowedActions: [],
        },
      });
    });

    it("should format DatabaseError with development details", () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(process.env, "NODE_ENV");
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        configurable: true,
      });

      const originalError = new Error("Connection failed");
      const error = new DatabaseError("Database connection error", originalError);

      const result = ErrorHandler.formatErrorResponse(error);

      expect(result).toEqual({
        error: "Database connection error",
        statusCode: 500,
        details: "Connection failed",
      });

      // Restore original descriptor
      if (originalDescriptor) {
        Object.defineProperty(process.env, "NODE_ENV", originalDescriptor);
      }
    });

    it("should format DatabaseError without details in production", () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(process.env, "NODE_ENV");
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        configurable: true,
      });

      const originalError = new Error("Connection failed");
      const error = new DatabaseError("Database connection error", originalError);

      const result = ErrorHandler.formatErrorResponse(error);

      expect(result).toEqual({
        error: "Database connection error",
        statusCode: 500,
      });

      // Restore original descriptor
      if (originalDescriptor) {
        Object.defineProperty(process.env, "NODE_ENV", originalDescriptor);
      }
    });

    it("should format TokenGenerationError", () => {
      const error = new TokenGenerationError("Token generation failed");

      const result = ErrorHandler.formatErrorResponse(error);

      expect(result).toEqual({
        error: "Token generation failed",
        statusCode: 500,
      });
    });

    it("should format QRCodeGenerationError", () => {
      const error = new QRCodeGenerationError("QR code generation failed");

      const result = ErrorHandler.formatErrorResponse(error);

      expect(result).toEqual({
        error: "QR code generation failed",
        statusCode: 500,
      });
    });

    it("should format generic errors with stack trace in development", () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(process.env, "NODE_ENV");
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        configurable: true,
      });

      const error = new Error("Generic error");

      const result = ErrorHandler.formatErrorResponse(error);

      expect(result.error).toBe("Generic error");
      expect(result.statusCode).toBe(500);
      expect(result.details).toBeDefined(); // Stack trace should be included

      // Restore original descriptor
      if (originalDescriptor) {
        Object.defineProperty(process.env, "NODE_ENV", originalDescriptor);
      }
    });

    it("should format generic errors without stack trace in production", () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(process.env, "NODE_ENV");
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        configurable: true,
      });

      const error = new Error("Generic error");

      const result = ErrorHandler.formatErrorResponse(error);

      expect(result.error).toBe("Internal server error");
      expect(result.statusCode).toBe(500);
      expect(result.details).toBeUndefined();

      // Restore original descriptor
      if (originalDescriptor) {
        Object.defineProperty(process.env, "NODE_ENV", originalDescriptor);
      }
    });
  });
});
