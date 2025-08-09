// Service layer for admin analytics API abstraction
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

export async function fetchAdminAnalytics(token: string | null): Promise<AnalyticsData> {
  const response = await fetch("/api/admin/analytics", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const result = await response.json();
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error || "Failed to fetch analytics");
  }
}
