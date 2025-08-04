"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Users, Building2, QrCode, TestTube } from "lucide-react";
import QRScanner from "@/components/qr-scanner";
import TestQRGenerator from "@/components/test-qr-generator";

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

export default function QRScanningDemoPage() {
  const [lastScanResult, setLastScanResult] = useState<AuthorizationRequestData | null>(null);
  const [scanHistory, setScanHistory] = useState<AuthorizationRequestData[]>([]);
  const [activeTab, setActiveTab] = useState("generator");

  const handleAuthorizationCreated = (data: AuthorizationRequestData) => {
    setLastScanResult(data);
    setScanHistory((prev) => [data, ...prev.slice(0, 4)]); // Keep last 5 results
    // Switch to scanner tab to show results
    setActiveTab("scanner");
  };

  const handleScanError = (error: string) => {
    console.error("Scan Error:", error);
  };

  // Demo organization and practitioner IDs
  const demoOrgId = "org_demo_clinic_abc123";
  const demoPractitionerId = "prac_demo_doc_xyz789";

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold">QR Scanning Demo</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-2">Healthcare Provider QR Code Authorization System</p>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Live Demo Environment
          </Badge>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Generator
            </TabsTrigger>
            <TabsTrigger value="scanner" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              QR Scanner
              {scanHistory.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {scanHistory.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* QR Generator Tab */}
          <TabsContent value="generator" className="space-y-6">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TestQRGenerator />
              </div>

              <div className="lg:col-span-1 space-y-6">
                {/* Instructions */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-blue-700">Testing Instructions</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-blue-600 space-y-3">
                    <div>
                      <p className="font-medium">Step 1: Generate QR Code</p>
                      <p>Use the generator to create a test patient QR code</p>
                    </div>
                    <div>
                      <p className="font-medium">Step 2: Switch to Scanner</p>
                      <p>Click the "QR Scanner" tab above</p>
                    </div>
                    <div>
                      <p className="font-medium">Step 3: Scan & Test</p>
                      <p>Start the camera and scan your generated QR code</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Demo Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Demo Organization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-2">
                      <div>
                        <p className="font-medium">Organization</p>
                        <p className="text-muted-foreground">Demo Medical Clinic</p>
                      </div>
                      <div>
                        <p className="font-medium">Organization ID</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{demoOrgId}</code>
                      </div>
                      <div>
                        <p className="font-medium">Practitioner ID</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{demoPractitionerId}</code>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* QR Scanner Tab */}
          <TabsContent value="scanner" className="space-y-6">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* QR Scanner - Main Column */}
              <div className="lg:col-span-2">
                <QRScanner
                  organizationId={demoOrgId}
                  requestingPractitionerId={demoPractitionerId}
                  onAuthorizationCreated={handleAuthorizationCreated}
                  onError={handleScanError}
                  className="h-full"
                />
              </div>

              {/* Sidebar - Results and Info */}
              <div className="lg:col-span-1 space-y-6">
                {/* Latest Scan Result */}
                {lastScanResult && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-green-700 flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Latest Scan Result
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="font-medium text-green-800">{lastScanResult.patient.name}</p>
                        <p className="text-sm text-green-600">Status: {lastScanResult.status}</p>
                      </div>
                      <div className="text-xs space-y-1">
                        <p>
                          <strong>Grant ID:</strong> {lastScanResult.grantId}
                        </p>
                        <p>
                          <strong>Duration:</strong> {lastScanResult.timeWindowHours}h
                        </p>
                        <p>
                          <strong>Patient ID:</strong> {lastScanResult.patient.digitalIdentifier}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Default Permissions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Default Permissions</CardTitle>
                    <CardDescription>Requested access scope</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-2">
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        ✓ Medical History
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        ✓ Prescriptions
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500 border-gray-200">
                        ✗ Create Encounters
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500 border-gray-200">
                        ✗ Audit Logs
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Scan History */}
                {scanHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Recent Scans ({scanHistory.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {scanHistory.map((scan, index) => (
                          <div key={scan.grantId} className="p-3 bg-muted rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-sm">{scan.patient.name}</p>
                                <p className="text-xs text-muted-foreground">{scan.patient.digitalIdentifier}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {scan.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Healthcare Authorization QR Code System - Demo Environment</p>
          <p>All scans are logged and audited according to HIPAA compliance requirements</p>
        </div>
      </div>
    </main>
  );
}
