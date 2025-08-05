import Organization from "@/lib/models/Organization";
import connectToDatabase from "@/lib/mongodb";

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
}
