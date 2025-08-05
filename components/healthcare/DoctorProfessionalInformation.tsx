"use client";

import React, { useState, useEffect } from "react";
import { Stethoscope, Award, Plus, X, Save, AlertCircle, CheckCircle, User, BadgeCheck, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ProfessionalInformation {
  licenseNumber: string;
  specialty: string;
  practitionerType: "doctor" | "nurse" | "pharmacist" | "technician" | "admin" | "other";
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

interface DoctorProfessionalInformationProps {
  userId: string;
}

const SPECIALTIES = [
  "Internal Medicine",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Surgery",
  "Emergency Medicine",
  "Family Medicine",
  "Psychiatry",
  "Radiology",
  "Anesthesiology",
  "Oncology",
  "Dermatology",
  "Ophthalmology",
  "ENT",
  "Gynecology",
  "Urology",
  "Endocrinology",
  "Gastroenterology",
  "Pulmonology",
  "Other",
];

const PRACTITIONER_TYPES = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "technician", label: "Medical Technician" },
  { value: "admin", label: "Healthcare Administrator" },
  { value: "other", label: "Other" },
];

export function DoctorProfessionalInformation({ userId }: Readonly<DoctorProfessionalInformationProps>) {
  const { user, token, logout, refreshAuthToken } = useAuth();
  const { toast } = useToast();

  const [professionalInfo, setProfessionalInfo] = useState<ProfessionalInformation>({
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
  const [newSpecialization, setNewSpecialization] = useState("");
  const [newLanguage, setNewLanguage] = useState("");
  const [newCertification, setNewCertification] = useState({
    name: "",
    issuingBody: "",
    issueDate: "",
    expiryDate: "",
  });
  const [showCertificationForm, setShowCertificationForm] = useState(false);

  useEffect(() => {
    fetchProfessionalInfo();
  }, [userId]);

  const fetchProfessionalInfo = async () => {
    try {
      setLoading(true);

      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch("/api/doctor/professional-info", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token
          await refreshAuthToken();
          return fetchProfessionalInfo(); // Retry after refresh
        }
        throw new Error("Failed to fetch professional information");
      }

      const result: { success: boolean; data: ProfessionalInfoResponse } = await response.json();

      if (result.success && result.data.practitioner) {
        setProfessionalInfo(result.data.practitioner.professionalInfo);
        setIsComplete(result.data.isComplete);
      } else {
        setIsComplete(false);
      }
    } catch (error) {
      console.error("Error fetching professional info:", error);
      if (error instanceof Error && error.message.includes("No authentication token")) {
        logout();
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load professional information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch("/api/doctor/professional-info", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(professionalInfo),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token
          await refreshAuthToken();
          return handleSave(); // Retry after refresh
        }
        throw new Error("Failed to save professional information");
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Professional information saved successfully",
        });
        setIsComplete(true);
        await fetchProfessionalInfo(); // Refresh data
      } else {
        throw new Error(result.error || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving professional info:", error);
      if (error instanceof Error && error.message.includes("No authentication token")) {
        logout();
        return;
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save professional information",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !professionalInfo.metadata?.specializations?.includes(newSpecialization.trim())) {
      setProfessionalInfo((prev) => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          specializations: [...(prev.metadata?.specializations || []), newSpecialization.trim()],
        },
      }));
      setNewSpecialization("");
    }
  };

  const removeSpecialization = (index: number) => {
    setProfessionalInfo((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        specializations: prev.metadata?.specializations?.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !professionalInfo.metadata?.languages?.includes(newLanguage.trim())) {
      setProfessionalInfo((prev) => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          languages: [...(prev.metadata?.languages || []), newLanguage.trim()],
        },
      }));
      setNewLanguage("");
    }
  };

  const removeLanguage = (index: number) => {
    setProfessionalInfo((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        languages: prev.metadata?.languages?.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const addCertification = () => {
    if (newCertification.name && newCertification.issuingBody && newCertification.issueDate) {
      const certification = {
        ...newCertification,
        verificationStatus: "pending" as const,
      };

      setProfessionalInfo((prev) => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          certifications: [...(prev.metadata?.certifications || []), certification],
        },
      }));

      setNewCertification({ name: "", issuingBody: "", issueDate: "", expiryDate: "" });
      setShowCertificationForm(false);
    }
  };

  const removeCertification = (index: number) => {
    setProfessionalInfo((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        certifications: prev.metadata?.certifications?.filter((_, i) => i !== index) || [],
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading professional information...</p>
        </div>
      </div>
    );
  }

  const requiredFieldsComplete = !!(
    professionalInfo.licenseNumber &&
    professionalInfo.specialty &&
    professionalInfo.practitionerType &&
    professionalInfo.yearsOfExperience !== undefined
  );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card
        className={`border-l-4 ${isComplete ? "border-l-green-500 bg-green-50" : "border-l-orange-500 bg-orange-50"}`}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`rounded-full p-3 ${isComplete ? "bg-green-100" : "bg-orange-100"}`}>
              {isComplete ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-orange-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {isComplete ? "Professional Profile Complete" : "Complete Your Professional Profile"}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {isComplete
                  ? "Your professional information is complete and verified."
                  : "Complete your professional information to access all healthcare provider features."}
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving || !requiredFieldsComplete}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Professional Information
          </CardTitle>
          <CardDescription>Your professional credentials and practice information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">Medical License Number *</Label>
              <Input
                id="licenseNumber"
                value={professionalInfo.licenseNumber}
                onChange={(e) => setProfessionalInfo((prev) => ({ ...prev, licenseNumber: e.target.value }))}
                placeholder="Enter your medical license number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty">Medical Specialty *</Label>
              <Select
                value={professionalInfo.specialty}
                onValueChange={(value) => setProfessionalInfo((prev) => ({ ...prev, specialty: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="practitionerType">Practitioner Type *</Label>
              <Select
                value={professionalInfo.practitionerType}
                onValueChange={(value) => setProfessionalInfo((prev) => ({ ...prev, practitionerType: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select practitioner type" />
                </SelectTrigger>
                <SelectContent>
                  {PRACTITIONER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                min="0"
                max="70"
                value={professionalInfo.yearsOfExperience}
                onChange={(e) =>
                  setProfessionalInfo((prev) => ({ ...prev, yearsOfExperience: parseInt(e.target.value) || 0 }))
                }
                placeholder="Years of professional experience"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentPosition">Current Position</Label>
              <Input
                id="currentPosition"
                value={professionalInfo.currentPosition || ""}
                onChange={(e) => setProfessionalInfo((prev) => ({ ...prev, currentPosition: e.target.value }))}
                placeholder="e.g., Senior Consultant, Chief of Medicine"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={professionalInfo.department || ""}
                onChange={(e) => setProfessionalInfo((prev) => ({ ...prev, department: e.target.value }))}
                placeholder="e.g., Cardiology, Emergency Medicine"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Specializations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Additional Specializations
          </CardTitle>
          <CardDescription>Any additional areas of expertise or sub-specializations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {professionalInfo.metadata?.specializations?.map((spec, index) => (
              <Badge key={`spec-${spec}-${index}`} variant="secondary" className="flex items-center gap-1">
                {spec}
                <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => removeSpecialization(index)} />
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newSpecialization}
              onChange={(e) => setNewSpecialization(e.target.value)}
              placeholder="Add a specialization"
              onKeyDown={(e) => e.key === "Enter" && addSpecialization()}
            />
            <Button onClick={addSpecialization} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Languages Spoken
          </CardTitle>
          <CardDescription>Languages you can communicate with patients in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {professionalInfo.metadata?.languages?.map((lang, index) => (
              <Badge key={`lang-${lang}-${index}`} variant="outline" className="flex items-center gap-1">
                {lang}
                <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => removeLanguage(index)} />
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              placeholder="Add a language"
              onKeyDown={(e) => e.key === "Enter" && addLanguage()}
            />
            <Button onClick={addLanguage} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5" />
            Professional Certifications
          </CardTitle>
          <CardDescription>Board certifications, additional qualifications, and training</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {professionalInfo.metadata?.certifications?.map((cert, index) => (
              <div
                key={`cert-${cert.name}-${index}`}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{cert.name}</div>
                  <div className="text-sm text-gray-600">{cert.issuingBody}</div>
                  <div className="text-xs text-gray-500">
                    Issued: {new Date(cert.issueDate).toLocaleDateString()}
                    {cert.expiryDate && ` • Expires: ${new Date(cert.expiryDate).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={cert.verificationStatus === "verified" ? "default" : "secondary"}>
                    {cert.verificationStatus}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => removeCertification(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {!showCertificationForm ? (
            <Button variant="outline" onClick={() => setShowCertificationForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Certification
            </Button>
          ) : (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Certification Name</Label>
                  <Input
                    value={newCertification.name}
                    onChange={(e) => setNewCertification((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Board Certified in Internal Medicine"
                  />
                </div>
                <div>
                  <Label>Issuing Body</Label>
                  <Input
                    value={newCertification.issuingBody}
                    onChange={(e) => setNewCertification((prev) => ({ ...prev, issuingBody: e.target.value }))}
                    placeholder="e.g., American Board of Internal Medicine"
                  />
                </div>
                <div>
                  <Label>Issue Date</Label>
                  <Input
                    type="date"
                    value={newCertification.issueDate}
                    onChange={(e) => setNewCertification((prev) => ({ ...prev, issueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Expiry Date (Optional)</Label>
                  <Input
                    type="date"
                    value={newCertification.expiryDate}
                    onChange={(e) => setNewCertification((prev) => ({ ...prev, expiryDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addCertification} size="sm">
                  Add Certification
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCertificationForm(false);
                    setNewCertification({ name: "", issuingBody: "", issueDate: "", expiryDate: "" });
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Emergency Contact
          </CardTitle>
          <CardDescription>Emergency contact information for professional purposes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Contact Name</Label>
              <Input
                value={professionalInfo.metadata?.emergencyContact?.name || ""}
                onChange={(e) =>
                  setProfessionalInfo((prev) => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      emergencyContact: {
                        ...prev.metadata?.emergencyContact,
                        name: e.target.value,
                        relationship: prev.metadata?.emergencyContact?.relationship || "",
                        phone: prev.metadata?.emergencyContact?.phone || "",
                        email: prev.metadata?.emergencyContact?.email || "",
                      },
                    },
                  }))
                }
                placeholder="Emergency contact name"
              />
            </div>
            <div>
              <Label>Relationship</Label>
              <Input
                value={professionalInfo.metadata?.emergencyContact?.relationship || ""}
                onChange={(e) =>
                  setProfessionalInfo((prev) => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      emergencyContact: {
                        ...prev.metadata?.emergencyContact,
                        name: prev.metadata?.emergencyContact?.name || "",
                        relationship: e.target.value,
                        phone: prev.metadata?.emergencyContact?.phone || "",
                        email: prev.metadata?.emergencyContact?.email || "",
                      },
                    },
                  }))
                }
                placeholder="e.g., Spouse, Parent, Colleague"
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                value={professionalInfo.metadata?.emergencyContact?.phone || ""}
                onChange={(e) =>
                  setProfessionalInfo((prev) => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      emergencyContact: {
                        ...prev.metadata?.emergencyContact,
                        name: prev.metadata?.emergencyContact?.name || "",
                        relationship: prev.metadata?.emergencyContact?.relationship || "",
                        phone: e.target.value,
                        email: prev.metadata?.emergencyContact?.email || "",
                      },
                    },
                  }))
                }
                placeholder="Emergency contact phone"
              />
            </div>
            <div>
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={professionalInfo.metadata?.emergencyContact?.email || ""}
                onChange={(e) =>
                  setProfessionalInfo((prev) => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      emergencyContact: {
                        ...prev.metadata?.emergencyContact,
                        name: prev.metadata?.emergencyContact?.name || "",
                        relationship: prev.metadata?.emergencyContact?.relationship || "",
                        phone: prev.metadata?.emergencyContact?.phone || "",
                        email: e.target.value,
                      },
                    },
                  }))
                }
                placeholder="Emergency contact email"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !requiredFieldsComplete} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Professional Profile"}
        </Button>
      </div>
    </div>
  );
}
