"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCode, Camera, CheckCircle, Users, Shield, Clock, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import QRScanner from "@/components/qr-scanner";

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

interface QRScannerWidgetProps {
  organizationId: string;
  practitionerId?: string;
  organizationName?: string;
  onAuthorizationCreated?: (data: AuthorizationRequestData) => void;
  onError?: (error: string) => void;
  className?: string;
  showInstructions?: boolean;
  showRecentScans?: boolean;
  compact?: boolean;
}

export function QRScannerWidget({
  organizationId,
  practitionerId,
  organizationName = "Healthcare Organization",
  onAuthorizationCreated,
  onError,
  className = "",
  showInstructions = true,
  showRecentScans = true,
  compact = false,
}: QRScannerWidgetProps) {
  const [recentScans, setRecentScans] = useState<AuthorizationRequestData[]>([]);
  const [lastScanResult, setLastScanResult] = useState<AuthorizationRequestData | null>(null);
  const [scannerActive, setScannerActive] = useState(false);

  const handleAuthorizationCreated = (data: AuthorizationRequestData) => {
    setLastScanResult(data);
    setRecentScans((prev) => [data, ...prev.slice(0, 4)]); // Keep last 5 results

    // Call parent callback
    onAuthorizationCreated?.(data);

    // Auto-close scanner after successful scan
    setTimeout(() => {
      setScannerActive(false);
    }, 3000);
  };

  const handleScanError = (error: string) => {
    console.error("Scan Error:", error);
    onError?.(error);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "ACTIVE":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPermissions = (accessScope: AuthorizationRequestData["accessScope"]) => {
    const permissions = [];
    if (accessScope.canViewMedicalHistory) permissions.push("Medical History");
    if (accessScope.canViewPrescriptions) permissions.push("Prescriptions");
    if (accessScope.canCreateEncounters) permissions.push("Create Encounters");
    if (accessScope.canViewAuditLogs) permissions.push("Audit Logs");
    return permissions;
  };

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <QrCode className="h-5 w-5" />
            QR Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!scannerActive ? (
            <div className="text-center">
              <Button onClick={() => setScannerActive(true)} className="w-full" size="lg">
                <Camera className="h-4 w-4 mr-2" />
                Start QR Scanner
              </Button>

              {lastScanResult && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Last Scan: {lastScanResult.patient.name}</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Status: {lastScanResult.status}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <QRScanner
                organizationId={organizationId}
                requestingPractitionerId={practitionerId}
                onAuthorizationCreated={handleAuthorizationCreated}
                onError={handleScanError}
              />
              <Button variant="outline" onClick={() => setScannerActive(false)} className="w-full">
                Close Scanner
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main QR Scanner Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-6 w-6" />
                Patient QR Code Scanner
              </CardTitle>
              <CardDescription>Scan patient QR codes to request access to their medical records</CardDescription>
            </div>
            {recentScans.length > 0 && <Badge variant="secondary">{recentScans.length} recent scans</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!scannerActive ? (
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <QrCode className="h-12 w-12 text-blue-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Ready to Scan</h3>
                <p className="text-muted-foreground mb-4">
                  Ask the patient to show their health QR code, then click below to start scanning
                </p>
              </div>

              <Button onClick={() => setScannerActive(true)} size="lg" className="px-8">
                <Camera className="h-5 w-5 mr-2" />
                Start Camera
              </Button>

              {/* Organization Info */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Authorized Organization</span>
                </div>
                <p className="text-sm text-blue-600">{organizationName}</p>
                <p className="text-xs text-blue-500 mt-1">Organization ID: {organizationId}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Camera Active</h3>
                <Button variant="outline" onClick={() => setScannerActive(false)} size="sm">
                  Close Scanner
                </Button>
              </div>

              <QRScanner
                organizationId={organizationId}
                requestingPractitionerId={practitionerId}
                onAuthorizationCreated={handleAuthorizationCreated}
                onError={handleScanError}
              />
            </div>
          )}

          {/* Latest Scan Result */}
          {lastScanResult && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Latest scan: {lastScanResult.patient.name}</span>
                    <br />
                    <span className="text-sm">Grant ID: {lastScanResult.grantId}</span>
                  </div>
                  {getStatusBadge(lastScanResult.status)}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      {showInstructions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              How to Use
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <p className="font-medium">Ask Patient for QR Code</p>
                  <p className="text-sm text-muted-foreground">
                    Patient opens their health app and displays their QR code
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <p className="font-medium">Scan QR Code</p>
                  <p className="text-sm text-muted-foreground">
                    Click "Start Camera" and position the QR code in the frame
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <p className="font-medium">Wait for Patient Approval</p>
                  <p className="text-sm text-muted-foreground">
                    Patient receives notification and approves access request
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">
                  4
                </div>
                <div>
                  <p className="font-medium">Access Patient Records</p>
                  <p className="text-sm text-muted-foreground">
                    Once approved, access patient data according to granted permissions
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg mt-4">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-700 font-medium">Security Note</p>
                  <p className="text-xs text-blue-600 mt-1">
                    All access requests are encrypted and logged. Patient approval is required for each session.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Scans */}
      {showRecentScans && recentScans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Scans ({recentScans.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentScans.map((scan, index) => (
                <div key={scan.grantId} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{scan.patient.name}</h4>
                      <p className="text-xs text-muted-foreground">ID: {scan.patient.digitalIdentifier}</p>
                    </div>
                    {getStatusBadge(scan.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p>{scan.timeWindowHours}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p className="text-xs">{new Date(scan.expiresAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Requested Permissions</p>
                    <div className="flex flex-wrap gap-1">
                      {formatPermissions(scan.accessScope).map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default QRScannerWidget;
