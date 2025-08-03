/**
 * Example: Integrating Audit Logger with API Routes
 *
 * This file demonstrates how to integrate the audit logger service
 * with existing API routes to provide comprehensive audit trails.
 */

import { NextRequest, NextResponse } from "next/server";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";

/**
 * Example: Enhanced login route with audit logging
 */
export async function enhancedLoginRoute(request: NextRequest) {
  const startTime = Date.now();
  let statusCode = 200;
  let errorMessage: string | undefined;

  try {
    // Initialize audit logger
    await auditLogger.initialize();

    const body = await request.json();
    const { email, password } = body;

    // Log the login attempt
    await auditLogger.logSecurityEvent(
      SecurityEventType.LOGIN_SUCCESS, // Will be updated to FAILURE if login fails
      request,
      undefined, // userId not known yet
      { email, loginMethod: "password" }
    );

    // Your existing login logic here...
    // const loginResult = await authenticateUser(email, password);

    // Simulated login logic for example
    const loginSuccessful = true; // Replace with actual logic
    const user = { id: "user123", email, role: "patient" }; // Replace with actual user

    if (loginSuccessful) {
      // Log successful login
      await auditLogger.logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, request, user.id, {
        email,
        role: user.role,
        loginMethod: "password",
        duration: Date.now() - startTime,
      });

      // Also log as API request
      await auditLogger.logFromRequest(
        request,
        200,
        "LOGIN",
        "auth",
        { userId: user.id, role: user.role },
        Date.now() - startTime
      );

      return NextResponse.json({
        success: true,
        data: { user, token: "jwt-token-here" },
      });
    } else {
      statusCode = 401;
      errorMessage = "Invalid credentials";

      // Log failed login
      await auditLogger.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, request, undefined, {
        email,
        reason: "invalid_credentials",
        duration: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    statusCode = 500;
    errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log system error
    await auditLogger.logFromRequest(
      request,
      statusCode,
      "LOGIN",
      "auth",
      { error: errorMessage },
      Date.now() - startTime,
      errorMessage
    );

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}

/**
 * Example: Enhanced user management route with audit logging
 */
export async function enhancedUserRoute(request: NextRequest) {
  const startTime = Date.now();
  let statusCode = 200;
  let errorMessage: string | undefined;

  try {
    await auditLogger.initialize();

    const method = request.method;
    let action: string;
    let auditDetails: any = {};

    switch (method) {
      case "GET":
        action = "LIST_USERS";
        // Your existing GET logic...
        auditDetails = {
          filters: Object.fromEntries(new URL(request.url).searchParams),
          resultsCount: 50, // Replace with actual count
        };
        break;

      case "POST": {
        action = "CREATE_USER";
        const createBody = await request.json();
        // Your existing POST logic...
        auditDetails = {
          createdUserEmail: createBody.personalInfo?.contact?.email,
          role: createBody.role,
        };
        break;
      }

      case "PUT": {
        action = "UPDATE_USER";
        const updateBody = await request.json();
        // Your existing PUT logic...
        auditDetails = {
          updatedFields: Object.keys(updateBody),
          targetUserId: "user-id-from-params", // Replace with actual ID
        };
        break;
      }

      case "DELETE":
        action = "DELETE_USER";
        auditDetails = {
          deletedUserId: "user-id-from-params", // Replace with actual ID
          deletionType: "soft_delete",
        };
        break;

      default:
        action = "UNKNOWN";
    }

    // Log the API request
    await auditLogger.logFromRequest(request, statusCode, action, "users", auditDetails, Date.now() - startTime);

    // If this is a data modification, log it as such
    if (["POST", "PUT", "DELETE"].includes(method)) {
      await auditLogger.logSecurityEvent(
        SecurityEventType.DATA_MODIFICATION,
        request,
        "current-user-id", // Replace with actual user ID from auth context
        {
          action,
          resource: "users",
          details: auditDetails,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: `${action} completed successfully` },
    });
  } catch (error) {
    statusCode = 500;
    errorMessage = error instanceof Error ? error.message : "Unknown error";

    await auditLogger.logFromRequest(
      request,
      statusCode,
      "USER_OPERATION",
      "users",
      { error: errorMessage },
      Date.now() - startTime,
      errorMessage
    );

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}

/**
 * Example: Middleware function for automatic audit logging
 */
export function withAuditLogging(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    resource: string;
    action?: string;
    logSecurity?: boolean;
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let response: NextResponse;

    try {
      await auditLogger.initialize();

      // Execute the actual handler
      response = await handler(request);

      // Log the request after completion
      await auditLogger.logFromRequest(
        request,
        response.status,
        options.action || request.method,
        options.resource,
        {
          responseHeaders: Object.fromEntries(response.headers.entries()),
          contentLength: response.headers.get("content-length"),
        },
        Date.now() - startTime
      );

      // Log security events if required
      if (options.logSecurity && response.status >= 400) {
        await auditLogger.logSecurityEvent(
          SecurityEventType.PERMISSION_DENIED,
          request,
          undefined, // Will be extracted from auth context if available
          {
            resource: options.resource,
            action: options.action || request.method,
            statusCode: response.status,
          }
        );
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Log the error
      await auditLogger.logFromRequest(
        request,
        500,
        options.action || request.method,
        options.resource,
        { error: errorMessage },
        Date.now() - startTime,
        errorMessage
      );

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Example: Using the middleware
 */
export const auditedUserHandler = withAuditLogging(enhancedUserRoute, {
  resource: "users",
  action: "USER_MANAGEMENT",
  logSecurity: true,
});

/**
 * Example: Querying audit logs for admin dashboard
 */
export async function getAuditLogsForDashboard(request: NextRequest) {
  try {
    await auditLogger.initialize();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "25");
    const userId = url.searchParams.get("userId") || undefined;
    const action = url.searchParams.get("action") || undefined;
    const resource = url.searchParams.get("resource") || undefined;

    const startDate = url.searchParams.get("startDate") ? new Date(url.searchParams.get("startDate")!) : undefined;

    const endDate = url.searchParams.get("endDate") ? new Date(url.searchParams.get("endDate")!) : undefined;

    const result = await auditLogger.queryLogs({
      page,
      limit,
      userId,
      action,
      resource,
      startDate,
      endDate,
    });

    // Log this audit query itself
    await auditLogger.logFromRequest(request, 200, "QUERY_AUDIT_LOGS", "audit", {
      filters: { userId, action, resource, startDate, endDate },
      resultsCount: result.logs.length,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await auditLogger.logFromRequest(
      request,
      500,
      "QUERY_AUDIT_LOGS",
      "audit",
      { error: errorMessage },
      0,
      errorMessage
    );

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export default {
  enhancedLoginRoute,
  enhancedUserRoute,
  withAuditLogging,
  auditedUserHandler,
  getAuditLogsForDashboard,
};
