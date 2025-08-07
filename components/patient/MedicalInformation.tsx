"use client";

import React, { useState, useEffect } from "react";
import {
  Heart,
  AlertTriangle,
  Pill,
  Cigarette,
  Scissors,
  Plus,
  X,
  Save,
  Shield,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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

// API Response interfaces for better type safety
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

interface MedicalInformationProps {
  userId: string;
  className?: string;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const COMMON_ALLERGIES = [
  "Peanuts",
  "Tree nuts",
  "Shellfish",
  "Fish",
  "Eggs",
  "Milk",
  "Soy",
  "Wheat",
  "Sesame",
  "Latex",
  "Dust mites",
  "Pet dander",
  "Pollen",
];

const COMMON_DRUG_ALLERGIES = [
  "Penicillin",
  "Aspirin",
  "Ibuprofen",
  "Codeine",
  "Morphine",
  "Sulfa drugs",
  "Insulin",
  "Tetracycline",
  "Vancomycin",
  "Contrast dye",
];

const COMMON_CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "Asthma",
  "Heart disease",
  "Arthritis",
  "Depression",
  "Anxiety",
  "COPD",
  "Kidney disease",
  "Liver disease",
  "Thyroid disorders",
  "Epilepsy",
  "Migraines",
];

// Helper function for API calls with JWT handling
const makeApiCallHelper = async (
  url: string,
  token: string,
  refreshAuthToken: () => Promise<void>,
  logout: () => void,
  options: RequestInit = {},
) => {
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

export function MedicalInformation({
  userId,
  className,
}: MedicalInformationProps) {
  const [medicalInfo, setMedicalInfo] = useState<MedicalInformation>({
    bloodType: "",
    foodAllergies: [],
    drugAllergies: [],
    knownMedicalConditions: [],
    currentMedications: [],
    pastSurgicalHistory: [],
    smokingStatus: "never",
    emergencyContact: {
      name: "",
      phone: "",
      relationship: "",
    },
    additionalNotes: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const { toast } = useToast();
  const { token, logout, refreshAuthToken } = useAuth();

  // Load existing medical information
  useEffect(() => {
    const loadMedicalInfo = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await makeApiCallHelper(
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

          setMedicalInfo(processedData);
          calculateCompletion(processedData);
        } else if (result.error) {
          throw new Error(result.error);
        }
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
      } finally {
        setIsLoading(false);
      }
    };

    loadMedicalInfo();
  }, [userId, token, toast]);

  // Calculate completion percentage
  const calculateCompletion = (info: MedicalInformation) => {
    const fields = [
      info.bloodType,
      info.emergencyContact.name,
      info.emergencyContact.phone,
      info.emergencyContact.relationship,
    ];

    const arrayFields = [
      info.foodAllergies.length > 0,
      info.drugAllergies.length > 0,
      info.knownMedicalConditions.length > 0,
      info.currentMedications.length > 0,
    ];

    const filledFields = fields.filter(
      (field) => field && field.trim() !== "",
    ).length;
    const filledArrays = arrayFields.filter((hasItems) => hasItems).length;
    const smokingProvided = info.smokingStatus !== "never" ? 1 : 0;

    const totalFields = fields.length + arrayFields.length + 1; // +1 for smoking status
    const completedFields = filledFields + filledArrays + smokingProvided;

    const percentage = Math.round((completedFields / totalFields) * 100);
    setCompletionPercentage(percentage);
  };

  // Update medical info and track changes
  const updateMedicalInfo = (updates: Partial<MedicalInformation>) => {
    const newInfo = { ...medicalInfo, ...updates };
    setMedicalInfo(newInfo);
    setHasChanges(true);
    calculateCompletion(newInfo);
  };

  // Add item to array field
  const addToArrayField = (
    fieldName: keyof MedicalInformation,
    value: string,
  ) => {
    if (!value.trim()) return;

    const currentArray = medicalInfo[fieldName] as string[];
    if (!currentArray.includes(value.trim())) {
      updateMedicalInfo({
        [fieldName]: [...currentArray, value.trim()],
      });
    }
  };

  // Remove item from array field
  const removeFromArrayField = (
    fieldName: keyof MedicalInformation,
    value: string,
  ) => {
    const currentArray = medicalInfo[fieldName] as string[];
    updateMedicalInfo({
      [fieldName]: currentArray.filter((item) => item !== value),
    });
  };

  // Save medical information
  const handleSave = async () => {
    if (!token) {
      toast({
        title: "Error",
        description: "Authentication required. Please login again.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await makeApiCallHelper(
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
        setHasChanges(false);
        setMedicalInfo((prev) => ({
          ...prev,
          lastUpdated: result.data?.lastUpdated
            ? new Date(result.data.lastUpdated)
            : new Date(),
        }));

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
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">
              Loading medical information...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            <CardTitle>Medical Information</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {completionPercentage < 100 ? (
              <Badge
                variant="outline"
                className="bg-orange-50 text-orange-700 border-orange-200"
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                {completionPercentage}% Complete
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            )}
            {hasChanges && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                Unsaved Changes
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Complete your medical profile to help healthcare providers give you
          the best care.
          {completionPercentage < 100 && (
            <span className="block mt-1 text-orange-600 font-medium">
              Please complete all sections for optimal healthcare delivery.
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Medical Info */}
        <div className="space-y-4">
          <Label className="text-base font-medium flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            Basic Medical Information
          </Label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bloodType">Blood Type *</Label>
              <Select
                value={medicalInfo.bloodType}
                onValueChange={(value) =>
                  updateMedicalInfo({ bloodType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="smokingStatus">Smoking Status</Label>
              <Select
                value={medicalInfo.smokingStatus}
                onValueChange={(value: "never" | "current" | "former") =>
                  updateMedicalInfo({ smokingStatus: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never smoked</SelectItem>
                  <SelectItem value="current">Current smoker</SelectItem>
                  <SelectItem value="former">Former smoker</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Allergies */}
        <div className="space-y-4">
          <Label className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Allergies
          </Label>

          {/* Food Allergies */}
          <div>
            <Label className="text-sm">Food Allergies</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Array.isArray(medicalInfo.foodAllergies) &&
                medicalInfo.foodAllergies.map((allergy) => (
                  <Badge
                    key={`food-${allergy}`}
                    variant="outline"
                    className="bg-red-50"
                  >
                    {typeof allergy === "string"
                      ? allergy
                      : JSON.stringify(allergy)}
                    <button
                      onClick={() =>
                        removeFromArrayField("foodAllergies", allergy)
                      }
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Select
                onValueChange={(value) =>
                  addToArrayField("foodAllergies", value)
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add food allergy" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_ALLERGIES.filter(
                    (a) => !medicalInfo.foodAllergies.includes(a),
                  ).map((allergy) => (
                    <SelectItem key={allergy} value={allergy}>
                      {allergy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Drug Allergies */}
          <div>
            <Label className="text-sm">Drug Allergies</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Array.isArray(medicalInfo.drugAllergies) &&
                medicalInfo.drugAllergies.map((allergy) => (
                  <Badge
                    key={`drug-${allergy}`}
                    variant="outline"
                    className="bg-red-50"
                  >
                    {typeof allergy === "string"
                      ? allergy
                      : JSON.stringify(allergy)}
                    <button
                      onClick={() =>
                        removeFromArrayField("drugAllergies", allergy)
                      }
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Select
                onValueChange={(value) =>
                  addToArrayField("drugAllergies", value)
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add drug allergy" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_DRUG_ALLERGIES.filter(
                    (a) => !medicalInfo.drugAllergies.includes(a),
                  ).map((allergy) => (
                    <SelectItem key={allergy} value={allergy}>
                      {allergy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Medical Conditions */}
        <div className="space-y-4">
          <Label className="text-base font-medium flex items-center gap-2">
            <Heart className="h-4 w-4 text-blue-500" />
            Medical Conditions
          </Label>

          <div>
            <Label className="text-sm">Known Medical Conditions</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Array.isArray(medicalInfo.knownMedicalConditions) &&
                medicalInfo.knownMedicalConditions.map((condition) => (
                  <Badge
                    key={`condition-${condition}`}
                    variant="outline"
                    className="bg-blue-50"
                  >
                    {typeof condition === "string"
                      ? condition
                      : JSON.stringify(condition)}
                    <button
                      onClick={() =>
                        removeFromArrayField(
                          "knownMedicalConditions",
                          condition,
                        )
                      }
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Select
                onValueChange={(value) =>
                  addToArrayField("knownMedicalConditions", value)
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add medical condition" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CONDITIONS.filter(
                    (c) => !medicalInfo.knownMedicalConditions.includes(c),
                  ).map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {condition}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Current Medications */}
        <div className="space-y-4">
          <Label className="text-base font-medium flex items-center gap-2">
            <Pill className="h-4 w-4 text-green-500" />
            Current Medications
          </Label>

          <div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Array.isArray(medicalInfo.currentMedications) &&
                medicalInfo.currentMedications.map((medication) => (
                  <Badge
                    key={`medication-${medication}`}
                    variant="outline"
                    className="bg-green-50"
                  >
                    {typeof medication === "string"
                      ? medication
                      : JSON.stringify(medication)}
                    <button
                      onClick={() =>
                        removeFromArrayField("currentMedications", medication)
                      }
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add current medication"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const target = e.target as HTMLInputElement;
                    addToArrayField("currentMedications", target.value);
                    target.value = "";
                  }
                }}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Surgical History */}
        <div className="space-y-4">
          <Label className="text-base font-medium flex items-center gap-2">
            <Scissors className="h-4 w-4 text-purple-500" />
            Past Surgical History
          </Label>

          <div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Array.isArray(medicalInfo.pastSurgicalHistory) &&
                medicalInfo.pastSurgicalHistory.map((surgery) => (
                  <Badge
                    key={`surgery-${surgery}`}
                    variant="outline"
                    className="bg-purple-50"
                  >
                    {typeof surgery === "string"
                      ? surgery
                      : JSON.stringify(surgery)}
                    <button
                      onClick={() =>
                        removeFromArrayField("pastSurgicalHistory", surgery)
                      }
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add past surgery (e.g., Appendectomy 2020)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const target = e.target as HTMLInputElement;
                    addToArrayField("pastSurgicalHistory", target.value);
                    target.value = "";
                  }
                }}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Emergency Contact */}
        <div className="space-y-4">
          <Label className="text-base font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            Emergency Contact *
          </Label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="emergencyName">Full Name</Label>
              <Input
                id="emergencyName"
                value={medicalInfo.emergencyContact.name}
                onChange={(e) =>
                  updateMedicalInfo({
                    emergencyContact: {
                      ...medicalInfo.emergencyContact,
                      name: e.target.value,
                    },
                  })
                }
                placeholder="Emergency contact name"
              />
            </div>
            <div>
              <Label htmlFor="emergencyPhone">Phone Number</Label>
              <Input
                id="emergencyPhone"
                value={medicalInfo.emergencyContact.phone}
                onChange={(e) =>
                  updateMedicalInfo({
                    emergencyContact: {
                      ...medicalInfo.emergencyContact,
                      phone: e.target.value,
                    },
                  })
                }
                placeholder="Phone number"
              />
            </div>
            <div>
              <Label htmlFor="emergencyRelationship">Relationship</Label>
              <Input
                id="emergencyRelationship"
                value={medicalInfo.emergencyContact.relationship}
                onChange={(e) =>
                  updateMedicalInfo({
                    emergencyContact: {
                      ...medicalInfo.emergencyContact,
                      relationship: e.target.value,
                    },
                  })
                }
                placeholder="e.g., Spouse, Parent"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Additional Notes */}
        <div className="space-y-4">
          <Label htmlFor="additionalNotes" className="text-base font-medium">
            Additional Medical Notes
          </Label>
          <Textarea
            id="additionalNotes"
            value={medicalInfo.additionalNotes}
            onChange={(e) =>
              updateMedicalInfo({ additionalNotes: e.target.value })
            }
            placeholder="Any additional medical information you'd like healthcare providers to know..."
            rows={3}
          />
        </div>

        {/* Save Button */}
        {hasChanges && (
          <>
            <Separator />
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Medical Information"}
              </Button>
            </div>
          </>
        )}

        {/* Privacy Notice */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">Privacy & Security</p>
              <p className="text-blue-700">
                Your medical information is encrypted and only accessible to
                healthcare providers you explicitly authorize through QR code
                access or direct permission.
              </p>
            </div>
          </div>
        </div>

        {medicalInfo.lastUpdated && (
          <div className="text-xs text-muted-foreground text-center">
            Last updated:{" "}
            {medicalInfo.lastUpdated instanceof Date
              ? medicalInfo.lastUpdated.toLocaleDateString()
              : new Date(medicalInfo.lastUpdated).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MedicalInformation;
