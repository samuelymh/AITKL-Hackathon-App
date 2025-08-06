"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Pill,
  Clock,
  QrCode,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Package,
  MessageSquare,
  History,
  Settings,
  User,
  XCircle,
  Eye,
} from "lucide-react";
import { QRScannerWidget } from "@/components/healthcare/QRScannerWidget";
import PrescriptionQueue, {
  createPharmacistActions,
  type PrescriptionRequest,
} from "@/components/healthcare/PrescriptionQueue";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface PharmacistStats {
  prescriptionsToday: number;
  pendingVerifications: number;
  consultationsScheduled: number;
  inventoryAlerts: number;
  prescriptionsThisWeek: number;
  prescriptionsThisMonth: number;
  mostCommonMedications: Array<{
    name: string;
    count: number;
  }>;
}

interface InventoryAlert {
  medicationName: string;
  currentStock: number;
  minimumThreshold: number;
  severity: "low" | "critical" | "out_of_stock";
}

interface ConsultationAppointment {
  id: string;
  patientName: string;
  time: string;
  type: "medication_review" | "drug_interaction" | "counseling" | "vaccination";
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}

interface PharmacyOrganization {
  id: string;
  name: string;
  type: string;
  registrationNumber: string;
  verified: boolean;
  status?: string;
  isPending?: boolean;
  isVerified?: boolean;
  department?: string;
  position?: string;
  role?: string;
}

