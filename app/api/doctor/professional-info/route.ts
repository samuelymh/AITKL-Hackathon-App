import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { executeDatabaseOperation } from "@/lib/db-utils";
import User from "@/lib/models/User";
import Practitioner from "@/lib/models/Practitioner";
import Organization from "@/lib/models/Organization";

/**
 * GET /api/doctor/professional-info - Get doctor's professional information
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const result = await executeDatabaseOperation(async () => {
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Only doctors and healthcare providers can access this endpoint
      if (!["doctor", "nurse", "pharmacist", "admin"].includes(decoded.role)) {
        throw new Error("Access denied - healthcare provider role required");
      }

      // Find practitioner record
      const practitioner = await Practitioner.findOne({ userId: decoded.userId })
        .populate("organizationId", "name type")
        .lean();

      if (!practitioner) {
        // Return empty structure for new doctors to complete
        return {
          practitioner: null,
          isComplete: false,
          requiredFields: ["licenseNumber", "specialty", "practitionerType", "yearsOfExperience", "organizationId"],
        };
      }

      // Check if profile is complete
      let requiredFields: any[] = [];
      if (Array.isArray(practitioner)) {
        // If practitioner is an array, use the first element or handle accordingly
        const firstPractitioner = practitioner[0];
        requiredFields = [
          firstPractitioner?.professionalInfo?.licenseNumber,
          firstPractitioner?.professionalInfo?.specialty,
          firstPractitioner?.professionalInfo?.practitionerType,
          firstPractitioner?.professionalInfo?.yearsOfExperience,
          firstPractitioner?.organizationId,
        ];
      } else {
        requiredFields = [
          practitioner.professionalInfo?.licenseNumber,
          practitioner.professionalInfo?.specialty,
          practitioner.professionalInfo?.practitionerType,
          practitioner.professionalInfo?.yearsOfExperience,
          practitioner.organizationId,
        ];
      }

      const isComplete = requiredFields.every((field) => field !== undefined && field !== null && field !== "");

      return {
        practitioner,
        isComplete,
        requiredFields: ["licenseNumber", "specialty", "practitionerType", "yearsOfExperience", "organizationId"],
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        practitioner: result?.data?.practitioner ?? null,
        isComplete: result?.data?.isComplete ?? false,
        requiredFields: result?.data?.requiredFields ?? [],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get professional info error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to get professional information" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/doctor/professional-info - Create or update doctor's professional information
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    // Only doctors and healthcare providers can update this
    if (!["doctor", "nurse", "pharmacist", "admin"].includes(decoded.role)) {
      return NextResponse.json(
        { success: false, error: "Access denied - healthcare provider role required" },
        { status: 403 }
      );
    }

    const professionalData = await request.json();

    const result = await executeDatabaseOperation(async () => {
      return await updatePractitionerInfo(decoded.userId, decoded.role, professionalData);
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Professional information updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Update professional info error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update professional information" },
      { status: 500 }
    );
  }
}

async function updatePractitionerInfo(userId: string, userRole: string, professionalData: any) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Validate organization exists
  if (professionalData.organizationId) {
    const organization = await Organization.findById(professionalData.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }
  }

  // Find or create practitioner record
  let practitioner = await Practitioner.findOne({ userId });

  if (!practitioner) {
    practitioner = await createNewPractitioner(userId, userRole, professionalData);
  } else {
    practitioner = await updateExistingPractitioner(practitioner, professionalData);
  }

  // Audit log for updating professional info
  // TODO: Add audit logging when audit system is available
  // await auditLogger.logDataAccess({
  //   userId,
  //   action: practitioner.isNew ? "CREATE_PROFESSIONAL_INFO" : "UPDATE_PROFESSIONAL_INFO",
  //   resourceType: "practitioner",
  //   resourceId: practitioner._id.toString(),
  //   metadata: {
  //     userRole,
  //     updatedFields: Object.keys(professionalData),
  //     accessType: "self_update"
  //   }
  // });

  // Populate organization for response
  await practitioner.populate("organizationId", "name type");
  return practitioner;
}

async function createNewPractitioner(userId: string, userRole: string, professionalData: any) {
  const practitioner = new Practitioner({
    userId,
    organizationId: professionalData.organizationId,
    professionalInfo: {
      licenseNumber: professionalData.licenseNumber,
      specialty: professionalData.specialty,
      practitionerType: professionalData.practitionerType || userRole,
      yearsOfExperience: professionalData.yearsOfExperience || 0,
      currentPosition: professionalData.currentPosition,
      department: professionalData.department,
    },
    verification: {
      isLicenseVerified: false,
      isOrganizationVerified: false,
    },
    metadata: professionalData.metadata || {},
    status: "active",
  });

  await practitioner.save();
  return practitioner;
}

async function updateExistingPractitioner(practitioner: any, professionalData: any) {
  const updates = {
    organizationId: professionalData.organizationId,
    "professionalInfo.licenseNumber": professionalData.licenseNumber,
    "professionalInfo.specialty": professionalData.specialty,
    "professionalInfo.practitionerType": professionalData.practitionerType,
    "professionalInfo.yearsOfExperience": professionalData.yearsOfExperience,
    "professionalInfo.currentPosition": professionalData.currentPosition,
    "professionalInfo.department": professionalData.department,
  };

  // Only update defined fields
  Object.keys(updates).forEach((key) => {
    const value = updates[key as keyof typeof updates];
    if (value !== undefined) {
      if (key.includes(".")) {
        const [parent, child] = key.split(".");
        if (!practitioner[parent]) practitioner[parent] = {};
        practitioner[parent][child] = value;
      } else {
        practitioner[key] = value;
      }
    }
  });

  if (professionalData.metadata) {
    practitioner.metadata = { ...practitioner.metadata, ...professionalData.metadata };
  }

  await practitioner.save();
  return practitioner;
}
