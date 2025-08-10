import { logger } from "@/lib/logger";
import User from "@/lib/models/User";
import Encounter from "@/lib/models/Encounter";
import mongoose from "mongoose";

// Type definitions for patient medical context
export interface PatientDemographics {
  age: number;
  bloodType?: string;
  smokingStatus?: string;
}

export interface PatientAllergies {
  drug: string[];
  food: string[];
  environmental: string[];
}

export interface ChronicCondition {
  condition: string;
  diagnosedDate: Date;
  icd10Code: string;
  status: "active" | "resolved" | "managed";
}

export interface RecentEncounter {
  date: Date;
  type: string;
  chiefComplaint: string;
  diagnosis: string[];
  prescriptions: string[];
}

export interface CurrentMedication {
  name: string;
  dosage: string;
  frequency: string;
  prescribedDate: Date;
}

export interface VitalSigns {
  temperature?: number;
  bloodPressure?: string;
  heartRate?: number;
  weight?: number;
  height?: number;
}

export interface PatientMedicalContext {
  demographics: PatientDemographics;
  allergies: PatientAllergies;
  chronicConditions: ChronicCondition[];
  recentEncounters: RecentEncounter[];
  currentMedications: CurrentMedication[];
  latestVitals?: VitalSigns;
  riskFactors: string[];
}

export class PatientContextService {
  /**
   * Gather comprehensive patient medical context for AI consultation preparation
   */
  static async gatherPatientContext(userId: string): Promise<PatientMedicalContext | null> {
    try {
      logger.info("Gathering patient medical context", { userId });

      // Get patient data
      const user = await User.findById(userId);
      if (!user) {
        logger.warn("User not found for medical context", { userId });
        return null;
      }

      // Get recent encounters (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const recentEncounters = await Encounter.find({
        userId: new mongoose.Types.ObjectId(userId),
        "encounter.encounterDate": { $gte: sixMonthsAgo },
        auditDeletedDateTime: null,
      })
        .sort({ "encounter.encounterDate": -1 })
        .limit(10)
        .populate("attendingPractitionerId", "professionalInfo.specialty")
        .lean();

      // Build demographics
      const demographics: PatientDemographics = {
        age: this.calculateAge(user),
        bloodType: user.medicalInfo?.bloodType,
        smokingStatus: user.medicalInfo?.smokingStatus,
      };

      // Process allergies
      const allergies: PatientAllergies = await this.processAllergies(user);

      // Process chronic conditions from encounters
      const chronicConditions: ChronicCondition[] = await this.extractChronicConditions(recentEncounters);

      // Process recent encounters
      const processedEncounters: RecentEncounter[] = await this.processRecentEncounters(recentEncounters);

      // Extract current medications
      const currentMedications: CurrentMedication[] = await this.extractCurrentMedications(recentEncounters);

      // Get latest vital signs
      const latestVitals: VitalSigns | undefined = await this.extractLatestVitals(recentEncounters);

      // Identify risk factors
      const riskFactors: string[] = await this.identifyRiskFactors(demographics, chronicConditions, currentMedications);

      const context: PatientMedicalContext = {
        demographics,
        allergies,
        chronicConditions,
        recentEncounters: processedEncounters,
        currentMedications,
        latestVitals,
        riskFactors,
      };

      logger.info("Patient medical context gathered successfully", {
        userId,
        encounterCount: processedEncounters.length,
        medicationCount: currentMedications.length,
        chronicConditionCount: chronicConditions.length,
      });

