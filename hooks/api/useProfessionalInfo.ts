import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ProfessionalInformation {
  licenseNumber: string;
  specialty: string;
  practitionerType:
    | "doctor"
    | "nurse"
    | "pharmacist"
    | "technician"
    | "admin"
    | "other";
  yearsOfExperience: number;
  currentPosition?: string;
  department?: string;
  organizationId?: string;
  metadata?: {
    specializations?: string[];
    languages?: string[];
    certifications?: Array<{
      name: string;
      issuingBody: string;
      issueDate: string;
      expiryDate?: string;
      verificationStatus: "verified" | "pending" | "expired" | "revoked";
    }>;
    emergencyContact?: {
      name: string;
      relationship: string;
      phone: string;
      email?: string;
    };
  };
}

interface ProfessionalInfoResponse {
  practitioner: {
    _id: string;
    professionalInfo: ProfessionalInformation;
    verification: {
      isLicenseVerified: boolean;
      isOrganizationVerified: boolean;
      verificationNotes?: string;
    };
    organizationId?: {
      _id: string;
      name: string;
      type: string;
    };
    updatedAt: string;
  } | null;
  isComplete: boolean;
  requiredFields?: string[];
  lastUpdated?: string;
}

interface UseProfessionalInfoReturn {
  professionalInfo: ProfessionalInformation;
  setProfessionalInfo: React.Dispatch<
    React.SetStateAction<ProfessionalInformation>
  >;
  loading: boolean;
  saving: boolean;
  isComplete: boolean;
  error: string | null;
  fetchProfessionalInfo: () => Promise<void>;
  saveProfessionalInfo: () => Promise<boolean>;
  requiredFieldsComplete: boolean;
}

export function useProfessionalInfo(): UseProfessionalInfoReturn {
  const { token, logout, refreshAuthToken } = useAuth();
  const { toast } = useToast();

  const [professionalInfo, setProfessionalInfo] =
    useState<ProfessionalInformation>({
      licenseNumber: "",
      specialty: "",
      practitionerType: "doctor",
      yearsOfExperience: 0,
      currentPosition: "",
      department: "",
      metadata: {
        specializations: [],
        languages: [],
        certifications: [],
        emergencyContact: {
          name: "",
          relationship: "",
          phone: "",
          email: "",
        },
      },
    });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeAuthenticatedRequest = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token once
          await refreshAuthToken();

          // Retry the request with the potentially new token
          const retryResponse = await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!retryResponse.ok) {
            throw new Error(
              `HTTP ${retryResponse.status}: ${retryResponse.statusText}`,
            );
          }

          return retryResponse;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    },
    [token, refreshAuthToken],
  );

  const fetchProfessionalInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await makeAuthenticatedRequest(
        "/api/doctor/professional-info",
      );
      const result: { success: boolean; data: ProfessionalInfoResponse } =
        await response.json();

      if (result.success && result.data.practitioner) {
        setProfessionalInfo(result.data.practitioner.professionalInfo);
        setIsComplete(result.data.isComplete);
      } else {
        setIsComplete(false);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load professional information";
      setError(errorMessage);

      if (
        error instanceof Error &&
        error.message.includes("No authentication token")
      ) {
        logout();
        return;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [makeAuthenticatedRequest, logout, toast]);

  const saveProfessionalInfo = useCallback(async (): Promise<boolean> => {
    try {
      setSaving(true);
      setError(null);

      const response = await makeAuthenticatedRequest(
        "/api/doctor/professional-info",
        {
          method: "POST",
          body: JSON.stringify(professionalInfo),
        },
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Professional information saved successfully",
        });
        setIsComplete(true);
        await fetchProfessionalInfo(); // Refresh data
        return true;
      } else {
        throw new Error(result.error || "Failed to save");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save professional information";
      setError(errorMessage);

      if (
        error instanceof Error &&
        error.message.includes("No authentication token")
      ) {
        logout();
        return false;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    makeAuthenticatedRequest,
    professionalInfo,
    logout,
    toast,
    fetchProfessionalInfo,
  ]);

  const requiredFieldsComplete = !!(
    professionalInfo.licenseNumber &&
    professionalInfo.specialty &&
    professionalInfo.practitionerType &&
    professionalInfo.yearsOfExperience !== undefined
  );

  useEffect(() => {
    fetchProfessionalInfo();
  }, [fetchProfessionalInfo]);

  return {
    professionalInfo,
    setProfessionalInfo,
    loading,
    saving,
    isComplete,
    error,
    fetchProfessionalInfo,
    saveProfessionalInfo,
    requiredFieldsComplete,
  };
}
