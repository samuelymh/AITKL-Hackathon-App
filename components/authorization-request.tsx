"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, User, Calendar, Send, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthorizationRequestProps {
  readonly scannedQRData: QRCodeData;
  readonly organizationId: string;
  readonly requestedBy: string; // User ID of the healthcare provider
  readonly onRequestSuccess?: (requestId: string) => void;
  readonly onRequestError?: (error: string) => void;
  readonly className?: string;
}

interface QRCodeData {
  type: string;
  digitalIdentifier: string;
  patientName?: string;
  issuedAt: string;
  expiresAt?: string;
  version: string;
}

interface AuthorizationRequestData {
  digitalIdentifier: string;
  organizationId: string;
  requestedBy: string;
  purpose: string;
  requestedPermissions: string[];
  urgencyLevel: "routine" | "urgent" | "emergency";
  expiresAt?: string;
}

interface AuthorizationRequestResponse {
  success: boolean;
  requestId?: string;
  message?: string;
  error?: string;
}

const PERMISSION_OPTIONS = [
  { id: "medical_history", label: "Medical History", description: "Access to past medical records and diagnoses" },
  { id: "current_medications", label: "Current Medications", description: "List of current prescriptions and dosages" },
  { id: "lab_results", label: "Lab Results", description: "Recent laboratory test results" },
  { id: "imaging_reports", label: "Imaging Reports", description: "X-rays, MRIs, CT scans, and other imaging" },
  { id: "allergies", label: "Allergies & Reactions", description: "Known allergies and adverse reactions" },
  { id: "vital_signs", label: "Vital Signs", description: "Recent vital signs and measurements" },
  { id: "treatment_plans", label: "Treatment Plans", description: "Current and past treatment plans" },
  { id: "emergency_contacts", label: "Emergency Contacts", description: "Emergency contact information" },
];

const URGENCY_LEVELS = [
  { value: "routine", label: "Routine", description: "Standard medical care", color: "bg-blue-100 text-blue-800" },
  {
    value: "urgent",
    label: "Urgent",
    description: "Time-sensitive care needed",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "emergency",
    label: "Emergency",
    description: "Immediate medical attention required",
    color: "bg-red-100 text-red-800",
  },
] as const;

export function AuthorizationRequest({
  scannedQRData,
  organizationId,
  requestedBy,
  onRequestSuccess,
  onRequestError,
  className,
}: AuthorizationRequestProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["medical_history", "allergies"]);
  const [purpose, setPurpose] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState<"routine" | "urgent" | "emergency">("routine");
  const [customExpiryHours, setCustomExpiryHours] = useState(24);

  // API call for creating authorization request
  const createRequestMutation = useMutation({
    mutationFn: async (requestData: AuthorizationRequestData): Promise<AuthorizationRequestResponse> => {
      const response = await fetch("/api/v1/authorizations/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.requestId) {
        onRequestSuccess?.(data.requestId);
      } else {
        onRequestError?.(data.error || "Failed to create authorization request");
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to create authorization request";
      onRequestError?.(errorMessage);
    },
  });

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
    );
  };

  const handleSubmitRequest = async () => {
    if (!purpose.trim()) {
      onRequestError?.("Please provide a purpose for this request");
      return;
    }

    if (selectedPermissions.length === 0) {
      onRequestError?.("Please select at least one permission");
      return;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + customExpiryHours);

    const requestData: AuthorizationRequestData = {
      digitalIdentifier: scannedQRData.digitalIdentifier,
      organizationId,
      requestedBy,
      purpose: purpose.trim(),
      requestedPermissions: selectedPermissions,
      urgencyLevel,
      expiresAt: expiresAt.toISOString(),
    };

    createRequestMutation.mutate(requestData);
  };

  const isSubmitting = createRequestMutation.isPending;
  const selectedUrgency = URGENCY_LEVELS.find((level) => level.value === urgencyLevel);

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Create Authorization Request
        </CardTitle>
        <CardDescription>Request access to patient health records for medical care</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Patient Information Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Patient Information</h3>
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">Digital ID:</span>
              <code className="text-xs bg-background px-1 rounded">
                {scannedQRData.digitalIdentifier.substring(0, 12)}...
              </code>
            </div>

            {scannedQRData.patientName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">Name:</span>
                <span>{scannedQRData.patientName}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">QR Issued:</span>
              <span>{new Date(scannedQRData.issuedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Purpose */}
        <div className="space-y-2">
          <Label htmlFor="purpose">Purpose of Access *</Label>
          <Textarea
            id="purpose"
            placeholder="e.g., Routine check-up, Emergency treatment, Follow-up consultation..."
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            disabled={isSubmitting}
            className="min-h-[80px]"
          />
        </div>

        {/* Urgency Level */}
        <div className="space-y-3">
          <Label>Urgency Level *</Label>
          <div className="grid grid-cols-1 gap-2">
            {URGENCY_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setUrgencyLevel(level.value)}
                disabled={isSubmitting}
                className={cn(
                  "text-left p-3 rounded-lg border-2 transition-colors",
                  urgencyLevel === level.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                  isSubmitting && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{level.label}</div>
                    <div className="text-sm text-muted-foreground">{level.description}</div>
                  </div>
                  <Badge className={level.color}>{level.label}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Requested Permissions */}
        <div className="space-y-3">
          <Label>Requested Access Permissions *</Label>
          <div className="grid grid-cols-1 gap-2">
            {PERMISSION_OPTIONS.map((permission) => (
              <button
                key={permission.id}
                type="button"
                onClick={() => handlePermissionToggle(permission.id)}
                disabled={isSubmitting}
                className={cn(
                  "text-left p-3 rounded-lg border-2 transition-colors",
                  selectedPermissions.includes(permission.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50",
                  isSubmitting && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5",
                      selectedPermissions.includes(permission.id) ? "border-primary bg-primary" : "border-border"
                    )}
                  >
                    {selectedPermissions.includes(permission.id) && (
                      <CheckCircle className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{permission.label}</div>
                    <div className="text-sm text-muted-foreground">{permission.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Request Expiry */}
        <div className="space-y-2">
          <Label htmlFor="expiry">Request Expires In (hours)</Label>
          <select
            id="expiry"
            value={customExpiryHours}
            onChange={(e) => setCustomExpiryHours(Number(e.target.value))}
            disabled={isSubmitting}
            className="w-full p-2 border border-border rounded-md bg-background"
          >
            <option value={1}>1 hour</option>
            <option value={4}>4 hours</option>
            <option value={12}>12 hours</option>
            <option value={24}>24 hours (default)</option>
            <option value={48}>48 hours</option>
            <option value={72}>72 hours</option>
          </select>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmitRequest}
          disabled={isSubmitting || !purpose.trim() || selectedPermissions.length === 0}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending Request...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Authorization Request
            </>
          )}
        </Button>

        {/* Request Summary */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Note:</strong> This request will be sent to the patient for approval. The patient will be notified
              and can approve or deny access to their health records. You will be notified once the patient responds.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AuthorizationRequest;
