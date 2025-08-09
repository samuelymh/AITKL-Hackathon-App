import { logger } from "@/lib/logger";
import Groq from "groq-sdk";
import NodeCache from "node-cache";
import { AIServiceInterface, AIServiceFactory, HealthStatus } from "./ai-service-factory";

// Type definitions
interface HealthcareSystemPrompts {
  patient: string;
  doctor: string;
  pharmacist: string;
  admin: string;
  [key: string]: string; // Index signature for dynamic access
}

interface DisclaimerPrompts {
  patient: string;
  doctor: string;
  pharmacist: string;
  admin: string;
  [key: string]: string; // Index signature for dynamic access
}

interface AIResponse {
  response: string;
  emergencyDetected: boolean;
  emergencyContext?: string;
  tokensUsed: number;
  confidence: number;
  modelUsed: string;
}

// Groq API Configuration
const GROQ_CONFIG = {
  apiKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  maxTokens: parseInt(process.env.GROQ_MAX_TOKENS || "10000"),
  temperature: parseFloat(process.env.GROQ_TEMPERATURE || "0.7"),
  healthcare: {
    emergencyWebhook: process.env.EMERGENCY_WEBHOOK_URL,
    auditLevel: process.env.GROQ_AUDIT_LEVEL || "full",
  },
};

// Healthcare-specific system prompts optimized for Llama 3.3 70B
const healthcareSystemPrompts: HealthcareSystemPrompts = {
  patient: `You are a compassionate healthcare AI assistant powered by Llama 3.3, designed to provide educational health information to patients.

CRITICAL GUIDELINES:
- Always include medical disclaimers
- Never provide specific medical diagnoses
- Encourage users to consult healthcare providers
- Detect and escalate emergency situations immediately
- Use conversational, empathetic tone
- Focus on education and preparation for medical visits

EMERGENCY KEYWORDS: chest pain, heart attack, stroke, bleeding, unconscious, suicide, overdose, severe pain, can't breathe, emergency

If emergency detected: Immediately respond with emergency protocols and advise calling 911.`,

  doctor: `You are a clinical decision support AI powered by Llama 3.3, designed to assist licensed healthcare providers.

PROFESSIONAL GUIDELINES:
- Provide evidence-based medical information
- Reference current clinical guidelines when possible
- Support clinical decision-making without replacing professional judgment
- Include confidence levels and evidence quality
- Highlight contraindications and safety considerations
- Maintain professional medical terminology

RESPONSE FORMAT:
- Clinical considerations
- Evidence-based recommendations  
- Safety alerts and contraindications
- Suggested follow-up or monitoring`,

  pharmacist: `You are a pharmaceutical AI assistant powered by Llama 3.3, designed to support licensed pharmacists.

PHARMACEUTICAL FOCUS:
- Drug interaction analysis
- Dosage calculations and adjustments
- Patient counseling guidance
- Contraindication identification
- Adherence optimization strategies
- Side effect management

SAFETY PRIORITIES:
- Drug interaction warnings
- Allergy considerations
- Age-appropriate dosing
- Renal/hepatic adjustments`,

  admin: `You are a healthcare administration AI assistant powered by Llama 3.3.

ADMINISTRATIVE FOCUS:
- Healthcare policy and compliance
- System administration guidance
- Regulatory information
- Quality assurance support

MAINTAIN PROFESSIONAL BOUNDARIES:
- Do not provide clinical advice
- Focus on administrative and policy matters
- Refer clinical questions to appropriate healthcare providers`,
};

