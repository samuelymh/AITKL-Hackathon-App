import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeDatabaseOperation } from "@/lib/db-utils";
import User from "@/lib/models/User";
import { generateToken, verifyPassword, AuthErrors, UserRole } from "@/lib/auth";
import { AuditHelper } from "@/lib/models/SchemaUtils";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/login - Authenticate user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = LoginSchema.parse(body);

    const result = await executeDatabaseOperation(async () => {
      // Find user by email
      const user = await User.findOne({
        "personalInfo.contact.email": email,
        auditDeletedDateTime: { $exists: false }, // Exclude soft-deleted users
      });

      if (!user) {
        throw new Error(AuthErrors.INVALID_CREDENTIALS);
      }

      // Check if account is locked
      if (
        user.auth?.accountLocked &&
        user.auth?.accountLockedUntil &&
        new Date() < new Date(user.auth.accountLockedUntil)
      ) {
        throw new Error("Account temporarily locked due to multiple failed login attempts");
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.auth?.passwordHash || "");

      if (!isValidPassword) {
        // Increment login attempts
        if (user.auth) {
          user.auth.loginAttempts = (user.auth.loginAttempts || 0) + 1;

          // Lock account after 5 failed attempts for 15 minutes
          if (user.auth.loginAttempts >= 5) {
            user.auth.accountLocked = true;
            user.auth.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          }

          AuditHelper.applyAudit(user, "update", "system-login-attempt");
          await user.save();
        }

        throw new Error(AuthErrors.INVALID_CREDENTIALS);
      }

      // Reset login attempts on successful login
      if (user.auth) {
        user.auth.loginAttempts = 0;
        user.auth.accountLocked = false;
        user.auth.accountLockedUntil = null;
        user.auth.lastLogin = new Date();

        AuditHelper.applyAudit(user, "update", user._id.toString());
        await user.save();
      }

      // Generate JWT token
      const token = generateToken({
        userId: user._id.toString(),
        digitalIdentifier: user.digitalIdentifier,
        role: (user.auth?.role as UserRole) || UserRole.PATIENT,
        email: user.personalInfo.contact.email,
      });

      return {
        user: user.toPublicJSON(),
        token,
        message: "Login successful",
      };
    }, "User Login");

    if (!result.success) {
      const status = result.error?.includes("credentials") || result.error?.includes("locked") ? 401 : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Login failed",
          timestamp: result.timestamp,
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid login data",
          details: error.errors,
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}
