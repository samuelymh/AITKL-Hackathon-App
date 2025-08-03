import { NextRequest, NextResponse } from "next/server";
import { executeDatabaseOperation } from "@/lib/db-utils";
import User from "@/lib/models/User";
import { AuditHelper } from "@/lib/models/SchemaUtils";
import { z } from "zod";

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
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100); // Max 100 per page
  const skip = (page - 1) * limit;

  const result = await executeDatabaseOperation(async () => {
    const [users, total] = await Promise.all([
      User.find({ auditDeletedDateTime: { $exists: false } }) // Exclude soft-deleted users
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .select("-personalInfo.contact.email -personalInfo.contact.phone") // Exclude sensitive data
        .lean(),
      User.countDocuments({ auditDeletedDateTime: { $exists: false } }),
    ]);

    return {
      users: users.map((user) => ({
        ...user,
        name: `${user.personalInfo.firstName} ${user.personalInfo.lastName}`,
        age: Math.floor(
          (Date.now() - new Date(user.personalInfo.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        ),
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: skip + limit < total,
        hasPrev: page > 1,
      },
    };
  }, "Fetch Users");

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "Failed to fetch users",
        timestamp: result.timestamp,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result.data,
    timestamp: result.timestamp,
  });
}

/**
 * POST /api/users - Create a new user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = CreateUserSchema.parse(body);

    const result = await executeDatabaseOperation(async () => {
      // Check if user with this email already exists
      const existingUser = await User.findOne({
        "personalInfo.contact.email": validatedData.personalInfo.contact.email,
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Create new user
      const user = new User(validatedData);

      // Apply audit fields for creation
      // In a real app, you'd get the current user ID from authentication
      AuditHelper.applyAudit(user, "create", "system-api");

      const savedUser = await user.save();

      return {
        user: savedUser.toPublicJSON(),
        message: "User created successfully",
      };
    }, "Create User");

    if (!result.success) {
      const status = result.error?.includes("already exists") ? 409 : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to create user",
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
    console.error("User creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input data",
          details: error.errors,
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users - Update a user (requires digitalIdentifier in body)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { digitalIdentifier, ...updateData } = body;

    if (!digitalIdentifier) {
      return NextResponse.json(
        {
          success: false,
          error: "digitalIdentifier is required for updates",
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    const result = await executeDatabaseOperation(async () => {
      const user = await User.findOne({ digitalIdentifier });

      if (!user) {
        throw new Error("User not found");
      }

      // Apply updates
      Object.assign(user, updateData);

      // Apply audit fields for update
      AuditHelper.applyAudit(user, "update", "system-api");

      const updatedUser = await user.save();

      return {
        user: updatedUser.toPublicJSON(),
        message: "User updated successfully",
      };
    }, "Update User");

    if (!result.success) {
      const status = result.error?.includes("not found") ? 404 : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to update user",
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
    console.error("User update error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users - Soft delete a user (requires digitalIdentifier as query param)
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const digitalIdentifier = searchParams.get("digitalIdentifier");

  if (!digitalIdentifier) {
    return NextResponse.json(
      {
        success: false,
        error: "digitalIdentifier query parameter is required",
        timestamp: new Date(),
      },
      { status: 400 }
    );
  }

  const result = await executeDatabaseOperation(async () => {
    const user = await User.findOne({ digitalIdentifier });

    if (!user) {
      throw new Error("User not found");
    }

    // Apply audit fields for soft delete
    AuditHelper.applyAudit(user, "delete", "system-api");

    const deletedUser = await user.save();

    return {
      user: deletedUser.toPublicJSON(),
      message: "User soft deleted successfully",
    };
  }, "Delete User");

  if (!result.success) {
    const status = result.error?.includes("not found") ? 404 : 500;
    return NextResponse.json(
      {
        success: false,
        error: result.error || "Failed to delete user",
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
}
