import connectToDatabase, { isConnected, getConnectionStatus } from "./mongodb";

/**
 * Database operation wrapper with retry logic for serverless environments
 */
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error = new Error("Database operation failed");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Ensure database connection before operation
      await connectToDatabase();

      if (!isConnected()) {
        throw new Error(
          `Database not connected. State: ${getConnectionStatus()}`,
        );
      }

      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a connection-related error that we should retry
      const isRetryableError =
        error instanceof Error &&
        (error.name === "MongoNetworkError" ||
          error.name === "MongoServerSelectionError" ||
          error.name === "MongoTimeoutError" ||
          error.message.includes("connection") ||
          error.message.includes("timeout"));

      console.log(
        `Database operation failed (attempt ${attempt}/${maxRetries}):`,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          isRetryable: isRetryableError,
          connectionStatus: getConnectionStatus(),
        },
      );

      if (isRetryableError && attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay =
          baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.log(`Retrying in ${Math.round(delay)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // If it's not retryable or we've exhausted retries, throw the error
      throw error;
    }
  }

  // This should never be reached, but just in case
  throw lastError;
}

/**
 * Handle operation execution with timing and logging
 */
async function executeOperationWithTiming<T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();

  try {
    console.log(`🔄 Starting ${operationName}...`);
    const result = await withDatabaseRetry(operation);
    const duration = Date.now() - startTime;

    console.log(`✅ ${operationName} completed successfully in ${duration}ms`);
    return { result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${operationName} failed after ${duration}ms:`, {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      connectionStatus: getConnectionStatus(),
    });

    // Ensure we always throw an Error object
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(
        typeof error === "string" ? error : "Unknown error occurred",
      );
    }
  }
}

/**
 * Format operation result for consistent API response
 */
function formatOperationResult<T>(
  success: boolean,
  data?: T,
  error?: string,
): {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
} {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    timestamp: new Date(),
  };
}

/**
 * Safe database operation executor with comprehensive error handling
 */
export async function executeDatabaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string = "Database Operation",
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}> {
  try {
    const { result } = await executeOperationWithTiming(
      operation,
      operationName,
    );
    return formatOperationResult(true, result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return formatOperationResult(false, undefined, errorMessage);
  }
}

/**
 * Batch operation handler for multiple database operations
 */
export async function executeBatchOperations<T>(
  operations: Array<{
    name: string;
    operation: () => Promise<T>;
  }>,
  continueOnError: boolean = false,
): Promise<{
  success: boolean;
  results: Array<{
    name: string;
    success: boolean;
    data?: T;
    error?: string;
  }>;
  totalSuccessful: number;
  totalFailed: number;
}> {
  const results: Array<{
    name: string;
    success: boolean;
    data?: T;
    error?: string;
  }> = [];

  let totalSuccessful = 0;
  let totalFailed = 0;

  for (const { name, operation } of operations) {
    try {
      const result = await executeDatabaseOperation(operation, name);

      if (result.success) {
        results.push({
          name,
          success: true,
          data: result.data,
        });
        totalSuccessful++;
      } else {
        results.push({
          name,
          success: false,
          error: result.error,
        });
        totalFailed++;

        if (!continueOnError) {
          break;
        }
      }
    } catch (error) {
      results.push({
        name,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      totalFailed++;

      if (!continueOnError) {
        break;
      }
    }
  }

  return {
    success: totalFailed === 0,
    results,
    totalSuccessful,
    totalFailed,
  };
}

/**
 * Connection health monitor for debugging
 */
export function logConnectionInfo(): void {
  console.log("📊 MongoDB Connection Info:", {
    status: getConnectionStatus(),
    isConnected: isConnected(),
    timestamp: new Date().toISOString(),
  });
}
