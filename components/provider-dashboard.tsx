"use client";

import React, { useState } from "react";
import { Building2, Users, Clock, CheckCircle, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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

interface ProviderDashboardProps {
  organizationId: string;
  practitionerId?: string;
  organizationName?: string;
  organizationType?: string;
}

export function ProviderDashboard({
  organizationId,
  practitionerId,
  organizationName = "Healthcare Organization",
  organizationType = "Hospital",
}: Readonly<ProviderDashboardProps>) {
  const [recentRequests, setRecentRequests] = useState<
    AuthorizationRequestData[]
  >([]);
  const [activeTab, setActiveTab] = useState("scan");

  const handleAuthorizationCreated = (data: AuthorizationRequestData) => {
    setRecentRequests((prev) => [data, ...prev.slice(0, 9)]); // Keep last 10 requests

    // Show success notification and switch to requests tab
    setTimeout(() => {
      setActiveTab("requests");
    }, 2000);
  };

  const handleScanError = (error: string) => {
    console.error("QR Scan Error:", error);
    // Handle error display
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Pending
          </Badge>
        );
      case "ACTIVE":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Active
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            Expired
          </Badge>
        );
      case "REVOKED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            Revoked
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPermissions = (
    accessScope: AuthorizationRequestData["accessScope"],
  ) => {
    const permissions = [];
    if (accessScope.canViewMedicalHistory) permissions.push("Medical History");
    if (accessScope.canViewPrescriptions) permissions.push("Prescriptions");
    if (accessScope.canCreateEncounters) permissions.push("Create Encounters");
    if (accessScope.canViewAuditLogs) permissions.push("Audit Logs");
    return permissions;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{organizationName}</h1>
            <p className="text-muted-foreground">
              {organizationType} Provider Portal
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scan" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            QR Scanner
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Authorization Requests
            {recentRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {recentRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Active Access
          </TabsTrigger>
        </TabsList>

        {/* QR Scanner Tab */}
        <TabsContent value="scan" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* QR Scanner */}
            <div className="md:col-span-1">
              <QRScanner
                organizationId={organizationId}
                requestingPractitionerId={practitionerId}
                onAuthorizationCreated={handleAuthorizationCreated}
                onError={handleScanError}
              />
            </div>

            {/* Instructions */}
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>How to Use</CardTitle>
                  <CardDescription>
                    Follow these steps to request patient access
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Ask Patient for QR Code</p>
                        <p className="text-sm text-muted-foreground">
                          Patient opens their health app and displays their QR
                          code
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
                          Click "Start Camera" and position the QR code in the
                          frame
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
                          Patient receives notification and approves access
                          request
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
                          Once approved, access patient data according to
                          granted permissions
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium">
                      Security Note
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      All access requests are encrypted and logged. Patient
                      approval is required for each session.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Authorization Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Authorization Requests
              </CardTitle>
              <CardDescription>
                Track the status of your recent patient access requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No authorization requests yet</p>
                  <p className="text-sm">
                    Scan a patient QR code to get started
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {recentRequests.map((request, index) => (
                      <div
                        key={request.grantId}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {request.patient.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              ID: {request.patient.digitalIdentifier}
                            </p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Grant ID</p>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {request.grantId}
                            </code>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Duration</p>
                            <p>{request.timeWindowHours}h</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Requested Permissions
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {formatPermissions(request.accessScope).map(
                              (permission) => (
                                <Badge
                                  key={permission}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {permission}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Expires:{" "}
                          {new Date(request.expiresAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Access Tab */}
        <TabsContent value="active" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Active Patient Access
              </CardTitle>
              <CardDescription>
                Currently active authorization grants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active access sessions</p>
                <p className="text-sm">
                  Approved authorization requests will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProviderDashboard;
