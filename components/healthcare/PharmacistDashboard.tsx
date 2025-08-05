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
} from "lucide-react";
import { QRScannerWidget } from "@/components/healthcare/QRScannerWidget";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface PrescriptionRequest {
  prescriptionId: string;
  patient: {
    name: string;
    digitalIdentifier: string;
    age?: number;
    allergies?: string[];
  };
  medication: {
    name: string;
    dosage: string;
    quantity: number;
    instructions: string;
  };
  prescriber: {
    name: string;
    licenseNumber: string;
  };
  status: "pending" | "verified" | "dispensed" | "consultation_required";
  priority: "normal" | "urgent" | "stat";
  submittedAt: string;
  interactions?: string[];
}

interface PharmacistStats {
  prescriptionsToday: number;
  pendingVerifications: number;
  consultationsScheduled: number;
  inventoryAlerts: number;
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

export function PharmacistDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("prescriptions");
  const [stats, setStats] = useState<PharmacistStats>({
    prescriptionsToday: 0,
    pendingVerifications: 0,
    consultationsScheduled: 0,
    inventoryAlerts: 0,
  });

  // Mock data for development - will be replaced with real API calls
  const mockStats: PharmacistStats = {
    prescriptionsToday: 24,
    pendingVerifications: 8,
    consultationsScheduled: 5,
    inventoryAlerts: 3,
  };

  const mockPrescriptions: PrescriptionRequest[] = [
    {
      prescriptionId: "RX-2025-001",
      patient: {
        name: "Sarah Johnson",
        digitalIdentifier: "P-2024-0891",
        age: 34,
        allergies: ["Penicillin"],
      },
      medication: {
        name: "Metformin",
        dosage: "500mg",
        quantity: 60,
        instructions: "Take twice daily with meals",
      },
      prescriber: {
        name: "Dr. Ahmad Rahman",
        licenseNumber: "MD-12345",
      },
      status: "pending",
      priority: "normal",
      submittedAt: "2025-08-05T09:30:00Z",
    },
    {
      prescriptionId: "RX-2025-002",
      patient: {
        name: "John Doe",
        digitalIdentifier: "P-2024-0892",
        age: 28,
        allergies: [],
      },
      medication: {
        name: "Lisinopril",
        dosage: "10mg",
        quantity: 30,
        instructions: "Take once daily in morning",
      },
      prescriber: {
        name: "Dr. Lisa Wong",
        licenseNumber: "MD-67890",
      },
      status: "verified",
      priority: "normal",
      submittedAt: "2025-08-05T08:15:00Z",
      interactions: ["Monitor potassium levels"],
    },
  ];

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
    // Simulate loading stats from API
    setStats(mockStats);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            Pending
          </Badge>
        );
      case "verified":
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-300">
            Verified
          </Badge>
        );
      case "dispensed":
        return (
          <Badge variant="outline" className="text-green-600 border-green-300">
            Dispensed
          </Badge>
        );
      case "consultation_required":
        return (
          <Badge variant="outline" className="text-red-600 border-red-300">
            Consultation Required
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
                <p className="text-3xl font-bold text-green-600">{stats.prescriptionsToday}</p>
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
                <p className="text-3xl font-bold text-orange-600">{stats.pendingVerifications}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Consultations</p>
                <p className="text-3xl font-bold text-blue-600">{stats.consultationsScheduled}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inventory Alerts</p>
                <p className="text-3xl font-bold text-red-600">{stats.inventoryAlerts}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
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
                <QRScannerWidget
                  organizationId="demo-pharmacy"
                  practitionerId={user?.digitalIdentifier || user?.id}
                  organizationName="Pharmacy"
                  compact={true}
                />
              </CardContent>
            </Card>

            {/* Prescription Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Prescription Queue
                </CardTitle>
                <CardDescription>Pending prescriptions requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {mockPrescriptions.map((prescription) => (
                      <div key={prescription.prescriptionId} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{prescription.patient.name}</p>
                            <p className="text-sm text-gray-600">{prescription.prescriptionId}</p>
                          </div>
                          <div className="flex gap-2">
                            {getPriorityBadge(prescription.priority)}
                            {getStatusBadge(prescription.status)}
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          <p>
                            <strong>{prescription.medication.name}</strong> {prescription.medication.dosage}
                          </p>
                          <p>Qty: {prescription.medication.quantity}</p>
                          <p>Prescriber: {prescription.prescriber.name}</p>
                          {prescription.interactions && (
                            <div className="flex items-center gap-1 text-orange-600">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Drug interaction alert</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
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
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Metformin 500mg dispensed</p>
                    <p className="text-sm text-gray-600">Sarah Johnson • 2:30 PM</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Patient consultation completed</p>
                    <p className="text-sm text-gray-600">John Doe • 1:15 PM</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Drug interaction alert reviewed</p>
                    <p className="text-sm text-gray-600">Mary Chen • 12:45 PM</p>
                  </div>
                </div>
              </div>
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
                  <Link href="/dashboard/pharmacist-profile">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      Edit Profile
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
