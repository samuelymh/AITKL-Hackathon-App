/**
 * Audit Logger Service
 *
 * Centralized audit logging service addressing PR feedback:
 * - Structured audit log creation
 * - Multiple storage backends (console, database)
 * - Security-focused logging for compliance
 * - Performance tracking for operations
 */

import { getAuthContext } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { NextRequest } from "next/server";
import mongoose from "mongoose";

// Audit log entry interface matching PR feedback requirements
export interface AuditLogEntry {
  timestamp: Date;
  userId?: string;
  userRole?: string;
  digitalIdentifier?: string;
  action: string;
  resource: string;
  method: string;
  endpoint: string;
  ip: string;
  userAgent: string;
  statusCode: number;
  duration?: number;
  details?: any;
  success: boolean;
  errorMessage?: string;
  requestId?: string;
}

// Security event types for enhanced monitoring
export enum SecurityEventType {
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILURE = "LOGIN_FAILURE",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  PASSWORD_RESET = "PASSWORD_RESET",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  DATA_ACCESS = "DATA_ACCESS",
  DATA_MODIFICATION = "DATA_MODIFICATION",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  TOKEN_REFRESH = "TOKEN_REFRESH",
  LOGOUT = "LOGOUT",
}

// Audit log storage backends
export enum AuditStorageBackend {
  CONSOLE = "console",
  DATABASE = "database",
}

// Configuration for audit logger
interface AuditLoggerConfig {
  enabledBackends: AuditStorageBackend[];
  logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
  enablePerformanceTracking: boolean;
  enableSecurityEventTracking: boolean;
}

// Default configuration
const DEFAULT_CONFIG: AuditLoggerConfig = {
  enabledBackends: [AuditStorageBackend.CONSOLE, AuditStorageBackend.DATABASE],
  logLevel: process.env.NODE_ENV === "production" ? "INFO" : "DEBUG",
  enablePerformanceTracking: true,
  enableSecurityEventTracking: true,
};

class AuditLogger {
  private readonly config: AuditLoggerConfig;
  private auditLogSchema?: mongoose.Schema;
  private isInitialized = false;

  constructor(config: Partial<AuditLoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the audit logger (call this before using)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.initializeDatabase();
    this.isInitialized = true;
  }

  /**
   * Initialize database schema for audit logs if database backend is enabled
   */
  private async initializeDatabase(): Promise<void> {
    if (!this.config.enabledBackends.includes(AuditStorageBackend.DATABASE)) {
      return;
    }

    try {
      // Define audit log schema for database storage
      this.auditLogSchema = new mongoose.Schema(
        {
          timestamp: { type: Date, default: Date.now, index: true },
          userId: { type: String, index: true },
          userRole: { type: String, index: true },
          digitalIdentifier: { type: String, index: true },
          action: { type: String, required: true, index: true },
          resource: { type: String, required: true, index: true },
          method: { type: String, required: true },
          endpoint: { type: String, required: true },
          ip: { type: String, required: true },
          userAgent: { type: String },
          statusCode: { type: Number, required: true, index: true },
          duration: { type: Number },
          details: { type: mongoose.Schema.Types.Mixed },
          success: { type: Boolean, required: true, index: true },
          errorMessage: { type: String },
          requestId: { type: String, index: true },
        },
        {
          timestamps: true,
          collection: "audit_logs",
        }
      );

      // Add compound indexes for common queries
      this.auditLogSchema.index({ timestamp: -1, userId: 1 });
      this.auditLogSchema.index({ resource: 1, action: 1, timestamp: -1 });
      this.auditLogSchema.index({ success: 1, timestamp: -1 });
      this.auditLogSchema.index({ statusCode: 1, timestamp: -1 });
    } catch (error) {
      console.error("Failed to initialize audit database schema:", error);
    }
  }

  /**
   * Log audit entry to configured backends
   */
  async log(entry: Partial<AuditLogEntry>): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const completeEntry: AuditLogEntry = {
        timestamp: new Date(),
        success: (entry.statusCode || 200) < 400,
        action: entry.action || "UNKNOWN",
        resource: entry.resource || "unknown",
        method: entry.method || "UNKNOWN",
        endpoint: entry.endpoint || "/unknown",
        ip: entry.ip || "unknown",
        userAgent: entry.userAgent || "unknown",
        statusCode: entry.statusCode || 200,
        ...entry,
      };

      // Log to all enabled backends
      const promises = this.config.enabledBackends.map((backend) => this.logToBackend(backend, completeEntry));

