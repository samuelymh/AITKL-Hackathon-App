import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeDatabaseOperation } from "@/lib/db-utils";
import User from "@/lib/models/User";
import { generateToken, generateRefreshToken, hashPassword, UserRole, AuthErrors } from "@/lib/auth";
import { AuditHelper } from "@/lib/models/SchemaUtils";
import { withRateLimit } from "@/lib/middleware/rate-limit";

// Validation schemas
const RegisterSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    dateOfBirth: z.string().transform((str) => new Date(str)),
    contact: z.object({
      email: z.string().email(),
      phone: z.string().regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
    }),
  }),
  password: z.string().min(8).max(128),
  role: z.enum(["patient", "doctor", "pharmacist", "admin"]).default("patient"),
  medicalInfo: z
    .object({
      bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
      knownAllergies: z.array(z.string()).optional(),
      emergencyContact: z
        .object({
          name: z.string().optional(),
          phone: z
            .string()
            .regex(/^\+?[\d\s\-()]+$/)
            .optional(),
          relationship: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

type RegisterData = z.infer<typeof RegisterSchema>;

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/register - Register a new user
 */
async function registerHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData: RegisterData = RegisterSchema.parse(body);

    const result = await executeDatabaseOperation(async () => {
      // Check if user already exists using searchableEmail for uniqueness
      const existingUser = await User.findOne({
        "personalInfo.contact.searchableEmail": validatedData.personalInfo.contact.email.toLowerCase().trim(),
      });

      if (existingUser) {
        throw new Error(AuthErrors.EMAIL_ALREADY_EXISTS);
      }

      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);

      // Create user with authentication fields
      const userData = {
        ...validatedData,
        auth: {
          passwordHash: hashedPassword,
          role: validatedData.role,
          emailVerified: false,
          phoneVerified: false,
          lastLogin: null,
          loginAttempts: 0,
          accountLocked: false,
          accountLockedUntil: null,
          tokenVersion: 1,
        },
      };

      delete (userData as any).password; // Remove plain password

      const user = new User(userData);

      // Apply audit fields for creation
      AuditHelper.applyAudit(user, "create", "system-registration");

      const savedUser = await user.save();

      const publicUser = await savedUser.toPublicJSON();

      // Generate JWT tokens
      const token = generateToken({
        userId: savedUser._id.toString(),
        digitalIdentifier: savedUser.digitalIdentifier,
        role: validatedData.role as UserRole,
        email: validatedData.personalInfo.contact.email,
        tokenVersion: 1,
      });

      const refreshToken = generateRefreshToken(savedUser._id.toString(), 1);

      return {
        user: publicUser,
        accessToken: token,
        refreshToken,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
        message: "User registered successfully",
      };
    }, "Register User");

    if (!result.success) {
      const status = result.error?.includes("already") ? 409 : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Registration failed",
          timestamp: result.timestamp,
        },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        timestamp: result.timestamp,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid registration data",
          details: error.errors,
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting to register endpoint
export const POST = withRateLimit(registerHandler, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 3,
  message: "Too many registration attempts, please try again in 15 minutes",
});
