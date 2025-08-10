"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Pill,
  Activity,
  AlertTriangle,
  Heart,
  User,
  Building,
  Stethoscope,
  Plus,
  Eye,
  History,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import DoctorClinicalAssistant from "@/components/ai/DoctorClinicalAssistant";
import Link from "next/link";

interface PatientSummary {
  digitalIdentifier: string;
  userId: string; // Add the actual user ID
  name: string;
  dateOfBirth?: string;
  bloodType?: string;
  allergies: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

interface MedicalEncounter {
  id: string;
  date: string;
  type: string;
  chiefComplaint: string;
  organization: string;
  attendingPhysician: string;
  specialty?: string;
  diagnoses: Array<{
    code: string;
    description: string;
    isChronic: boolean;
    notes?: string;
  }>;
  prescriptions: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    status: string;
  }>;
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
  };
}

interface CurrentMedication {
  medicationName: string;
  dosage: string;
  frequency: string;
  status: string;
  prescribedAt: string;
  prescribedBy: string;
}

interface ChronicCondition {
  code: string;
  description: string;
  diagnosedAt: string;
  notes?: string;
}

interface MedicalHistoryData {
  patient: PatientSummary;
  medicalHistory: MedicalEncounter[];
  currentMedications: CurrentMedication[];
  chronicConditions: ChronicCondition[];
  summary: {
    totalEncounters: number;
    lastVisit?: string;
    activeGrant: {
      id: string;
      expiresAt: string;
      accessScope: any;
    };
  };
}

