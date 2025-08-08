"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  User,
  FileText,
  Activity,
  Pill,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";

interface PatientInfo {
  digitalIdentifier: string;
  name: string;
  dateOfBirth?: string;
  allergies: string[];
}

interface Diagnosis {
  code: string;
  description: string;
  isChronic: boolean;
  notes: string;
}

interface Prescription {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
}

interface Vitals {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  weight: string;
  height: string;
  oxygenSaturation: string;
}

interface EncounterForm {
  encounterType: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  physicalExamination: string;
  assessmentAndPlan: string;
  vitals: Vitals;
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
}

const ENCOUNTER_TYPES = [
  "Initial Consultation",
  "Follow-up Visit",
  "Annual Physical",
  "Urgent Care",
  "Emergency Visit",
  "Procedure",
  "Lab Review",
  "Medication Management",
  "Specialist Consultation",
];

const COMMON_DIAGNOSES = [
  { code: "Z00.00", description: "General adult medical examination" },
  { code: "I10", description: "Essential hypertension" },
  { code: "E11.9", description: "Type 2 diabetes mellitus" },
  { code: "J06.9", description: "Acute upper respiratory infection" },
  { code: "M79.18", description: "Myalgia, other site" },
  { code: "R50.9", description: "Fever, unspecified" },
  { code: "K59.00", description: "Constipation, unspecified" },
  { code: "R51", description: "Headache" },
  { code: "F41.9", description: "Anxiety disorder, unspecified" },
  { code: "Z51.11", description: "Encounter for antineoplastic chemotherapy" },
];

