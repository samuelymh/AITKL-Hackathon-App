import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeDatabaseOperation } from "@/lib/db-utils";
import User from "@/lib/models/User";
import { verifyToken } from "@/lib/auth";
import { AuditHelper } from "@/lib/models/SchemaUtils";

// Type definitions for better type safety
interface MedicalInformation {
  bloodType: string;
  foodAllergies: string[];
  drugAllergies: string[];
  knownMedicalConditions: string[];
  currentMedications: string[];
  pastSurgicalHistory: string[];
  smokingStatus: "never" | "current" | "former";
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  additionalNotes: string;
  lastUpdated?: Date;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

// Medical information validation schema
const MedicalInfoSchema = z.object({
  bloodType: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .optional(),
  foodAllergies: z.array(z.string()).optional(),
  drugAllergies: z.array(z.string()).optional(),
  knownMedicalConditions: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  pastSurgicalHistory: z.array(z.string()).optional(),
  smokingStatus: z.enum(["never", "current", "former"]).optional(),
  emergencyContact: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      relationship: z.string().optional(),
    })
    .optional(),
  additionalNotes: z.string().optional(),
});

/**
 * GET /api/patient/medical-info - Get patient's medical information
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 },
      );
    }

    const result = await executeDatabaseOperation(async () => {
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Only patients can access their own medical info, or healthcare providers with permission
      if (
        decoded.role === "patient" &&
        user._id.toString() !== decoded.userId
      ) {
        throw new Error("Access denied");
      }

      // Decrypt and return medical information with guaranteed array types
      const medicalInfo: MedicalInformation = {
        bloodType: user.medicalInfo?.bloodType || "",
        foodAllergies: [], // Always initialize as empty array
        drugAllergies: [], // Always initialize as empty array
        knownMedicalConditions: [], // Always initialize as empty array
        currentMedications: [], // Always initialize as empty array
        pastSurgicalHistory: [], // Always initialize as empty array
        smokingStatus: user.medicalInfo?.smokingStatus || "never",
        emergencyContact: {
          name: "",
          phone: "",
          relationship: user.medicalInfo?.emergencyContact?.relationship || "",
        },
        additionalNotes: user.medicalInfo?.additionalNotes || "",
        lastUpdated:
          (user as any).auditModifiedDateTime || (user as any).updatedAt,
      };

      // Helper function to safely decrypt or return plaintext
      const { encryptionService, encryptionUtils } = await import(
        "@/lib/services/encryption-service"
      );

      const safeDecrypt = async (field: any): Promise<string> => {
        try {
          if (encryptionUtils.isEncrypted(field)) {
            return await encryptionService.decryptField(field);
          }
          return typeof field === "string" ? field : "";
        } catch (error) {
          console.warn("Failed to decrypt field:", error);
          return typeof field === "string" ? field : "";
        }
      };

      // Decrypt emergency contact information
      if (user.medicalInfo?.emergencyContact?.name) {
        medicalInfo.emergencyContact.name = await safeDecrypt(
          user.medicalInfo.emergencyContact.name,
        );
      }
      if (user.medicalInfo?.emergencyContact?.phone) {
        medicalInfo.emergencyContact.phone = await safeDecrypt(
          user.medicalInfo.emergencyContact.phone,
        );
      }

      // Process knownAllergies if they exist
      if (
        user.medicalInfo?.knownAllergies &&
        Array.isArray(user.medicalInfo.knownAllergies)
      ) {
        for (let i = 0; i < user.medicalInfo.knownAllergies.length; i++) {
          try {
            const decrypted = await safeDecrypt(
              user.medicalInfo.knownAllergies[i],
            );
            if (decrypted) {
              if (decrypted.startsWith("food:")) {
                medicalInfo.foodAllergies.push(decrypted.replace("food:", ""));
              } else if (decrypted.startsWith("drug:")) {
                medicalInfo.drugAllergies.push(decrypted.replace("drug:", ""));
              } else if (decrypted.startsWith("condition:")) {
                medicalInfo.knownMedicalConditions.push(
                  decrypted.replace("condition:", ""),
                );
              } else if (decrypted.startsWith("medication:")) {
                medicalInfo.currentMedications.push(
                  decrypted.replace("medication:", ""),
                );
              } else if (decrypted.startsWith("surgery:")) {
                medicalInfo.pastSurgicalHistory.push(
                  decrypted.replace("surgery:", ""),
                );
              }
            }
          } catch (error) {
            console.warn(`Failed to decrypt knownAllergies[${i}]:`, error);
          }
        }
      }

      return medicalInfo;
    }, "Get Medical Information");

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to fetch medical information",
          timestamp: result.timestamp,
        },
        { status: 500 },
      );
    }

    return NextResponse.json<ApiResponse<MedicalInformation>>({
      success: true,
      data: result.data,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error("Get medical info error:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch medical information",
        timestamp: new Date(),
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/patient/medical-info - Update patient's medical information
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 },
      );
    }

    // Only patients can update their own medical info
    if (decoded.role !== "patient") {
      return NextResponse.json(
        {
          success: false,
          error: "Only patients can update their medical information",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = MedicalInfoSchema.parse(body);

    const result = await executeDatabaseOperation(async () => {
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new Error("User not found");
      }

      if (user._id.toString() !== decoded.userId) {
        throw new Error("Access denied");
      }

      // Prepare encrypted medical data
      const encryptedAllergies: string[] = [];

      // Combine all medical data into the knownAllergies encrypted field with prefixes
      if (validatedData.foodAllergies) {
        encryptedAllergies.push(
          ...validatedData.foodAllergies.map((allergy) => `food:${allergy}`),
        );
      }
      if (validatedData.drugAllergies) {
        encryptedAllergies.push(
          ...validatedData.drugAllergies.map((allergy) => `drug:${allergy}`),
        );
      }
      if (validatedData.knownMedicalConditions) {
        encryptedAllergies.push(
          ...validatedData.knownMedicalConditions.map(
            (condition) => `condition:${condition}`,
          ),
        );
      }
      if (validatedData.currentMedications) {
        encryptedAllergies.push(
          ...validatedData.currentMedications.map((med) => `medication:${med}`),
        );
      }
      if (validatedData.pastSurgicalHistory) {
        encryptedAllergies.push(
          ...validatedData.pastSurgicalHistory.map(
            (surgery) => `surgery:${surgery}`,
          ),
        );
      }

      // Update medical information
      const updateData: any = {
        medicalInfo: {
          ...user.medicalInfo,
          bloodType: validatedData.bloodType,
          knownAllergies: encryptedAllergies,
          smokingStatus: validatedData.smokingStatus,
          additionalNotes: validatedData.additionalNotes,
        },
      };

      // Update emergency contact if provided
      if (validatedData.emergencyContact) {
        updateData.medicalInfo.emergencyContact = {
          name: validatedData.emergencyContact.name || "",
          phone: validatedData.emergencyContact.phone || "",
          relationship: validatedData.emergencyContact.relationship || "",
        };
      }

      // Apply audit fields for update
      AuditHelper.applyAudit(user, "update", `user-${decoded.userId}`);

      // Update the user
      Object.assign(user, updateData);
      const savedUser = await user.save();

      return {
        message: "Medical information updated successfully",
        lastUpdated:
          (savedUser as any).auditModifiedDateTime ||
          (savedUser as any).updatedAt,
      };
    }, "Update Medical Information");

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to update medical information",
          timestamp: result.timestamp,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error("Update medical info error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid medical information data",
          details: error.errors,
          timestamp: new Date(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update medical information",
        timestamp: new Date(),
      },
      { status: 500 },
    );
  }
}