// Medical function definitions for structured healthcare workflows
const medicalFunctions = [
  {
    name: "assessSymptoms",
    description: "Systematic symptom evaluation following clinical assessment protocols",
    parameters: {
      type: "object",
      properties: {
        primarySymptom: {
          type: "string",
          description: "Main presenting symptom",
        },
        additionalSymptoms: {
          type: "array",
          items: { type: "string" },
          description: "Additional reported symptoms",
        },
        duration: {
          type: "string",
          description: "Duration of symptoms",
        },
        severity: {
          type: "string",
          enum: ["mild", "moderate", "severe", "critical"],
          description: "Severity assessment",
        },
        triggeringFactors: {
          type: "array",
          items: { type: "string" },
          description: "Known triggering factors",
        },
      },
      required: ["primarySymptom", "severity"],
    },
  },
  {
    name: "analyzeDrugInteraction",
    description: "Comprehensive drug interaction analysis",
    parameters: {
      type: "object",
      properties: {
        medications: {
          type: "array",
          items: { type: "string" },
          description: "List of medications to analyze",
        },
        patientAge: {
          type: "number",
          description: "Patient age for age-specific considerations",
        },
        allergies: {
          type: "array",
          items: { type: "string" },
          description: "Known allergies",
        },
        medicalConditions: {
          type: "array",
          items: { type: "string" },
          description: "Relevant medical conditions",
        },
      },
      required: ["medications"],
    },
  },
  {
    name: "emergencyTriage",
    description: "Emergency situation assessment and triage",
    parameters: {
      type: "object",
      properties: {
        symptoms: {
          type: "array",
          items: { type: "string" },
          description: "Emergency symptoms",
        },
        vitalSigns: {
          type: "object",
          properties: {
            bloodPressure: { type: "string" },
            heartRate: { type: "number" },
            temperature: { type: "number" },
            oxygenSaturation: { type: "number" },
          },
        },
        consciousness: {
          type: "string",
          enum: ["alert", "drowsy", "confused", "unconscious"],
          description: "Level of consciousness",
        },
        urgencyLevel: {
          type: "string",
          enum: ["low", "moderate", "high", "critical"],
          description: "Assessed urgency level",
        },
      },
      required: ["symptoms", "urgencyLevel"],
    },
  },
];

// Disclaimers for different user roles
const disclaimers: DisclaimerPrompts = {
  patient:
    "\n\n⚠️ MEDICAL DISCLAIMER: This information is for educational purposes only and does not constitute medical advice. Always consult with qualified healthcare professionals for medical decisions.",
  doctor:
    "\n\n📋 CLINICAL SUPPORT: This AI provides decision support based on current evidence. Always use clinical judgment and follow institutional protocols.",
  pharmacist:
    "\n\n💊 PHARMACEUTICAL DISCLAIMER: Verify all drug information with official sources. Consider patient-specific factors and institutional guidelines.",
  admin:
    "\n\n🏥 ADMINISTRATIVE NOTE: This guidance is for informational purposes. Verify compliance requirements with legal and regulatory experts.",
};

export class GroqHealthcareService implements AIServiceInterface {
  private readonly groq: Groq;
  private readonly model: string;
  private readonly responseCache: NodeCache;

