"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Pill, Calendar, Clock, User, AlertTriangle, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Medication {
  id: string;
  encounterId: string;
  prescriptionIndex: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  notes: string;
  status: string;
  issuedAt: string;
  prescribedBy: {
    practitionerId: string;
  };
  encounter: {
    date: string;
    chiefComplaint: string;
    encounterType: string;
  };
  dispensationStatus: "DISPENSED" | "PENDING";
  dispensedAt?: string;
  canDispense: boolean;
}

interface PatientInfo {
  digitalIdentifier: string;
  name: string;
  dateOfBirth?: string;
}

interface ViewMedicationsProps {
  digitalId: string;
  onBack: () => void;
  onDispensationSuccess?: () => void; // Optional callback for when dispensation succeeds
}

export default function ViewMedications({ digitalId, onBack, onDispensationSuccess }: ViewMedicationsProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispensing, setDispensing] = useState<string | null>(null);

  useEffect(() => {
    fetchMedications();
  }, [digitalId]);

  const fetchMedications = async () => {
    try {
      const response = await fetch(`/api/pharmacist/patient/${digitalId}/medications`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMedications(data.data.medications);
        setPatient(data.data.patient);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to fetch medications");
      }
    } catch (error) {
      console.error("Error fetching medications:", error);
      toast.error("Failed to fetch medications");
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async (medication: Medication) => {
    if (!medication.canDispense) {
      toast.error("This prescription cannot be dispensed");
      return;
    }

    setDispensing(medication.id);

    try {
      const response = await fetch(`/api/pharmacist/patient/${digitalId}/dispense`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
        },
        body: JSON.stringify({
          encounterId: medication.encounterId,
          prescriptionIndex: medication.prescriptionIndex,
          quantityDispensed: medication.dosage,
          daysSupply: 30, // Default 30 days
          notes: `Dispensed by pharmacist on ${new Date().toLocaleDateString()}`,
        }),
      });

      if (response.ok) {
        toast.success("Prescription dispensed successfully");
        // Refresh the medications list
        await fetchMedications();
        // Notify parent component to refresh stats
        onDispensationSuccess?.();

        // Emit custom event to notify dashboard to refresh stats
        window.dispatchEvent(
          new CustomEvent("pharmacist-dispensation-success", {
            detail: {
              medicationName: medication.medicationName,
              patientId: digitalId,
              timestamp: new Date(),
            },
          })
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to dispense prescription");
      }
    } catch (error) {
      console.error("Error dispensing prescription:", error);
      toast.error("Failed to dispense prescription");
    } finally {
      setDispensing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ISSUED":
        return "bg-blue-100 text-blue-800";
      case "FILLED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDispensationStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "DISPENSED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading medications...</p>
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
          <h1 className="text-2xl font-semibold text-gray-900">Patient Medications</h1>
          {patient && (
            <p className="text-gray-600">
              {patient.name} • {patient.digitalIdentifier}
            </p>
          )}
        </div>
      </div>

      {/* Medications List */}
      <div className="space-y-4">
        {medications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No medications found for this patient</p>
            </CardContent>
          </Card>
        ) : (
          medications.map((medication) => (
            <Card key={medication.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">{medication.medicationName}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {medication.dosage} • {medication.frequency}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(medication.status)}>{medication.status}</Badge>
                    <Badge className={getDispensationStatusColor(medication.dispensationStatus)}>
                      {medication.dispensationStatus}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Prescription Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        Prescribed: {new Date(medication.issuedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Encounter: {medication.encounter.encounterType}</span>
                    </div>
                  </div>

                  {/* Encounter Context */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 mb-1">Chief Complaint</p>
                    <p className="text-sm text-gray-600">{medication.encounter.chiefComplaint}</p>
                  </div>

                  {/* Prescription Notes */}
                  {medication.notes && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">Prescription Notes</p>
                      <p className="text-sm text-blue-800">{medication.notes}</p>
                    </div>
                  )}

                  {/* Dispensation Info */}
                  {medication.dispensationStatus === "DISPENSED" && medication.dispensedAt && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <p className="text-sm font-medium text-green-900">
                          Dispensed on {new Date(medication.dispensedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end pt-3">
                    {medication.canDispense ? (
                      <Button
                        onClick={() => handleDispense(medication)}
                        disabled={dispensing === medication.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {dispensing === medication.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Dispensing...
                          </>
                        ) : (
                          <>
                            <Pill className="w-4 h-4 mr-2" />
                            Dispense Medication
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center text-sm text-gray-500">
                        {medication.dispensationStatus === "DISPENSED" ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Already Dispensed
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            Cannot Dispense
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
