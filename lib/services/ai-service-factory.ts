import { logger } from "@/lib/logger";

// AI Service Interface
export interface AIServiceInterface {
  generateResponse(
    message: string,
    sessionType: string,
    userRole: "patient" | "doctor" | "pharmacist" | "admin",
    context?: any,
    conversationHistory?: any[]
  ): Promise<AIResponse>;
  getHealthStatus(): HealthStatus;
}

export interface AIResponse {
  response: string;
  emergencyDetected: boolean;
  emergencyContext?: string;
  tokensUsed: number;
  confidence: number;
  modelUsed: string;
}

export interface HealthStatus {
  status: string;
  version: string;
  provider: string;
  model?: string;
  availableModels: string[];
  supportedSessionTypes: string[];
  features: {
    emergencyDetection: boolean;
    functionCalling: boolean;
    roleBasedResponses: boolean;
    auditLogging: boolean;
  };
}

// Factory to manage AI service instances
export class AIServiceFactory {
  private static services: { [key: string]: AIServiceInterface } = {};
  private static defaultService: string = "groq";

  static register(name: string, service: AIServiceInterface) {
    this.services[name] = service;
    logger.info(`AI Service registered: ${name}`);
  }

  static getService(name?: string): AIServiceInterface {
    const serviceName = name || this.defaultService;
    const service = this.services[serviceName];

    if (!service) {
      logger.error(`AI Service ${serviceName} not registered`);
      throw new Error(`AI Service ${serviceName} not registered.`);
    }

    return service;
  }

  static setDefaultService(name: string) {
    if (!this.services[name]) {
      throw new Error(`Cannot set default service ${name}: not registered`);
    }
    this.defaultService = name;
    logger.info(`Default AI service set to: ${name}`);
  }

  static getAvailableServices(): string[] {
    return Object.keys(this.services);
  }

  static isServiceRegistered(name: string): boolean {
    return name in this.services;
  }
}
