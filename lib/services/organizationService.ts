import Organization from "@/lib/models/Organization";
import connectToDatabase from "@/lib/mongodb";
import { logger } from "../logger";

export interface OrganizationRegistrationData {
  organizationInfo: {
    name: string;
    type: string;
    registrationNumber?: string;
    description?: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  metadata?: {
    establishedDate?: string;
  };
}

export class OrganizationService {
  private static async ensureConnection() {
    await connectToDatabase();
  }

  /**
   * Check if an organization already exists based on registration number or name/location
   */
  static async findExistingOrganization(data: OrganizationRegistrationData) {
    await this.ensureConnection();

    const existingOrgConditions = [];

    if (data.organizationInfo.registrationNumber) {
      existingOrgConditions.push({
        "organizationInfo.registrationNumber": data.organizationInfo.registrationNumber,
      });
    }

    existingOrgConditions.push({
      "organizationInfo.name": data.organizationInfo.name,
      "address.city": data.address.city,
      "address.state": data.address.state,
    });

    return await Organization.findOne({
      $or: existingOrgConditions,
      auditDeletedDateTime: { $exists: false },
    });
  }

  /**
   * Create a new organization
   */
  static async createOrganization(data: OrganizationRegistrationData, createdBy: string) {
    await this.ensureConnection();

    const organization = new Organization({
      organizationInfo: data.organizationInfo,
      address: data.address,
      contact: data.contact,
      verification: {
        isVerified: false, // New organizations start unverified
      },
      metadata: {
        isActive: true,
        memberCount: 0,
        establishedDate: data.metadata?.establishedDate ? new Date(data.metadata.establishedDate) : undefined,
      },
      auditCreatedBy: createdBy,
    });

    return await organization.save();
  }

  /**
   * Get organization by ID
   */
  static async getOrganizationById(organizationId: string) {
    await this.ensureConnection();

    return await Organization.findById(organizationId).where({
      auditDeletedDateTime: { $exists: false },
    });
  }

  /**
   * Search organizations with filters and pagination
   */
  static async searchOrganizations(
    query?: string,
    type?: string,
    location?: { city?: string; state?: string },
    options: {
      page?: number;
      limit?: number;
      onlyVerified?: boolean;
    } = {}
  ) {
    await this.ensureConnection();

    const { page = 1, limit = 20, onlyVerified = false } = options;

    return await Organization.searchOrganizations(query || "", type as any, location, { page, limit, onlyVerified });
  }

  /**
   * Get total count of organizations matching search criteria
   */
  static async getSearchCount(
    query?: string,
    type?: string,
    location?: { city?: string; state?: string },
    onlyVerified: boolean = false
  ) {
    await this.ensureConnection();

    const filters = this.buildSearchFilters(query, type, location, onlyVerified);
    return await Organization.countDocuments(filters);
  }

  /**
   * Build search filters (DRY principle)
   */
  private static buildSearchFilters(
    query?: string,
    type?: string,
    location?: { city?: string; state?: string },
    onlyVerified: boolean = false
  ) {
    const filters: any = {
      auditDeletedDateTime: { $exists: false },
    };

    if (query?.trim()) {
      filters.$or = [
        { "organizationInfo.name": { $regex: query, $options: "i" } },
        { "organizationInfo.registrationNumber": { $regex: query, $options: "i" } },
        { "address.city": { $regex: query, $options: "i" } },
        { "address.state": { $regex: query, $options: "i" } },
      ];
    }

    if (type) {
      filters["organizationInfo.type"] = type;
    }

    if (location?.city) {
      filters["address.city"] = { $regex: location.city, $options: "i" };
    }

    if (location?.state) {
      filters["address.state"] = { $regex: location.state, $options: "i" };
    }

    if (onlyVerified) {
      filters["verification.isVerified"] = true;
    }

    return filters;
  }

  /**
   * Validate if organization exists and return appropriate error
   */
  static validateExistingOrganization(existingOrg: any, registrationNumber?: string) {
    if (!existingOrg) return null;

    if (existingOrg.organizationInfo.registrationNumber === registrationNumber) {
      return {
        error: "Organization with this registration number already exists",
        status: 409,
      };
    } else {
      return {
        error: "Organization with this name already exists in this location",
        status: 409,
      };
    }
  }

