"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Eye, FileText, User } from "lucide-react";

export interface AuthorizationGrant {
  id: string;
  patient: {
    name: string;
    digitalIdentifier: string;
  };
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED";
  grantedAt?: Date;
  expiresAt: Date;
  timeWindowHours: number;
  accessScope: string[];
  organization?: {
    name: string;
    type: string;
  };
  requester?: {
    name: string;
    type: string;
  };
}

interface AuthorizationAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
  className?: string;
  onClick: (grantId: string) => void;
  showForStatus?: string[];
}

interface AuthorizationQueueProps {
  grants: AuthorizationGrant[];
  loading?: boolean;
  emptyMessage?: string;
  title?: string;
  description?: string;
  actions?: AuthorizationAction[];
  onViewPatientRecord?: (patientId: string, grantId: string) => void;
  className?: string;
  maxHeight?: string;
}

const AuthorizationQueue: React.FC<AuthorizationQueueProps> = ({
  grants,
  loading = false,
  emptyMessage = "No approved authorizations",
  title = "Patient Access Authorizations",
  description = "Approved patient access grants",
  actions = [],
  onViewPatientRecord,
  className = "",
  maxHeight = "h-64",
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="outline" className="text-green-600 border-green-300">
            Active
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            Pending
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="outline" className="text-red-600 border-red-300">
            Expired
          </Badge>
        );
      case "REVOKED":
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-300">
            Revoked
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const getActionsForGrant = (grant: AuthorizationGrant) => {
    return actions.filter((action) => !action.showForStatus || action.showForStatus.includes(grant.status));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className={maxHeight}>
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading authorizations...</div>
            </div>
          )}

          {!loading && grants.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">{emptyMessage}</div>
            </div>
          )}

          {!loading && grants.length > 0 && (
            <div className="space-y-3">
              {grants.map((grant) => (
                <div key={grant.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{grant.patient.name}</p>
                      <p className="text-sm text-gray-600">ID: {grant.patient.digitalIdentifier}</p>
                      {grant.requester && (
                        <p className="text-xs text-gray-500">
                          Requested by: {grant.requester.name} ({grant.requester.type})
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">{getStatusBadge(grant.status)}</div>
                  </div>

                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Access Scope:</strong> {grant.accessScope.join(", ")}
                    </p>
                    {grant.grantedAt && <p>Granted: {new Date(grant.grantedAt).toLocaleString()}</p>}
                    <p>Expires: {new Date(grant.expiresAt).toLocaleString()}</p>
                    {grant.status === "ACTIVE" && (
                      <p className="text-green-600 font-medium">⏰ {getTimeRemaining(grant.expiresAt)}</p>
                    )}
                    <p className="text-xs text-gray-500">Duration: {grant.timeWindowHours} hours</p>
                  </div>

                  {/* Action buttons */}
                  {(getActionsForGrant(grant).length > 0 || onViewPatientRecord) && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {getActionsForGrant(grant).map((action) => (
                        <Button
                          key={action.id}
                          size="sm"
                          variant={action.variant || "default"}
                          onClick={() => action.onClick(grant.id)}
                          className={action.className}
                        >
                          {action.icon}
                          {action.label}
                        </Button>
                      ))}

                      {onViewPatientRecord && grant.status === "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onViewPatientRecord(grant.patient.digitalIdentifier, grant.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Patient Records
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

// Factory functions for authorization actions
export const createPharmacistAuthActions = (handlers: {
  onViewMedications?: (grantId: string) => void;
  onRequestAccess?: (grantId: string) => void;
}): AuthorizationAction[] => [
  {
    id: "view_medications",
    label: "View Medications",
    icon: <FileText className="w-4 h-4 mr-1" />,
    variant: "outline",
    onClick: handlers.onViewMedications || (() => {}),
    showForStatus: ["ACTIVE"],
  },
  {
    id: "request_access",
    label: "Request Access",
    icon: <CheckCircle className="w-4 h-4 mr-1" />,
    variant: "default",
    onClick: handlers.onRequestAccess || (() => {}),
    showForStatus: ["PENDING"],
  },
];

export const createDoctorAuthActions = (handlers: {
  onViewMedicalHistory?: (grantId: string) => void;
  onCreateEncounter?: (grantId: string) => void;
  onViewAuditLogs?: (grantId: string) => void;
  onWritePrescription?: (grantId: string) => void;
}): AuthorizationAction[] => [
  {
    id: "view_medical_history",
    label: "Medical History",
    icon: <FileText className="w-4 h-4 mr-1" />,
    variant: "outline",
    onClick: handlers.onViewMedicalHistory || (() => {}),
    showForStatus: ["ACTIVE"],
  },
  {
    id: "create_encounter",
    label: "New Encounter",
    icon: <CheckCircle className="w-4 h-4 mr-1" />,
    variant: "default",
    onClick: handlers.onCreateEncounter || (() => {}),
    showForStatus: ["ACTIVE"],
  },
  {
    id: "write_prescription",
    label: "Write Prescription",
    icon: <FileText className="w-4 h-4 mr-1" />,
    variant: "secondary",
    onClick: handlers.onWritePrescription || (() => {}),
    showForStatus: ["ACTIVE"],
  },
  {
    id: "view_audit_logs",
    label: "Audit Logs",
    icon: <Eye className="w-4 h-4 mr-1" />,
    variant: "outline",
    onClick: handlers.onViewAuditLogs || (() => {}),
    showForStatus: ["ACTIVE"],
  },
];

export default AuthorizationQueue;