export default function NewEncounterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();

  const digitalId = params.digitalId as string;
  const grantId = searchParams.get("grantId");

  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<EncounterForm>({
    encounterType: "",
    chiefComplaint: "",
    historyOfPresentIllness: "",
    physicalExamination: "",
    assessmentAndPlan: "",
    vitals: {
      bloodPressure: "",
      heartRate: "",
      temperature: "",
      weight: "",
      height: "",
      oxygenSaturation: "",
    },
    diagnoses: [],
    prescriptions: [],
  });

  useEffect(() => {
    if (!digitalId || !token) return;

    const fetchPatientInfo = async () => {
      try {
        // Fetch basic patient info - this would be a simplified version of medical history
        const response = await fetch(`/api/doctor/patients/${digitalId}/medical-history`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setPatientInfo(result.data.patient);
          }
        }
      } catch (err) {
        console.error("Error fetching patient info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientInfo();
  }, [digitalId, token]);

  const addDiagnosis = () => {
    setForm((prev) => ({
      ...prev,
      diagnoses: [
        ...prev.diagnoses,
        {
          code: "",
          description: "",
          isChronic: false,
          notes: "",
        },
      ],
    }));
  };

  const removeDiagnosis = (index: number) => {
    setForm((prev) => ({
      ...prev,
      diagnoses: prev.diagnoses.filter((_, i) => i !== index),
    }));
  };

  const updateDiagnosis = (index: number, field: keyof Diagnosis, value: any) => {
    setForm((prev) => ({
      ...prev,
      diagnoses: prev.diagnoses.map((diagnosis, i) => (i === index ? { ...diagnosis, [field]: value } : diagnosis)),
    }));
  };

  const selectCommonDiagnosis = (index: number, commonDiagnosis: (typeof COMMON_DIAGNOSES)[0]) => {
    updateDiagnosis(index, "code", commonDiagnosis.code);
    updateDiagnosis(index, "description", commonDiagnosis.description);
  };

  const addPrescription = () => {
    setForm((prev) => ({
      ...prev,
      prescriptions: [
        ...prev.prescriptions,
        {
          medicationName: "",
          dosage: "",
          frequency: "",
          duration: "",
          notes: "",
        },
      ],
    }));
  };

  const removePrescription = (index: number) => {
    setForm((prev) => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index),
    }));
  };

  const updatePrescription = (index: number, field: keyof Prescription, value: string) => {
    setForm((prev) => ({
      ...prev,
      prescriptions: prev.prescriptions.map((prescription, i) =>
        i === index ? { ...prescription, [field]: value } : prescription
      ),
    }));
  };

  const handleSaveEncounter = async () => {
    if (!form.encounterType || !form.chiefComplaint) {
      setError("Please fill in encounter type and chief complaint");
      return;
    }

    if (form.diagnoses.length === 0) {
      setError("Please add at least one diagnosis");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const encounterData = {
        patientDigitalId: digitalId,
        grantId,
        encounter: {
          encounterType: form.encounterType,
          encounterDate: new Date().toISOString(),
          chiefComplaint: form.chiefComplaint,
          historyOfPresentIllness: form.historyOfPresentIllness,
          physicalExamination: form.physicalExamination,
          assessmentAndPlan: form.assessmentAndPlan,
          vitals: Object.fromEntries(Object.entries(form.vitals).filter(([_, value]) => value !== "")),
        },
        diagnoses: form.diagnoses.filter((d) => d.code && d.description),
        prescriptions: form.prescriptions.filter((p) => p.medicationName && p.dosage),
      };

      const response = await fetch("/api/doctor/encounters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(encounterData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/doctor/medical-history/${digitalId}?grantId=${grantId}`);
        }, 2000);
      } else {
        setError(result.error || "Failed to create encounter");
      }
    } catch (err) {
      setError("Failed to save encounter. Please try again.");
      console.error("Error saving encounter:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading patient information...</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">New Encounter</h1>
              <p className="text-gray-600">{patientInfo?.name || `Patient ${digitalId}`}</p>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Encounter saved successfully! Redirecting to medical history...
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Patient Summary */}
        {patientInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Digital ID</p>
                  <p className="font-mono text-sm">{patientInfo.digitalIdentifier}</p>
                </div>
                {patientInfo.dateOfBirth && (
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p>{new Date(patientInfo.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Allergies</p>
                  <div className="flex flex-wrap gap-1">
                    {patientInfo.allergies.length > 0 ? (
                      patientInfo.allergies.map((allergy, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {allergy}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">None known</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Encounter Form */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Basic Encounter Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Encounter Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="encounterType">Encounter Type *</Label>
                <Select
                  value={form.encounterType}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, encounterType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select encounter type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENCOUNTER_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="chiefComplaint">Chief Complaint *</Label>
                <Textarea
                  id="chiefComplaint"
                  value={form.chiefComplaint}
                  onChange={(e) => setForm((prev) => ({ ...prev, chiefComplaint: e.target.value }))}
                  placeholder="Describe the main reason for this visit..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="historyOfPresentIllness">History of Present Illness</Label>
                <Textarea
                  id="historyOfPresentIllness"
                  value={form.historyOfPresentIllness}
                  onChange={(e) => setForm((prev) => ({ ...prev, historyOfPresentIllness: e.target.value }))}
                  placeholder="Detailed history of the current condition..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="physicalExamination">Physical Examination</Label>
                <Textarea
                  id="physicalExamination"
                  value={form.physicalExamination}
                  onChange={(e) => setForm((prev) => ({ ...prev, physicalExamination: e.target.value }))}
                  placeholder="Physical examination findings..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="assessmentAndPlan">Assessment & Plan</Label>
                <Textarea
                  id="assessmentAndPlan"
                  value={form.assessmentAndPlan}
                  onChange={(e) => setForm((prev) => ({ ...prev, assessmentAndPlan: e.target.value }))}
                  placeholder="Clinical assessment and treatment plan..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Vitals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Vital Signs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bloodPressure">Blood Pressure</Label>
                  <Input
                    id="bloodPressure"
                    value={form.vitals.bloodPressure}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        vitals: { ...prev.vitals, bloodPressure: e.target.value },
                      }))
                    }
                    placeholder="120/80"
                  />
                </div>
                <div>
                  <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                  <Input
                    id="heartRate"
                    type="number"
                    value={form.vitals.heartRate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        vitals: { ...prev.vitals, heartRate: e.target.value },
                      }))
                    }
                    placeholder="72"
                  />
                </div>
                <div>
                  <Label htmlFor="temperature">Temperature (°F)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={form.vitals.temperature}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        vitals: { ...prev.vitals, temperature: e.target.value },
                      }))
                    }
                    placeholder="98.6"
                  />
                </div>
                <div>
                  <Label htmlFor="oxygenSaturation">O2 Saturation (%)</Label>
                  <Input
                    id="oxygenSaturation"
                    type="number"
                    value={form.vitals.oxygenSaturation}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        vitals: { ...prev.vitals, oxygenSaturation: e.target.value },
                      }))
                    }
                    placeholder="98"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={form.vitals.weight}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        vitals: { ...prev.vitals, weight: e.target.value },
                      }))
                    }
                    placeholder="150"
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height (inches)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={form.vitals.height}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        vitals: { ...prev.vitals, height: e.target.value },
                      }))
                    }
                    placeholder="68"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Diagnoses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Diagnoses
              </div>
              <Button onClick={addDiagnosis} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Diagnosis
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.diagnoses.map((diagnosis, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Diagnosis {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDiagnosis(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>ICD-10 Code</Label>
                    <Input
                      value={diagnosis.code}
                      onChange={(e) => updateDiagnosis(index, "code", e.target.value)}
                      placeholder="e.g., I10"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={diagnosis.description}
                      onChange={(e) => updateDiagnosis(index, "description", e.target.value)}
                      placeholder="e.g., Essential hypertension"
                    />
                  </div>
                </div>

                <div>
                  <Label>Common Diagnoses (Quick Select)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {COMMON_DIAGNOSES.map((common, commonIndex) => (
                      <Button
                        key={commonIndex}
                        variant="outline"
                        size="sm"
                        onClick={() => selectCommonDiagnosis(index, common)}
                        className="text-xs"
                      >
                        {common.code} - {common.description}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`chronic-${index}`}
                    checked={diagnosis.isChronic}
                    onChange={(e) => updateDiagnosis(index, "isChronic", e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor={`chronic-${index}`}>Chronic condition</Label>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={diagnosis.notes}
                    onChange={(e) => updateDiagnosis(index, "notes", e.target.value)}
                    placeholder="Additional notes about this diagnosis..."
                    rows={2}
                  />
                </div>
              </div>
            ))}

            {form.diagnoses.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No diagnoses added yet</p>
                <p className="text-sm">Click "Add Diagnosis" to add the first diagnosis</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prescriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Prescriptions
              </div>
              <Button onClick={addPrescription} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Prescription
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.prescriptions.map((prescription, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Prescription {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePrescription(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Medication Name *</Label>
                    <Input
                      value={prescription.medicationName}
                      onChange={(e) => updatePrescription(index, "medicationName", e.target.value)}
                      placeholder="e.g., Lisinopril"
                    />
                  </div>
                  <div>
                    <Label>Dosage *</Label>
                    <Input
                      value={prescription.dosage}
                      onChange={(e) => updatePrescription(index, "dosage", e.target.value)}
                      placeholder="e.g., 10mg"
                    />
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Select
                      value={prescription.frequency}
                      onValueChange={(value) => updatePrescription(index, "frequency", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Once daily">Once daily</SelectItem>
                        <SelectItem value="Twice daily">Twice daily</SelectItem>
                        <SelectItem value="Three times daily">Three times daily</SelectItem>
                        <SelectItem value="Four times daily">Four times daily</SelectItem>
                        <SelectItem value="Every 4 hours">Every 4 hours</SelectItem>
                        <SelectItem value="Every 6 hours">Every 6 hours</SelectItem>
                        <SelectItem value="Every 8 hours">Every 8 hours</SelectItem>
                        <SelectItem value="As needed">As needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <Input
                      value={prescription.duration}
                      onChange={(e) => updatePrescription(index, "duration", e.target.value)}
                      placeholder="e.g., 30 days"
                    />
                  </div>
                </div>

                <div>
                  <Label>Instructions/Notes</Label>
                  <Textarea
                    value={prescription.notes}
                    onChange={(e) => updatePrescription(index, "notes", e.target.value)}
                    placeholder="Special instructions, warnings, or notes..."
                    rows={2}
                  />
                </div>
              </div>
            ))}

            {form.prescriptions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No prescriptions added yet</p>
                <p className="text-sm">Click "Add Prescription" to add the first prescription</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Cancel
          </Button>
          <Button onClick={handleSaveEncounter} disabled={saving || success} className="min-w-32">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Encounter
              </>
            )}
          </Button>
        </div>
      </div>
    </ProtectedLayout>
  );
}