export default function MedicalHistoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();

  const digitalId = params.digitalId as string;
  const grantId = searchParams.get("grantId");

  const [medicalData, setMedicalData] = useState<MedicalHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!digitalId || !token) return;

    const fetchMedicalHistory = async () => {
      try {
        const response = await fetch(`/api/doctor/patients/${digitalId}/medical-history`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch medical history");
        }

        const result = await response.json();
        if (result.success) {
          setMedicalData(result.data);
        } else {
          throw new Error(result.error || "Failed to load medical history");
        }
      } catch (err) {
        console.error("Error fetching medical history:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchMedicalHistory();
  }, [digitalId, token]);

  const getStatusBadge = (status: string) => {
    const statusColors = {
      ISSUED: "bg-blue-100 text-blue-800",
      FILLED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
      EXPIRED: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading patient medical history...</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  if (error) {
    return (
      <ProtectedLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Medical History</h1>
          </div>

          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        </div>
      </ProtectedLayout>
    );
  }

  if (!medicalData) {
    return (
      <ProtectedLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">No medical history data available</p>
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
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Medical History</h1>
              <p className="text-gray-600">{medicalData.patient.name}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href={`/doctor/encounter/new/${digitalId}?grantId=${grantId}`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Encounter
              </Button>
            </Link>
          </div>
        </div>

        {/* Patient Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Digital ID</p>
                <p className="font-mono text-sm">{medicalData.patient.digitalIdentifier}</p>
              </div>
              {medicalData.patient.dateOfBirth && (
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p>{formatDate(medicalData.patient.dateOfBirth)}</p>
                </div>
              )}
              {medicalData.patient.bloodType && (
                <div>
                  <p className="text-sm text-gray-500">Blood Type</p>
                  <p className="font-semibold text-red-600">{medicalData.patient.bloodType}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Total Encounters</p>
                <p className="font-semibold">{medicalData.summary.totalEncounters}</p>
              </div>
            </div>

            {/* Allergies */}
            {medicalData.patient.allergies.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Known Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {medicalData.patient.allergies.map((allergy, index) => (
                    <Badge key={index} variant="destructive" className="bg-red-100 text-red-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Authorization Info */}
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-medium">Active Authorization</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Grant expires: {formatDateTime(medicalData.summary.activeGrant.expiresAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="encounters" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Encounters
            </TabsTrigger>
            <TabsTrigger value="medications" className="flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Medications
            </TabsTrigger>
            <TabsTrigger value="conditions" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Conditions
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Medications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Current Medications ({medicalData.currentMedications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {medicalData.currentMedications.length > 0 ? (
                    <div className="space-y-3">
                      {medicalData.currentMedications.slice(0, 5).map((med, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{med.medicationName}</h4>
                            {getStatusBadge(med.status)}
                          </div>
                          <p className="text-sm text-gray-600">
                            {med.dosage} - {med.frequency}
                          </p>
                          <p className="text-xs text-gray-500">Prescribed: {formatDate(med.prescribedAt)}</p>
                        </div>
                      ))}
                      {medicalData.currentMedications.length > 5 && (
                        <p className="text-sm text-gray-500 text-center">
                          +{medicalData.currentMedications.length - 5} more medications
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No current medications</p>
                  )}
                </CardContent>
              </Card>

              {/* Chronic Conditions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Chronic Conditions ({medicalData.chronicConditions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {medicalData.chronicConditions.length > 0 ? (
                    <div className="space-y-3">
                      {medicalData.chronicConditions.map((condition, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{condition.description}</h4>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{condition.code}</code>
                          </div>
                          <p className="text-sm text-gray-600">Diagnosed: {formatDate(condition.diagnosedAt)}</p>
                          {condition.notes && <p className="text-sm text-gray-500 mt-1">{condition.notes}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No chronic conditions</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Encounters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Encounters
                </CardTitle>
              </CardHeader>
              <CardContent>
                {medicalData.medicalHistory.length > 0 ? (
                  <div className="space-y-4">
                    {medicalData.medicalHistory.slice(0, 3).map((encounter) => (
                      <div key={encounter.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{formatDate(encounter.date)}</span>
                            <Badge variant="outline">{encounter.type}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{encounter.organization}</span>
                          </div>
                        </div>
                        <p className="text-gray-700 mb-2">{encounter.chiefComplaint}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Stethoscope className="h-3 w-3" />
                            {encounter.attendingPhysician}
                          </div>
                          {encounter.specialty && <span>• {encounter.specialty}</span>}
                          <span>• {encounter.diagnoses.length} diagnoses</span>
                          <span>• {encounter.prescriptions.length} prescriptions</span>
                        </div>
                      </div>
                    ))}
                    {medicalData.medicalHistory.length > 3 && (
                      <div className="text-center">
                        <Button variant="outline" onClick={() => setActiveTab("encounters")}>
                          View All {medicalData.medicalHistory.length} Encounters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No medical encounters on record</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Encounters Tab */}
          <TabsContent value="encounters" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Medical Encounters ({medicalData.medicalHistory.length})</CardTitle>
                <CardDescription>Complete encounter history with details</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {medicalData.medicalHistory.map((encounter) => (
                      <div key={encounter.id} className="border rounded-lg p-4 space-y-3">
                        {/* Encounter Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{formatDate(encounter.date)}</span>
                            <Badge variant="outline">{encounter.type}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Building className="h-4 w-4" />
                            {encounter.organization}
                          </div>
                        </div>

                        {/* Chief Complaint */}
                        <div>
                          <p className="font-medium text-gray-900">{encounter.chiefComplaint}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <Stethoscope className="h-3 w-3" />
                            {encounter.attendingPhysician}
                            {encounter.specialty && <span>• {encounter.specialty}</span>}
                          </div>
                        </div>

                        {/* Vitals */}
                        {encounter.vitals && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <h5 className="font-medium text-sm mb-2">Vitals</h5>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                              {encounter.vitals.bloodPressure && (
                                <div>
                                  <span className="text-gray-500">BP:</span> {encounter.vitals.bloodPressure}
                                </div>
                              )}
                              {encounter.vitals.heartRate && (
                                <div>
                                  <span className="text-gray-500">HR:</span> {encounter.vitals.heartRate} bpm
                                </div>
                              )}
                              {encounter.vitals.temperature && (
                                <div>
                                  <span className="text-gray-500">Temp:</span> {encounter.vitals.temperature}°F
                                </div>
                              )}
                              {encounter.vitals.weight && (
                                <div>
                                  <span className="text-gray-500">Weight:</span> {encounter.vitals.weight} lbs
                                </div>
                              )}
                              {encounter.vitals.height && (
                                <div>
                                  <span className="text-gray-500">Height:</span> {encounter.vitals.height}"
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Diagnoses */}
                        {encounter.diagnoses.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2">Diagnoses</h5>
                            <div className="space-y-2">
                              {encounter.diagnoses.map((diagnosis, index) => (
                                <div key={index} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                                  <div>
                                    <span className="font-medium">{diagnosis.description}</span>
                                    {diagnosis.isChronic && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        Chronic
                                      </Badge>
                                    )}
                                  </div>
                                  <code className="text-xs bg-white px-2 py-1 rounded">{diagnosis.code}</code>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Prescriptions */}
                        {encounter.prescriptions.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2">Prescriptions</h5>
                            <div className="space-y-2">
                              {encounter.prescriptions.map((prescription, index) => (
                                <div key={index} className="flex items-center justify-between bg-green-50 p-2 rounded">
                                  <div>
                                    <span className="font-medium">{prescription.medication}</span>
                                    <span className="text-sm text-gray-600 ml-2">
                                      {prescription.dosage} - {prescription.frequency}
                                    </span>
                                  </div>
                                  {getStatusBadge(prescription.status)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medications Tab */}
          <TabsContent value="medications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Medications ({medicalData.currentMedications.length})</CardTitle>
                <CardDescription>Current and recent prescriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {medicalData.currentMedications.map((med, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">{med.medicationName}</h4>
                        {getStatusBadge(med.status)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Dosage:</span>
                          <p className="font-medium">{med.dosage}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Frequency:</span>
                          <p className="font-medium">{med.frequency}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Prescribed:</span>
                          <p className="font-medium">{formatDate(med.prescribedAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conditions Tab */}
          <TabsContent value="conditions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Medical Conditions ({medicalData.chronicConditions.length})</CardTitle>
                <CardDescription>Chronic and ongoing medical conditions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {medicalData.chronicConditions.map((condition, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">{condition.description}</h4>
                        <code className="text-sm bg-gray-100 px-3 py-1 rounded">{condition.code}</code>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Diagnosed:</span> {formatDate(condition.diagnosedAt)}
                        </p>
                        {condition.notes && (
                          <p className="mt-2">
                            <span className="font-medium">Notes:</span> {condition.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {medicalData.chronicConditions.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No chronic conditions on record</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Clinical AI Assistant */}
        <DoctorClinicalAssistant patientId={medicalData.patient.userId} patientName={medicalData.patient.name} />
      </div>
    </ProtectedLayout>
  );
}