      await Promise.allSettled(promises);
    } catch (error) {
      console.error("Audit logging failed:", error);
      // Don't throw - audit failures shouldn't break business logic
    }
  }

  /**
   * Log from HTTP request context
   */
  async logFromRequest(
    request: NextRequest,
    statusCode: number,
    action: string,
    resource: string,
    details?: any,
    duration?: number,
    errorMessage?: string
  ): Promise<void> {
    const authContext = getAuthContext(request);
    const ip = this.extractClientIP(request);
    const userAgent = request.headers.get("user-agent") || "unknown";
    const requestId = request.headers.get("x-request-id") || this.generateId();

    await this.log({
      userId: authContext?.userId,
      userRole: authContext?.role,
      digitalIdentifier: authContext?.digitalIdentifier,
      action,
      resource,
      method: request.method,
      endpoint: new URL(request.url).pathname,
      ip,
      userAgent,
      statusCode,
      duration,
      details,
      errorMessage,
      requestId,
    });
  }

  /**
   * Log security events with enhanced details
   */
  async logSecurityEvent(
    eventType: SecurityEventType,
    request?: NextRequest,
    userId?: string,
    details?: any
  ): Promise<void> {
    if (!this.config.enableSecurityEventTracking) {
      return;
    }

    const ip = request ? this.extractClientIP(request) : "unknown";
    const userAgent = request?.headers.get("user-agent") || "unknown";

    await this.log({
      userId,
      action: eventType,
      resource: "security",
      method: request?.method || "SYSTEM",
      endpoint: request ? new URL(request.url).pathname : "/system",
      ip,
      userAgent,
      statusCode: eventType.includes("FAILURE") || eventType.includes("DENIED") ? 403 : 200,
      details: {
        eventType,
        securityEvent: true,
        ...details,
      },
    });
  }

  /**
   * Query audit logs (simplified version)
   */
  async queryLogs(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ logs: any[]; total: number; page: number; limit: number }> {
    if (!this.config.enabledBackends.includes(AuditStorageBackend.DATABASE)) {
      throw new Error("Database backend not enabled for audit log queries");
    }

    try {
      await connectToDatabase();

      if (!mongoose.models.AuditLog && this.auditLogSchema) {
        mongoose.model("AuditLog", this.auditLogSchema);
      }

      const AuditLog = mongoose.models.AuditLog;
      if (!AuditLog) {
        throw new Error("AuditLog model not available");
      }

      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 100);
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {};
      if (filters.userId) query.userId = filters.userId;
      if (filters.action) query.action = filters.action;
      if (filters.resource) query.resource = filters.resource;
      if (filters.success !== undefined) query.success = filters.success;

      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      // Execute query with pagination
      const [logs, total] = await Promise.all([
        AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
        AuditLog.countDocuments(query),
      ]);

      return { logs, total, page, limit };
    } catch (error) {
      console.error("Failed to query audit logs:", error);
      throw new Error("Failed to query audit logs");
    }
  }

  /**
   * Log to specific backend
   */
  private async logToBackend(backend: AuditStorageBackend, entry: AuditLogEntry): Promise<void> {
    try {
      switch (backend) {
        case AuditStorageBackend.CONSOLE:
          await this.logToConsole(entry);
          break;
        case AuditStorageBackend.DATABASE:
          await this.logToDatabase(entry);
          break;
      }
    } catch (error) {
      console.error(`Failed to log to ${backend}:`, error);
    }
  }

  /**
   * Log to console with structured format
   */
  private async logToConsole(entry: AuditLogEntry): Promise<void> {
    const logLevel = entry.success ? "INFO" : "ERROR";
    const timestamp = entry.timestamp.toISOString();

    const logData = {
      timestamp,
      level: logLevel,
      category: "AUDIT",
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      method: entry.method,
      endpoint: entry.endpoint,
      statusCode: entry.statusCode,
      duration: entry.duration,
      ip: entry.ip,
      success: entry.success,
      ...(entry.errorMessage && { error: entry.errorMessage }),
      ...(entry.details && { details: entry.details }),
    };

    const logMessage = `[AUDIT] ${entry.action} on ${entry.resource} - ${entry.success ? "SUCCESS" : "FAILED"}`;

    if (entry.success) {
      console.log(logMessage, JSON.stringify(logData));
    } else {
      console.error(logMessage, JSON.stringify(logData));
    }
  }

  /**
   * Log to database
   */
  private async logToDatabase(entry: AuditLogEntry): Promise<void> {
    try {
      await connectToDatabase();

      if (!this.auditLogSchema) {
        console.warn("Audit log schema not initialized, falling back to console");
        await this.logToConsole(entry);
        return;
      }

      if (!mongoose.models.AuditLog) {
        mongoose.model("AuditLog", this.auditLogSchema);
      }

      const AuditLog = mongoose.models.AuditLog;
      await AuditLog.create(entry);
    } catch (error) {
      console.error("Failed to store audit log in database:", error);
      // Fallback to console logging
      await this.logToConsole(entry);
    }
  }

  /**
   * Generate unique ID for audit entries
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Extract client IP from request
   */
  private extractClientIP(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const clientIP = request.headers.get("x-client-ip");

    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    return realIP || clientIP || "unknown";
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Export factory function for custom configurations
export function createAuditLogger(config?: Partial<AuditLoggerConfig>): AuditLogger {
  return new AuditLogger(config);
}

// Convenience functions for common audit scenarios
export const auditOperations = {
  /**
   * Log API request
   */
  logAPIRequest: (
    request: NextRequest,
    statusCode: number,
    action: string,
    resource: string,
    details?: any,
    duration?: number,
    errorMessage?: string
  ) => auditLogger.logFromRequest(request, statusCode, action, resource, details, duration, errorMessage),

  /**
   * Log authentication events
   */
  logAuth: (eventType: SecurityEventType, request?: NextRequest, userId?: string, details?: any) =>
    auditLogger.logSecurityEvent(eventType, request, userId, details),

  /**
   * Log data access
   */
  logDataAccess: (userId: string, resource: string, action: string, details?: any) =>
    auditLogger.log({
      userId,
      action,
      resource,
      method: "READ",
      endpoint: `/api/${resource}`,
      ip: "internal",
      userAgent: "system",
      statusCode: 200,
      details,
    }),

  /**
   * Log system events
   */
  logSystem: (action: string, details?: any) =>
    auditLogger.log({
      action,
      resource: "system",
      method: "SYSTEM",
      endpoint: "/system",
      ip: "internal",
      userAgent: "system",
      statusCode: 200,
      details,
    }),
};

export default auditLogger;
