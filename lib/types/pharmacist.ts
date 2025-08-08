/**
 * Pharmacist-related type definitions
 * Improves type safety and reduces duplication across components
 */

import { PrescriptionStatus, DispensationStatus, EncounterType } from "@/lib/constants";

export interface PharmacistStats {
  prescriptionsToday: number;
  pendingVerifications: number;
  consultationsScheduled: number;
  inventoryAlerts: number;
  prescriptionsThisWeek: number;
  prescriptionsThisMonth: number;
  mostCommonMedications: Array<{
    name: string;
    count: number;
  }>;
}

export interface InventoryAlert {
  medicationName: string;
  currentStock: number;
  minimumThreshold: number;
  severity: "low" | "critical" | "out_of_stock";
}

export interface ConsultationAppointment {
  id: string;
  patientName: string;
  appointmentTime: Date;
  purpose: string;
  digitalId: string;
}

export interface PrescriptionMedication {
  id: string;
  encounterId: string;
  prescriptionIndex: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  notes: string;
  status: PrescriptionStatus;
  issuedAt: Date;
  prescribedBy: {
    practitionerId: string;
  };
  encounter: {
    date: Date;
    chiefComplaint: string;
    encounterType: EncounterType;
  };
  dispensationStatus: DispensationStatus;
  dispensedAt?: Date;
  canDispense: boolean;
}

export interface PatientInfo {
  digitalIdentifier: string;
  name: string;
  dateOfBirth?: string;
}

export interface MedicationsResponse {
  success: boolean;
  data: {
    patient: PatientInfo;
    medications: PrescriptionMedication[];
    authorizationGrant: {
      id: string;
      expiresAt: Date;
      accessScope: any;
    };
  };
}

export interface DispenseRequest {
  encounterId: string;
  prescriptionIndex: number;
  quantityDispensed: string;
  daysSupply: number;
  notes?: string;
  substitutions?: Array<{
    original: string;
    substitute: string;
    reason: string;
  }>;
}

export interface DispenseResponse {
  success: boolean;
  data: {
    dispensationId: string;
    patientDigitalId: string;
    medication: PrescriptionMedication;
    message: string;
  };
}

export interface PatientRecords {
  patient: PatientInfo & {
    bloodType?: string;
  };
  safetyInformation: {
    drugAllergies: string[];
    foodAllergies: string[];
    otherAllergies: string[];
    currentMedications: string[];
    medicalConditions: string[];
    smokingStatus?: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  recentEncounters: Array<{
    id: string;
    date: Date;
    encounterType: EncounterType;
    chiefComplaint: string;
    diagnoses: Array<{
      code: string;
      description: string;
      isChronic: boolean;
    }>;
    prescriptionCount: number;
  }>;
  clinicalNotes?: string;
  authorization: {
    grantId: string;
    expiresAt: Date;
    accessScope: any;
  };
}

export interface RecordsResponse {
  success: boolean;
  data: PatientRecords;
}