export function PharmacistDashboard() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState("prescriptions");
  const [stats, setStats] = useState<PharmacistStats>({
    prescriptionsToday: 0,
    pendingVerifications: 0,
    consultationsScheduled: 0,
    inventoryAlerts: 0,
    prescriptionsThisWeek: 0,
    prescriptionsThisMonth: 0,
    mostCommonMedications: [],
  });
  const [pharmacyOrg, setPharmacyOrg] = useState<PharmacyOrganization | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [prescriptionQueue, setPrescriptionQueue] = useState<PrescriptionRequest[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(true);

  // Remove mock data - will fetch real data from API

  const mockInventoryAlerts: InventoryAlert[] = [
    {
      medicationName: "Insulin Glargine",
      currentStock: 2,
      minimumThreshold: 10,
      severity: "critical",
    },
    {
      medicationName: "Amoxicillin 500mg",
      currentStock: 15,
      minimumThreshold: 25,
      severity: "low",
    },
    {
      medicationName: "Atorvastatin 20mg",
      currentStock: 0,
      minimumThreshold: 20,
      severity: "out_of_stock",
    },
  ];

  const mockConsultations: ConsultationAppointment[] = [
    {
      id: "CONS-001",
      patientName: "Mary Chen",
      time: "2:00 PM",
      type: "medication_review",
      status: "scheduled",
    },
    {
      id: "CONS-002",
      patientName: "Robert Wilson",
      time: "3:30 PM",
      type: "drug_interaction",
      status: "scheduled",
    },
  ];

  useEffect(() => {
    // Only fetch if user is authenticated and we have a token
    if (!user || !token) {
      setLoadingOrg(false);
      setLoadingStats(false);
      return;
    }

    // Fetch pharmacist's organization from membership
    const fetchPharmacyOrg = async () => {
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        // Add Authorization header if token is available
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch("/api/pharmacist/organization", {
          method: "GET",
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.organization) {
            setPharmacyOrg({
              id: data.organization.id,
              name: data.organization.name,
              type: data.organization.type,
              registrationNumber: data.organization.registrationNumber || "",
              verified: data.organization.isVerified || false,
              status: data.organization.status,
              isPending: data.organization.isPending || false,
              isVerified: data.organization.isVerified || false,
              department: data.organization.department,
              position: data.organization.position,
              role: data.organization.role,
            });
          } else {
            console.error("No organization found for pharmacist");
            setPharmacyOrg(null);
          }
        } else {
          const errorData = await response.json();
          console.error("Failed to fetch pharmacist organization:", errorData.error);
          setPharmacyOrg(null);
        }
      } catch (error) {
        console.error("Error fetching pharmacist organization:", error);
        setPharmacyOrg(null);
      } finally {
        setLoadingOrg(false);
      }
    };

    // Fetch pharmacy statistics
    const fetchPharmacyStats = async () => {
      try {
        const response = await fetch("/api/pharmacist/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setStats(result.data);
          }
        } else {
          console.error("Failed to fetch pharmacy stats:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching pharmacy stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchPharmacyOrg();
    fetchPharmacyStats();
  }, [user, token]);

  // Fetch prescription queue (real prescription data for this pharmacist)
  useEffect(() => {
    if (!token) {
      setLoadingPrescriptions(false);
      return;
    }

    const fetchPrescriptionQueue = async () => {
      try {
        const response = await fetch(`/api/pharmacist/prescriptions?status=pending&limit=20`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setPrescriptionQueue(result.data);
          }
        } else {
          console.error("Failed to fetch prescription queue:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching prescription queue:", error);
      } finally {
        setLoadingPrescriptions(false);
      }
    };

    fetchPrescriptionQueue(); // Initial fetch only

    // No automatic polling - data refreshes only on page reload or manual action
  }, [token]);

  const handlePrescriptionAction = async (prescriptionId: string, action: "dispense" | "cancel") => {
    if (!token) return;

    try {
      // For now, we'll just update the status locally
      // In a real implementation, this would call an API to update prescription status
      setPrescriptionQueue((prev) =>
        prev.map((p) =>
          p.id === prescriptionId ? { ...p, status: action === "dispense" ? "FILLED" : "CANCELLED" } : p
        )
      );

      // Update stats
      setStats((prev) => ({
        ...prev,
        pendingVerifications: prev.pendingVerifications - 1,
        prescriptionsToday: action === "dispense" ? prev.prescriptionsToday + 1 : prev.prescriptionsToday,
      }));

      console.log(`Prescription ${action}d successfully`);
    } catch (error) {
      console.error(`Error ${action}ing prescription:`, error);
    }
  };

  const handleViewPatientRecord = (patientId: string) => {
    console.log("Viewing patient record for:", patientId);
    // This would typically open a modal or navigate to a patient record view
    // For now, we'll just log it
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600";
      case "out_of_stock":
        return "text-red-800";
      case "low":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Pill className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  Welcome, {user.firstName} {user.lastName}
                </h2>
                <p className="text-gray-600">Licensed Pharmacist</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Pharmacist
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prescriptions Today</p>
                <p className="text-3xl font-bold text-green-600">{loadingStats ? "..." : stats.prescriptionsToday}</p>
              </div>
              <Pill className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Verifications</p>
                <p className="text-3xl font-bold text-orange-600">
                  {loadingStats ? "..." : stats.pendingVerifications}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-3xl font-bold text-blue-600">{loadingStats ? "..." : stats.prescriptionsThisWeek}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-3xl font-bold text-purple-600">
                  {loadingStats ? "..." : stats.prescriptionsThisMonth}
                </p>
              </div>
              <History className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="prescriptions" className="flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            Prescriptions
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="consultations" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Consultations
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QR Scanner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Prescription Scanner
                </CardTitle>
                <CardDescription>Scan prescription QR codes to verify and process medications</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrg && (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-sm text-muted-foreground">Loading scanner...</div>
                  </div>
                )}
                {!loadingOrg && !pharmacyOrg && (
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">No pharmacy organization found</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Please contact your administrator to add you to a pharmacy organization.
                      </p>
                    </div>
                  </div>
                )}
                {!loadingOrg && pharmacyOrg && (
                  <div className="space-y-4">
                    {/* Membership Status Banner */}
                    {pharmacyOrg.isPending && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <AlertTriangle className="w-4 h-4" />
                          <div className="text-sm">
                            <p className="font-medium">Membership Pending Verification</p>
                            <p className="text-xs mt-1">
                              Your pharmacy membership is pending administrative approval. You can scan QR codes, but
                              some features may be limited until verification is complete.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Organization Info */}
                    <div className="text-sm text-gray-600 mb-3">
                      <p>
                        <strong>Organization:</strong> {pharmacyOrg.name}
                      </p>
                      {pharmacyOrg.department && (
                        <p>
                          <strong>Department:</strong> {pharmacyOrg.department}
                        </p>
                      )}
                      {pharmacyOrg.position && (
                        <p>
                          <strong>Position:</strong> {pharmacyOrg.position}
                        </p>
                      )}
                    </div>

                    <QRScannerWidget
                      organizationId={pharmacyOrg.id}
                      practitionerId={user?.id}
                      organizationName={pharmacyOrg.name}
                      compact={true}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prescription Queue */}
            <PrescriptionQueue
              prescriptions={prescriptionQueue}
              loading={loadingPrescriptions}
              emptyMessage="No pending prescriptions"
              title="Prescription Queue"
              description="Pending prescriptions requiring attention"
              actions={createPharmacistActions({
                onDispense: (prescriptionId: string) => handlePrescriptionAction(prescriptionId, "dispense"),
                onCancel: (prescriptionId: string) => handlePrescriptionAction(prescriptionId, "cancel"),
              })}
              onViewPatientRecord={handleViewPatientRecord}
            />
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Inventory Alerts
              </CardTitle>
              <CardDescription>Medications requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockInventoryAlerts.map((alert) => (
                  <div
                    key={`${alert.medicationName}-${alert.severity}`}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium">{alert.medicationName}</p>
                      <p className="text-sm text-gray-600">
                        Current: {alert.currentStock} | Minimum: {alert.minimumThreshold}
                      </p>
                    </div>
                    <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                      {alert.severity.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consultations Tab */}
        <TabsContent value="consultations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Scheduled Consultations
              </CardTitle>
              <CardDescription>Today's patient consultations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockConsultations.map((consultation) => (
                  <div key={consultation.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{consultation.patientName}</p>
                      <p className="text-sm text-gray-600">
                        {consultation.time} • {consultation.type.replace("_", " ")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      {consultation.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your recent pharmacy activities</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-gray-500">Loading activity...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Statistics Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900">This Week</h4>
                      <p className="text-2xl font-bold text-blue-700">{stats.prescriptionsThisWeek}</p>
                      <p className="text-sm text-blue-600">Prescriptions processed</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900">This Month</h4>
                      <p className="text-2xl font-bold text-green-700">{stats.prescriptionsThisMonth}</p>
                      <p className="text-sm text-green-600">Total prescriptions</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-medium text-purple-900">Active</h4>
                      <p className="text-2xl font-bold text-purple-700">{stats.pendingVerifications}</p>
                      <p className="text-sm text-purple-600">Pending verifications</p>
                    </div>
                  </div>

                  {/* Most Common Medications */}
                  {stats.mostCommonMedications.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Most Prescribed Medications This Month</h4>
                      <div className="space-y-2">
                        {stats.mostCommonMedications.map((med, index) => (
                          <div key={med.name} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-700">{index + 1}</span>
                              </div>
                              <span className="font-medium">{med.name}</span>
                            </div>
                            <Badge variant="secondary">{med.count} prescriptions</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Activity Placeholder */}
                  <div className="space-y-3 mt-6">
                    <h4 className="font-medium">Recent Actions</h4>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">System ready for prescription processing</p>
                        <p className="text-sm text-gray-600">
                          Ready to serve patients • {new Date().toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Pharmacy Settings
              </CardTitle>
              <CardDescription>Configure your pharmacy dashboard preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Drug Interaction Alerts</p>
                    <p className="text-sm text-gray-600">Show warnings for potential drug interactions</p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    Enabled
                  </Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Inventory Notifications</p>
                    <p className="text-sm text-gray-600">Alert when medication stock is low</p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    Enabled
                  </Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Professional Profile</p>
                    <p className="text-sm text-gray-600">Complete your pharmacist credentials</p>
                  </div>
                  <Link href="/dashboard/pharmacist/professional-profile">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Manage Profile
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PharmacistDashboard;