      return context;
    } catch (error) {
      logger.error("Error gathering patient medical context", { userId, error });
      return null;
    }
  }

  /**
   * Process and categorize patient allergies
   */
  private static async processAllergies(user: any): Promise<PatientAllergies> {
    const allergies: PatientAllergies = {
      drug: [],
      food: [],
      environmental: [],
    };

    try {
      if (user.medicalInfo?.knownAllergies && Array.isArray(user.medicalInfo.knownAllergies)) {
        for (const allergy of user.medicalInfo.knownAllergies) {
          let allergyStr = "";

          // Handle different allergy formats
          if (typeof allergy === "string") {
            allergyStr = allergy;
          } else if (typeof allergy === "object" && allergy) {
            // Try to decrypt if it looks like an encrypted field
            if (allergy.iv && allergy.encrypted) {
              try {
                const { encryptionService } = await import("../services/encryption-service");
                allergyStr = (await encryptionService.decryptField(allergy)) || "";
              } catch (decryptError) {
                logger.warn("Failed to decrypt allergy, using fallback", { error: decryptError });
                // Fallback: try to extract any string value from the object
                allergyStr = allergy.value || allergy.name || JSON.stringify(allergy).substring(0, 50);
              }
            } else {
              // Try to extract meaningful data from object
              allergyStr = allergy.value || allergy.name || allergy.allergen || String(allergy).substring(0, 50);
            }
          }

          if (allergyStr && allergyStr !== "[object Object]") {
            // Categorize allergies (simple keyword-based categorization)
            const lowerAllergy = allergyStr.toLowerCase();
            if (this.isDrugAllergy(lowerAllergy)) {
              allergies.drug.push(allergyStr);
            } else if (this.isFoodAllergy(lowerAllergy)) {
              allergies.food.push(allergyStr);
            } else {
              allergies.environmental.push(allergyStr);
            }
          }
        }
      }
    } catch (error) {
      logger.warn("Error processing allergies", { error });
    }

    return allergies;
  }

  /**
   * Extract chronic conditions from recent encounters
   */
  private static async extractChronicConditions(encounters: any[]): Promise<ChronicCondition[]> {
    const chronicConditions: ChronicCondition[] = [];
    const seenConditions = new Set<string>();

    for (const encounter of encounters) {
      if (encounter.diagnoses && Array.isArray(encounter.diagnoses)) {
        for (const diagnosis of encounter.diagnoses) {
          if (diagnosis.isChronic && !seenConditions.has(diagnosis.code)) {
            chronicConditions.push({
              condition: diagnosis.description,
              diagnosedDate: diagnosis.diagnosedAt || encounter.encounter.encounterDate,
              icd10Code: diagnosis.code,
              status: "active", // Default to active for recent diagnoses
            });
            seenConditions.add(diagnosis.code);
          }
        }
      }
    }

    return chronicConditions;
  }

  /**
   * Process recent encounters for context
   */
  private static async processRecentEncounters(encounters: any[]): Promise<RecentEncounter[]> {
    return encounters.slice(0, 5).map((encounter) => ({
      date: encounter.encounter.encounterDate,
      type: encounter.encounter.encounterType,
      chiefComplaint: encounter.encounter.chiefComplaint,
      diagnosis: encounter.diagnoses?.map((d: any) => d.description) || [],
      prescriptions: encounter.prescriptions?.map((p: any) => p.medicationName) || [],
    }));
  }

  /**
   * Extract current medications from recent prescriptions
   */
  private static async extractCurrentMedications(encounters: any[]): Promise<CurrentMedication[]> {
    const medications: CurrentMedication[] = [];
    const seenMedications = new Set<string>();

    // Look for recent prescriptions (last 3 months) that are likely still active
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    for (const encounter of encounters) {
      if (encounter.encounter.encounterDate >= threeMonthsAgo && encounter.prescriptions) {
        for (const prescription of encounter.prescriptions) {
          // Only include prescriptions with valid medication names
          if (
            prescription.medicationName &&
            prescription.medicationName !== "undefined" &&
            (prescription.status === "ISSUED" || prescription.status === "FILLED")
          ) {
            const medKey = `${prescription.medicationName}-${prescription.dosage || "unknown"}`;
            if (!seenMedications.has(medKey)) {
              medications.push({
                name: prescription.medicationName,
                dosage: prescription.dosage || "Unknown dosage",
                frequency: prescription.frequency || "As prescribed",
                prescribedDate: prescription.issuedAt || encounter.encounter.encounterDate,
              });
              seenMedications.add(medKey);
            }
          }
        }
      }
    }

    return medications;
  }

  /**
   * Extract latest vital signs
   */
  private static async extractLatestVitals(encounters: any[]): Promise<VitalSigns | undefined> {
    for (const encounter of encounters) {
      if (encounter.encounter.vitals) {
        return encounter.encounter.vitals;
      }
    }
    return undefined;
  }

  /**
   * Identify health risk factors based on patient data
   */
  private static async identifyRiskFactors(
    demographics: PatientDemographics,
    chronicConditions: ChronicCondition[],
    medications: CurrentMedication[]
  ): Promise<string[]> {
    const riskFactors: string[] = [];

    // Age-based risk factors
    if (demographics.age >= 65) {
      riskFactors.push("Advanced age (65+)");
    }

    // Smoking status
    if (demographics.smokingStatus === "current") {
      riskFactors.push("Current smoker");
    } else if (demographics.smokingStatus === "former") {
      riskFactors.push("Former smoker");
    }

    // Chronic condition risk factors
    const conditionNames = chronicConditions.map((c) => c.condition.toLowerCase());
    if (conditionNames.some((c) => c.includes("diabetes"))) {
      riskFactors.push("Diabetes mellitus");
    }
    if (conditionNames.some((c) => c.includes("hypertension") || c.includes("blood pressure"))) {
      riskFactors.push("Hypertension");
    }
    if (conditionNames.some((c) => c.includes("heart") || c.includes("cardiac"))) {
      riskFactors.push("Cardiovascular disease");
    }

    // Medication-based risk factors
    const medNames = medications.map((m) => m.name.toLowerCase());
    if (medNames.some((m) => m.includes("warfarin") || m.includes("coumadin"))) {
      riskFactors.push("Anticoagulant therapy");
    }

    return riskFactors;
  }

  /**
   * Helper function to categorize drug allergies
   */
  private static isDrugAllergy(allergy: string): boolean {
    const drugKeywords = [
      "penicillin",
      "amoxicillin",
      "sulfa",
      "aspirin",
      "ibuprofen",
      "codeine",
      "morphine",
      "latex",
      "iodine",
      "contrast",
      "antibiotic",
      "nsaid",
    ];
    return drugKeywords.some((keyword) => allergy.includes(keyword));
  }

  /**
   * Helper function to categorize food allergies
   */
  private static isFoodAllergy(allergy: string): boolean {
    const foodKeywords = [
      "peanut",
      "nut",
      "shellfish",
      "fish",
      "milk",
      "egg",
      "soy",
      "wheat",
      "gluten",
      "dairy",
      "lactose",
      "food",
    ];
    return foodKeywords.some((keyword) => allergy.includes(keyword));
  }

  /**
   * Calculate age from user data
   */
  private static calculateAge(user: any): number {
    try {
      // Try different possible date fields
      let birthDate = null;

      if (user.personalInfo?.dateOfBirth) {
        birthDate = new Date(user.personalInfo.dateOfBirth);
      } else if (user.dateOfBirth) {
        birthDate = new Date(user.dateOfBirth);
      } else if (user.personalInfo?.birthDate) {
        birthDate = new Date(user.personalInfo.birthDate);
      }

      if (birthDate && !isNaN(birthDate.getTime())) {
        const today = new Date();
        const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age > 0 && age < 150 ? age : 35; // Default to 35 if age seems invalid
      }
    } catch (error) {
      logger.warn("Error calculating age", { error });
    }

    // Default age if calculation fails
    return 35;
  }
}
