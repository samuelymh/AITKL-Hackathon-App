/**
 * Custom hook for managing medical information API calls
 * Addresses PR review recommendation for separating API logic
 */

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Type definitions
interface MedicalInformation {
  bloodType: string;
  foodAllergies: string[];
  drugAllergies: string[];
  knownMedicalConditions: string[];
  currentMedications: string[];
  pastSurgicalHistory: string[];
  smokingStatus: "never" | "current" | "former";
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  additionalNotes: string;
  lastUpdated?: Date | string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

interface MedicalInfoApiResponse extends ApiResponse<MedicalInformation> {}
interface SaveMedicalInfoResponse
  extends ApiResponse<{
    message: string;
    lastUpdated: Date | string;
  }> {}

// Helper function for API calls with JWT handling
const makeApiCall = async (
  url: string,
  token: string,
  refreshAuthToken: () => Promise<void>,
  logout: () => void,
  options: RequestInit = {},
): Promise<Response> => {
  if (!token) {
    throw new Error("No authentication token available");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  try {
    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 - token expired
    if (response.status === 401) {
      try {
        await refreshAuthToken();

        // Get the new token from localStorage
        const newToken = localStorage.getItem("auth-token");
        if (!newToken) {
          throw new Error("Token refresh failed");
        }

        // Retry the request with new token
        response = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            Authorization: `Bearer ${newToken}`,
          },
        });
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        logout();
        throw new Error("Session expired. Please log in again.");
      }
    }

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Session expired")) {
      throw error;
    }
    throw new Error(
      `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Main hook
export const useMedicalInfo = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { token, logout, refreshAuthToken } = useAuth();
  const { toast } = useToast();

  const fetchMedicalInfo =
    useCallback(async (): Promise<MedicalInformation | null> => {
      if (!token) {
        throw new Error("Authentication required");
      }

      setIsLoading(true);
      try {
        const response = await makeApiCall(
          "/api/patient/medical-info",
          token,
          refreshAuthToken,
          logout,
        );
        const result: MedicalInfoApiResponse = await response.json();

        if (result.success && result.data) {
          // Ensure all array fields are arrays and not objects - defensive programming
          const processedData: MedicalInformation = {
            ...result.data,
            foodAllergies: Array.isArray(result.data.foodAllergies)
              ? result.data.foodAllergies
              : [],
            drugAllergies: Array.isArray(result.data.drugAllergies)
              ? result.data.drugAllergies
              : [],
            knownMedicalConditions: Array.isArray(
              result.data.knownMedicalConditions,
            )
              ? result.data.knownMedicalConditions
              : [],
            currentMedications: Array.isArray(result.data.currentMedications)
              ? result.data.currentMedications
              : [],
            pastSurgicalHistory: Array.isArray(result.data.pastSurgicalHistory)
              ? result.data.pastSurgicalHistory
              : [],
            emergencyContact: result.data.emergencyContact || {
              name: "",
              phone: "",
              relationship: "",
            },
            lastUpdated: result.data.lastUpdated
              ? new Date(result.data.lastUpdated)
              : undefined,
          };

          return processedData;
        } else if (result.error) {
          throw new Error(result.error);
        }
        return null;
      } catch (error) {
        console.error("Failed to load medical information:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load medical information. Please refresh the page.",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    }, [token, refreshAuthToken, logout, toast]);

  const saveMedicalInfo = useCallback(
    async (medicalInfo: MedicalInformation): Promise<void> => {
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication required. Please login again.",
          variant: "destructive",
        });
        throw new Error("Authentication required");
      }

      setIsSaving(true);
      try {
        const response = await makeApiCall(
          "/api/patient/medical-info",
          token,
          refreshAuthToken,
          logout,
          {
            method: "PUT",
            body: JSON.stringify(medicalInfo),
          },
        );
        const result: SaveMedicalInfoResponse = await response.json();

        if (result.success) {
          toast({
            title: "Medical Information Saved",
            description:
              "Your medical information has been updated successfully.",
          });
        } else {
          throw new Error(result.error || "Failed to save medical information");
        }
      } catch (error) {
        console.error("Failed to save medical information:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to save medical information. Please try again.",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [token, refreshAuthToken, logout, toast],
  );

  return {
    fetchMedicalInfo,
    saveMedicalInfo,
    isLoading,
    isSaving,
  };
};

export default useMedicalInfo;
