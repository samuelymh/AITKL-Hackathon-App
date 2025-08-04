import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeDatabaseOperation } from "@/lib/db-utils";
import User from "@/lib/models/User";
import { verifyToken } from "@/lib/auth";
import { AuditHelper } from "@/lib/models/SchemaUtils";

// Medical information validation schema
const MedicalInfoSchema = z.object({
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
  foodAllergies: z.array(z.string()).optional(),
  drugAllergies: z.array(z.string()).optional(),
  knownMedicalConditions: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  pastSurgicalHistory: z.array(z.string()).optional(),
  smokingStatus: z.enum(["never", "current", "former"]).optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }).optional(),
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
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const result = await executeDatabaseOperation(async () => {
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        throw new Error("User not found");
      }

      // Only patients can access their own medical info, or healthcare providers with permission
      if (decoded.role === "patient" && user._id.toString() !== decoded.userId) {
        throw new Error("Access denied");
      }

      // Decrypt and return medical information
      const medicalInfo = {
        bloodType: user.medicalInfo?.bloodType || "",
        foodAllergies: user.medicalInfo?.knownAllergies ? 
          await Promise.all(
            user.medicalInfo.knownAllergies
              .filter(allergy => allergy.includes("food:"))
              .map(async (allergy) => {
                const decrypted = await user.decryptField(`medicalInfo.knownAllergies.${user.medicalInfo.knownAllergies.indexOf(allergy)}`);
                return decrypted?.replace("food:", "") || "";
              })
          ) : [],
        drugAllergies: user.medicalInfo?.knownAllergies ? 
          await Promise.all(
            user.medicalInfo.knownAllergies
              .filter(allergy => allergy.includes("drug:"))
              .map(async (allergy) => {
                const decrypted = await user.decryptField(`medicalInfo.knownAllergies.${user.medicalInfo.knownAllergies.indexOf(allergy)}`);
                return decrypted?.replace("drug:", "") || "";
              })
          ) : [],
        knownMedicalConditions: user.medicalInfo?.knownAllergies ? 
          await Promise.all(
            user.medicalInfo.knownAllergies
              .filter(allergy => allergy.includes("condition:"))
              .map(async (allergy) => {
                const decrypted = await user.decryptField(`medicalInfo.knownAllergies.${user.medicalInfo.knownAllergies.indexOf(allergy)}`);
                return decrypted?.replace("condition:", "") || "";
              })
          ) : [],
        currentMedications: user.medicalInfo?.knownAllergies ? 
          await Promise.all(
            user.medicalInfo.knownAllergies
              .filter(allergy => allergy.includes("medication:"))
              .map(async (allergy) => {
                const decrypted = await user.decryptField(`medicalInfo.knownAllergies.${user.medicalInfo.knownAllergies.indexOf(allergy)}`);
                return decrypted?.replace("medication:", "") || "";
              })
          ) : [],
        pastSurgicalHistory: user.medicalInfo?.knownAllergies ? 
          await Promise.all(
            user.medicalInfo.knownAllergies
              .filter(allergy => allergy.includes("surgery:"))
              .map(async (allergy) => {
                const decrypted = await user.decryptField(`medicalInfo.knownAllergies.${user.medicalInfo.knownAllergies.indexOf(allergy)}`);
                return decrypted?.replace("surgery:", "") || "";
              })
          ) : [],
        smokingStatus: user.medicalInfo?.smokingStatus || "never",
        emergencyContact: {
          name: user.medicalInfo?.emergencyContact?.name ? 
            await user.decryptField("medicalInfo.emergencyContact.name") || "" : "",
          phone: user.medicalInfo?.emergencyContact?.phone ? 
            await user.decryptField("medicalInfo.emergencyContact.phone") || "" : "",
          relationship: user.medicalInfo?.emergencyContact?.relationship || "",
        },
        additionalNotes: user.medicalInfo?.additionalNotes || "",
        lastUpdated: user.audit?.updatedAt,
      };

      return medicalInfo;
    }, "Get Medical Information");

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to fetch medical information",
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
  } catch (error) {
    console.error("Get medical info error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch medical information",
        timestamp: new Date(),
      },
      { status: 500 }
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
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // Only patients can update their own medical info
    if (decoded.role !== "patient") {
      return NextResponse.json(
        { success: false, error: "Only patients can update their medical information" },
        { status: 403 }
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
        encryptedAllergies.push(...validatedData.foodAllergies.map(allergy => `food:${allergy}`));
      }
      if (validatedData.drugAllergies) {
        encryptedAllergies.push(...validatedData.drugAllergies.map(allergy => `drug:${allergy}`));
      }
      if (validatedData.knownMedicalConditions) {
        encryptedAllergies.push(...validatedData.knownMedicalConditions.map(condition => `condition:${condition}`));
      }
      if (validatedData.currentMedications) {
        encryptedAllergies.push(...validatedData.currentMedications.map(med => `medication:${med}`));
      }
      if (validatedData.pastSurgicalHistory) {
        encryptedAllergies.push(...validatedData.pastSurgicalHistory.map(surgery => `surgery:${surgery}`));
      }

      // Update medical information
      const updateData: any = {
        medicalInfo: {
          ...user.medicalInfo,
          bloodType: validatedData.bloodType,
          knownAllergies: encryptedAllergies,
          smokingStatus: validatedData.smokingStatus,
          additionalNotes: validatedData.additionalNotes,
        }
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
        lastUpdated: savedUser.audit?.updatedAt,
      };
    }, "Update Medical Information");

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to update medical information",
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
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update medical information",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}
