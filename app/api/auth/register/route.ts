import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { executeDatabaseOperation } from "@/lib/db-utils";
import User from "@/lib/models/User";
import Practitioner from "@/lib/models/Practitioner";
import OrganizationMember from "@/lib/models/OrganizationMember";
import Organization from "@/lib/models/Organization";
import { generateToken, generateRefreshToken, hashPassword, UserRole, AuthErrors } from "@/lib/auth";
import { AuditHelper } from "@/lib/models/SchemaUtils";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { InputSanitizer } from "@/lib/utils/input-sanitizer";
import { SanitizationRule } from "@/lib/types/enums";
import { logger } from "@/lib/logger";

// Base schema for all users
const BaseRegistrationSchema = z.object({
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
      smokingStatus: z.enum(["never", "current", "former"]).optional(),
      additionalNotes: z.string().max(1000).optional(),
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

// Professional info schema for healthcare professionals
const ProfessionalInfoSchema = z.object({
  licenseNumber: z.string().min(3, "License number must be at least 3 characters"),
  specialty: z.string().min(2, "Specialty must be at least 2 characters"),
  yearsOfExperience: z.number().min(0).max(70),
  currentPosition: z.string().optional(),
  department: z.string().optional(),
});

// Dynamic schema based on role
const RegisterSchema = z.discriminatedUnion("role", [
  // Patient registration schema
  BaseRegistrationSchema.extend({
    role: z.literal("patient"),
    organizationId: z.string().optional(),
    professionalInfo: z.undefined().optional(),
  }),

  // Doctor registration schema
  BaseRegistrationSchema.extend({
    role: z.literal("doctor"),
    organizationId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Valid Organization ID is required for doctors",
    }),
    professionalInfo: ProfessionalInfoSchema,
  }),

  // Pharmacist registration schema
  BaseRegistrationSchema.extend({
    role: z.literal("pharmacist"),
    organizationId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Valid Organization ID is required for pharmacists",
    }),
    professionalInfo: ProfessionalInfoSchema,
  }),

  // Admin registration schema
  BaseRegistrationSchema.extend({
    role: z.literal("admin"),
    organizationId: z.string().optional(),
    professionalInfo: z.undefined().optional(),
  }),
]);

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

    // Sanitize input data before validation
    const sanitizedBody = InputSanitizer.sanitizeObject(body, {
      "personalInfo.contact.email": SanitizationRule.EMAIL,
      "personalInfo.contact.phone": SanitizationRule.PHONE,
      "personalInfo.firstName": SanitizationRule.TEXT,
      "personalInfo.lastName": SanitizationRule.TEXT,
      "professionalInfo.licenseNumber": SanitizationRule.TEXT,
      "professionalInfo.specialty": SanitizationRule.TEXT,
      "professionalInfo.currentPosition": SanitizationRule.TEXT,
      "professionalInfo.department": SanitizationRule.TEXT,
    });

    const validatedData: RegisterData = RegisterSchema.parse(sanitizedBody);

    const result = await executeDatabaseOperation(async () => {
      // Check if user already exists using searchableEmail for uniqueness
      const existingUser = await User.findOne({
        "personalInfo.contact.searchableEmail": validatedData.personalInfo.contact.email.toLowerCase().trim(),
      });

      if (existingUser) {
        throw new Error(AuthErrors.EMAIL_ALREADY_EXISTS);
      }

      // If this is a healthcare professional, validate organization exists
      if ((validatedData.role === "doctor" || validatedData.role === "pharmacist") && validatedData.organizationId) {
        const organization = await Organization.findById(validatedData.organizationId);
        if (!organization) {
          throw new Error("Organization not found");
        }
        if (!organization.verification?.isVerified) {
          throw new Error("Cannot join unverified organization");
        }
      }

      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);

      // Create user with authentication fields
      const userData = {
        personalInfo: validatedData.personalInfo,
        medicalInfo: validatedData.medicalInfo,
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

      const user = new User(userData);

      // Apply audit fields for creation
      AuditHelper.applyAudit(user, "create", "system-registration");

      const savedUser = await user.save();

      // For healthcare professionals, create Practitioner and OrganizationMember records
      let practitionerId: mongoose.Types.ObjectId | null = null;

      if (
        (validatedData.role === "doctor" || validatedData.role === "pharmacist") &&
        validatedData.professionalInfo &&
        validatedData.organizationId
      ) {
        // Create Practitioner record
        const practitionerData = {
          userId: savedUser._id,
          professionalInfo: {
            licenseNumber: validatedData.professionalInfo.licenseNumber,
            specialty: validatedData.professionalInfo.specialty,
            practitionerType: validatedData.role,
            yearsOfExperience: validatedData.professionalInfo.yearsOfExperience,
            currentPosition: validatedData.professionalInfo.currentPosition,
            department: validatedData.professionalInfo.department,
          },
          verification: {
            isLicenseVerified: false,
            isOrganizationVerified: false,
          },
          status: "pending_verification" as const,
        };

        const practitioner = new Practitioner(practitionerData);
        AuditHelper.applyAudit(practitioner, "create", "system-registration");
        const savedPractitioner = await practitioner.save();
        practitionerId = savedPractitioner._id;

        // Create OrganizationMember record
        const membershipData = {
          organizationId: new mongoose.Types.ObjectId(validatedData.organizationId),
          practitionerId: savedPractitioner._id,
          membershipDetails: {
            role: validatedData.role,
            accessLevel: "limited" as const,
            department: validatedData.professionalInfo.department,
            position: validatedData.professionalInfo.currentPosition,
            startDate: new Date(),
            isPrimary: true, // First organization is primary
          },
          permissions: {
            // Set role-based permissions - these will be enhanced by pre-save middleware
            canAccessPatientRecords: validatedData.role === "doctor" || validatedData.role === "pharmacist",
            canModifyPatientRecords: validatedData.role === "doctor",
            canPrescribeMedications: validatedData.role === "doctor" || validatedData.role === "pharmacist",
            canViewAuditLogs: false,
            canManageMembers: false,
            canManageOrganization: false,
            canRequestAuthorizationGrants: validatedData.role === "doctor" || validatedData.role === "pharmacist",
            canApproveAuthorizationGrants: false,
            canRevokeAuthorizationGrants: false,
            specialPermissions: [],
          },
          status: "active" as const, // Make healthcare professionals active by default
          metadata: {
            invitationDate: new Date(),
            activationDate: new Date(),
            notes: "Created during user registration - automatically activated for healthcare professional",
          },
        };

        const organizationMember = new OrganizationMember(membershipData);
        AuditHelper.applyAudit(organizationMember, "create", "system-registration");
        await organizationMember.save();
      }

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
        practitionerId: practitionerId?.toString(),
      };
    }, "Register User");

    if (!result.success) {
      let status = 500;
      if (result.error?.includes("already")) {
        status = 409;
      } else if (result.error?.includes("Organization not found")) {
        status = 404;
      } else if (result.error?.includes("unverified organization")) {
        status = 400;
      }

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
    logger.error("Registration error:", error);

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
