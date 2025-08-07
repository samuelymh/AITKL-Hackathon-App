import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import User from "@/lib/models/User";
import connectToDatabase from "@/lib/mongodb";

interface CreateAdminParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export class AdminCreationService {
  /**
   * Create an admin user directly in the database
   */
  static async createAdmin({
    email,
    password,
    firstName,
    lastName,
    phone = "+1-000-000-0000",
  }: CreateAdminParams) {
    try {
      await connectToDatabase();

      // Validate inputs
      if (!email || !email.includes("@")) {
        throw new Error("Invalid email address");
      }

      if (!password || password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      if (!firstName || !lastName) {
        throw new Error("First name and last name are required");
      }

      // Check if admin already exists
      const existingAdmin = await User.findOne({
        "personalInfo.contact.searchableEmail": email.toLowerCase().trim(),
        "auth.role": "admin",
      });

      if (existingAdmin) {
        throw new Error("Admin user with this email already exists");
      }

      // Check if any user with this email exists
      const existingUser = await User.findOne({
        "personalInfo.contact.searchableEmail": email.toLowerCase().trim(),
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Generate digital identifier
      const digitalIdentifier = randomUUID();

      // Create admin user
      const adminUser = new User({
        digitalIdentifier,
        personalInfo: {
          firstName,
          lastName,
          dateOfBirth: new Date("1990-01-01"), // Default date for admin
          contact: {
            email,
            phone,
            searchableEmail: email.toLowerCase().trim(),
            verified: {
              email: true, // Auto-verify admin email
              phone: false,
            },
          },
        },
        medicalInfo: {
          // Admin doesn't need medical info
        },
        auth: {
          passwordHash,
          role: "admin",
          emailVerified: true, // Auto-verify admin
          phoneVerified: false,
          lastLogin: null,
          loginAttempts: 0,
          accountLocked: false,
          accountLockedUntil: null,
          tokenVersion: 1,
        },
        auditCreatedBy: "system-admin-creation",
        auditCreatedDateTime: new Date(),
      });

      const savedUser = await adminUser.save();

      return {
        success: true,
        admin: {
          id: savedUser._id.toString(),
          email,
          name: `${firstName} ${lastName}`,
          digitalIdentifier,
          role: "admin",
          createdAt: savedUser.auditCreatedDateTime,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to create admin: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * List all admin users
   */
  static async listAdmins() {
    try {
      await connectToDatabase();

      const admins = await User.find({
        "auth.role": "admin",
        auditDeletedDateTime: { $exists: false },
      }).select(
        "digitalIdentifier personalInfo.firstName personalInfo.lastName personalInfo.contact.email auth.emailVerified auth.lastLogin auditCreatedDateTime",
      );

      return admins.map((admin) => ({
        id: admin._id.toString(),
        digitalIdentifier: admin.digitalIdentifier,
        name: `${admin.personalInfo.firstName} ${admin.personalInfo.lastName}`,
        email: admin.personalInfo.contact.email,
        emailVerified: admin.auth?.emailVerified || false,
        lastLogin: admin.auth?.lastLogin,
        createdAt: admin.auditCreatedDateTime,
      }));
    } catch (error) {
      throw new Error(
        `Failed to list admins: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Deactivate an admin user (soft delete)
   */
  static async deactivateAdmin(adminId: string, deactivatedBy: string) {
    try {
      await connectToDatabase();

      const admin = await User.findById(adminId);
      if (!admin) {
        throw new Error("Admin user not found");
      }

      if (admin.auth?.role !== "admin") {
        throw new Error("User is not an admin");
      }

      // Soft delete
      admin.auditDeletedBy = deactivatedBy;
      admin.auditDeletedDateTime = new Date().toISOString();
      admin.auth!.accountLocked = true;

      await admin.save();

      return {
        success: true,
        message: "Admin user deactivated successfully",
      };
    } catch (error) {
      throw new Error(
        `Failed to deactivate admin: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
