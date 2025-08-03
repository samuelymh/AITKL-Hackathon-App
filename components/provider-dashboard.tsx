"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QrCode, FileText, CheckCircle, XCircle, ArrowRight, RotateCcw, UserCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import QRScanner from "@/components/qr-scanner";
import AuthorizationRequest from "@/components/authorization-request";

interface ProviderDashboardProps {
  readonly organizationId: string;
  readonly userId: string; // Healthcare provider user ID
  readonly userName?: string;
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

type WorkflowStep = "scan" | "request" | "completed";

interface CompletedRequest {
  requestId: string;
  patientId: string;
  timestamp: Date;
  status: "pending" | "approved" | "denied";
}

export function ProviderDashboard({ organizationId, userId, userName, className }: ProviderDashboardProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("scan");
  const [scannedQRData, setScannedQRData] = useState<QRCodeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedRequest, setCompletedRequest] = useState<CompletedRequest | null>(null);

  const handleScanSuccess = (qrData: QRCodeData) => {
    setScannedQRData(qrData);
    setError(null);
    setCurrentStep("request");
  };

  const handleScanError = (errorMessage: string) => {
    setError(errorMessage);
    setScannedQRData(null);
  };

  const handleRequestSuccess = (requestId: string) => {
    const request: CompletedRequest = {
      requestId,
      patientId: scannedQRData?.digitalIdentifier || "",
      timestamp: new Date(),
      status: "pending",
    };
    setCompletedRequest(request);
    setCurrentStep("completed");
    setError(null);
  };

  const handleRequestError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const resetWorkflow = () => {
    setCurrentStep("scan");
    setScannedQRData(null);
    setError(null);
    setCompletedRequest(null);
  };

  const getStepStatus = (step: WorkflowStep) => {
    if (currentStep === step) return "current";
    if (
      (step === "scan" && (currentStep === "request" || currentStep === "completed")) ||
      (step === "request" && currentStep === "completed")
    ) {
      return "completed";
    }
    return "upcoming";
  };

  const getStepClassName = (step: WorkflowStep): string => {
    const status = getStepStatus(step);
    if (status === "completed") return "bg-green-500 text-white";
    if (status === "current") return "bg-primary text-primary-foreground";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className={cn("w-full max-w-4xl mx-auto space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Patient Access Request System
          </CardTitle>
          <CardDescription>
            Scan patient QR code and request access to health records
            {userName && (
              <span className="block mt-1 text-xs">
                Logged in as: <span className="font-medium">{userName}</span>
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {/* Step 1: Scan QR Code */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  getStepClassName("scan")
                )}
              >
                {getStepStatus("scan") === "completed" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
              </div>
              <div className="text-sm">
                <div className="font-medium">Scan QR Code</div>
                <div className="text-muted-foreground">Capture patient identifier</div>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-muted-foreground" />

            {/* Step 2: Create Request */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  getStepClassName("request")
                )}
              >
                {getStepStatus("request") === "completed" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </div>
              <div className="text-sm">
                <div className="font-medium">Create Request</div>
                <div className="text-muted-foreground">Specify access needs</div>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-muted-foreground" />

            {/* Step 3: Awaiting Approval */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  getStepStatus("completed") === "current"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-sm">
                <div className="font-medium">Patient Approval</div>
                <div className="text-muted-foreground">Awaiting response</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Current Step */}
        <div className="space-y-4">
          {currentStep === "scan" && (
            <QRScanner
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
              organizationId={organizationId}
              requestedBy={userId}
            />
          )}

          {currentStep === "request" && scannedQRData && (
            <AuthorizationRequest
              scannedQRData={scannedQRData}
              organizationId={organizationId}
              requestedBy={userId}
              onRequestSuccess={handleRequestSuccess}
              onRequestError={handleRequestError}
            />
          )}

          {currentStep === "completed" && completedRequest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Request Submitted Successfully
                </CardTitle>
                <CardDescription>Authorization request has been sent to the patient</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Request ID:</span>
                    <code className="text-xs bg-background px-2 py-1 rounded">{completedRequest.requestId}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                      Pending Patient Approval
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Submitted:</span>
                    <span className="text-sm text-muted-foreground">{completedRequest.timestamp.toLocaleString()}</span>
                  </div>
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <p>
                    The patient will receive a notification about your access request. You will be notified via email
                    and in-app notification once they respond.
                  </p>
                </div>

                <Button onClick={resetWorkflow} variant="outline" className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Process Another Patient
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Context/History */}
        <div className="space-y-4">
          {/* Current QR Data Display (when available) */}
          {scannedQRData && currentStep !== "scan" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Scanned Patient Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Digital ID:</span>
                  <code className="text-xs bg-muted px-1 rounded">
                    {scannedQRData.digitalIdentifier.substring(0, 12)}...
                  </code>
                </div>
                {scannedQRData.patientName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient:</span>
                    <span>{scannedQRData.patientName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">QR Issued:</span>
                  <span>{new Date(scannedQRData.issuedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {currentStep === "scan" && (
                <ol className="list-decimal list-inside space-y-1">
                  <li>Ask the patient to display their QR code</li>
                  <li>Click "Start Scanning" to activate camera</li>
                  <li>Position the QR code within the frame</li>
                  <li>Wait for automatic recognition</li>
                </ol>
              )}

              {currentStep === "request" && (
                <ol className="list-decimal list-inside space-y-1">
                  <li>Specify the purpose of access request</li>
                  <li>Select appropriate urgency level</li>
                  <li>Choose required permissions</li>
                  <li>Set request expiry time</li>
                  <li>Submit the authorization request</li>
                </ol>
              )}

              {currentStep === "completed" && (
                <div className="space-y-2">
                  <p>
                    <strong>Next Steps:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Patient will receive notification</li>
                    <li>You'll get email when they respond</li>
                    <li>Check notifications for real-time updates</li>
                    <li>Access granted records in patient portal</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {currentStep !== "scan" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={resetWorkflow} variant="outline" size="sm" className="w-full">
                  <RotateCcw className="h-3 w-3 mr-2" />
                  Start Over
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProviderDashboard;
