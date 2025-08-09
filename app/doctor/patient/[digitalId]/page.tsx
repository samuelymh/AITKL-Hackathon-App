"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Calendar,
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
  Clock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import Link from "next/link";

interface PatientSummary {
  digitalIdentifier: string;
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

export default function PatientRecordPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();

  const digitalId = params.digitalId as string;
  const grantId = searchParams.get("grantId");

  const [medicalData, setMedicalData] = useState<MedicalHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          throw new Error(errorData.error || "Failed to fetch patient record");
        }

        const result = await response.json();
        if (result.success) {
          setMedicalData(result.data);
        } else {
          throw new Error(result.error || "Failed to load patient record");
        }
      } catch (err) {
        console.error("Error fetching patient record:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchMedicalHistory();
  }, [digitalId, token]);

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
            <p className="text-gray-600">Loading patient record...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Patient Record</h1>
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
          <p className="text-gray-600">No patient record data available</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Patient Record</h1>
              <p className="text-gray-600">{medicalData.patient.name}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href={`/doctor/medical-history/${digitalId}?grantId=${grantId}`}>
              <Button variant="outline">
                <History className="h-4 w-4 mr-2" />
                Full Medical History
              </Button>
            </Link>
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
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Digital ID</p>
                <p className="font-mono text-sm">{medicalData.patient.digitalIdentifier}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Patient Name</p>
                <p className="font-semibold">{medicalData.patient.name}</p>
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

            {/* Emergency Contact */}
            {medicalData.patient.emergencyContact && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-1">Emergency Contact</p>
                <div className="text-sm text-blue-700">
                  <p>
                    <strong>{medicalData.patient.emergencyContact.name}</strong> (
                    {medicalData.patient.emergencyContact.relationship})
                  </p>
                  <p>{medicalData.patient.emergencyContact.phone}</p>
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

        {/* Quick Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Encounters</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{medicalData.summary.totalEncounters}</div>
              {medicalData.summary.lastVisit && (
                <p className="text-xs text-muted-foreground">Last visit: {formatDate(medicalData.summary.lastVisit)}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Medications</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{medicalData.currentMedications.length}</div>
              <p className="text-xs text-muted-foreground">Active prescriptions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chronic Conditions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{medicalData.chronicConditions.length}</div>
              <p className="text-xs text-muted-foreground">Ongoing conditions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Known Allergies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{medicalData.patient.allergies.length}</div>
              <p className="text-xs text-muted-foreground">Drug/environmental</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Encounters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Encounters
              </CardTitle>
              <CardDescription>Latest medical visits</CardDescription>
            </CardHeader>
            <CardContent>
              {medicalData.medicalHistory.length > 0 ? (
                <div className="space-y-3">
                  {medicalData.medicalHistory.slice(0, 3).map((encounter) => (
                    <div key={encounter.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-sm">{formatDate(encounter.date)}</span>
                          <Badge variant="outline" className="text-xs">
                            {encounter.type}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{encounter.chiefComplaint}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Building className="h-3 w-3" />
                        <span>{encounter.organization}</span>
                        <span>•</span>
                        <span>{encounter.attendingPhysician}</span>
                      </div>
                    </div>
                  ))}
                  <div className="text-center pt-2">
                    <Link href={`/doctor/medical-history/${digitalId}?grantId=${grantId}`}>
                      <Button variant="outline" size="sm">
                        View All Encounters
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No encounters on record</p>
              )}
            </CardContent>
          </Card>

          {/* Current Medications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Current Medications
              </CardTitle>
              <CardDescription>Active prescriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {medicalData.currentMedications.length > 0 ? (
                <div className="space-y-3">
                  {medicalData.currentMedications.slice(0, 4).map((med, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{med.medicationName}</h4>
                        <Badge
                          className={
                            med.status === "ISSUED"
                              ? "bg-blue-100 text-blue-800"
                              : med.status === "FILLED"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                          }
                        >
                          {med.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        {med.dosage} - {med.frequency}
                      </p>
                      <p className="text-xs text-gray-500">Prescribed: {formatDate(med.prescribedAt)}</p>
                    </div>
                  ))}
                  {medicalData.currentMedications.length > 4 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{medicalData.currentMedications.length - 4} more medications
                    </p>
                  )}
                  <div className="text-center pt-2">
                    <Link href={`/doctor/medical-history/${digitalId}?grantId=${grantId}#medications`}>
                      <Button variant="outline" size="sm">
                        View All Medications
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No current medications</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chronic Conditions Summary */}
        {medicalData.chronicConditions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Chronic Conditions
              </CardTitle>
              <CardDescription>Long-term medical conditions requiring ongoing care</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {medicalData.chronicConditions.map((condition, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{condition.description}</h4>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{condition.code}</code>
                    </div>
                    <p className="text-xs text-gray-600">Diagnosed: {formatDate(condition.diagnosedAt)}</p>
                    {condition.notes && <p className="text-xs text-gray-500 mt-1">{condition.notes}</p>}
                  </div>
                ))}
              </div>
              <div className="text-center pt-4">
                <Link href={`/doctor/medical-history/${digitalId}?grantId=${grantId}#conditions`}>
                  <Button variant="outline" size="sm">
                    View Detailed History
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  );
}
