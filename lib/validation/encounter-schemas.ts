import { z } from "zod";

// Base schemas for reusable components
export const encounterLocationSchema = z.object({
  display: z.string().min(1, "Location display is required"),
  physicalType: z.enum(["room", "ward", "building", "site", "virtual"]).optional(),
  ward: z.string().optional(),
  room: z.string().optional(),
  bed: z.string().optional(),
});

export const diagnosisSchema = z.object({
  code: z.string().min(1, "Diagnosis code is required"),
  display: z.string().min(1, "Diagnosis display is required"),
  codeSystem: z.string().default("ICD-10"),
  use: z.enum(["primary", "secondary", "differential", "provisional"]).default("primary"),
  rank: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

export const quantitySchema = z.object({
  value: z.number().positive("Quantity value must be positive"),
  unit: z.string().min(1, "Quantity unit is required"),
});

export const prescriptionSchema = z.object({
  medicationCode: z.string().min(1, "Medication code is required"),
  medicationDisplay: z.string().min(1, "Medication display name is required"),
  dosageText: z.string().min(1, "Dosage instructions are required"),
  dosageForm: z.string().optional(),
  route: z.string().optional(),
  frequency: z.string().optional(),
  quantity: quantitySchema.optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  substitutionAllowed: z.boolean().default(true),
  status: z
    .enum(["active", "on-hold", "cancelled", "completed", "entered-in-error", "stopped", "draft"])
    .default("active"),
});

export const admissionDetailsSchema = z.object({
  admissionType: z.enum(["emergency", "elective", "urgent", "routine"]),
  sourceLocation: z.string().optional(),
  destination: z.string().optional(),
  preAdmissionIdentifier: z.string().optional(),
});

export const dischargeDetailsSchema = z.object({
  dispositionCode: z.string().optional(),
  dispositionDisplay: z.string().optional(),
  dischargeDestination: z.string().optional(),
  dischargeInstructions: z.string().optional(),
});

// Main create encounter schema
export const createEncounterSchema = z
  .object({
    // Required identifiers
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
    organizationId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid organization ID format"),
    practitionerId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid practitioner ID format"),

    // Encounter details
    status: z
      .enum([
        "planned",
        "arrived",
        "triaged",
        "in-progress",
        "onleave",
        "finished",
        "cancelled",
        "entered-in-error",
        "unknown",
      ])
      .default("in-progress"),

    class: z.enum(["inpatient", "outpatient", "ambulatory", "emergency", "home", "field", "daytime", "virtual"]),

    type: z.enum([
      "consultation",
      "follow-up",
      "emergency",
      "routine-checkup",
      "vaccination",
      "surgery",
      "diagnostic",
      "therapy",
      "other",
    ]),

    priority: z.enum(["routine", "urgent", "asap", "stat"]).default("routine"),

    startDateTime: z.string().datetime().optional(),
    endDateTime: z.string().datetime().optional(),

    reasonCode: z.string().optional(),
    reasonDisplay: z.string().optional(),
    chiefComplaint: z.string().min(1, "Chief complaint is required"),

    // Optional nested objects
    location: encounterLocationSchema.optional(),
    admissionDetails: admissionDetailsSchema.optional(),
    dischargeDetails: dischargeDetailsSchema.optional(),

    // Arrays
    diagnoses: z.array(diagnosisSchema).default([]),
    prescriptions: z.array(prescriptionSchema).default([]),
  })
  .refine(
    (data) => {
      // If endDateTime is provided, it must be after startDateTime
      if (data.startDateTime && data.endDateTime) {
        return new Date(data.endDateTime) > new Date(data.startDateTime);
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDateTime"],
    }
  )
  .refine(
    (data) => {
      // Inpatient encounters should have admission details
      if (data.class === "inpatient" && !data.admissionDetails) {
        return false;
      }
      return true;
    },
    {
      message: "Inpatient encounters must include admission details",
      path: ["admissionDetails"],
    }
  );

// Update encounter schema (similar but allows partial updates)
export const updateEncounterSchema = z
  .object({
    status: z
      .enum([
        "planned",
        "arrived",
        "triaged",
        "in-progress",
        "onleave",
        "finished",
        "cancelled",
        "entered-in-error",
        "unknown",
      ])
      .optional(),

    endDateTime: z.string().datetime().optional(),
    reasonCode: z.string().optional(),
    reasonDisplay: z.string().optional(),
    chiefComplaint: z.string().min(1).optional(),

    location: encounterLocationSchema.optional(),
    dischargeDetails: dischargeDetailsSchema.optional(),

    // Note: diagnoses and prescriptions are added separately via dedicated endpoints
  })
  .strict();

// Add diagnosis schema
export const addDiagnosisSchema = z.object({
  practitionerId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid practitioner ID format"),
  diagnosis: diagnosisSchema,
});

// Add prescription schema
export const addPrescriptionSchema = z.object({
  practitionerId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid practitioner ID format"),
  prescription: prescriptionSchema,
});

// Query schemas for filtering
export const encounterQuerySchema = z
  .object({
    userId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .optional(),
    organizationId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .optional(),
    practitionerId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .optional(),
    status: z
      .enum([
        "planned",
        "arrived",
        "triaged",
        "in-progress",
        "onleave",
        "finished",
        "cancelled",
        "entered-in-error",
        "unknown",
      ])
      .optional(),
    class: z
      .enum(["inpatient", "outpatient", "ambulatory", "emergency", "home", "field", "daytime", "virtual"])
      .optional(),
    type: z
      .enum([
        "consultation",
        "follow-up",
        "emergency",
        "routine-checkup",
        "vaccination",
        "surgery",
        "diagnostic",
        "therapy",
        "other",
      ])
      .optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).default("1"),
    limit: z.string().regex(/^\d+$/).transform(Number).default("10"),
  })
  .refine(
    (data) => {
      // Validate date range
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      // Limit page size
      return data.limit <= 100;
    },
    {
      message: "Limit cannot exceed 100",
      path: ["limit"],
    }
  );

// Type exports for TypeScript
export type CreateEncounterInput = z.infer<typeof createEncounterSchema>;
export type UpdateEncounterInput = z.infer<typeof updateEncounterSchema>;
export type AddDiagnosisInput = z.infer<typeof addDiagnosisSchema>;
export type AddPrescriptionInput = z.infer<typeof addPrescriptionSchema>;
export type EncounterQueryInput = z.infer<typeof encounterQuerySchema>;
export type DiagnosisInput = z.infer<typeof diagnosisSchema>;
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;
