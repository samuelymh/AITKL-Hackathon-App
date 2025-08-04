"use client";

import React, { useState, useRef } from "react";
import {
  Camera,
  StopCircle,
  RotateCcw,
  Scan,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// QR Scanner library (@yudiel/react-qr-scanner)
import { Scanner } from "@yudiel/react-qr-scanner";

interface QRCodeData {
  type: string;
  digitalIdentifier: string;
  version: string;
  timestamp: string;
}

interface AuthorizationRequestData {
  grantId: string;
  status: string;
  expiresAt: string;
  patient: {
    name: string;
    digitalIdentifier: string;
  };
  organization: {
    name: string;
    type: string;
  };
  accessScope: {
    canViewMedicalHistory: boolean;
    canViewPrescriptions: boolean;
    canCreateEncounters: boolean;
    canViewAuditLogs: boolean;
  };
  timeWindowHours: number;
}

interface QRScannerProps {
  organizationId: string;
  requestingPractitionerId?: string;
  onAuthorizationCreated?: (data: AuthorizationRequestData) => void;
  onError?: (error: string) => void;
  className?: string;
}

type ScanState = "idle" | "scanning" | "processing" | "success" | "error";

export function QRScanner({
  organizationId,
  requestingPractitionerId,
  onAuthorizationCreated,
  onError,
  className = "",
}: Readonly<QRScannerProps>) {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null);
  const [authRequestData, setAuthRequestData] =
    useState<AuthorizationRequestData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );

  const scannerRef = useRef<any>(null);

  // Default access scope - can be made configurable
  const defaultAccessScope = {
    canViewMedicalHistory: true,
    canViewPrescriptions: true,
    canCreateEncounters: false,
    canViewAuditLogs: false,
  };

  const handleScan = async (data: string | null) => {
    if (!data || scanState === "processing") return;

    try {
      setScanState("processing");
      setErrorMessage("");

      // Parse and validate QR code data
      const qrData = JSON.parse(data) as QRCodeData;

      // Validate QR code structure
      if (
        qrData.type !== "health_access_request" ||
        !qrData.digitalIdentifier
      ) {
        throw new Error(
          "Invalid QR code format. Please scan a valid patient QR code.",
        );
      }

      setScannedData(qrData);

      // Create authorization request
      const response = await fetch("/api/v1/authorizations/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scannedQRData: data,
          organizationId,
          requestingPractitionerId,
          accessScope: defaultAccessScope,
          timeWindowHours: 24,
          requestMetadata: {
            deviceInfo: {
              userAgent: navigator.userAgent,
              screen: {
                width: screen.width,
                height: screen.height,
              },
            },
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to create authorization request",
        );
      }

      if (result.success) {
        setAuthRequestData(result.data);
        setScanState("success");
        onAuthorizationCreated?.(result.data);
      } else {
        throw new Error("Failed to process authorization request");
      }
    } catch (error) {
      console.error("QR Scan Error:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Failed to process QR code";
      setErrorMessage(errorMsg);
      setScanState("error");
      onError?.(errorMsg);
    }
  };

  const handleError = (error: any) => {
    console.error("Camera Error:", error);
    setErrorMessage(
      "Camera access failed. Please check permissions and try again.",
    );
    setScanState("error");
  };

  const startScanning = () => {
    setScanState("scanning");
    setScannedData(null);
    setAuthRequestData(null);
    setErrorMessage("");
    setIsCameraReady(false);
  };

  const stopScanning = () => {
    setScanState("idle");
    setIsCameraReady(false);
  };

  const resetScanner = () => {
    setScanState("idle");
    setScannedData(null);
    setAuthRequestData(null);
    setErrorMessage("");
    setIsCameraReady(false);
  };

  const toggleCamera = () => {
    setFacingMode(facingMode === "environment" ? "user" : "environment");
  };

  const renderScannerContent = () => {
    switch (scanState) {
      case "idle":
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Scan className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Scan</h3>
            <p className="text-muted-foreground mb-6">
              Scan the patient's QR code to request access authorization
            </p>
            <Button onClick={startScanning} size="lg" className="gap-2">
              <Camera className="h-4 w-4" />
              Start Camera
            </Button>
          </div>
        );

      case "scanning":
        return (
          <div className="relative">
            <div className="aspect-square bg-black rounded-lg overflow-hidden relative">
              <Scanner
                onScan={(result) => {
                  if (result) {
                    handleScan(result[0]?.rawValue || null);
                  }
                }}
                onError={handleError}
                constraints={{
                  facingMode: facingMode,
                }}
                styles={{
                  container: { width: "100%", height: "100%" },
                }}
              />

              {/* Overlay frame */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-white border-dashed rounded-lg opacity-75"></div>
              </div>

              {/* Camera controls */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleCamera}
                  className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stopScanning}
                  className="bg-red-600/80 hover:bg-red-600"
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isCameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Initializing camera...</p>
                </div>
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground mt-4">
              Position the QR code within the frame above
            </p>
          </div>
        );

      case "processing":
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-semibold mb-2">Processing QR Code</h3>
            <p className="text-muted-foreground">
              Creating authorization request...
            </p>
          </div>
        );

      case "success":
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                Authorization Request Created
              </h3>
              <p className="text-muted-foreground">
                Notification sent to patient for approval
              </p>
            </div>

            {authRequestData && (
              <div className="space-y-4">
                <Separator />

                {/* Patient Information */}
                <div>
                  <h4 className="font-semibold mb-2">Patient Information</h4>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-medium">
                      {authRequestData.patient.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ID: {authRequestData.patient.digitalIdentifier}
                    </p>
                  </div>
                </div>

                {/* Request Details */}
                <div>
                  <h4 className="font-semibold mb-2">Request Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Grant ID:</span>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {authRequestData.grantId}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Status:</span>
                      <Badge variant="outline">{authRequestData.status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Duration:</span>
                      <span className="text-sm">
                        {authRequestData.timeWindowHours}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Expires:</span>
                      <span className="text-sm">
                        {new Date(authRequestData.expiresAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Access Permissions */}
                <div>
                  <h4 className="font-semibold mb-2">Requested Permissions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(authRequestData.accessScope).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className={`text-xs p-2 rounded-lg border ${
                            value
                              ? "bg-green-50 border-green-200 text-green-700"
                              : "bg-gray-50 border-gray-200 text-gray-500"
                          }`}
                        >
                          {key
                            .replace(/^can/, "")
                            .replace(/([A-Z])/g, " $1")
                            .trim()}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button onClick={resetScanner} className="w-full" variant="outline">
              Scan Another Patient
            </Button>
          </div>
        );

      case "error":
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Scan Failed
            </h3>
            <Alert className="mb-4">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={resetScanner} variant="outline">
                Try Again
              </Button>
              <Button onClick={startScanning}>
                <Camera className="h-4 w-4 mr-2" />
                Restart Camera
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Patient QR Scanner
        </CardTitle>
        <CardDescription>
          Scan patient QR codes to create authorization requests
        </CardDescription>
      </CardHeader>
      <CardContent>{renderScannerContent()}</CardContent>
    </Card>
  );
}

export default QRScanner;
