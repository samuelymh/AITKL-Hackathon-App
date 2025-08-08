"use client";

import React, { useState, useEffect } from "react";
import PrescriptionQueue, {
  createDoctorActions,
  type PrescriptionRequest,
} from "@/components/healthcare/PrescriptionQueue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

// Example of how a doctor would use the PrescriptionQueue component
const DoctorPrescriptionsView: React.FC = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctorPrescriptions();
  }, []);

  const fetchDoctorPrescriptions = async () => {
    try {
      const response = await fetch("/api/doctor/prescriptions", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setPrescriptions(result.data);
      } else {
        console.error("Failed to fetch doctor prescriptions:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching doctor prescriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPrescription = (prescriptionId: string) => {
    // Navigate to prescription edit page
    window.open(`/doctor/prescriptions/edit/${prescriptionId}`, "_blank");
  };

  const handleCancelPrescription = async (prescriptionId: string) => {
    try {
      const response = await fetch(`/api/doctor/prescriptions/${prescriptionId}/cancel`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Update the prescription in the local state
        setPrescriptions((prev) =>
          prev.map((p) => (p.id === prescriptionId ? { ...p, status: "CANCELLED" as const } : p))
        );
      } else {
        console.error("Failed to cancel prescription:", response.statusText);
      }
    } catch (error) {
      console.error("Error canceling prescription:", error);
    }
  };

  const handleViewPatientRecord = (patientId: string) => {
    // Navigate to patient record view
    window.open(`/doctor/patients/${patientId}`, "_blank");
  };

  const doctorPrescriptionActions = createDoctorActions({
    onEdit: handleEditPrescription,
    onCancel: (prescriptionId: string) => {
      handleCancelPrescription(prescriptionId).catch(console.error);
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Doctor Dashboard - Prescription Management</CardTitle>
          <CardDescription>Manage your prescribed medications and patient treatments</CardDescription>
        </CardHeader>
      </Card>

      {/* Active Prescriptions */}
      <PrescriptionQueue
        prescriptions={prescriptions.filter((p) => p.status === "ISSUED")}
        loading={loading}
        emptyMessage="No active prescriptions"
        title="Active Prescriptions"
        description="Prescriptions you've issued that are still pending"
        actions={doctorPrescriptionActions}
        onViewPatientRecord={handleViewPatientRecord}
        maxHeight="h-80"
      />

      {/* Recently Filled Prescriptions */}
      <PrescriptionQueue
        prescriptions={prescriptions.filter((p) => p.status === "FILLED")}
        loading={loading}
        emptyMessage="No recently filled prescriptions"
        title="Recently Filled"
        description="Prescriptions that have been dispensed by pharmacies"
        actions={[]} // No actions needed for filled prescriptions
        onViewPatientRecord={handleViewPatientRecord}
        maxHeight="h-64"
      />
    </div>
  );
};

export default DoctorPrescriptionsView;
