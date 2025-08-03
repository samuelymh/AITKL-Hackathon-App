"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Camera, CameraOff, CheckCircle, XCircle, AlertTriangle, Scan, User, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface QRScannerProps {
  readonly onScanSuccess: (data: QRCodeData) => void;
  readonly onScanError?: (error: string) => void;
  readonly className?: string;
  readonly organizationId: string;
  readonly requestedBy: string; // User ID of the healthcare provider
}

interface QRCodeData {
  type: string;
  digitalIdentifier: string;
  patientName?: string;
  issuedAt: string;
  expiresAt?: string;
  version: string;
}

interface ScanResult {
  success: boolean;
  data?: QRCodeData;
  error?: string;
  timestamp: Date;
}

export function QRScanner({ onScanSuccess, onScanError, className, organizationId, requestedBy }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<any>(null);

  // Check camera permissions on mount
  useEffect(() => {
    checkCameraPermissions();
  }, []);

  const checkCameraPermissions = async () => {
    try {
      const permissions = await navigator.permissions.query({ name: "camera" as PermissionName });
      setCameraPermission(permissions.state);

      permissions.addEventListener("change", () => {
        setCameraPermission(permissions.state);
      });
    } catch (error) {
      console.warn("Camera permissions check not supported:", error);
    }
  };

  const validateQRCode = (data: string): { isValid: boolean; parsedData?: QRCodeData; error?: string } => {
    try {
      const parsed = JSON.parse(data);

      // Validate QR code structure according to knowledge base
      if (parsed.type !== "health_access_request") {
        return { isValid: false, error: "Invalid QR code type. Expected health access request." };
      }

      if (!parsed.digitalIdentifier) {
        return { isValid: false, error: "Missing digital identifier in QR code." };
      }

      if (!parsed.issuedAt) {
        return { isValid: false, error: "Missing issue timestamp in QR code." };
      }

      // Check if QR code has expired (if expiresAt is present)
      if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
        return { isValid: false, error: "QR code has expired." };
      }

      // Validate version compatibility
      if (parsed.version && !["1.0", "1.1"].includes(parsed.version)) {
        return { isValid: false, error: "Unsupported QR code version." };
      }

      return { isValid: true, parsedData: parsed };
    } catch (error) {
      console.error("QR validation error:", error);
      return { isValid: false, error: "Invalid QR code format. Unable to parse data." };
    }
  };

  const handleScan = useCallback(
    async (result: any) => {
      if (!result || isProcessing) return;

      setIsProcessing(true);

      try {
        const scannedData = result.text || result;

        // Validate the QR code
        const validation = validateQRCode(scannedData);

        if (!validation.isValid) {
          const errorResult: ScanResult = {
            success: false,
            error: validation.error,
            timestamp: new Date(),
          };
          setScanResult(errorResult);
          setError(validation.error || "Invalid QR code");
          onScanError?.(validation.error || "Invalid QR code");
          return;
        }

        // Successful scan
        const successResult: ScanResult = {
          success: true,
          data: validation.parsedData,
          timestamp: new Date(),
        };

        setScanResult(successResult);
        setError(null);

        // Stop scanning after successful scan
        setIsScanning(false);

        // Trigger success callback
        onScanSuccess(validation.parsedData!);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to process QR code";
        const errorResult: ScanResult = {
          success: false,
          error: errorMessage,
          timestamp: new Date(),
        };
        setScanResult(errorResult);
        setError(errorMessage);
        onScanError?.(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [onScanSuccess, onScanError, isProcessing]
  );

  const handleError = useCallback(
    (error: any) => {
      console.error("QR Scanner error:", error);
      const errorMessage = error?.message || "Camera access failed";
      setError(errorMessage);
      onScanError?.(errorMessage);
    },
    [onScanError]
  );

  const startScanning = async () => {
    try {
      setError(null);
      setScanResult(null);
      setIsScanning(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start camera";
      setError(errorMessage);
      onScanError?.(errorMessage);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
    setIsScanning(false);
  };

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Scan className="h-5 w-5" />
          Patient QR Scanner
        </CardTitle>
        <CardDescription>Scan patient QR code to request access to health records</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Camera Permission Status */}
        {cameraPermission === "denied" && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Camera access denied. Please enable camera permissions in your browser settings.
            </AlertDescription>
          </Alert>
        )}

        {/* Scanner Area */}
        <div className="relative">
          {isScanning ? (
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={{
                  facingMode: "environment",
                }}
                styles={{
                  container: { width: "100%", height: "100%" },
                }}
              />

              {/* Scanner Overlay */}
              <div className="absolute inset-0 border-2 border-white/20 rounded-lg">
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-sm">Processing...</div>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center space-y-2">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Camera not active</p>
              </div>
            </div>
          )}
        </div>

        {/* Scanner Controls */}
        <div className="flex gap-2">
          {!isScanning ? (
            <Button onClick={startScanning} className="flex-1" disabled={cameraPermission === "denied"}>
              <Camera className="h-4 w-4 mr-2" />
              Start Scanning
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="outline" className="flex-1">
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Scanning
            </Button>
          )}

          {scanResult && (
            <Button onClick={resetScanner} variant="ghost" size="sm">
              Reset
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Scan Result Display */}
        {scanResult && (
          <div className="space-y-3">
            <Separator />

            <div className="flex items-center gap-2">
              {scanResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium">{scanResult.success ? "QR Code Valid" : "Scan Failed"}</span>
              <Badge variant={scanResult.success ? "default" : "destructive"}>
                {new Date(scanResult.timestamp).toLocaleTimeString()}
              </Badge>
            </div>

            {scanResult.success && scanResult.data && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">Digital ID:</span>
                  <code className="text-xs bg-muted px-1 rounded">
                    {scanResult.data.digitalIdentifier.substring(0, 8)}...
                  </code>
                </div>

                {scanResult.data.patientName && (
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">Patient:</span>
                    <span>{scanResult.data.patientName}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">Issued:</span>
                  <span>{new Date(scanResult.data.issuedAt).toLocaleDateString()}</span>
                </div>

                {scanResult.data.expiresAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">Expires:</span>
                    <span>{new Date(scanResult.data.expiresAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground text-center">
          Position the patient's QR code within the scanner frame
        </div>
      </CardContent>
    </Card>
  );
}

export default QRScanner;
