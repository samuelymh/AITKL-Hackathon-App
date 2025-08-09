import { logger } from "@/lib/logger";
import { PatientContextService, PatientMedicalContext } from "./patient-context-service";

// Types for clinical analysis
export interface DrugInteraction {
  medication1: string;
  medication2: string;
  severity: "mild" | "moderate" | "severe" | "contraindicated";
  description: string;
  clinicalSignificance: string;
  recommendation: string;
}

export interface SafetyAlert {
  type: "drug_interaction" | "allergy_warning" | "condition_risk" | "age_related" | "polypharmacy";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  recommendation: string;
  evidence?: string;
}

export interface ClinicalRecommendation {
  category: "examination" | "diagnostic" | "treatment" | "screening" | "coordination";
  priority: "low" | "medium" | "high" | "urgent";
  recommendation: string;
  rationale: string;
  evidence?: string;
}

export interface CareGap {
  type: "screening_overdue" | "medication_review" | "chronic_care" | "specialist_referral" | "patient_education";
  description: string;
  priority: "low" | "medium" | "high";
  recommendation: string;
  dueDate?: Date;
}

export interface VitalTrend {
  parameter: string;
  trend: "improving" | "stable" | "declining" | "fluctuating";
  significance: string;
  recommendation?: string;
}

export interface ClinicalInsights {
  briefing: {
    patientSummary: string;
    keyRiskFactors: string[];
    clinicalSignificance: string;
    presentingConcernAnalysis: string;
  };

  safetyAlerts: SafetyAlert[];

  recommendations: ClinicalRecommendation[];

  careOptimization: {
    medicationReview: string[];
    chronicCareGaps: CareGap[];
    coordinationNeeds: string[];
    patientEducation: string[];
  };

  trends: {
    vitalSigns: VitalTrend[];
    medicationChanges: string[];
    encounterPatterns: string[];
  };

  metadata: {
    analysisDate: Date;
    dataQuality: "excellent" | "good" | "fair" | "limited";
    confidence: number;
    analysisType: string;
  };
}

export class ClinicalAnalysisService {
  /**
   * Generate comprehensive clinical insights for a patient
   */
  static async generateClinicalInsights(
    userId: string,
    presentingConcern?: string,
    encounterContext?: any
  ): Promise<ClinicalInsights> {
    console.log("🏥 Generating clinical insights", { userId, presentingConcern });

    try {
      // Gather comprehensive patient context
      const patientContext = await PatientContextService.gatherPatientContext(userId);

      if (!patientContext) {
        throw new Error("Unable to gather patient context for clinical analysis");
      }

      // Analyze safety concerns
      const safetyAlerts = await this.analyzeSafetyConcerns(patientContext, presentingConcern);

      // Generate clinical recommendations
      const recommendations = await this.generateClinicalRecommendations(patientContext, presentingConcern);

      // Identify care gaps
      const careOptimization = await this.identifyCareGaps(patientContext);

      // Analyze trends
      const trends = await this.analyzeTrends(patientContext);

      // Generate briefing
      const briefing = await this.generateClinicalBriefing(patientContext, presentingConcern);

      const insights: ClinicalInsights = {
        briefing,
        safetyAlerts,
        recommendations,
        careOptimization,
        trends,
        metadata: {
          analysisDate: new Date(),
          dataQuality: this.assessDataQuality(patientContext),
          confidence: this.calculateConfidence(patientContext),
          analysisType: "comprehensive_clinical_analysis",
        },
      };

      logger.info("Clinical insights generated successfully", {
        userId,
        safetyAlertsCount: safetyAlerts.length,
        recommendationsCount: recommendations.length,
        confidence: insights.metadata.confidence,
      });

      return insights;
    } catch (error) {
      logger.error("Failed to generate clinical insights", { userId, error });
      throw error;
    }
  }

