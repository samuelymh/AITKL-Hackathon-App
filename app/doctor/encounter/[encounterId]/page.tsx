"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Edit,
  Calendar,
  User,
  Building,
  Stethoscope,
  Activity,
  FileText,
  Pill,
  QrCode,
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { PrescriptionQRGenerator } from "@/components/healthcare/PrescriptionQRGenerator";

interface EncounterDetails {
  id: string;
  encounter: {
    encounterDate: string;
    encounterType: string;
    chiefComplaint: string;
    historyOfPresentIllness?: string;
    physicalExamination?: string;
    assessmentAndPlan?: string;
    vitals?: {
      bloodPressure?: string;
      heartRate?: number;
      temperature?: number;
      weight?: number;
      height?: number;
      oxygenSaturation?: number;
    };
  };
  patient: {
    name: string;
    digitalIdentifier: string;
    dateOfBirth?: string;
    allergies: string[];
  };
  organization: {
    name: string;
    type: string;
  };
  attendingPractitioner: {
    name: string;
    specialty?: string;
    licenseNumber?: string;
  };
  diagnoses: Array<{
    code: string;
    description: string;
    isChronic: boolean;
    notes?: string;
    diagnosedAt: string;
  }>;
  prescriptions: Array<{
    id: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    duration?: string;
    notes?: string;
    status: string;
    issuedAt: string;
    qrCode?: string;
  }>;
  auditInfo: {
    createdAt: string;
    createdBy: string;
    modifiedAt?: string;
    modifiedBy?: string;
  };
}

