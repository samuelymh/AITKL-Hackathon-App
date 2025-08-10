import { logger } from "@/lib/logger";
import Groq from "groq-sdk";
import NodeCache from "node-cache";
import { AIServiceInterface, AIServiceFactory, HealthStatus } from "./ai-service-factory";
import { PatientContextService, PatientMedicalContext } from "./patient-context-service";

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

    console.log("🔧 Initializing GroqHealthcareService", {
      hasApiKey: !!GROQ_CONFIG.apiKey,
      model: GROQ_CONFIG.model,
    });

    if (!GROQ_CONFIG.apiKey) {
      console.warn("⚠️ Groq API key not provided. Using enhanced mock responses.");
      logger.warn("Groq API key not provided. Using enhanced mock responses.");
      this.groq = null as any; // Will use mock service
    } else {
      console.log("✅ Groq API key found, initializing Groq client");
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
      const aiResponse = await this.processGroqRequest(
        message,
        sessionType,
        userRole,
        context,
        requestId,
        startTime,
        conversationHistory
      );

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

  /**
   * Build conversation messages with history for context
   */
  private buildConversationMessages(
    systemPrompt: string,
    currentMessage: string,
    conversationHistory?: any[]
  ): Array<{ role: "system" | "user" | "assistant"; content: string }> {
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // Add conversation history for context (last 5 exchanges to stay within token limits)
    if (conversationHistory && conversationHistory.length > 0) {
      console.log("📝 Adding conversation history", {
        historyLength: conversationHistory.length,
        lastFive: conversationHistory.slice(-10).length,
      });

      const recentHistory = conversationHistory.slice(-10); // Last 10 messages
      recentHistory.forEach((msg: any) => {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      });
    }

    // Add current message
    messages.push({
      role: "user",
      content: currentMessage,
    });

    console.log("🔗 Conversation messages built", {
      totalMessages: messages.length,
      hasHistory: conversationHistory && conversationHistory.length > 0,
      historyCount: conversationHistory?.length || 0,
    });

    return messages;
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
    startTime: number,
    conversationHistory?: any[]
  ): Promise<AIResponse> {
    console.log("🚀 Processing Groq request", {
      requestId,
      messageLength: message.length,
      sessionType,
      userRole,
      hasContext: !!context,
      contextKeys: context ? Object.keys(context) : [],
      hasGroqClient: !!this.groq,
    });

    // Emergency detection
    const emergencyCheck = this.detectEmergency(message);

    // Check if we have API key, otherwise use mock
    if (!this.groq) {
      console.log("⚠️ No Groq client, using mock response");
      return this.generateMockResponse(message, sessionType, userRole, emergencyCheck);
    }

    // Gather patient medical context for enhanced consultation preparation
    let patientContext: PatientMedicalContext | null = null;
    if (userRole === "patient" && sessionType === "consultation_prep") {
      try {
        console.log("🔍 Attempting to gather patient context", {
          userRole,
          sessionType,
          userId: context?.userId,
          hasContext: !!context,
        });

        if (context?.userId) {
          patientContext = await PatientContextService.gatherPatientContext(context.userId);
        } else {
          console.log("⚠️ No userId provided, creating mock patient context for testing");
          // Create mock patient context for testing
          patientContext = {
            demographics: { age: 35, bloodType: "O+", smokingStatus: "never" },
            allergies: { drug: ["Penicillin"], food: [], environmental: [] },
            chronicConditions: [
              {
                condition: "Type 2 Diabetes",
                diagnosedDate: new Date("2020-01-01"),
                icd10Code: "E11.9",
                status: "active",
              },
            ],
            recentEncounters: [
              {
                date: new Date("2024-12-01"),
                type: "routine_checkup",
                chiefComplaint: "Routine diabetes follow-up",
                diagnosis: ["Type 2 Diabetes - well controlled"],
                prescriptions: ["Metformin 500mg"],
              },
            ],
            currentMedications: [
              {
                name: "Metformin",
                dosage: "500mg",
                frequency: "twice daily",
                prescribedDate: new Date("2024-12-01"),
              },
            ],
            latestVitals: {
              bloodPressure: "130/80",
              heartRate: 72,
              weight: 75,
              height: 175,
            },
            riskFactors: ["Type 2 Diabetes", "Hypertension risk"],
          };
          console.log("✅ Using mock patient context for consultation prep");
        }

        console.log("✅ Patient medical context gathered", {
          requestId,
          hasContext: !!patientContext,
          userId: context?.userId,
          contextData: patientContext
            ? {
                age: patientContext.demographics.age,
                chronicConditions: patientContext.chronicConditions.length,
                medications: patientContext.currentMedications.length,
                encounters: patientContext.recentEncounters.length,
              }
            : null,
        });

        logger.info("Patient medical context gathered for consultation prep", {
          requestId,
          hasContext: !!patientContext,
          userId: context?.userId,
        });
      } catch (error) {
        console.error("❌ Failed to gather patient context", { requestId, error });
        logger.warn("Failed to gather patient context, using fallback", { requestId, error });
      }
    } else {
      console.log("ℹ️ Patient context not gathered", {
        userRole,
        sessionType,
        hasUserId: !!context?.userId,
        reason:
          userRole !== "patient"
            ? "Not a patient"
            : sessionType !== "consultation_prep"
              ? "Not consultation prep"
              : !context?.userId
                ? "No user ID"
                : "Unknown",
      });
    }

    // Build enhanced system prompt based on session type and context
    const systemPrompt = await this.buildEnhancedSystemPrompt(userRole, sessionType, message, patientContext);

    // Build contextual prompt
    const contextualPrompt = this.buildContextualPrompt(message, context, patientContext);

    // Build conversation messages with history
    const conversationMessages = this.buildConversationMessages(systemPrompt, contextualPrompt, conversationHistory);

    const completion = await this.groq.chat.completions.create({
      messages: conversationMessages,
      model: this.model,
      temperature: emergencyCheck.isEmergency ? 0.1 : 0.3,
      max_tokens: patientContext ? 1500 : 1000, // More tokens for detailed consultation prep
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
      hasPatientContext: !!patientContext,
    });

    return {
      response: enhancedResponse,
      emergencyDetected: emergencyCheck.isEmergency,
      emergencyContext: emergencyCheck.context,
      tokensUsed: completion.usage?.total_tokens || 0,
      confidence: patientContext ? 0.95 : 0.9, // Higher confidence with patient context
      modelUsed: this.model,
    };
  }

  /**
   * Build enhanced system prompt based on session type and patient context
   */
  private async buildEnhancedSystemPrompt(
    userRole: "patient" | "doctor" | "pharmacist" | "admin",
    sessionType: string,
    message: string,
    patientContext: PatientMedicalContext | null
  ): Promise<string> {
    console.log("🎯 Building enhanced system prompt", {
      userRole,
      sessionType,
      hasPatientContext: !!patientContext,
    });

    // For consultation preparation with patient context, use enhanced prompt
    if (userRole === "patient" && sessionType === "consultation_prep" && patientContext) {
      console.log("✅ Using personalized consultation prep prompt with patient context");
      return this.buildConsultationPrepPrompt(patientContext, message, sessionType);
    }

    console.log("ℹ️ Using standard system prompt", {
      reason:
        userRole !== "patient"
          ? "Not a patient"
          : sessionType !== "consultation_prep"
            ? "Not consultation prep"
            : !patientContext
              ? "No patient context"
              : "Unknown",
    });

    // Default to standard system prompts for other cases
    return healthcareSystemPrompts[userRole] || healthcareSystemPrompts.patient;
  }

  /**
   * Build personalized consultation preparation prompt with patient medical context
   */
  private buildConsultationPrepPrompt(context: PatientMedicalContext, message: string, sessionType: string): string {
    console.log("🏥 Building personalized consultation prep prompt", {
      patientAge: context.demographics.age,
      chronicConditions: context.chronicConditions.length,
      currentMedications: context.currentMedications.length,
      recentEncounters: context.recentEncounters.length,
      message: message.substring(0, 50) + "...",
    });

    const consultationPrepPrompt = `You are Dr. AI-Assistant, a compassionate and experienced physician. Your role is to help patients prepare for their medical consultations by providing personalized, easy-to-understand guidance based on their medical history.

## Your Patient's Medical Profile
- **Age**: ${context.demographics.age} years old
- **Medical Conditions**: ${context.chronicConditions.length > 0 ? context.chronicConditions.map((c) => c.condition).join(", ") : "None on record"}
- **Current Medications**: ${context.currentMedications.length > 0 ? context.currentMedications.map((m) => `${m.name} (${m.dosage})`).join(", ") : "None listed"}
- **Known Allergies**: ${[...context.allergies.drug, ...context.allergies.food].length > 0 ? [...context.allergies.drug, ...context.allergies.food].join(", ") : "None documented"}

## Patient's Current Concern
"${message}"

## How to Respond

**IMPORTANT FORMATTING RULES:**
1. **Use natural, conversational language** - avoid medical jargon and formal formatting
2. **Write in paragraphs** - not bullet points or structured sections
3. **Be warm and empathetic** - like talking to a trusted family doctor
4. **Ask ONE focused question** to better understand their situation
5. **Keep responses concise** - aim for 2-3 paragraphs maximum
6. **Use simple, clear language** that any patient can understand

**Your Response Should Include:**
1. **Acknowledge their concern** with empathy and reference their medical history when relevant
2. **Build on previous conversation** if this is a follow-up question
3. **Ask ONE specific question** that helps you understand their situation better (unless you have enough information)
4. **Briefly explain why this question is important** in simple terms

**Example Response Style:**
"I understand you're concerned about [their symptom]. Given that you have [relevant medical condition] and take [relevant medication], it's important we get a clear picture of what's happening.

To help me better understand your situation, I'd like to ask: [ONE specific question]?

This is important because [simple explanation of why this matters for their health]."

**For Follow-up Conversations:**
"Thank you for that additional information about [reference previous response]. That helps me understand your situation better. 

Based on what you've told me about [summarize key points], I think [next guidance or question]."

**Key Guidelines:**
- Never use markdown formatting (**, ##, ###, bullet points)
- Write like you're having a face-to-face conversation
- Reference their specific medical history naturally in the conversation
- **Build on previous parts of our conversation** - remember what they've already told you
- Focus on ONE key question to gather more information (unless you have enough context)
- Keep medical explanations simple and reassuring
- Show genuine concern for their wellbeing
- If this is a follow-up, acknowledge their previous responses and build on them

Remember: You're preparing them for a productive doctor visit by asking the right questions and helping them think through their symptoms in the context of their health history.`;

    console.log("📝 Consultation prep prompt built successfully", {
      promptLength: consultationPrepPrompt.length,
    });

    return consultationPrepPrompt;
  }

  /**
   * Build contextual prompt with available data
   */
  private buildContextualPrompt(message: string, context: any, patientContext: PatientMedicalContext | null): string {
    if (patientContext) {
      // For consultation prep with patient context, the medical info is already in system prompt
      return message;
    }

    // For other cases, include context if available
    return context ? `Context: ${JSON.stringify(context)}\n\nUser Question: ${message}` : message;
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
