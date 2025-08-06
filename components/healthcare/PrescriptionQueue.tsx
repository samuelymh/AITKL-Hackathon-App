"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Eye, Edit, FileText } from "lucide-react";

export interface PrescriptionRequest {
  id: string;
  patientName: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  status: "ISSUED" | "FILLED" | "CANCELLED";
  issuedAt: Date;
  prescribingPractitioner: {
    name: string;
    type: string;
  };
  notes?: string;
  priority: "normal" | "urgent" | "stat";
}

interface PrescriptionAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
  className?: string;
  onClick: (prescriptionId: string) => void;
  showForStatus?: string[];
}

interface PrescriptionQueueProps {
  prescriptions: PrescriptionRequest[];
  loading?: boolean;
  emptyMessage?: string;
  title?: string;
  description?: string;
  actions?: PrescriptionAction[];
  onViewPatientRecord?: (patientId: string) => void;
  className?: string;
  maxHeight?: string;
}

const PrescriptionQueue: React.FC<PrescriptionQueueProps> = ({
  prescriptions,
  loading = false,
  emptyMessage = "No pending prescriptions",
  title = "Prescription Queue",
  description = "Pending prescriptions requiring attention",
  actions = [],
  onViewPatientRecord,
  className = "",
  maxHeight = "h-64",
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ISSUED":
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            Pending
          </Badge>
        );
      case "FILLED":
        return (
          <Badge variant="outline" className="text-green-600 border-green-300">
            Dispensed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="outline" className="text-red-600 border-red-300">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "stat":
        return <Badge variant="destructive">STAT</Badge>;
      case "urgent":
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            Urgent
          </Badge>
        );
      default:
        return null;
    }
  };

  const getActionsForPrescription = (prescription: PrescriptionRequest) => {
    return actions.filter((action) => !action.showForStatus || action.showForStatus.includes(prescription.status));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className={maxHeight}>
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading prescriptions...</div>
            </div>
          )}

          {!loading && prescriptions.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">{emptyMessage}</div>
            </div>
          )}

          {!loading && prescriptions.length > 0 && (
            <div className="space-y-3">
              {prescriptions.map((prescription) => (
                <div key={prescription.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{prescription.patientName}</p>
                      <p className="text-sm text-gray-600">ID: {prescription.id}</p>
                      <p className="text-xs text-gray-500">Patient ID: {prescription.patientId}</p>
                    </div>
                    <div className="flex gap-2">
                      {getPriorityBadge(prescription.priority)}
                      {getStatusBadge(prescription.status)}
                    </div>
                  </div>

                  <div className="text-sm space-y-1">
                    <p>
                      <strong>{prescription.medicationName}</strong> {prescription.dosage}
                    </p>
                    <p>Frequency: {prescription.frequency}</p>
                    <p>Prescriber: {prescription.prescribingPractitioner.name}</p>
                    <p>Type: {prescription.prescribingPractitioner.type}</p>
                    {prescription.notes && <p>Notes: {prescription.notes}</p>}
                    <p className="text-xs text-gray-500">Issued: {new Date(prescription.issuedAt).toLocaleString()}</p>
                  </div>

                  {/* Action buttons */}
                  {(getActionsForPrescription(prescription).length > 0 || onViewPatientRecord) && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {getActionsForPrescription(prescription).map((action) => (
                        <Button
                          key={action.id}
                          size="sm"
                          variant={action.variant || "default"}
                          onClick={() => action.onClick(prescription.id)}
                          className={action.className}
                        >
                          {action.icon}
                          {action.label}
                        </Button>
                      ))}

                      {onViewPatientRecord && (
                        <Button size="sm" variant="ghost" onClick={() => onViewPatientRecord(prescription.patientId)}>
                          <Eye className="w-4 h-4 mr-1" />
                          View Record
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Factory functions to create customized actions
export const createPharmacistActions = (handlers: {
  onDispense?: (prescriptionId: string) => void;
  onCancel?: (prescriptionId: string) => void;
}): PrescriptionAction[] => [
  {
    id: "dispense",
    label: "Dispense",
    icon: <CheckCircle className="w-4 h-4 mr-1" />,
    variant: "default",
    className: "bg-green-600 hover:bg-green-700",
    onClick: handlers.onDispense || (() => {}),
    showForStatus: ["ISSUED"],
  },
  {
    id: "cancel",
    label: "Cancel",
    icon: <XCircle className="w-4 h-4 mr-1" />,
    variant: "outline",
    className: "border-red-200 text-red-600 hover:bg-red-50",
    onClick: handlers.onCancel || (() => {}),
    showForStatus: ["ISSUED"],
  },
];

export const createDoctorActions = (handlers: {
  onEdit?: (prescriptionId: string) => void;
  onCancel?: (prescriptionId: string) => void;
}): PrescriptionAction[] => [
  {
    id: "edit",
    label: "Edit",
    icon: <Edit className="w-4 h-4 mr-1" />,
    variant: "outline",
    onClick: handlers.onEdit || (() => {}),
    showForStatus: ["ISSUED"],
  },
  {
    id: "cancel",
    label: "Cancel",
    icon: <XCircle className="w-4 h-4 mr-1" />,
    variant: "destructive",
    onClick: handlers.onCancel || (() => {}),
    showForStatus: ["ISSUED"],
  },
];

export const createOrganizationActions = (handlers: {
  onView?: (prescriptionId: string) => void;
  onAudit?: (prescriptionId: string) => void;
}): PrescriptionAction[] => [
  {
    id: "review",
    label: "Review",
    icon: <FileText className="w-4 h-4 mr-1" />,
    variant: "outline",
    onClick: handlers.onView || (() => {}),
    showForStatus: ["ISSUED", "FILLED"],
  },
  {
    id: "audit",
    label: "Audit",
    icon: <FileText className="w-4 h-4 mr-1" />,
    variant: "outline",
    onClick: handlers.onAudit || (() => {}),
    showForStatus: ["FILLED", "COMPLETED"],
  },
];

export default PrescriptionQueue;