export default function EncounterDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();

  const encounterId = params.encounterId as string;
  const grantId = searchParams.get("grantId");

  const [encounter, setEncounter] = useState<EncounterDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPrescriptionForQR, setSelectedPrescriptionForQR] = useState<number | null>(null);

  useEffect(() => {
    if (!encounterId || !token) return;

    const fetchEncounter = async () => {
      try {
        const response = await fetch(`/api/doctor/encounters/${encounterId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch encounter details");
        }

        const result = await response.json();
        if (result.success) {
          setEncounter(result.data);
        } else {
          throw new Error(result.error || "Failed to load encounter details");
        }
      } catch (err) {
        console.error("Error fetching encounter:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchEncounter();
  }, [encounterId, token]);

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

  const generatePrescriptionQR = async (prescriptionIndex: number) => {
    setSelectedPrescriptionForQR(prescriptionIndex);
  };

  const downloadEncounterSummary = () => {
    // This would generate and download a PDF summary
    console.log("Downloading encounter summary");
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading encounter details...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Encounter Details</h1>
          </div>

          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        </div>
      </ProtectedLayout>
    );
  }

  if (!encounter) {
    return (
      <ProtectedLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">No encounter data available</p>
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
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Encounter Details</h1>
              <p className="text-gray-600">
                {encounter.patient.name} • {formatDate(encounter.encounter.encounterDate)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadEncounterSummary}>
              <Download className="h-4 w-4 mr-2" />
              Download Summary
            </Button>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Encounter
            </Button>
          </div>
        </div>

        {/* Encounter Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Encounter Overview
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{encounter.encounter.encounterType}</Badge>
                <span className="text-sm text-gray-500">ID: {encounter.id}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDateTime(encounter.encounter.encounterDate)}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Patient</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{encounter.patient.name}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Organization</p>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span>{encounter.organization.name}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Attending Physician</p>
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-gray-400" />
                  <span>{encounter.attendingPractitioner.name}</span>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Chief Complaint */}
            <div>
              <h4 className="font-medium mb-2">Chief Complaint</h4>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{encounter.encounter.chiefComplaint}</p>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="vitals" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Vitals
            </TabsTrigger>
            <TabsTrigger value="diagnoses" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Diagnoses
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Prescriptions
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Audit
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>History of Present Illness</CardTitle>
                </CardHeader>
                <CardContent>
                  {encounter.encounter.historyOfPresentIllness ? (
                    <p className="text-gray-700">{encounter.encounter.historyOfPresentIllness}</p>
                  ) : (
                    <p className="text-gray-500 italic">No history recorded</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Physical Examination</CardTitle>
                </CardHeader>
                <CardContent>
                  {encounter.encounter.physicalExamination ? (
                    <p className="text-gray-700">{encounter.encounter.physicalExamination}</p>
                  ) : (
                    <p className="text-gray-500 italic">No examination notes recorded</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Assessment & Plan</CardTitle>
              </CardHeader>
              <CardContent>
                {encounter.encounter.assessmentAndPlan ? (
                  <p className="text-gray-700">{encounter.encounter.assessmentAndPlan}</p>
                ) : (
                  <p className="text-gray-500 italic">No assessment and plan recorded</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vitals Tab */}
          <TabsContent value="vitals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Vital Signs
                </CardTitle>
                <CardDescription>Recorded during this encounter</CardDescription>
              </CardHeader>
              <CardContent>
                {encounter.encounter.vitals ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {encounter.encounter.vitals.bloodPressure && (
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-sm text-red-600 font-medium">Blood Pressure</p>
                        <p className="text-lg font-bold text-red-700">{encounter.encounter.vitals.bloodPressure}</p>
                        <p className="text-xs text-red-500">mmHg</p>
                      </div>
                    )}
                    {encounter.encounter.vitals.heartRate && (
                      <div className="bg-pink-50 p-3 rounded-lg">
                        <p className="text-sm text-pink-600 font-medium">Heart Rate</p>
                        <p className="text-lg font-bold text-pink-700">{encounter.encounter.vitals.heartRate}</p>
                        <p className="text-xs text-pink-500">bpm</p>
                      </div>
                    )}
                    {encounter.encounter.vitals.temperature && (
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-sm text-orange-600 font-medium">Temperature</p>
                        <p className="text-lg font-bold text-orange-700">{encounter.encounter.vitals.temperature}</p>
                        <p className="text-xs text-orange-500">°F</p>
                      </div>
                    )}
                    {encounter.encounter.vitals.oxygenSaturation && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">O2 Saturation</p>
                        <p className="text-lg font-bold text-blue-700">{encounter.encounter.vitals.oxygenSaturation}</p>
                        <p className="text-xs text-blue-500">%</p>
                      </div>
                    )}
                    {encounter.encounter.vitals.weight && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Weight</p>
                        <p className="text-lg font-bold text-green-700">{encounter.encounter.vitals.weight}</p>
                        <p className="text-xs text-green-500">lbs</p>
                      </div>
                    )}
                    {encounter.encounter.vitals.height && (
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">Height</p>
                        <p className="text-lg font-bold text-purple-700">{encounter.encounter.vitals.height}</p>
                        <p className="text-xs text-purple-500">inches</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No vital signs recorded for this encounter</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diagnoses Tab */}
          <TabsContent value="diagnoses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Diagnoses ({encounter.diagnoses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {encounter.diagnoses.length > 0 ? (
                  <div className="space-y-4">
                    {encounter.diagnoses.map((diagnosis, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-lg">{diagnosis.description}</h4>
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">{diagnosis.code}</code>
                            {diagnosis.isChronic && (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                Chronic
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>
                            <span className="font-medium">Diagnosed:</span> {formatDateTime(diagnosis.diagnosedAt)}
                          </p>
                          {diagnosis.notes && (
                            <p className="mt-2">
                              <span className="font-medium">Notes:</span> {diagnosis.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No diagnoses recorded for this encounter</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Prescriptions ({encounter.prescriptions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {encounter.prescriptions.length > 0 ? (
                  <div className="space-y-4">
                    {encounter.prescriptions.map((prescription, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-lg">{prescription.medicationName}</h4>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(prescription.status)}
                            <Button size="sm" variant="outline" onClick={() => generatePrescriptionQR(index)}>
                              <QrCode className="h-4 w-4 mr-2" />
                              QR Code
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">Dosage:</span>
                            <p className="font-medium">{prescription.dosage}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Frequency:</span>
                            <p className="font-medium">{prescription.frequency}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <p className="font-medium">{prescription.duration || "Not specified"}</p>
                          </div>
                        </div>

                        <div className="text-sm text-gray-600">
                          <p>
                            <span className="font-medium">Issued:</span> {formatDateTime(prescription.issuedAt)}
                          </p>
                          {prescription.notes && (
                            <p className="mt-2">
                              <span className="font-medium">Instructions:</span> {prescription.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No prescriptions issued for this encounter</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prescription QR Generator Modal */}
            {selectedPrescriptionForQR !== null && encounter.prescriptions[selectedPrescriptionForQR] && (
              <PrescriptionQRGenerator
                prescriptionData={{
                  encounterId: encounter.id,
                  prescriptionIndex: selectedPrescriptionForQR,
                  medicationName: encounter.prescriptions[selectedPrescriptionForQR].medicationName,
                  dosage: encounter.prescriptions[selectedPrescriptionForQR].dosage,
                  frequency: encounter.prescriptions[selectedPrescriptionForQR].frequency,
                  patientName: encounter.patient.name,
                  patientDigitalId: encounter.patient.digitalIdentifier,
                  doctorName: encounter.attendingPractitioner.name,
                  organizationName: encounter.organization.name,
                  issuedAt: encounter.prescriptions[selectedPrescriptionForQR].issuedAt,
                }}
                onClose={() => setSelectedPrescriptionForQR(null)}
              />
            )}
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Audit Trail
                </CardTitle>
                <CardDescription>Record creation and modification history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Encounter Created</p>
                      <p className="text-sm text-gray-600">
                        {formatDateTime(encounter.auditInfo.createdAt)} by {encounter.auditInfo.createdBy}
                      </p>
                    </div>
                  </div>

                  {encounter.auditInfo.modifiedAt && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium">Last Modified</p>
                        <p className="text-sm text-gray-600">
                          {formatDateTime(encounter.auditInfo.modifiedAt)} by {encounter.auditInfo.modifiedBy}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  );
}
