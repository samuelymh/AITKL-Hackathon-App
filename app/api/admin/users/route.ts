import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminAuth } from "@/lib/middleware/auth";
import { AdminCreationService } from "@/lib/services/adminCreationService";
import { InputSanitizer } from "@/lib/utils/input-sanitizer";
import { logger } from "@/lib/logger";

const createAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().optional(),
});

/**
 * POST /api/admin/users/create
 * Create a new admin user (admin-only endpoint)
 */
async function createAdminHandler(request: NextRequest, authContext: any) {
  try {
    const body = await request.json();

    // Sanitize input data
    const sanitizedBody = InputSanitizer.sanitizeObject(body, {
      email: "email",
      firstName: "text",
      lastName: "text",
      phone: "phone",
    });

    const validatedData = createAdminSchema.parse(sanitizedBody);

    logger.info(`Admin ${authContext.userId} attempting to create new admin user for ${validatedData.email}`);

    const result = await AdminCreationService.createAdmin(validatedData);

    if (result.success) {
      logger.info(`New admin user created: ${result.admin.id} by ${authContext.userId}`);

      return NextResponse.json({
        success: true,
        message: "Admin user created successfully",
        data: {
          id: result.admin.id,
          email: result.admin.email,
          name: result.admin.name,
          role: result.admin.role,
          createdAt: result.admin.createdAt,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create admin user",
          message: "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Admin creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid admin data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Handle specific business logic errors
      if (error.message.includes("already exists")) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 });
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create admin user",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/users/list
 * List all admin users (admin-only endpoint)
 */
async function listAdminsHandler(request: NextRequest, authContext: any) {
  try {
    logger.info(`Admin ${authContext.userId} requesting admin user list`);

    const admins = await AdminCreationService.listAdmins();

    return NextResponse.json({
      success: true,
      data: {
        admins,
        count: admins.length,
      },
    });
  } catch (error) {
    logger.error("Admin list error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve admin users",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Deactivate an admin user (admin-only endpoint)
 */
async function deactivateAdminHandler(request: NextRequest, authContext: any) {
  try {
    const url = new URL(request.url);
    const adminId = url.pathname.split("/").pop();

    if (!adminId) {
      return NextResponse.json({ success: false, error: "Admin ID is required" }, { status: 400 });
    }

    // Sanitize admin ID
    const sanitizedAdminId = InputSanitizer.sanitizeObjectId(adminId);
    if (!sanitizedAdminId) {
      return NextResponse.json({ success: false, error: "Invalid admin ID format" }, { status: 400 });
    }

    // Prevent self-deactivation
    if (sanitizedAdminId === authContext.userId) {
      return NextResponse.json({ success: false, error: "Cannot deactivate your own admin account" }, { status: 400 });
    }

    logger.info(`Admin ${authContext.userId} attempting to deactivate admin ${sanitizedAdminId}`);

    const result = await AdminCreationService.deactivateAdmin(sanitizedAdminId, authContext.userId);

    if (result.success) {
      logger.info(`Admin user ${sanitizedAdminId} deactivated by ${authContext.userId}`);

      return NextResponse.json({
        success: true,
        message: "Admin user deactivated successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to deactivate admin user",
          message: "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Admin deactivation error:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to deactivate admin user",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Apply admin authentication to all endpoints
export const POST = withAdminAuth(createAdminHandler);
export const GET = withAdminAuth(listAdminsHandler);
export const DELETE = withAdminAuth(deactivateAdminHandler);
