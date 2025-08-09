/**
 * Analytics Service - Abstraction layer for analytics API calls
 * Implements service pattern to decouple frontend from specific API endpoints
 */

export interface AnalyticsData {
  userAnalytics: {
    growth: Array<{ _id: string; count: number }>;
    trends: Array<{ _id: { date: string; role: string }; count: number }>;
    activity: {
      totalUsers: number;
      activeUsers: number;
      verifiedEmails: number;
      verifiedPhones: number;
      lockedAccounts: number;
    };
  };
  organizationAnalytics: {
    byType: Array<{ _id: { type: string; verified: boolean }; count: number }>;
    trends: Array<{ _id: { date: string; type: string }; count: number }>;
    geography: Array<{ _id: { state: string; city: string }; count: number; types: string[] }>;
  };
  healthcareWorkflow: {
    encounters: Array<{ _id: { date: string; type: string }; count: number; totalPrescriptions: number }>;
    prescriptions: Array<{ _id: { medication: string; status: string }; count: number; avgDosage: number }>;
    dispensations: Array<{ _id: { date: string; status: string }; count: number; avgDaysSupply: number }>;
    authorizations: Array<{ _id: { date: string; status: string }; count: number; avgTimeWindow: number }>;
  };
  performance: {
    topOrganizations: Array<{ _id: string; memberCount: number; roles: string[] }>;
    systemHealth: {
      avgLoginAttempts: number;
      maxLoginAttempts: number;
      usersWithFailedLogins: number;
    };
    dataQuality: {
      totalUsers: number;
      usersWithProfilePictures: number;
      usersWithEmergencyContact: number;
      usersWithMedicalInfo: number;
    };
  };
  security: {
    failedLogins: Array<{ _id: { date: string }; failedAttempts: number; uniqueUsers: number }>;
    accountSecurity: {
      totalUsers: number;
      lockedAccounts: number;
      unverifiedEmails: number;
      recentPasswordResets: number;
    };
  };
  compliance: {
    auditCompliance: { recordsWithAuditTrail: number; totalRecords: number };
    dataRetention: { totalEncounters: number; oldRecords: number };
    encryption: { totalUsers: number; encryptedFields: number };
  };
  financial: {
    organizationMetrics: Array<{ _id: string; count: number; avgMemberCount: number }>;
    resourceUtilization: Array<{ _id: string; encounterCount: number; avgPrescriptionsPerEncounter: number }>;
  };
  generatedAt: string;
  timeRanges: {
    last7Days: string;
    last30Days: string;
    last90Days: string;
  };
}

export interface AlertData {
  id: string;
  type: 'security' | 'system' | 'compliance' | 'performance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  actionRequired: boolean;
}

export interface UserStats {
  totalUsers: number;
  adminUsers: number;
  medicalStaff: number;
  patients: number;
  newUsersLast7Days: number;
  activeUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  roleBreakdown: {
    admin: number;
    doctor: number;
    pharmacist: number;
    patient: number;
  };
}

export interface RecentUser {
  id: string;
  digitalIdentifier: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
  verified: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * HTTP Client with authentication and error handling
 */
class ApiClient {
  private readonly baseUrl: string;
  private readonly getAuthToken: () => string | null;

  constructor(getAuthToken: () => string | null, baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.getAuthToken = getAuthToken;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

/**
 * Analytics Service - Main service class
 */
export class AnalyticsService {
  private readonly apiClient: ApiClient;

  constructor(getAuthToken: () => string | null) {
    this.apiClient = new ApiClient(getAuthToken, '/api');
  }

  /**
   * Fetch comprehensive analytics data
   */
  async getAnalytics(): Promise<AnalyticsData> {
    const response = await this.apiClient.get<AnalyticsData>('/admin/analytics');
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch analytics');
    }
    return response.data;
  }

  /**
   * Fetch admin alerts with optional filtering
   */
  async getAlerts(filters?: { type?: string; severity?: string }): Promise<AlertData[]> {
    let endpoint = '/admin/alerts';
    
    if (filters) {
      const params = new URLSearchParams();
      if (filters.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity);
      
      const queryString = params.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }
    }

    const response = await this.apiClient.get<AlertData[]>(endpoint);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch alerts');
    }
    return response.data;
  }

  /**
   * Fetch user statistics
   */
  async getUserStats(): Promise<UserStats> {
    const response = await this.apiClient.get<UserStats>('/admin/users/stats');
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch user statistics');
    }
    return response.data;
  }

  /**
   * Fetch recent users with pagination
   */
  async getRecentUsers(limit: number = 10, page: number = 1): Promise<{
    users: RecentUser[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const response = await this.apiClient.get<{
      users: RecentUser[];
      pagination: any;
    }>(`/admin/users/recent?limit=${limit}&page=${page}`);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch recent users');
    }
    return response.data;
  }
}

/**
 * Create analytics service instance
 */
export const createAnalyticsService = (getAuthToken: () => string | null): AnalyticsService => {
  return new AnalyticsService(getAuthToken);
};
