"use client";

import React, { useState, useEffect } from "react";
import PrescriptionQueue, {
  createOrganizationActions,
  type PrescriptionRequest,
} from "@/components/healthcare/PrescriptionQueue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

// Example of how an organization would use the PrescriptionQueue component
const OrganizationPrescriptionOverview: React.FC = () => {
  const { user } = useAuth();
  const [allPrescriptions, setAllPrescriptions] = useState<PrescriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizationPrescriptions();
  }, []);

  const fetchOrganizationPrescriptions = async () => {
    try {
      const response = await fetch("/api/organization/prescriptions", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setAllPrescriptions(result.data);
      } else {
        console.error("Failed to fetch organization prescriptions:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching organization prescriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewPrescription = (prescriptionId: string) => {
    // Navigate to detailed prescription review page
    window.open(`/organization/prescriptions/review/${prescriptionId}`, "_blank");
  };

  const handleViewPatientRecord = (patientId: string) => {
    // Navigate to patient record view within organization context
    window.open(`/organization/patients/${patientId}`, "_blank");
  };

  const organizationPrescriptionActions = createOrganizationActions({
    onView: handleReviewPrescription,
    onAudit: (prescriptionId: string) => {
      console.log("Auditing prescription:", prescriptionId);
      // Add audit functionality
    },
  });

  const pendingPrescriptions = allPrescriptions.filter((p) => p.status === "ISSUED");
  const filledPrescriptions = allPrescriptions.filter((p) => p.status === "FILLED");
  const cancelledPrescriptions = allPrescriptions.filter((p) => p.status === "CANCELLED");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Prescription Overview</CardTitle>
          <CardDescription>Monitor and review all prescriptions within your healthcare organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pendingPrescriptions.length}</div>
              <div className="text-sm text-gray-600">Pending Prescriptions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{filledPrescriptions.length}</div>
              <div className="text-sm text-gray-600">Filled Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{cancelledPrescriptions.length}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pending
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              {pendingPrescriptions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="filled" className="flex items-center gap-2">
            Filled
            <Badge variant="outline" className="text-green-600 border-green-300">
              {filledPrescriptions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            Cancelled
            <Badge variant="outline" className="text-red-600 border-red-300">
              {cancelledPrescriptions.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <PrescriptionQueue
            prescriptions={pendingPrescriptions}
            loading={loading}
            emptyMessage="No pending prescriptions in the organization"
            title="Pending Prescriptions"
            description="Prescriptions awaiting pharmacy dispensing"
            actions={organizationPrescriptionActions}
            onViewPatientRecord={handleViewPatientRecord}
            maxHeight="h-96"
          />
        </TabsContent>

        <TabsContent value="filled">
          <PrescriptionQueue
            prescriptions={filledPrescriptions}
            loading={loading}
            emptyMessage="No filled prescriptions today"
            title="Filled Prescriptions"
            description="Prescriptions that have been successfully dispensed"
            actions={organizationPrescriptionActions}
            onViewPatientRecord={handleViewPatientRecord}
            maxHeight="h-96"
          />
        </TabsContent>

        <TabsContent value="cancelled">
          <PrescriptionQueue
            prescriptions={cancelledPrescriptions}
            loading={loading}
            emptyMessage="No cancelled prescriptions"
            title="Cancelled Prescriptions"
            description="Prescriptions that have been cancelled"
            actions={organizationPrescriptionActions}
            onViewPatientRecord={handleViewPatientRecord}
            maxHeight="h-96"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizationPrescriptionOverview;