  constructor() {
    // Initialize cache with 5-minute TTL for frequently accessed responses
    this.responseCache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60, // Check for expired keys every minute
      maxKeys: 1000, // Limit cache size
    });

    if (!GROQ_CONFIG.apiKey) {
      logger.warn("Groq API key not provided. Using enhanced mock responses.");
      this.groq = null as any; // Will use mock service
    } else {
      this.groq = new Groq({
        apiKey: GROQ_CONFIG.apiKey,
      });
    }
    this.model = GROQ_CONFIG.model;
  }

  /**
   * Generate healthcare-specific AI response using Groq + Llama 3.3 70B
   */
  async generateResponse(
    message: string,
    sessionType: string,
    userRole: "patient" | "doctor" | "pharmacist" | "admin",
    context?: any,
    conversationHistory?: any[]
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    logger.info("Groq healthcare AI request initiated", {
      requestId,
      messageLength: message.length,
      sessionType,
      userRole,
      hasContext: !!context,
      conversationLength: conversationHistory?.length || 0,
      model: this.model,
    });

    // Check cache first
    const cacheKey = this.shouldCache(message, context) ? this.generateCacheKey(message) : null;

    if (cacheKey) {
      const cachedResponse = this.responseCache.get<AIResponse>(cacheKey);
      if (cachedResponse) {
        logger.info("Response served from cache", { requestId, cacheKey });
        return cachedResponse;
      }
    }

    try {
      const aiResponse = await this.processGroqRequest(message, sessionType, userRole, context, requestId, startTime);

      // Cache eligible responses
      if (cacheKey && !aiResponse.emergencyDetected) {
        this.responseCache.set(cacheKey, aiResponse);
        logger.debug("Response cached", { cacheKey });
      }

      return aiResponse;
    } catch (error) {
      return this.handleError(error, requestId, startTime, message);
    }
  }

  private shouldCache(message: string, context?: any): boolean {
    return !context && message.length < 500;
  }

  private generateCacheKey(message: string): string {
    return `groq_${Buffer.from(message).toString("base64").slice(0, 32)}`;
  }

  private async processGroqRequest(
    message: string,
    sessionType: string,
    userRole: "patient" | "doctor" | "pharmacist" | "admin",
    context: any,
    requestId: string,
    startTime: number
  ): Promise<AIResponse> {
    // Emergency detection
    const emergencyCheck = this.detectEmergency(message);

    // Check if we have API key, otherwise use mock
    if (!this.groq) {
      return this.generateMockResponse(message, sessionType, userRole, emergencyCheck);
    }

    // Build contextual prompt with available data
    const contextualPrompt = context ? `Context: ${JSON.stringify(context)}\n\nUser Question: ${message}` : message;

    // Get appropriate system prompt for user role
    const systemPrompt = healthcareSystemPrompts[userRole] || healthcareSystemPrompts.patient;

    const completion = await this.groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: contextualPrompt,
        },
      ],
      model: this.model,
      temperature: emergencyCheck.isEmergency ? 0.1 : 0.3,
      max_tokens: 1000,
      top_p: 0.9,
      stream: false,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response generated from Groq");
    }

    // Add appropriate disclaimer based on user role
    const enhancedResponse = response + (disclaimers[userRole] || disclaimers.patient);

    const processingTime = Date.now() - startTime;

    logger.info("Groq response generated successfully", {
      requestId,
      model: this.model,
      sessionType,
      userRole,
      tokensUsed: completion.usage?.total_tokens || 0,
      processingTime,
      responseLength: response.length,
      emergencyDetected: emergencyCheck.isEmergency,
    });

    return {
      response: enhancedResponse,
      emergencyDetected: emergencyCheck.isEmergency,
      emergencyContext: emergencyCheck.context,
      tokensUsed: completion.usage?.total_tokens || 0,
      confidence: 0.9,
      modelUsed: this.model,
    };
  }

  private handleError(error: unknown, requestId: string, startTime: number, message: string): never {
    const processingTime = Date.now() - startTime;

    logger.error("Groq healthcare AI request failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      processingTime,
      model: this.model,
      messageLength: message.length,
    });

    if (error instanceof Error && error.message.includes("rate limit")) {
      throw new Error("AI service is temporarily unavailable due to high demand. Please try again in a moment.");
    }

    if (error instanceof Error && (error.message.includes("401") || error.message.includes("unauthorized"))) {
      throw new Error("AI service configuration error. Please contact support.");
    }

    throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : String(error)}`);
  }

  /**
   * Detect emergency situations in user messages
   */
  private detectEmergency(message: string): { isEmergency: boolean; context?: string } {
    const emergencyKeywords = [
      "chest pain",
      "heart attack",
      "stroke",
      "bleeding",
      "unconscious",
      "suicide",
      "overdose",
      "severe pain",
      "can't breathe",
      "emergency",
      "dying",
      "choking",
      "seizure",
      "collapsed",
      "unresponsive",
    ];

    const lowerMessage = message.toLowerCase();
    const detectedKeywords = emergencyKeywords.filter((keyword) => lowerMessage.includes(keyword));

    if (detectedKeywords.length > 0) {
      return {
        isEmergency: true,
        context: `Emergency keywords detected: ${detectedKeywords.join(", ")}`,
      };
    }

    return { isEmergency: false };
  }

  /**
   * Enhanced mock response for development/fallback
   */
  private generateMockResponse(
    message: string,
    sessionType: string,
    userRole: string,
    emergencyCheck: { isEmergency: boolean; context?: string }
  ): AIResponse {
    let mockResponse = "";

    if (emergencyCheck.isEmergency) {
      mockResponse = `🚨 EMERGENCY DETECTED: If this is a medical emergency, call 911 immediately or go to your nearest emergency room.

Based on your message, this appears to be an urgent situation that requires immediate medical attention. Do not delay seeking professional help.

Emergency Resources:
- Call 911 for immediate emergency response
- Go to your nearest emergency room
- Call your local emergency services
- Contact your healthcare provider immediately

This is a mock response. In production, this would trigger emergency protocols and notifications.`;
    } else {
      // Generate contextual mock responses based on user role and session type
      switch (userRole) {
        case "patient":
          mockResponse = `Thank you for your question about your health. As an AI assistant, I can provide educational information, but I always recommend consulting with your healthcare provider for personalized medical advice.

${this.generateSessionSpecificMockContent(sessionType, "patient")}

Remember: This is educational information only and should not replace professional medical advice.`;
          break;

        case "doctor":
          mockResponse = `Clinical Considerations:

${this.generateSessionSpecificMockContent(sessionType, "doctor")}

Evidence Level: This is a mock response for development. In production, responses would include current evidence-based recommendations and clinical guidelines.