  /**
   * Analyze safety concerns including drug interactions and contraindications
   */
  private static async analyzeSafetyConcerns(
    context: PatientMedicalContext,
    presentingConcern?: string
  ): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];

    // Drug interaction analysis
    const drugInteractions = await this.analyzeDrugInteractions(context.currentMedications);
    alerts.push(...drugInteractions);

    // Allergy-based warnings
    const allergyWarnings = await this.analyzeAllergyRisks(context.allergies, presentingConcern);
    alerts.push(...allergyWarnings);

    // Age-related risks
    const ageRisks = await this.analyzeAgeRelatedRisks(context.demographics.age, context.currentMedications);
    alerts.push(...ageRisks);

    // Polypharmacy concerns
    if (context.currentMedications.length >= 5) {
      alerts.push({
        type: "polypharmacy",
        severity: "medium",
        message: `Patient is on ${context.currentMedications.length} medications (polypharmacy risk)`,
        recommendation: "Consider medication review for potential interactions and simplification opportunities",
        evidence: "Polypharmacy (≥5 medications) increases risk of adverse drug events by 50-100%",
      });
    }

    // Condition-specific risks
    const conditionRisks = await this.analyzeConditionSpecificRisks(context.chronicConditions, presentingConcern);
    alerts.push(...conditionRisks);

    return alerts.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
  }

  /**
   * Analyze potential drug interactions
   */
  private static async analyzeDrugInteractions(medications: any[]): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];

    // Common drug interaction patterns (simplified - in production, use comprehensive drug database)
    const interactions = [
      {
        drugs: ["warfarin", "aspirin"],
        severity: "high" as const,
        description: "Increased bleeding risk",
        recommendation: "Monitor INR closely, consider alternative antiplatelet therapy",
      },
      {
        drugs: ["metformin", "contrast"],
        severity: "high" as const,
        description: "Risk of lactic acidosis",
        recommendation: "Hold metformin 48 hours before and after contrast procedures",
      },
      {
        drugs: ["ace inhibitor", "potassium"],
        severity: "medium" as const,
        description: "Risk of hyperkalemia",
        recommendation: "Monitor potassium levels regularly",
      },
      {
        drugs: ["simvastatin", "clarithromycin"],
        severity: "high" as const,
        description: "Increased risk of rhabdomyolysis",
        recommendation: "Avoid combination or reduce statin dose",
      },
    ];

    const medNames = medications.map((m) => m.name.toLowerCase());

    for (const interaction of interactions) {
      const foundDrugs = interaction.drugs.filter((drug) => medNames.some((med) => med.includes(drug)));

      if (foundDrugs.length >= 2) {
        alerts.push({
          type: "drug_interaction",
          severity: interaction.severity,
          message: `Potential interaction: ${foundDrugs.join(" + ")} - ${interaction.description}`,
          recommendation: interaction.recommendation,
          evidence: "Based on established pharmacokinetic and pharmacodynamic interactions",
        });
      }
    }

    return alerts;
  }

  /**
   * Analyze allergy-based risks
   */
  private static async analyzeAllergyRisks(allergies: any, presentingConcern?: string): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];

    // Drug allergies
    if (allergies.drug && allergies.drug.length > 0) {
      for (const allergy of allergies.drug) {
        alerts.push({
          type: "allergy_warning",
          severity: "high",
          message: `Drug allergy: ${allergy} - Avoid related medications`,
          recommendation: `Screen all prescriptions for ${allergy} and cross-reactive drugs`,
          evidence: "Drug allergies can cause severe anaphylactic reactions",
        });
      }
    }

    // Food allergies that might affect treatment
    if (allergies.food && allergies.food.includes("shellfish")) {
      alerts.push({
        type: "allergy_warning",
        severity: "medium",
        message: "Shellfish allergy - Caution with iodinated contrast",
        recommendation: "Premedicate if contrast studies needed, consider non-iodinated alternatives",
        evidence: "Shellfish allergy may increase risk of contrast reactions",
      });
    }

    return alerts;
  }

  /**
   * Analyze age-related risks
   */
  private static async analyzeAgeRelatedRisks(age: number, medications: any[]): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];

    if (age >= 65) {
      // Beers Criteria medications
      const beersRiskyMeds = ["diphenhydramine", "lorazepam", "diazepam", "amitriptyline"];
      const medNames = medications.map((m) => m.name.toLowerCase());

      for (const riskyMed of beersRiskyMeds) {
        if (medNames.some((med) => med.includes(riskyMed))) {
          alerts.push({
            type: "age_related",
            severity: "medium",
            message: `Potentially inappropriate medication for age 65+: ${riskyMed}`,
            recommendation: "Consider safer alternatives per Beers Criteria",
            evidence: "Beers Criteria identifies medications with increased risk in elderly patients",
          });
        }
      }

      // General elderly considerations
      alerts.push({
        type: "age_related",
        severity: "low",
        message: "Elderly patient (65+) - Enhanced fall risk and medication sensitivity",
        recommendation: "Consider dose reductions, monitor for orthostatic hypotension, assess fall risk",
        evidence: "Elderly patients have increased pharmacodynamic sensitivity and fall risk",
      });
    }

    return alerts;
  }

  /**
   * Analyze condition-specific risks
   */
  private static async analyzeConditionSpecificRisks(
    conditions: any[],
    presentingConcern?: string
  ): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];

    const conditionNames = conditions.map((c) => c.condition.toLowerCase());

    // Diabetes-specific risks
    if (conditionNames.some((c) => c.includes("diabetes"))) {
      alerts.push({
        type: "condition_risk",
        severity: "medium",
        message: "Diabetes patient - Monitor for diabetic emergencies and complications",
        recommendation: "Check blood glucose, assess diabetic complications, review HbA1c trends",
        evidence: "Diabetic patients require careful monitoring for acute and chronic complications",
      });
    }

    // Hypertension risks
    if (conditionNames.some((c) => c.includes("hypertension"))) {
      if (presentingConcern?.toLowerCase().includes("headache")) {
        alerts.push({
          type: "condition_risk",
          severity: "high",
          message: "Hypertensive patient with headache - Rule out hypertensive emergency",
          recommendation: "Check blood pressure immediately, assess for end-organ damage",
          evidence: "Headache in hypertensive patients may indicate hypertensive crisis",
        });
      }
    }

    // Heart disease risks
    if (conditionNames.some((c) => c.includes("heart") || c.includes("cardiac"))) {
      alerts.push({
        type: "condition_risk",
        severity: "medium",
        message: "Cardiac patient - Monitor for cardiac symptoms and medication effects",
        recommendation: "Assess cardiac symptoms, review medications affecting heart rate/rhythm",
        evidence: "Cardiac patients require careful monitoring of symptoms and medications",
      });
    }

    return alerts;
  }

  /**
   * Generate clinical recommendations
   */
  private static async generateClinicalRecommendations(
    context: PatientMedicalContext,
    presentingConcern?: string
  ): Promise<ClinicalRecommendation[]> {
    const recommendations: ClinicalRecommendation[] = [];

    // Age-based screening recommendations
    recommendations.push(...(await this.getAgeBasedScreeningRecommendations(context.demographics.age)));

    // Condition-specific recommendations
    recommendations.push(...(await this.getConditionSpecificRecommendations(context.chronicConditions)));

    // Medication-related recommendations
    if (context.currentMedications.length > 0) {
      recommendations.push({
        category: "treatment",
        priority: "medium",
        recommendation: "Comprehensive medication review and reconciliation",
        rationale: `Patient on ${context.currentMedications.length} medications - review for appropriateness, interactions, and adherence`,
        evidence: "Medication reconciliation reduces adverse drug events by 15-30%",
      });
    }

    // Examination focus based on presenting concern
    if (presentingConcern) {
      recommendations.push(...(await this.getExaminationRecommendations(presentingConcern, context)));
    }

    return recommendations.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
  }

  /**
   * Get age-based screening recommendations
   */
  private static async getAgeBasedScreeningRecommendations(age: number): Promise<ClinicalRecommendation[]> {
    const recommendations: ClinicalRecommendation[] = [];

    if (age >= 50) {
      recommendations.push({
        category: "screening",
        priority: "high",
        recommendation: "Colorectal cancer screening",
        rationale: "Patient over 50 - colonoscopy or FIT test due",
        evidence: "USPSTF Grade A recommendation for ages 50-75",
      });
    }

    if (age >= 40) {
      recommendations.push({
        category: "screening",
        priority: "medium",
        recommendation: "Cardiovascular risk assessment",
        rationale: "Calculate 10-year ASCVD risk, consider statin therapy",
        evidence: "ACC/AHA guidelines recommend risk assessment starting at age 40",
      });
    }

    if (age >= 65) {
      recommendations.push({
        category: "screening",
        priority: "medium",
        recommendation: "Bone density screening",
        rationale: "DEXA scan for osteoporosis screening",
        evidence: "USPSTF recommends screening for women 65+ and high-risk individuals",
      });
    }

    return recommendations;
  }

  /**
   * Get condition-specific recommendations
   */
  private static async getConditionSpecificRecommendations(conditions: any[]): Promise<ClinicalRecommendation[]> {
    const recommendations: ClinicalRecommendation[] = [];
    const conditionNames = conditions.map((c) => c.condition.toLowerCase());

    if (conditionNames.some((c) => c.includes("diabetes"))) {
      recommendations.push({
        category: "diagnostic",
        priority: "high",
        recommendation: "Diabetic monitoring panel",
        rationale: "HbA1c, microalbumin, lipid panel, diabetic foot exam",
        evidence: "ADA guidelines for comprehensive diabetes care",
      });
    }

    if (conditionNames.some((c) => c.includes("hypertension"))) {
      recommendations.push({
        category: "examination",
        priority: "high",
        recommendation: "Blood pressure assessment and cardiovascular examination",
        rationale: "Verify BP control, assess for target organ damage",
        evidence: "ACC/AHA hypertension guidelines",
      });
    }

    return recommendations;
  }

  /**
   * Get examination recommendations based on presenting concern
   */
  private static async getExaminationRecommendations(
    concern: string,
    context: PatientMedicalContext
  ): Promise<ClinicalRecommendation[]> {
    const recommendations: ClinicalRecommendation[] = [];
    const lowerConcern = concern.toLowerCase();

    if (lowerConcern.includes("chest pain")) {
      recommendations.push({
        category: "examination",
        priority: "urgent",
        recommendation: "Comprehensive cardiovascular assessment",
        rationale: "ECG, cardiac enzymes, chest examination for chest pain evaluation",
        evidence: "AHA/ACC chest pain evaluation guidelines",
      });
    }

    if (lowerConcern.includes("headache")) {
      recommendations.push({
        category: "examination",
        priority: "high",
        recommendation: "Neurological examination and vital signs",
        rationale: "Rule out secondary headache causes, assess neurological function",
        evidence: "Headache evaluation requires systematic neurological assessment",
      });
    }

    if (lowerConcern.includes("shortness of breath") || lowerConcern.includes("dyspnea")) {
      recommendations.push({
        category: "examination",
        priority: "high",
        recommendation: "Cardiopulmonary examination",
        rationale: "Assess heart sounds, lung sounds, oxygen saturation, lower extremity edema",
        evidence: "Dyspnea evaluation requires comprehensive cardiopulmonary assessment",
      });
    }

    return recommendations;
  }

  /**
   * Identify care gaps and optimization opportunities
   */
  private static async identifyCareGaps(context: PatientMedicalContext): Promise<any> {
    const gaps: CareGap[] = [];
    const medicationReview: string[] = [];
    const coordinationNeeds: string[] = [];
    const patientEducation: string[] = [];

    // Medication review needs
    if (context.currentMedications.length >= 5) {
      medicationReview.push("Polypharmacy review - assess for drug interactions and deprescribing opportunities");
    }

    // Chronic care gaps
    const conditionNames = context.chronicConditions.map((c) => c.condition.toLowerCase());

    if (conditionNames.some((c) => c.includes("diabetes"))) {
      gaps.push({
        type: "chronic_care",
        description: "Diabetes management optimization",
        priority: "high",
        recommendation: "Review HbA1c trends, diabetic complications screening, medication adherence",
      });

      patientEducation.push("Diabetes self-management education and support (DSMES)");
    }

    if (conditionNames.some((c) => c.includes("hypertension"))) {
      patientEducation.push("Blood pressure monitoring and lifestyle modifications");
      coordinationNeeds.push("Consider cardiology consultation if blood pressure not at target");
    }

    // Age-based care coordination
    if (context.demographics.age >= 65) {
      coordinationNeeds.push("Consider geriatric assessment for comprehensive elderly care");
    }

    return {
      medicationReview,
      chronicCareGaps: gaps,
      coordinationNeeds,
      patientEducation,
    };
  }

  /**
   * Analyze trends in patient data
   */
  private static async analyzeTrends(context: PatientMedicalContext): Promise<any> {
    const vitalTrends: VitalTrend[] = [];
    const medicationChanges: string[] = [];
    const encounterPatterns: string[] = [];

    // Analyze recent encounters for patterns
    if (context.recentEncounters.length > 1) {
      const recentTypes = context.recentEncounters.map((e) => e.type);
      const uniqueTypes = [...new Set(recentTypes)];

      if (uniqueTypes.length === 1 && recentTypes.length > 2) {
        encounterPatterns.push(`Pattern: Multiple ${recentTypes[0]} visits - consider underlying cause`);
      }
    }

    // Medication patterns
    if (context.currentMedications.length > 3) {
      medicationChanges.push("Multiple active prescriptions - monitor for adherence and interactions");
    }

    // Vital sign analysis (simplified - would need historical data for true trends)
    if (context.latestVitals) {
      if (context.latestVitals.bloodPressure) {
        const [systolic] = context.latestVitals.bloodPressure.split("/").map(Number);
        if (systolic > 140) {
          vitalTrends.push({
            parameter: "Blood Pressure",
            trend: "declining",
            significance: "Elevated blood pressure requires monitoring and potential medication adjustment",
            recommendation: "Trend blood pressure readings over time, assess medication adherence",
          });
        }
      }
    }

    return {
      vitalSigns: vitalTrends,
      medicationChanges,
      encounterPatterns,
    };
  }

  /**
   * Generate clinical briefing summary
   */
  private static async generateClinicalBriefing(
    context: PatientMedicalContext,
    presentingConcern?: string
  ): Promise<any> {
    const age = context.demographics.age;
    const conditions = context.chronicConditions.map((c) => c.condition).join(", ");
    const medicationCount = context.currentMedications.length;
    const allergies = [...context.allergies.drug, ...context.allergies.food].join(", ");

    let patientSummary = `${age}-year-old patient`;

    if (conditions) {
      patientSummary += ` with medical history of ${conditions}`;
    }

    if (medicationCount > 0) {
      patientSummary += `, currently on ${medicationCount} medications`;
    }

    if (allergies) {
      patientSummary += `, with known allergies to ${allergies}`;
    }

    const keyRiskFactors = context.riskFactors || [];

    let clinicalSignificance = "Standard medical evaluation recommended.";
    let presentingConcernAnalysis = "";

    if (presentingConcern) {
      presentingConcernAnalysis = `Presenting concern: ${presentingConcern}. `;

      if (
        presentingConcern.toLowerCase().includes("chest pain") &&
        context.chronicConditions.some((c) => c.condition.toLowerCase().includes("heart"))
      ) {
        clinicalSignificance = "HIGH PRIORITY: Chest pain in patient with cardiac history requires urgent evaluation.";
      } else if (
        presentingConcern.toLowerCase().includes("headache") &&
        context.chronicConditions.some((c) => c.condition.toLowerCase().includes("hypertension"))
      ) {
        clinicalSignificance =
          "ELEVATED PRIORITY: Headache in hypertensive patient - assess for hypertensive emergency.";
      }
    }

    return {
      patientSummary,
      keyRiskFactors,
      clinicalSignificance,
      presentingConcernAnalysis,
    };
  }

  /**
   * Assess data quality for confidence scoring
   */
  private static assessDataQuality(context: PatientMedicalContext): "excellent" | "good" | "fair" | "limited" {
    let score = 0;

    if (context.demographics.age > 0) score += 1;
    if (context.chronicConditions.length > 0) score += 2;
    if (context.currentMedications.length > 0) score += 2;
    if (context.recentEncounters.length > 0) score += 2;
    if (context.allergies.drug.length > 0 || context.allergies.food.length > 0) score += 1;
    if (context.latestVitals) score += 1;

    if (score >= 8) return "excellent";
    if (score >= 6) return "good";
    if (score >= 4) return "fair";
    return "limited";
  }

  /**
   * Calculate confidence score
   */
  private static calculateConfidence(context: PatientMedicalContext): number {
    const quality = this.assessDataQuality(context);
    const qualityScores = { excellent: 0.95, good: 0.85, fair: 0.7, limited: 0.5 };
    return qualityScores[quality];
  }

  /**
   * Get severity weight for sorting
   */
  private static getSeverityWeight(severity: string): number {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return weights[severity as keyof typeof weights] || 0;
  }

  /**
   * Get priority weight for sorting
   */
  private static getPriorityWeight(priority: string): number {
    const weights = { urgent: 4, high: 3, medium: 2, low: 1 };
    return weights[priority as keyof typeof weights] || 0;
  }
}
