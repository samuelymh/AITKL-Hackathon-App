"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, AlertTriangle, Phone, Clock, FileText, ArrowLeft, Shield } from "lucide-react";
import { toast } from "sonner";

interface PatientRecords {
  patient: {
    digitalIdentifier: string;
    name: string;
    dateOfBirth?: string;
    bloodType?: string;
  };
  safetyInformation: {
    drugAllergies: string[];
    foodAllergies: string[];
    otherAllergies: string[];
    currentMedications: string[];
    medicalConditions: string[];
    smokingStatus: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  recentEncounters: Array<{
    id: string;
    date: string;
    chiefComplaint: string;
    encounterType: string;
    diagnoses: Array<{
      code: string;
      description: string;
      isChronic: boolean;
    }>;
    prescriptionCount: number;
  }>;
  clinicalNotes: string;
  authorization: {
    grantId: string;
    expiresAt: string;
    accessScope: any;
  };
}

interface ViewPatientRecordsProps {
  digitalId: string;
  onBack: () => void;
}

export default function ViewPatientRecords({ digitalId, onBack }: ViewPatientRecordsProps) {
  const [records, setRecords] = useState<PatientRecords | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatientRecords();
  }, [digitalId]);

  const fetchPatientRecords = async () => {
    try {
      const response = await fetch(`/api/pharmacist/patient/${digitalId}/records`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(data.data);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to fetch patient records");
      }
    } catch (error) {
      console.error("Error fetching patient records:", error);
      toast.error("Failed to fetch patient records");
    } finally {
      setLoading(false);
    }
  };

  const getSmokingStatusColor = (status: string) => {
    switch (status) {
      case "never":
        return "bg-green-100 text-green-800";
      case "former":
        return "bg-yellow-100 text-yellow-800";
      case "current":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEncounterTypeColor = (type: string) => {
    switch (type) {
      case "EMERGENCY":
        return "bg-red-100 text-red-800";
      case "ROUTINE":
        return "bg-green-100 text-green-800";
      case "FOLLOW_UP":
        return "bg-blue-100 text-blue-800";
      case "CONSULTATION":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading patient records...</p>
        </div>
      </div>
    );
  }

  if (!records) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load patient records</p>
          <Button onClick={onBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Patient Medical Records</h1>
          <p className="text-gray-600">
            {records.patient.name} • {records.patient.digitalIdentifier}
          </p>
        </div>
      </div>

      {/* Authorization Status */}
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Authorized Access</p>
              <p className="text-sm text-green-700">
                Access expires: {new Date(records.authorization.expiresAt).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-700">Name</div>
              <p className="text-gray-900">{records.patient.name}</p>
            </div>
            {records.patient.dateOfBirth && (
              <div>
                <div className="text-sm font-medium text-gray-700">Date of Birth</div>
                <p className="text-gray-900">{new Date(records.patient.dateOfBirth).toLocaleDateString()}</p>
              </div>
            )}
            {records.patient.bloodType && (
              <div>
                <div className="text-sm font-medium text-gray-700">Blood Type</div>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {records.patient.bloodType}
                </Badge>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-gray-700">Smoking Status</div>
              <Badge className={getSmokingStatusColor(records.safetyInformation.smokingStatus)}>
                {records.safetyInformation.smokingStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {records.emergencyContact.name ? (
              <>
                <div>
                  <div className="text-sm font-medium text-gray-700">Name</div>
                  <p className="text-gray-900">{records.emergencyContact.name}</p>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Phone</div>
                  <p className="text-gray-900">{records.emergencyContact.phone}</p>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Relationship</div>
                  <p className="text-gray-900">{records.emergencyContact.relationship}</p>
                </div>
              </>
            ) : (
              <p className="text-gray-500 italic">No emergency contact information available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Critical Safety Information */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="w-5 h-5" />
            Critical Safety Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drug Allergies */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Drug Allergies</h4>
            {records.safetyInformation.drugAllergies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {records.safetyInformation.drugAllergies.map((allergy) => (
                  <Badge key={allergy} className="bg-red-100 text-red-800">
                    {allergy}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No known drug allergies</p>
            )}
          </div>

          {/* Food Allergies */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Food Allergies</h4>
            {records.safetyInformation.foodAllergies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {records.safetyInformation.foodAllergies.map((allergy) => (
                  <Badge key={allergy} className="bg-orange-100 text-orange-800">
                    {allergy}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No known food allergies</p>
            )}
          </div>

          {/* Current Medications */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Current Medications</h4>
            {records.safetyInformation.currentMedications.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {records.safetyInformation.currentMedications.map((medication) => (
                  <Badge key={medication} className="bg-blue-100 text-blue-800">
                    {medication}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No current medications listed</p>
            )}
          </div>

          {/* Medical Conditions */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Medical Conditions</h4>
            {records.safetyInformation.medicalConditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {records.safetyInformation.medicalConditions.map((condition) => (
                  <Badge key={condition} className="bg-purple-100 text-purple-800">
                    {condition}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No known medical conditions</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Encounters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Medical Encounters
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.recentEncounters.length > 0 ? (
            <div className="space-y-4">
              {records.recentEncounters.map((encounter) => (
                <div key={encounter.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{encounter.chiefComplaint}</p>
                      <p className="text-sm text-gray-600">{new Date(encounter.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getEncounterTypeColor(encounter.encounterType)}>
                        {encounter.encounterType}
                      </Badge>
                      {encounter.prescriptionCount > 0 && (
                        <Badge variant="outline">{encounter.prescriptionCount} Rx</Badge>
                      )}
                    </div>
                  </div>

                  {encounter.diagnoses.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Diagnoses</h5>
                      <div className="space-y-1">
                        {encounter.diagnoses.map((diagnosis) => (
                          <div key={`${diagnosis.code}-${diagnosis.description}`} className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={diagnosis.isChronic ? "bg-orange-50 border-orange-200" : ""}
                            >
                              {diagnosis.code}
                            </Badge>
                            <span className="text-sm text-gray-600">{diagnosis.description}</span>
                            {diagnosis.isChronic && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs">Chronic</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No recent encounters found</p>
          )}
        </CardContent>
      </Card>

      {/* Clinical Notes */}
      {records.clinicalNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Additional Clinical Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{records.clinicalNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
