/**
 * Data validation utilities for medical information
 * Addresses PR review recommendation for improved type safety
 */

export interface MedicalInformation {
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
  lastUpdated?: Date | string;
}

/**
 * Validates and normalizes medical information data to ensure type safety
 * @param data - Raw data from API
 * @returns Normalized MedicalInformation object
 */
export const validateAndNormalizeMedicalInfo = (
  data: any,
): MedicalInformation => {
  return {
    bloodType: typeof data?.bloodType === "string" ? data.bloodType : "",
    foodAllergies: Array.isArray(data?.foodAllergies)
      ? data.foodAllergies.filter((item: any) => typeof item === "string")
      : [],
    drugAllergies: Array.isArray(data?.drugAllergies)
      ? data.drugAllergies.filter((item: any) => typeof item === "string")
      : [],
    knownMedicalConditions: Array.isArray(data?.knownMedicalConditions)
      ? data.knownMedicalConditions.filter(
          (item: any) => typeof item === "string",
        )
      : [],
    currentMedications: Array.isArray(data?.currentMedications)
      ? data.currentMedications.filter((item: any) => typeof item === "string")
      : [],
    pastSurgicalHistory: Array.isArray(data?.pastSurgicalHistory)
      ? data.pastSurgicalHistory.filter((item: any) => typeof item === "string")
      : [],
    smokingStatus: ["never", "current", "former"].includes(data?.smokingStatus)
      ? data.smokingStatus
      : "never",
    emergencyContact: {
      name:
        typeof data?.emergencyContact?.name === "string"
          ? data.emergencyContact.name
          : "",
      phone:
        typeof data?.emergencyContact?.phone === "string"
          ? data.emergencyContact.phone
          : "",
      relationship:
        typeof data?.emergencyContact?.relationship === "string"
          ? data.emergencyContact.relationship
          : "",
    },
    additionalNotes:
      typeof data?.additionalNotes === "string" ? data.additionalNotes : "",
    lastUpdated: data?.lastUpdated ? new Date(data.lastUpdated) : undefined,
  };
};

/**
 * Checks if a value is a valid array of strings
 * @param value - Value to check
 * @returns True if the value is an array of strings
 */
export const isStringArray = (value: any): value is string[] => {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
};

/**
 * Safely renders array values, handling both strings and encrypted objects
 * @param value - Value to render
 * @returns Safe string representation
 */
export const safeRenderValue = (value: any): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
};

/**
 * Calculates completion percentage for medical information
 * @param info - Medical information object
 * @returns Completion percentage (0-100)
 */
export const calculateCompletionPercentage = (
  info: MedicalInformation,
): number => {
  const requiredFields = [
    info.bloodType,
    info.emergencyContact.name,
    info.emergencyContact.phone,
    info.emergencyContact.relationship,
  ];

  const optionalArrayFields = [
    info.foodAllergies.length > 0,
    info.drugAllergies.length > 0,
    info.knownMedicalConditions.length > 0,
    info.currentMedications.length > 0,
  ];

  const filledRequiredFields = requiredFields.filter(
    (field) => field && field.trim() !== "",
  ).length;
  const filledOptionalFields = optionalArrayFields.filter(
    (hasItems) => hasItems,
  ).length;
  const smokingProvided = info.smokingStatus !== "never" ? 1 : 0;

  const totalFields = requiredFields.length + optionalArrayFields.length + 1; // +1 for smoking status
  const completedFields =
    filledRequiredFields + filledOptionalFields + smokingProvided;

  return Math.round((completedFields / totalFields) * 100);
};

/**
 * Creates an empty medical information object with proper defaults
 * @returns Empty MedicalInformation object
 */
export const createEmptyMedicalInfo = (): MedicalInformation => ({
  bloodType: "",
  foodAllergies: [],
  drugAllergies: [],
  knownMedicalConditions: [],
  currentMedications: [],
  pastSurgicalHistory: [],
  smokingStatus: "never",
  emergencyContact: {
    name: "",
    phone: "",
    relationship: "",
  },
  additionalNotes: "",
});

export default {
  validateAndNormalizeMedicalInfo,
  isStringArray,
  safeRenderValue,
  calculateCompletionPercentage,
  createEmptyMedicalInfo,
};
