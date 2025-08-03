import { NextRequest } from "next/server";
import { z } from "zod";
import { executeDatabaseOperation } from "@/lib/db-utils";
import User from "@/lib/models/User";
import { AuditHelper } from "@/lib/models/SchemaUtils";
import { getAuthContext, requireAuth, UserRole } from "@/lib/auth";
import {
  createErrorResponse,
  createSuccessResponse,
  extractPaginationParams,
  createPaginationMeta,
  transformUserForResponse,
  validateRequiredFields,
  getActiveUserQuery,
} from "@/lib/api-helpers";

// Input validation schema
const CreateUserSchema = z.object({
  digitalIdentifier: z.string().optional(),
  personalInfo: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    dateOfBirth: z.string().transform((str) => new Date(str)),
    contact: z.object({
      email: z.string().email(),
      phone: z.string().regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
    }),
  }),
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

/**
 * GET /api/users - Retrieve all users with pagination
 */
export async function GET(request: NextRequest) {
  // Extract authentication context
  const authContext = getAuthContext(request);
  const authCheck = requireAuth([UserRole.ADMIN, UserRole.DOCTOR])(authContext);

  if (!authCheck.success) {
    return createErrorResponse(authCheck.error!, authCheck.status!);
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = extractPaginationParams(searchParams);

  const result = await executeDatabaseOperation(async () => {
    const activeUserQuery = getActiveUserQuery();

    // Use aggregation pipeline for better performance
    const [users, total] = await Promise.all([
      User.find(activeUserQuery)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .select("-personalInfo.contact.email -personalInfo.contact.phone -auth.passwordHash") // Exclude sensitive data
        .lean()
        .exec(),
      User.countDocuments(activeUserQuery),
    ]);

    // Transform users using helper function
    const transformedUsers = users.map(transformUserForResponse);

    return {
      users: transformedUsers,
      pagination: createPaginationMeta(page, limit, total, skip),
    };
  }, "Fetch Users");

  if (!result.success) {
    return createErrorResponse(result.error || "Failed to fetch users", 500);
  }

  return createSuccessResponse(result.data);
}

/**
 * POST /api/users - Create a new user
 */
export async function POST(request: NextRequest) {
  // Extract authentication context
  const authContext = getAuthContext(request);
  const authCheck = requireAuth([UserRole.ADMIN, UserRole.DOCTOR])(authContext);

  if (!authCheck.success) {
    return createErrorResponse(authCheck.error!, authCheck.status!);
  }

  try {
    const body = await request.json();

    // Validate input
    const validatedData = CreateUserSchema.parse(body);

    const result = await executeDatabaseOperation(async () => {
      // Check if user with this email already exists
      const existingUser = await User.findOne({
        "personalInfo.contact.email": validatedData.personalInfo.contact.email,
        ...getActiveUserQuery(),
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Create new user
      const user = new User(validatedData);

      // Apply audit fields for creation with authenticated user ID
      const currentUserId = authContext?.userId || "system-api";
      AuditHelper.applyAudit(user, "create", currentUserId);

      const savedUser = await user.save();

      return {
        user: savedUser.toPublicJSON(),
        message: "User created successfully",
      };
    }, "Create User");

    if (!result.success) {
      const status = result.error?.includes("already exists") ? 409 : 500;
      return createErrorResponse(result.error || "Failed to create user", status);
    }

    return createSuccessResponse(result.data, 201);
  } catch (error) {
    console.error("User creation error:", error);

    if (error instanceof z.ZodError) {
      return createErrorResponse("Invalid input data", 400, error.errors);
    }

    return createErrorResponse(error instanceof Error ? error.message : "Unknown error occurred", 500);
  }
}

/**
 * PUT /api/users - Update a user (requires digitalIdentifier in body)
 */
export async function PUT(request: NextRequest) {
  // Extract authentication context
  const authContext = getAuthContext(request);
  const authCheck = requireAuth([UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT])(authContext);

  if (!authCheck.success) {
    return createErrorResponse(authCheck.error!, authCheck.status!);
  }

  try {
    const body = await request.json();

    // Validate required fields
    const validationError = validateRequiredFields(body, ["digitalIdentifier"]);
    if (validationError) {
      return createErrorResponse(validationError, 400);
    }

    const { digitalIdentifier, ...updateData } = body;

    const result = await executeDatabaseOperation(async () => {
      const user = await User.findOne({
        digitalIdentifier,
        ...getActiveUserQuery(),
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Check if user can update this profile
      if (authContext?.role === UserRole.PATIENT && authContext.digitalIdentifier !== digitalIdentifier) {
        throw new Error("Patients can only update their own profile");
      }

      // Apply updates (excluding sensitive fields)
      const { auth, ...safeUpdateData } = updateData;
      Object.assign(user, safeUpdateData);

      // Apply audit fields for update with authenticated user ID
      const currentUserId = authContext?.userId || "system-api";
      AuditHelper.applyAudit(user, "update", currentUserId);

      const updatedUser = await user.save();

      return {
        user: updatedUser.toPublicJSON(),
        message: "User updated successfully",
      };
    }, "Update User");

    if (!result.success) {
      let status = 500;
      if (result.error?.includes("not found")) {
        status = 404;
      } else if (result.error?.includes("only update")) {
        status = 403;
      }

      return createErrorResponse(result.error || "Failed to update user", status);
    }

    return createSuccessResponse(result.data);
  } catch (error) {
    console.error("User update error:", error);
    return createErrorResponse(error instanceof Error ? error.message : "Unknown error occurred", 500);
  }
}

/**
 * DELETE /api/users - Soft delete a user (requires digitalIdentifier as query param)
 */
export async function DELETE(request: NextRequest) {
  // Extract authentication context
  const authContext = getAuthContext(request);
  const authCheck = requireAuth([UserRole.ADMIN])(authContext);

  if (!authCheck.success) {
    return createErrorResponse(authCheck.error!, authCheck.status!);
  }

  const { searchParams } = new URL(request.url);
  const digitalIdentifier = searchParams.get("digitalIdentifier");

  if (!digitalIdentifier) {
    return createErrorResponse("digitalIdentifier query parameter is required", 400);
  }

  const result = await executeDatabaseOperation(async () => {
    const user = await User.findOne({
      digitalIdentifier,
      ...getActiveUserQuery(),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Apply audit fields for soft delete with authenticated user ID
    const currentUserId = authContext?.userId || "system-api";
    AuditHelper.applyAudit(user, "delete", currentUserId);

    const deletedUser = await user.save();

    return {
      user: deletedUser.toPublicJSON(),
      message: "User soft deleted successfully",
    };
  }, "Delete User");

  if (!result.success) {
    const status = result.error?.includes("not found") ? 404 : 500;
    return createErrorResponse(result.error || "Failed to delete user", status);
  }

  return createSuccessResponse(result.data);
}
