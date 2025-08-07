import mongoose from "mongoose";
import Encounter from "@/lib/models/Encounter";
import Counter from "@/lib/models/Counter";
import { NotFoundError, ValidationError } from "@/lib/errors/custom-errors";

/**
 * Encounter Service - Business logic separated from API routes
 * Follows Clean Architecture principles
 */
export class EncounterService {
  /**
   * Generate unique encounter number using atomic counter
   * Prevents race conditions and ensures uniqueness
   */
  static async generateEncounterNumber(
    organizationId: string,
  ): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const prefix = `ENC-${year}${month}${day}`;
    const counterId = `${prefix}-${organizationId}`;

    const sequenceNumber = await Counter.increment(counterId);
    return `${prefix}-${String(sequenceNumber).padStart(4, "0")}`;
  }

  /**
   * Validate that all referenced entities exist
   * Single responsibility: entity validation
   */
  static async validateReferencedEntities(encounterData: {
    userId: string;
    organizationId: string;
    practitionerId: string;
  }): Promise<void> {
    const User = (await import("@/lib/models/User")).default;
    const { default: Organization } = await import("@/lib/models/Organization");
    const { default: Practitioner } = await import("@/lib/models/Practitioner");

    // Validate user exists
    const user = await User.findById(encounterData.userId);
    if (!user) {
      throw new NotFoundError("Patient not found");
    }

    // Validate organization exists
    const organization = await Organization.findById(
      encounterData.organizationId,
    );
    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    // Validate practitioner exists
    const practitioner = await Practitioner.findById(
      encounterData.practitionerId,
    );
    if (!practitioner) {
      throw new NotFoundError("Practitioner not found");
    }

    // Validate practitioner belongs to organization
    if (
      practitioner.organizationId.toString() !== encounterData.organizationId
    ) {
      throw new ValidationError(
        "Practitioner does not belong to the specified organization",
      );
    }
  }

  /**
   * Create a new encounter with proper data transformation
   */
  static async createEncounter(
    encounterData: any,
    practitionerId: string,
    authorizationGrantId: string,
  ): Promise<any> {
    // Generate unique encounter number
    const encounterNumber = await this.generateEncounterNumber(
      encounterData.organizationId,
    );

    // Create the encounter with transformed data
    const encounter = new Encounter({
      userId: new mongoose.Types.ObjectId(encounterData.userId),
      organizationId: new mongoose.Types.ObjectId(encounterData.organizationId),
      attendingPractitionerId: new mongoose.Types.ObjectId(practitionerId),
      authorizationGrantId: new mongoose.Types.ObjectId(authorizationGrantId),

      encounter: {
        encounterNumber,
        chiefComplaint: encounterData.chiefComplaint,
        notes: {
          __enc_notes: true, // Encrypted field marker
          value: encounterData.notes || "",
        },
        encounterDate: encounterData.startDateTime
          ? new Date(encounterData.startDateTime)
          : new Date(),
        encounterType: encounterData.type || "ROUTINE",
        vitals: encounterData.vitals,
      },

      diagnoses:
        encounterData.diagnoses?.map((diagnosis: any) => ({
          code: diagnosis.code,
          description: diagnosis.display,
          notes: diagnosis.notes,
          isChronic: diagnosis.use === "chronic" || false,
          diagnosedAt: new Date(),
        })) || [],

      prescriptions:
        encounterData.prescriptions?.map((prescription: any) => ({
          medicationName: prescription.medicationDisplay,
          dosage: prescription.dosageText,
          frequency: prescription.frequency || "",
          notes: prescription.instructions,
          status: "ISSUED" as any,
          prescribingPractitionerId: new mongoose.Types.ObjectId(
            practitionerId,
          ),
          issuedAt: new Date(),
        })) || [],

      // Audit fields
      auditCreatedBy: new mongoose.Types.ObjectId(practitionerId),
      auditCreatedDateTime: new Date(),
      auditVersion: 1,
    });

    return encounter.save();
  }

  /**
   * List encounters with filtering and pagination
   */
  static async listEncounters(
    userId: string,
    organizationId: string,
    filters: any,
    pagination: { page: number; limit: number },
  ): Promise<{ encounters: any[]; totalCount: number }> {
    // Build MongoDB filter
    const filter: any = {
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      auditDeletedDateTime: { $exists: false },
    };

    // Add optional filters based on actual model structure
    if (filters.status) {
      filter["encounter.encounterType"] = filters.status;
    }
    if (filters.type) {
      filter["encounter.encounterType"] = filters.type;
    }
    if (filters.startDate || filters.endDate) {
      filter["encounter.encounterDate"] = {};
      if (filters.startDate) {
        filter["encounter.encounterDate"].$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        filter["encounter.encounterDate"].$lte = new Date(filters.endDate);
      }
    }

    // Calculate pagination
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const [encounters, totalCount] = await Promise.all([
      Encounter.find(filter)
        .populate(["userId", "organizationId", "attendingPractitionerId"])
        .sort({ "encounter.encounterDate": -1 })
        .skip(skip)
        .limit(limit),
      Encounter.countDocuments(filter),
    ]);

    return { encounters, totalCount };
  }

  /**
   * Get a single encounter by ID with validation
   */
  static async getEncounterById(encounterId: string): Promise<any> {
    const encounter = await Encounter.findById(encounterId).populate([
      "userId",
      "organizationId",
      "attendingPractitionerId",
    ]);

    if (!encounter) {
      throw new NotFoundError("Encounter not found");
    }

    return encounter;
  }

  /**
   * Update encounter with allowed fields only
   */
  static async updateEncounter(
    encounterId: string,
    updateData: any,
    practitionerId: string,
  ): Promise<any> {
    // Only allow specific fields to be updated
    const allowedUpdates: any = {};

    if (updateData.notes) {
      allowedUpdates["encounter.notes"] = {
        __enc_notes: true,
        value: updateData.notes,
      };
    }

    if (updateData.vitals) {
      allowedUpdates["encounter.vitals"] = updateData.vitals;
    }

    // Add audit fields
    allowedUpdates.auditUpdatedBy = practitionerId;
    allowedUpdates.auditUpdatedDateTime = new Date();
    allowedUpdates.$inc = { auditVersion: 1 };

    // Update the encounter
    const updatedEncounter = await Encounter.findByIdAndUpdate(
      encounterId,
      allowedUpdates,
      {
        new: true,
        runValidators: true,
      },
    ).populate(["userId", "organizationId", "attendingPractitionerId"]);

    if (!updatedEncounter) {
      throw new NotFoundError("Encounter not found");
    }

    return updatedEncounter;
  }
}