  /**
   * Get organizations for verification with pagination and filtering
   */
  static async getOrganizationsForVerification(status: string, page: number, limit: number) {
    try {
      await this.ensureConnection();

      const skip = (page - 1) * limit;
      const filter: any = { auditDeletedDateTime: { $exists: false } };

      // Apply status filter
      if (status === "pending") {
        filter["verification.isVerified"] = false;
      } else if (status === "verified") {
        filter["verification.isVerified"] = true;
      }

      // Execute queries in parallel for better performance
      const [organizations, totalCount] = await Promise.all([
        Organization.find(filter)
          .select(
            "organizationInfo.name organizationInfo.type organizationInfo.registrationNumber organizationInfo.description address contact verification auditCreatedBy auditUpdatedBy auditCreatedDateTime auditUpdatedDateTime"
          )
          .sort({ auditCreatedDateTime: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Organization.countDocuments(filter),
      ]);

      const formattedOrganizations = organizations.map((org: any) => ({
        id: org._id.toString(),
        name: org.organizationInfo?.name,
        type: org.organizationInfo?.type,
        registrationNumber: org.organizationInfo?.registrationNumber,
        description: org.organizationInfo?.description,
        address: org.address,
        contact: org.contact,
        verification: {
          isVerified: org.verification?.isVerified || false,
          verifiedAt: org.verification?.verifiedAt,
          verifiedBy: org.verification?.verifiedBy,
          notes: org.verification?.notes,
          rejectionReason: org.verification?.rejectionReason,
        },
        createdAt: org.auditCreatedDateTime,
        updatedAt: org.auditUpdatedDateTime,
        auditCreatedBy: org.auditCreatedBy,
        auditUpdatedBy: org.auditUpdatedBy,
      }));

      return {
        success: true,
        data: {
          organizations: formattedOrganizations,
          pagination: {
            current: page,
            total: Math.ceil(totalCount / limit),
            count: formattedOrganizations.length,
            totalCount,
          },
        },
      };
    } catch (error) {
      logger.error("Error fetching organizations for verification:", error);
      throw new Error("Failed to fetch organizations for verification");
    }
  }

  /**
   * Process verification decision for an organization
   */
  static async processVerificationDecision(
    organizationId: string,
    action: "verify" | "reject",
    adminUserId: string,
    notes?: string,
    rejectionReason?: string
  ) {
    try {
      await this.ensureConnection();

      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error("Organization not found");
      }

      // Update verification status
      const updateData: any = {
        "verification.isVerified": action === "verify",
        "verification.verifiedAt": action === "verify" ? new Date() : null,
        "verification.verifiedBy": action === "verify" ? adminUserId : null,
        "verification.notes": notes || "",
        "verification.rejectionReason": action === "reject" ? rejectionReason : "",
        auditUpdatedBy: adminUserId,
        auditUpdatedDateTime: new Date(),
      };

      await Organization.findByIdAndUpdate(organizationId, updateData);

      const actionText = action === "verify" ? "verified" : "rejected";
      logger.info(`Organization ${organizationId} ${actionText} by admin ${adminUserId}`);

      return {
        success: true,
        message: `Organization ${actionText} successfully`,
      };
    } catch (error) {
      logger.error("Error processing verification decision:", error);
      throw new Error("Failed to process verification decision");
    }
  }

  /**
   * Get organizations for dropdown (verified only in production)
   */
  static async getOrganizationsForDropdown() {
    try {
      await this.ensureConnection();

      const filter: any = { auditDeletedDateTime: { $exists: false } };

      // In production, only show verified organizations
      if (process.env.NODE_ENV === "production") {
        filter["verification.isVerified"] = true;
      }

      const organizations = await Organization.find(filter)
        .select("organizationInfo.name organizationInfo.type address")
        .sort({ "organizationInfo.name": 1 })
        .lean();

      return organizations.map((org: any) => ({
        id: org._id.toString(),
        name: org.organizationInfo?.name,
        type: org.organizationInfo?.type,
        address: org.address,
      }));
    } catch (error) {
      logger.error("Error fetching organizations for dropdown:", error);
      throw new Error("Failed to fetch organizations");
    }
  }
}
