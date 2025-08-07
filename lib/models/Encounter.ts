import mongoose, { Model } from "mongoose";
import { createExtendedSchema } from "./SchemaUtils";
import { IBaseDocument } from "./BaseSchema";
import { EncryptedFieldType } from "../services/encryption-plugin";

// Enums matching knowledge base specifications
export enum EncounterType {
  ROUTINE = "ROUTINE",
  EMERGENCY = "EMERGENCY",
  FOLLOW_UP = "FOLLOW_UP",
  CONSULTATION = "CONSULTATION",
}

export enum PrescriptionStatus {
  ISSUED = "ISSUED",
  FILLED = "FILLED",
  CANCELLED = "CANCELLED",
}

// Interface definition matching the knowledge base
export interface IEncounter extends IBaseDocument {
  userId: mongoose.Types.ObjectId; // Reference to User (Patient)
  organizationId: mongoose.Types.ObjectId; // Reference to Organization
  attendingPractitionerId: mongoose.Types.ObjectId; // Reference to Practitioner
  authorizationGrantId: mongoose.Types.ObjectId; // Links to authorization

  encounter: {
    chiefComplaint: string;
    notes: EncryptedFieldType; // Encrypted clinical notes
    encounterDate: Date;
    encounterType: EncounterType;
    vitals?: {
      temperature?: number; // Celsius
      bloodPressure?: string; // e.g., "120/80"
      heartRate?: number; // BPM
      weight?: number; // kg
      height?: number; // cm
    };
  };

  // Embedded diagnoses array
  diagnoses: [
    {
      code: string; // ICD-10 code
      description: string;
      notes?: string;
      isChronic: boolean;
      diagnosedAt: Date;
    },
  ];

  // Embedded prescriptions array
  prescriptions: [
    {
      medicationName: string;
      dosage: string;
      frequency: string;
      notes?: string;
      status: PrescriptionStatus;
      prescribingPractitionerId: mongoose.Types.ObjectId;
      issuedAt: Date;
    },
  ];

  // Instance methods
  addDiagnosis(diagnosis: any, addedBy: string): Promise<IEncounter>;
  addPrescription(prescription: any, addedBy: string): Promise<IEncounter>;
  updatePrescriptionStatus(
    prescriptionIndex: number,
    status: PrescriptionStatus,
    updatedBy: string,
  ): Promise<IEncounter>;
  toPatientJSON(): Promise<any>;
  toPractitionerJSON(): Promise<any>;
}

// Static methods interface
export interface IEncounterModel extends Model<IEncounter> {
  findByPatient(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<IEncounter[]>;
  findByOrganization(
    organizationId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<IEncounter[]>;
  findByPractitioner(
    practitionerId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<IEncounter[]>;
  findByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<IEncounter[]>;
  createEncounter(encounterData: any, createdBy: string): Promise<IEncounter>;
  validateVitals(vitals: any): { valid: boolean; errors: string[] };
}

// Encounter schema fields
const encounterSchemaFields = {
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },
  attendingPractitionerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Practitioner",
    required: true,
    index: true,
  },
  authorizationGrantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AuthorizationGrant",
    required: true,
    // Remove index: true to avoid duplicate with explicit index below
  },

  encounter: {
    chiefComplaint: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    notes: {
      type: mongoose.Schema.Types.Mixed, // Support encrypted field type
      required: true,
    },
    encounterDate: {
      type: Date,
      required: true,
      index: true,
      validate: {
        validator: function (value: Date) {
          return value <= new Date();
        },
        message: "Encounter date cannot be in the future",
      },
    },
    encounterType: {
      type: String,
      enum: Object.values(EncounterType),
      required: true,
      index: true,
    },
    vitals: {
      temperature: {
        type: Number,
        min: 30, // Minimum reasonable temperature (Celsius)
        max: 45, // Maximum reasonable temperature (Celsius)
      },
      bloodPressure: {
        type: String,
        match: [
          /^\d{2,3}\/\d{2,3}$/,
          "Blood pressure must be in format XXX/XX",
        ],
      },
      heartRate: {
        type: Number,
        min: 30, // Minimum reasonable heart rate
        max: 220, // Maximum reasonable heart rate
      },
      weight: {
        type: Number,
        min: 0.5, // Minimum reasonable weight (kg)
        max: 500, // Maximum reasonable weight (kg)
      },
      height: {
        type: Number,
        min: 30, // Minimum reasonable height (cm)
        max: 300, // Maximum reasonable height (cm)
      },
    },
  },

