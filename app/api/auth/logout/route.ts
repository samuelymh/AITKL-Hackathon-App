import { NextRequest } from "next/server";
import { z } from "zod";
import User from "@/lib/models/User";
import { getAuthContext, AuthErrors } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-helpers";
import { AuditHelper } from "@/lib/models/SchemaUtils";

const LogoutSchema = z.object({
  logoutFromAllDevices: z.boolean().optional().default(false),
});

/**
 * POST /api/auth/logout
 * Logout user and invalidate tokens
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get authenticated user context
    const authContext = getAuthContext(request);
    if (!authContext) {
      return createErrorResponse(AuthErrors.MISSING_TOKEN, 401);
    }

    // Parse request body for logout options
    const body = await request.json().catch(() => ({}));
    const { logoutFromAllDevices } = LogoutSchema.parse(body);

    // Find user in database
    const user = await User.findById(authContext.userId);
    if (!user) {
      return createErrorResponse(AuthErrors.USER_NOT_FOUND, 404);
    }

    // Invalidate tokens by incrementing token version
    if (user.auth) {
      if (logoutFromAllDevices) {
        // Increment by 2 to invalidate all tokens across all devices
        user.auth.tokenVersion = (user.auth.tokenVersion || 1) + 2;
      } else {
        // Increment by 1 to invalidate current session tokens
        user.auth.tokenVersion = (user.auth.tokenVersion || 1) + 1;
      }

      // Apply audit trail
      AuditHelper.applyAudit(user, "update", authContext.userId);
      await user.save();
    }

    return createSuccessResponse({
      message: logoutFromAllDevices ? "Successfully logged out from all devices" : "Successfully logged out",
      logoutFromAllDevices,
    });
  } catch (error) {
    console.error("Logout error:", error);

    if (error instanceof z.ZodError) {
      return createErrorResponse("Invalid logout data: " + error.errors.map((e) => e.message).join(", "), 400);
    }

    return createErrorResponse("Failed to logout", 500);
  }
}
