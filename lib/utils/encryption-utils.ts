/**
 * Shared utility functions for encryption and nested object operations
 * Addresses PR comment about code duplication
 */

/**
 * Get nested value from object using dot notation
 * Used across encryption plugin and migration utilities
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, prop) => current?.[prop], obj);
}

/**
 * Set nested value in object using dot notation
 * Used across encryption plugin and migration utilities
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const pathArray = path.split(".");
  const lastKey = pathArray.pop()!;
  const target = pathArray.reduce((current, prop) => {
    if (!current[prop]) current[prop] = {};
    return current[prop];
  }, obj);
  target[lastKey] = value;
}

/**
 * Safely extract field paths from nested objects
 * Useful for validation and migration operations
 */
export function extractFieldPaths(obj: any, prefix: string = ""): string[] {
  const paths: string[] = [];

  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === "object" && !Array.isArray(value)) {
        // Check if it's an encrypted field structure
        if ("data" in value && "iv" in value && "keyVersion" in value) {
          paths.push(currentPath);
        } else {
          // Recursively process nested objects
          paths.push(...extractFieldPaths(value, currentPath));
        }
      } else if (typeof value === "string") {
        paths.push(currentPath);
      }
    }
  }

  return paths;
}

/**
 * Validate field path format
 * Ensures dot notation paths are properly formatted
 */
export function validateFieldPath(path: string): boolean {
  if (!path || typeof path !== "string") {
    return false;
  }

  // Check for valid dot notation format
  const pathRegex = /^[a-zA-Z_]\w*(\.[a-zA-Z_]\w*)*$/;
  return pathRegex.test(path);
}

/**
 * Batch process operations with concurrency control
 * Addresses PR comment about migration performance
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  concurrency: number = 5,
): Promise<R[]> {
  const results: R[] = [];
  const semaphore = new Semaphore(concurrency);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map((item) =>
      semaphore.acquire().then(async () => {
        try {
          return await processor(item);
        } finally {
          semaphore.release();
        }
      }),
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Simple semaphore implementation for concurrency control
 */
class Semaphore {
  private permits: number;
  private readonly waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }
}

/**
 * Retry mechanism with exponential backoff
 * Addresses PR comment about migration resilience
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      console.warn(
        `Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`,
        error,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(lastError?.message || "Operation failed after all retries");
}

/**
 * Validate encrypted field structure
 * Ensures encrypted fields meet expected format
 */
export function validateEncryptedField(field: any): field is {
  data: string;
  iv: string;
  keyVersion: number;
  algorithm: string;
} {
  return (
    field &&
    typeof field === "object" &&
    typeof field.data === "string" &&
    typeof field.iv === "string" &&
    typeof field.keyVersion === "number" &&
    typeof field.algorithm === "string" &&
    field.data.length > 0 &&
    field.iv.length > 0 &&
    field.keyVersion > 0
  );
}

/**
 * Performance timing utility for monitoring operations
 */
export class PerformanceTimer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.startTime;
    console.log(`⏱️  ${this.label}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  checkpoint(checkpointLabel: string): void {
    const duration = performance.now() - this.startTime;
    console.log(
      `⏱️  ${this.label} - ${checkpointLabel}: ${duration.toFixed(2)}ms`,
    );
  }
}

/**
 * Safe JSON serialization that handles encrypted fields
 */
export function safeStringify(obj: any, space?: number): string {
  return JSON.stringify(
    obj,
    (key, value) => {
      // Don't expose internal encryption structure in logs
      if (
        value &&
        typeof value === "object" &&
        "data" in value &&
        "iv" in value
      ) {
        return "[ENCRYPTED]";
      }
      return value;
    },
    space,
  );
}

/**
 * Generate secure random identifiers for operations
 */
export function generateOperationId(prefix: string = "op"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}