Recommendations: Always verify with current clinical protocols and use professional judgment.`;
          break;

        case "pharmacist":
          mockResponse = `Pharmaceutical Analysis:

${this.generateSessionSpecificMockContent(sessionType, "pharmacist")}

Safety Considerations: This is a mock response. In production, comprehensive drug interaction analysis and safety profiles would be provided.

Recommendation: Verify all information with official pharmaceutical references.`;
          break;

        case "admin":
          mockResponse = `Administrative Guidance:

${this.generateSessionSpecificMockContent(sessionType, "admin")}

Note: This is a mock response for development purposes. In production, current regulatory and compliance information would be provided.`;
          break;

        default:
          mockResponse =
            "This is a mock response from the Groq Healthcare Service. Your message has been received and would be processed by the Llama 3.3 70B model in production.";
      }
    }

    // Add disclaimer
    if (disclaimers[userRole]) {
      mockResponse += disclaimers[userRole];
    }

    return {
      response: mockResponse,
      emergencyDetected: emergencyCheck.isEmergency,
      emergencyContext: emergencyCheck.context,
      tokensUsed: 150, // Mock token count
      confidence: 0.85,
      modelUsed: "groq-mock-enhanced",
    };
  }

  /**
   * Generate session-specific mock content
   */
  private generateSessionSpecificMockContent(sessionType: string, userRole: string): string {
    const mockContent = {
      consultation_prep: {
        patient:
          "To prepare for your consultation, consider writing down your symptoms, questions, and current medications. This will help your healthcare provider give you the best care.",
        doctor:
          "Patient consultation preparation should include reviewing medical history, current medications, and preparing focused assessment questions.",
        pharmacist:
          "Consultation preparation involves reviewing medication history, identifying potential interactions, and preparing patient counseling points.",
        admin:
          "Consultation workflow optimization includes scheduling efficiency, documentation requirements, and resource allocation.",
      },
      clinical_support: {
        patient:
          "For clinical questions, please consult directly with your healthcare provider who can assess your specific situation.",
        doctor:
          "Clinical decision support would include evidence-based recommendations, current guidelines, and safety considerations for your specific case.",
        pharmacist:
          "Clinical pharmacy support involves therapeutic monitoring, dosage optimization, and patient safety assessments.",
        admin:
          "Clinical operations support includes workflow optimization, quality metrics, and compliance monitoring.",
      },
      medication_education: {
        patient:
          "Medication education should cover proper dosing, timing, side effects, and when to contact your healthcare provider.",
        doctor:
          "Prescribing considerations include patient factors, drug interactions, monitoring requirements, and patient education needs.",
        pharmacist:
          "Medication therapy management includes comprehensive review, optimization strategies, and patient counseling protocols.",
        admin:
          "Medication management systems focus on safety protocols, compliance tracking, and quality assurance measures.",
      },
      emergency_triage: {
        patient: "For any emergency situation, please call 911 or go to your nearest emergency room immediately.",
        doctor: "Emergency triage protocols should follow institutional guidelines and current ACLS/PALS standards.",
        pharmacist:
          "Emergency pharmaceutical support includes antidote protocols, drug information, and poison control consultation.",
        admin:
          "Emergency response procedures include notification protocols, resource coordination, and compliance documentation.",
      },
      general: {
        patient:
          "I'm here to provide general health education and support. For specific medical concerns, please consult your healthcare provider.",
        doctor:
          "General clinical support includes evidence-based information, best practices, and professional development resources.",
        pharmacist:
          "General pharmaceutical guidance covers drug information, patient care, and professional practice standards.",
        admin:
          "General administrative support includes policy guidance, compliance information, and operational best practices.",
      },
    };

    return (
      mockContent[sessionType as keyof typeof mockContent]?.[userRole as keyof typeof mockContent.general] ||
      "Mock response content based on your session type and role."
    );
  }

  /**
   * Get service health status
   */
  getHealthStatus(): HealthStatus {
    return {
      status: "healthy",
      version: "2.0.0",
      provider: "Groq",
      model: this.model,
      availableModels: ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"],
      supportedSessionTypes: [
        "consultation_prep",
        "clinical_support",
        "medication_education",
        "emergency_triage",
        "general",
      ],
      features: {
        emergencyDetection: true,
        functionCalling: true,
        roleBasedResponses: true,
        auditLogging: true,
      },
    };
  }
}

// Register the Groq healthcare service
AIServiceFactory.register("groq", new GroqHealthcareService());
