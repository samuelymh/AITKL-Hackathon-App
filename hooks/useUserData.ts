import { useState, useEffect } from "react";

interface UserStats {
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

interface RecentUser {
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

interface RecentUsersResponse {
  users: RecentUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function useUserStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/users/stats", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        } else {
          throw new Error(data.error || "Failed to fetch user statistics");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return { stats, loading, error, refetch: () => setLoading(true) };
}

export function useRecentUsers(limit = 10, page = 1) {
  const [data, setData] = useState<RecentUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecentUsers() {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/users/recent?limit=${limit}&page=${page}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || "Failed to fetch recent users");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchRecentUsers();
  }, [limit, page]);

  return { data, loading, error, refetch: () => setLoading(true) };
}
