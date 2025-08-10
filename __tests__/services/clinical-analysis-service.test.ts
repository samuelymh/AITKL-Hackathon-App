import { ClinicalAnalysisService } from "@/lib/services/clinical-analysis-service";
import { PatientMedicalContext } from "@/lib/services/patient-context-service";

describe("ClinicalAnalysisService", () => {
  const mockPatientContext: PatientMedicalContext = {
    demographics: {
      age: 65,
      bloodType: "O+",
      smokingStatus: "former",
    },
    allergies: {
      drug: ["Penicillin", "Sulfa"],
      food: ["Shellfish"],
      environmental: ["Pollen"],
    },
    chronicConditions: [
      {
        condition: "Type 2 Diabetes",
        diagnosedDate: new Date("2018-03-15"),
        icd10Code: "E11.9",
        status: "active",
      },
      {
        condition: "Hypertension",
        diagnosedDate: new Date("2016-07-20"),
        icd10Code: "I10",
        status: "active",
      },
    ],
    currentMedications: [
      {
        name: "Metformin",
        dosage: "500mg",
        frequency: "twice daily",
        prescribedDate: new Date("2024-01-01"),
      },
      {
        name: "Lisinopril",
        dosage: "10mg",
        frequency: "once daily",
        prescribedDate: new Date("2024-01-01"),
      },
    ],
    recentEncounters: [
      {
        date: new Date("2024-12-01"),
        type: "routine_checkup",
        chiefComplaint: "Routine diabetes and hypertension follow-up",
        diagnosis: ["Type 2 Diabetes - well controlled", "Hypertension - stable"],
        prescriptions: ["Metformin 500mg", "Lisinopril 10mg"],
      },
      {
        date: new Date("2024-10-15"),
        type: "urgent_care",
        chiefComplaint: "Chest discomfort",
        diagnosis: ["Acid reflux", "Anxiety"],
        prescriptions: ["Omeprazole 20mg"],
      },
    ],
    latestVitals: {
      bloodPressure: "145/92",
      heartRate: 78,
      weight: 85,
      height: 175,
      temperature: 98.6,
    },
    riskFactors: ["Type 2 Diabetes", "Hypertension", "Former smoker", "Elevated BMI"],
  };

  describe("generateClinicalInsights", () => {
    it("should generate comprehensive clinical insights", async () => {
      const query = "Patient presenting for routine follow-up, concerned about recent fatigue";

      const insights = await ClinicalAnalysisService.generateClinicalInsights(mockPatientContext, query);

      expect(insights).toBeDefined();
      expect(insights.briefing).toContain("65");
      expect(insights.briefing.toLowerCase()).toContain("diabetes");
      expect(insights.briefing.toLowerCase()).toContain("hypertension");
    });

    it("should include safety alerts", async () => {
      const query = "Review medication safety for this patient";

      const insights = await ClinicalAnalysisService.generateClinicalInsights(mockPatientContext, query);

      expect(insights.safetyAlerts).toBeDefined();
      expect(Array.isArray(insights.safetyAlerts)).toBe(true);
    });

    it("should provide clinical recommendations", async () => {
      const query = "What clinical recommendations do you have?";

      const insights = await ClinicalAnalysisService.generateClinicalInsights(mockPatientContext, query);

      expect(insights.recommendations).toBeDefined();
      expect(Array.isArray(insights.recommendations)).toBe(true);
    });

    it("should analyze patient trends", async () => {
      const query = "How has the patient been trending?";

      const insights = await ClinicalAnalysisService.generateClinicalInsights(mockPatientContext, query);

      expect(insights.trends).toBeDefined();
      expect(Array.isArray(insights.trends)).toBe(true);
    });

    it("should identify care optimization opportunities", async () => {
      const query = "What care optimization opportunities exist?";

      const insights = await ClinicalAnalysisService.generateClinicalInsights(mockPatientContext, query);

      expect(insights.careOptimization).toBeDefined();
      expect(typeof insights.careOptimization).toBe("object");
    });
  });

  describe("generateClinicalBriefing", () => {
    it("should create comprehensive patient summary", () => {
      const briefing = ClinicalAnalysisService.generateClinicalBriefing(mockPatientContext);

      expect(briefing).toContain("65");
      expect(briefing.toLowerCase()).toContain("diabetes");
      expect(briefing.toLowerCase()).toContain("hypertension");
      expect(briefing.toLowerCase()).toContain("metformin");
    });

    it("should highlight key allergies", () => {
      const briefing = ClinicalAnalysisService.generateClinicalBriefing(mockPatientContext);

      expect(briefing.toLowerCase()).toContain("penicillin");
      expect(briefing.toLowerCase()).toContain("allerg");
    });

    it("should mention risk factors", () => {
      const briefing = ClinicalAnalysisService.generateClinicalBriefing(mockPatientContext);

      expect(briefing.toLowerCase()).toContain("risk");
    });

    it("should handle patients with no chronic conditions", () => {
      const minimalContext: PatientMedicalContext = {
        demographics: { age: 30 },
        allergies: { drug: [], food: [], environmental: [] },
        chronicConditions: [],
        currentMedications: [],
        recentEncounters: [],
        latestVitals: {},
        riskFactors: [],
      };

      const briefing = ClinicalAnalysisService.generateClinicalBriefing(minimalContext);
      expect(briefing).toContain("30");
      expect(briefing.toLowerCase()).toContain("healthy");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty patient context gracefully", async () => {
      const emptyContext: PatientMedicalContext = {
        demographics: { age: 0 },
        allergies: { drug: [], food: [], environmental: [] },
        chronicConditions: [],
        currentMedications: [],
        recentEncounters: [],
        latestVitals: {},
        riskFactors: [],
      };

      const insights = await ClinicalAnalysisService.generateClinicalInsights(emptyContext, "Basic health assessment");

      expect(insights).toBeDefined();
      expect(insights.briefing).toBeDefined();
      expect(insights.safetyAlerts).toBeDefined();
      expect(insights.recommendations).toBeDefined();
    });

    it("should handle missing vital signs", () => {
      const contextWithoutVitals = {
        ...mockPatientContext,
        latestVitals: {},
      };

      const briefing = ClinicalAnalysisService.generateClinicalBriefing(contextWithoutVitals);
      expect(briefing).toBeDefined();
      expect(briefing.length).toBeGreaterThan(0);
    });
  });
});
