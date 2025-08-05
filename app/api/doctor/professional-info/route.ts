import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { executeDatabaseOperation } from "@/lib/db-utils";
import User from "@/lib/models/User";
import Practitioner from "@/lib/models/Practitioner";
import Organization from "@/lib/models/Organization";
import { OrganizationMember } from "@/lib/models/OrganizationMember";
import { ORGANIZATION_MEMBER_STATUS, PRACTITIONER_TYPES } from "@/lib/constants/organization-member";

/**
 * Utility function to set nested properties safely
 */
function setProperty(obj: any, path: string, value: any): void {
  if (value === undefined || value === null) {
    return;
  }

  if (path.includes(".")) {
    const [parent, child] = path.split(".");
    obj[parent] = obj[parent] || {};
    obj[parent][child] = value;
  } else {
    obj[path] = value;
  }
}

/**
 * Validate professional data input
 */
function validateProfessionalData(data: any): string | null {
  const requiredFields = ["licenseNumber", "specialty", "practitionerType", "yearsOfExperience"];

  for (const field of requiredFields) {
    if (!data[field]) {
      return `Missing required field: ${field}`;
    }
  }

  // Validate years of experience
  if (typeof data.yearsOfExperience !== "number" || data.yearsOfExperience < 0 || data.yearsOfExperience > 70) {
    return "Years of experience must be a number between 0 and 70";
  }

  // Validate practitioner type
  const validTypes = Object.values(PRACTITIONER_TYPES);
  if (!validTypes.includes(data.practitionerType)) {
    return `Invalid practitioner type. Must be one of: ${validTypes.join(", ")}`;
  }

  return null;
}

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
      const allowedRoles = [
        PRACTITIONER_TYPES.DOCTOR,
        PRACTITIONER_TYPES.NURSE,
        PRACTITIONER_TYPES.PHARMACIST,
        PRACTITIONER_TYPES.ADMIN,
      ];
      if (!allowedRoles.includes(decoded.role as any)) {
        throw new Error("Access denied - healthcare provider role required");
      }

      // Find practitioner record
      const practitioner = (await Practitioner.findOne({ userId: decoded.userId }).lean()) as any;

      if (!practitioner) {
        // Return empty structure for new doctors to complete
        return {
          practitioner: null,
          memberships: [],
          isComplete: false,
          requiredFields: ["licenseNumber", "specialty", "practitionerType", "yearsOfExperience", "organizationId"],
        };
      }

      // Get organization memberships for this practitioner
      const memberships = await OrganizationMember.find({
        practitionerId: practitioner._id,
      })
        .populate("organizationId", "name type")
        .lean();

      // Check if profile is complete
      const requiredFields = [
        practitioner.professionalInfo?.licenseNumber,
        practitioner.professionalInfo?.specialty,
        practitioner.professionalInfo?.practitionerType,
        practitioner.professionalInfo?.yearsOfExperience,
      ];

      const hasOrganizationMembership = memberships.length > 0;
      const isComplete =
        requiredFields.every((field) => field !== undefined && field !== null && field !== "") &&
        hasOrganizationMembership;

      return {
        practitioner,
        memberships,
        isComplete,
        requiredFields: ["licenseNumber", "specialty", "practitionerType", "yearsOfExperience", "organizationId"],
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        practitioner: result?.data?.practitioner ?? null,
        memberships: result?.data?.memberships ?? [],
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
    const allowedRoles = [
      PRACTITIONER_TYPES.DOCTOR,
      PRACTITIONER_TYPES.NURSE,
      PRACTITIONER_TYPES.PHARMACIST,
      PRACTITIONER_TYPES.ADMIN,
    ];
    if (!allowedRoles.includes(decoded.role as any)) {
      return NextResponse.json(
        { success: false, error: "Access denied - healthcare provider role required" },
        { status: 403 }
      );
    }

    const professionalData = await request.json();

    // Validate input data
    const validationError = validateProfessionalData(professionalData);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

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

async function validateUserAndOrganization(userId: string, organizationId?: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (organizationId) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }
  }

  return user;
}

async function updatePractitionerInfo(userId: string, userRole: string, professionalData: any) {
  await validateUserAndOrganization(userId, professionalData.organizationId);

  let practitioner = await Practitioner.findOne({ userId });

  if (!practitioner) {
    practitioner = await createNewPractitioner(userId, userRole, professionalData);
  } else {
    practitioner = await updateExistingPractitioner(practitioner, professionalData);
  }

  // Audit log for updating professional info
  // TODO: Add audit logging when audit system is available

  return practitioner;
}

async function createNewPractitioner(userId: string, userRole: string, professionalData: any) {
  const practitioner = new Practitioner({
    userId,
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
    status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
  });

  await practitioner.save();

  // Create organization membership if organizationId is provided
  if (professionalData.organizationId) {
    const membershipData = {
      organizationId: professionalData.organizationId,
      practitionerId: practitioner._id,
      membershipDetails: {
        role: professionalData.practitionerType || userRole,
        accessLevel: "limited",
        department: professionalData.department,
        position: professionalData.currentPosition,
        isPrimary: true, // First organization is usually primary
        startDate: new Date(),
      },
      status: ORGANIZATION_MEMBER_STATUS.PENDING, // Requires activation by admin
    };

    const membership = new OrganizationMember(membershipData);
    await membership.save();
  }

  return practitioner;
}

async function updateExistingPractitioner(practitioner: any, professionalData: any) {
  await updatePractitionerFields(practitioner, professionalData);
  await handleOrganizationMembership(practitioner, professionalData);
  return practitioner;
}

async function updatePractitionerFields(practitioner: any, professionalData: any) {
  const updates = {
    "professionalInfo.licenseNumber": professionalData.licenseNumber,
    "professionalInfo.specialty": professionalData.specialty,
    "professionalInfo.practitionerType": professionalData.practitionerType,
    "professionalInfo.yearsOfExperience": professionalData.yearsOfExperience,
    "professionalInfo.currentPosition": professionalData.currentPosition,
    "professionalInfo.department": professionalData.department,
  };

  // Update defined fields
  for (const key in updates) {
    if (updates.hasOwnProperty(key)) {
      const value = updates[key as keyof typeof updates];
      if (value !== undefined) {
        setProperty(practitioner, key, value);
      }
    }
  }

  if (professionalData.metadata) {
    practitioner.metadata = { ...practitioner.metadata, ...professionalData.metadata };
  }

  await practitioner.save();
}

async function handleOrganizationMembership(practitioner: any, professionalData: any) {
  if (!professionalData.organizationId) {
    return;
  }

  const existingMembership = await OrganizationMember.findOne({
    practitionerId: practitioner._id,
    organizationId: professionalData.organizationId,
  });

  if (existingMembership) {
    return; // Membership already exists
  }

  const existingMemberships = await OrganizationMember.find({
    practitionerId: practitioner._id,
  });

  const membershipData = {
    organizationId: professionalData.organizationId,
    practitionerId: practitioner._id,
    membershipDetails: {
      role: professionalData.practitionerType || practitioner.professionalInfo.practitionerType,
      accessLevel: "limited",
      department: professionalData.department,
      position: professionalData.currentPosition,
      isPrimary: existingMemberships.length === 0, // First membership is primary
      startDate: new Date(),
    },
    status: ORGANIZATION_MEMBER_STATUS.PENDING,
  };

  const membership = new OrganizationMember(membershipData);
  await membership.save();
}
