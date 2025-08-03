/**
 * Custom error classes for better error handling and specificity
 */

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: any,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

export class NotFoundError extends Error {
  constructor(
    resource: string,
    public statusCode: number = 404
  ) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(
    message: string,
    public statusCode: number = 409
  ) {
    super(message);
    this.name = "ConflictError";
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: Error,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "DatabaseError";
    this.originalError = originalError;
  }
}

export class GrantActionError extends Error {
  constructor(
    message: string,
    public currentStatus: string,
    public allowedActions: string[],
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "GrantActionError";
    this.currentStatus = currentStatus;
    this.allowedActions = allowedActions;
  }
}

export class TokenGenerationError extends Error {
  constructor(
    message: string = "Failed to generate secure token",
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "TokenGenerationError";
  }
}

export class QRCodeGenerationError extends Error {
  constructor(
    message: string = "Failed to generate QR code",
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "QRCodeGenerationError";
  }
}

/**
 * Error handler utility for consistent error responses
 */
export class ErrorHandler {
  /**
   * Centralized error handling method
   */
  static handleError(error: any): {
    error: string;
    statusCode: number;
    details?: any;
  } {
    // Handle Zod validation errors
    if (error?.name === "ZodError" || (error?.errors && Array.isArray(error.errors))) {
      const validationError = new ValidationError("Validation failed", error.errors);
      return this.formatErrorResponse(validationError);
    }

    // Handle custom error types
    if (
      error instanceof NotFoundError ||
      error instanceof ConflictError ||
      error instanceof AuthorizationError ||
      error instanceof GrantActionError ||
      error instanceof ValidationError
    ) {
      return this.formatErrorResponse(error);
    }

    // Generic error fallback
    return this.formatErrorResponse(error as Error);
  }

  static formatErrorResponse(error: Error): {
    error: string;
    statusCode: number;
    details?: any;
  } {
    if (error instanceof AuthorizationError) {
      return {
        error: error.message,
        statusCode: error.statusCode,
      };
    }

    if (error instanceof ValidationError) {
      return {
        error: error.message,
        statusCode: error.statusCode,
        details: error.details,
      };
    }

    if (error instanceof NotFoundError) {
      return {
        error: error.message,
        statusCode: error.statusCode,
      };
    }

    if (error instanceof ConflictError) {
      return {
        error: error.message,
        statusCode: error.statusCode,
      };
    }

    if (error instanceof GrantActionError) {
      return {
        error: error.message,
        statusCode: error.statusCode,
        details: {
          currentStatus: error.currentStatus,
          allowedActions: error.allowedActions,
        },
      };
    }

    if (error instanceof DatabaseError) {
      return {
        error: error.message,
        statusCode: error.statusCode,
        details: process.env.NODE_ENV === "development" ? error.originalError?.message : undefined,
      };
    }

    if (error instanceof TokenGenerationError || error instanceof QRCodeGenerationError) {
      return {
        error: error.message,
        statusCode: error.statusCode,
      };
    }

    // Generic error fallback
    return {
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
      statusCode: 500,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }
}
