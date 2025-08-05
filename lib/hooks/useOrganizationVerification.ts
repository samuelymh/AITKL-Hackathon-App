import { useState, useEffect } from "react";

export interface Organization {
  id: string;
  name: string;
  type: string;
  registrationNumber?: string;
  description?: string;
  address: any;
  contact: any;
  verification: {
    isVerified: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
    notes?: string;
    rejectionReason?: string;
  };
  createdAt: string;
  updatedAt: string;
  auditCreatedBy?: string;
  auditUpdatedBy?: string;
}

export interface PaginationInfo {
  current: number;
  total: number;
  count: number;
  totalCount: number;
}

export interface OrganizationVerificationState {
  organizations: Organization[];
  pagination: PaginationInfo | null;
  loading: boolean;
  error: string;
  success: string;
  status: string;
  processingId: string | null;
  verificationNotes: Record<string, string>;
  rejectionReasons: Record<string, string>;
}

export interface OrganizationVerificationActions {
  setStatus: (status: string) => void;
  setVerificationNotes: (notes: Record<string, string>) => void;
  setRejectionReasons: (reasons: Record<string, string>) => void;
  updateVerificationNote: (orgId: string, note: string) => void;
  updateRejectionReason: (orgId: string, reason: string) => void;
  fetchOrganizations: (page?: number) => Promise<void>;
  handleVerificationDecision: (organizationId: string, action: "verify" | "reject") => Promise<void>;
  clearMessages: () => void;
}

export function useOrganizationVerification(): OrganizationVerificationState & OrganizationVerificationActions {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [status, setStatus] = useState("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const updateVerificationNote = (orgId: string, note: string) => {
    setVerificationNotes((prev) => ({ ...prev, [orgId]: note }));
  };

  const updateRejectionReason = (orgId: string, reason: string) => {
    setRejectionReasons((prev) => ({ ...prev, [orgId]: reason }));
  };

  const fetchOrganizations = async (page = 1) => {
    try {
      setLoading(true);
      clearMessages();

      const response = await fetch(`/api/admin/organizations/verification?status=${status}&page=${page}&limit=20`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setOrganizations(data.data.organizations);
        setPagination(data.data.pagination);
      } else {
        throw new Error(data.error || "Failed to fetch organizations");
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch organizations");
      setOrganizations([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationDecision = async (organizationId: string, action: "verify" | "reject") => {
    if (processingId) return; // Prevent multiple simultaneous requests

    try {
      setProcessingId(organizationId);
      clearMessages();

      const notes = verificationNotes[organizationId] || "";
      const rejectionReason = rejectionReasons[organizationId] || "";

      // Validate rejection reason if rejecting
      if (action === "reject" && !rejectionReason.trim()) {
        setError("Please provide a reason for rejection");
        return;
      }

      const response = await fetch("/api/admin/organizations/verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          action,
          notes,
          rejectionReason: action === "reject" ? rejectionReason : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);

        // Clear the notes/reasons for this organization
        setVerificationNotes((prev) => {
          const updated = { ...prev };
          delete updated[organizationId];
          return updated;
        });
        setRejectionReasons((prev) => {
          const updated = { ...prev };
          delete updated[organizationId];
          return updated;
        });

        // Refresh the organizations list
        await fetchOrganizations(pagination?.current || 1);
      } else {
        throw new Error(data.error || "Failed to process verification decision");
      }
    } catch (error) {
      console.error("Error processing verification:", error);
      setError(error instanceof Error ? error.message : "Failed to process verification");
    } finally {
      setProcessingId(null);
    }
  };

  // Fetch organizations when status changes
  useEffect(() => {
    fetchOrganizations();
  }, [status]);

  return {
    // State
    organizations,
    pagination,
    loading,
    error,
    success,
    status,
    processingId,
    verificationNotes,
    rejectionReasons,

    // Actions
    setStatus,
    setVerificationNotes,
    setRejectionReasons,
    updateVerificationNote,
    updateRejectionReason,
    fetchOrganizations,
    handleVerificationDecision,
    clearMessages,
  };
}
