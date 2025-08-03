import { NextRequest } from "next/server";
import { z } from "zod";
import User from "@/lib/models/User";
import { verifyRefreshToken, generateToken, generateRefreshToken, AuthErrors, UserRole } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-helpers";
import { withRateLimit } from "@/lib/middleware/rate-limit";

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

/**
 * POST /api/auth/refresh
 * Refresh access token using valid refresh token
 */
async function refreshHandler(request: NextRequest) {
  try {
    await connectToDatabase();

    // Parse and validate request body
    const body = await request.json();
    const validatedData = RefreshTokenSchema.parse(body);

    // Verify refresh token
    const payload = verifyRefreshToken(validatedData.refreshToken);
    if (!payload) {
      return createErrorResponse(AuthErrors.INVALID_TOKEN, 401, "INVALID_REFRESH_TOKEN");
    }

    // Find user in database
    const user = await User.findById(payload.userId).select(
      "digitalIdentifier personalInfo.contact.email auth.role personalInfo.firstName personalInfo.lastName auth.tokenVersion auth.accountLocked"
    );

    if (!user) {
      return createErrorResponse(AuthErrors.USER_NOT_FOUND, 404);
    }

    // Check if user account is locked
    if (user.auth?.accountLocked) {
      return createErrorResponse("Account has been locked", 403);
    }

    // Verify token version matches (for token rotation)
    if (user.auth?.tokenVersion !== payload.tokenVersion) {
      return createErrorResponse("Token has been invalidated", 401);
    }

    // Generate new access token
    const newAccessToken = generateToken({
      userId: user._id.toString(),
      digitalIdentifier: user.digitalIdentifier,
      role: user.auth?.role as UserRole,
      email: user.personalInfo.contact.email,
      tokenVersion: user.auth?.tokenVersion,
    });

    // Generate new refresh token (optional rotation)
    const shouldRotateRefreshToken = process.env.ROTATE_REFRESH_TOKENS === "true";
    let newRefreshToken = validatedData.refreshToken;

    if (shouldRotateRefreshToken) {
      // Increment token version for security
      if (user.auth) {
        user.auth.tokenVersion = (user.auth.tokenVersion || 1) + 1;
        await user.save();
      }

      newRefreshToken = generateRefreshToken(user._id.toString(), user.auth?.tokenVersion || 1);
    }

    // Return new tokens
    return createSuccessResponse({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: "Bearer",
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
      user: {
        id: user._id.toString(),
        digitalIdentifier: user.digitalIdentifier,
        email: user.personalInfo.contact.email,
        role: user.auth?.role,
        firstName: user.personalInfo.firstName,
        lastName: user.personalInfo.lastName,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    if (error instanceof z.ZodError) {
      return createErrorResponse("Invalid request data: " + error.errors.map((e) => e.message).join(", "), 400);
    }

    return createErrorResponse("Failed to refresh token", 500, "REFRESH_TOKEN_ERROR");
  }
}

// Apply rate limiting to refresh endpoint
export const POST = withRateLimit(refreshHandler, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20,
  message: "Too many refresh requests, please try again later",
});