  diagnoses: [
    {
      code: {
        type: String,
        required: true,
        trim: true,
        match: [/^[A-Z]\d{2}\.?\d{0,2}$/, "Invalid ICD-10 code format"],
      },
      description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      notes: {
        type: String,
        maxlength: 500,
      },
      isChronic: {
        type: Boolean,
        default: false,
      },
      diagnosedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  prescriptions: [
    {
      medicationName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      dosage: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },
      frequency: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      notes: {
        type: String,
        maxlength: 500,
      },
      status: {
        type: String,
        enum: Object.values(PrescriptionStatus),
        default: PrescriptionStatus.ISSUED,
      },
      prescribingPractitionerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Practitioner",
        required: true,
      },
      issuedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
};

// Create extended schema with audit fields
const EncounterSchema = createExtendedSchema(encounterSchemaFields, {
  timestamps: true,
  versionKey: false,
  collection: "encounters",
});

// Indexes for performance optimization (from knowledge base)
EncounterSchema.index({ userId: 1, "encounter.encounterDate": -1 });
EncounterSchema.index({ organizationId: 1, "encounter.encounterDate": -1 });
EncounterSchema.index({
  attendingPractitionerId: 1,
  "encounter.encounterDate": -1,
});
EncounterSchema.index({ authorizationGrantId: 1 });
EncounterSchema.index({
  "encounter.encounterType": 1,
  "encounter.encounterDate": -1,
});

// Pre-save middleware for validation
EncounterSchema.pre("save", function (next) {
  const doc = this as any;

  // Validate that encounter date is not in the future
  if (
    doc.encounter?.encounterDate &&
    doc.encounter.encounterDate > new Date()
  ) {
    return next(new Error("Encounter date cannot be in the future"));
  }

  // Validate vitals if provided
  if (doc.encounter?.vitals) {
    const validation = EncounterModel.validateVitals(doc.encounter.vitals);
    if (!validation.valid) {
      return next(new Error(`Invalid vitals: ${validation.errors.join(", ")}`));
    }
  }

  next();
});

// Instance methods
EncounterSchema.methods = {
  // Add a new diagnosis to the encounter
  addDiagnosis: async function (
    this: IEncounter,
    diagnosis: any,
    addedBy: string,
  ): Promise<IEncounter> {
    this.diagnoses.push({
      code: diagnosis.code,
      description: diagnosis.description,
      notes: diagnosis.notes,
      isChronic: diagnosis.isChronic || false,
      diagnosedAt: new Date(),
    });

    this.auditModifiedBy = addedBy;
    return await this.save();
  },

  // Add a new prescription to the encounter
  addPrescription: async function (
    this: IEncounter,
    prescription: any,
    addedBy: string,
  ): Promise<IEncounter> {
    this.prescriptions.push({
      medicationName: prescription.medicationName,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      notes: prescription.notes,
      status: PrescriptionStatus.ISSUED,
      prescribingPractitionerId: prescription.prescribingPractitionerId,
      issuedAt: new Date(),
    });

    this.auditModifiedBy = addedBy;
    return await this.save();
  },

  // Update prescription status
  updatePrescriptionStatus: async function (
    this: IEncounter,
    prescriptionIndex: number,
    status: PrescriptionStatus,
    updatedBy: string,
  ): Promise<IEncounter> {
    if (
      prescriptionIndex < 0 ||
      prescriptionIndex >= this.prescriptions.length
    ) {
      throw new Error("Invalid prescription index");
    }

    this.prescriptions[prescriptionIndex].status = status;
    this.auditModifiedBy = updatedBy;
    return await this.save();
  },

  // Convert to patient-safe JSON (limited information)
  toPatientJSON: async function (this: IEncounter) {
    await this.populate([
      { path: "organizationId", select: "organizationInfo.name address" },
      {
        path: "attendingPractitionerId",
        select: "personalInfo professionalInfo.specialty",
      },
    ]);

    return {
      _id: this._id,
      encounter: {
        chiefComplaint: this.encounter.chiefComplaint,
        encounterDate: this.encounter.encounterDate,
        encounterType: this.encounter.encounterType,
        vitals: this.encounter.vitals,
      },
      diagnoses: this.diagnoses.map((d) => ({
        code: d.code,
        description: d.description,
        isChronic: d.isChronic,
        diagnosedAt: d.diagnosedAt,
      })),
      prescriptions: this.prescriptions.map((p) => ({
        medicationName: p.medicationName,
        dosage: p.dosage,
        frequency: p.frequency,
        status: p.status,
        issuedAt: p.issuedAt,
      })),
      organization: this.organizationId,
      attendingPractitioner: this.attendingPractitionerId,
      createdAt: this.createdAt,
    };
  },

  // Convert to practitioner JSON (full information including notes)
  toPractitionerJSON: async function (this: IEncounter) {
    await this.populate([
      {
        path: "userId",
        select:
          "personalInfo.firstName personalInfo.lastName digitalIdentifier",
      },
      { path: "organizationId", select: "organizationInfo.name" },
      {
        path: "attendingPractitionerId",
        select: "personalInfo professionalInfo",
      },
    ]);

    return {
      _id: this._id,
      patient: this.userId,
      encounter: this.encounter,
      diagnoses: this.diagnoses,
      prescriptions: this.prescriptions,
      organization: this.organizationId,
      attendingPractitioner: this.attendingPractitionerId,
      authorizationGrantId: this.authorizationGrantId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  },
};

// Static methods
EncounterSchema.statics = {
  // Find encounters by patient
  findByPatient: function (
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    const { limit = 20, offset = 0 } = options;
    return this.find({
      userId: new mongoose.Types.ObjectId(userId),
      auditDeletedDateTime: { $exists: false },
    })
      .populate([
        {
          path: "organizationId",
          select: "organizationInfo.name organizationInfo.type",
        },
        {
          path: "attendingPractitionerId",
          select: "personalInfo professionalInfo.specialty",
        },
      ])
      .sort({ "encounter.encounterDate": -1 })
      .limit(limit)
      .skip(offset);
  },

  // Find encounters by organization
  findByOrganization: function (
    organizationId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    const { limit = 20, offset = 0 } = options;
    return this.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      auditDeletedDateTime: { $exists: false },
    })
      .populate([
        {
          path: "userId",
          select:
            "personalInfo.firstName personalInfo.lastName digitalIdentifier",
        },
        {
          path: "attendingPractitionerId",
          select: "personalInfo professionalInfo",
        },
      ])
      .sort({ "encounter.encounterDate": -1 })
      .limit(limit)
      .skip(offset);
  },

  // Find encounters by practitioner
  findByPractitioner: function (
    practitionerId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    const { limit = 20, offset = 0 } = options;
    return this.find({
      attendingPractitionerId: new mongoose.Types.ObjectId(practitionerId),
      auditDeletedDateTime: { $exists: false },
    })
      .populate([
        {
          path: "userId",
          select:
            "personalInfo.firstName personalInfo.lastName digitalIdentifier",
        },
        { path: "organizationId", select: "organizationInfo.name" },
      ])
      .sort({ "encounter.encounterDate": -1 })
      .limit(limit)
      .skip(offset);
  },

  // Find encounters by date range
  findByDateRange: function (startDate: Date, endDate: Date, userId?: string) {
    const query: any = {
      "encounter.encounterDate": { $gte: startDate, $lte: endDate },
      auditDeletedDateTime: { $exists: false },
    };

    if (userId) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    return this.find(query)
      .populate([
        {
          path: "userId",
          select: "personalInfo.firstName personalInfo.lastName",
        },
        { path: "organizationId", select: "organizationInfo.name" },
        {
          path: "attendingPractitionerId",
          select: "personalInfo professionalInfo.specialty",
        },
      ])
      .sort({ "encounter.encounterDate": -1 });
  },

  // Create a new encounter with validation
  createEncounter: async function (
    encounterData: any,
    createdBy: string,
  ): Promise<IEncounter> {
    const encounter = new this({
      ...encounterData,
      auditCreatedBy: createdBy,
      auditCreatedDateTime: new Date(),
    });

    return await encounter.save();
  },

  // Validate vitals data
  validateVitals: function (vitals: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (vitals.temperature !== undefined) {
      if (vitals.temperature < 30 || vitals.temperature > 45) {
        errors.push("Temperature must be between 30°C and 45°C");
      }
    }

    if (vitals.heartRate !== undefined) {
      if (vitals.heartRate < 30 || vitals.heartRate > 220) {
        errors.push("Heart rate must be between 30 and 220 BPM");
      }
    }

    if (vitals.weight !== undefined) {
      if (vitals.weight < 0.5 || vitals.weight > 500) {
        errors.push("Weight must be between 0.5kg and 500kg");
      }
    }

    if (vitals.height !== undefined) {
      if (vitals.height < 30 || vitals.height > 300) {
        errors.push("Height must be between 30cm and 300cm");
      }
    }

    if (vitals.bloodPressure !== undefined) {
      const bpPattern = /^\d{2,3}\/\d{2,3}$/;
      if (!bpPattern.test(vitals.bloodPressure)) {
        errors.push("Blood pressure must be in format XXX/XX");
      }
    }

    return { valid: errors.length === 0, errors };
  },
};

// Create and export the model
const EncounterModel: IEncounterModel = (mongoose.models.Encounter ||
  mongoose.model<IEncounter, IEncounterModel>(
    "Encounter",
    EncounterSchema,
  )) as IEncounterModel;

export default EncounterModel;
