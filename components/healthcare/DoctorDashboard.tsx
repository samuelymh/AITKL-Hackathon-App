"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Stethoscope,
  Users,
  Calendar,
  Clock,
  Activity,
  FileText,
  Edit,
  QrCode,
  TrendingUp,
  Pill,
  CheckCircle,
  UserCheck,
  History,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building,
  Shield,
} from "lucide-react";
import { QRScannerWidget } from "@/components/healthcare/QRScannerWidget";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProfileStatusIcon } from "@/components/ui/profile-status-icon";

interface PatientAccess {
  grantId: string;
  patient: {
    name: string;
    digitalIdentifier: string;
    age?: number;
    bloodType?: string;
  };
  status: string;
  grantedAt: string;
  expiresAt: string;
  accessScope: {
    canViewMedicalHistory: boolean;
    canViewPrescriptions: boolean;
    canCreateEncounters: boolean;
    canViewAuditLogs: boolean;
  };
}

interface DoctorStats {
  patientsToday: number;
  activeAccess: number;
  pendingRequests: number;
  prescriptionsWritten: number;
}

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  type: string;
  status: "confirmed" | "waiting" | "completed" | "cancelled";
}

export function DoctorDashboard() {
  const { user, token, refreshAuthToken, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [recentAccess, setRecentAccess] = useState<PatientAccess[]>([]);
  const [professionalProfileComplete, setProfessionalProfileComplete] =
    useState<boolean | null>(null);
  const [stats, setStats] = useState<DoctorStats>({
    patientsToday: 0,
    activeAccess: 0,
    pendingRequests: 0,
    prescriptionsWritten: 0,
  });

  // Mock data for demonstration - in real app, this would come from API
  const [appointments] = useState<Appointment[]>([
    {
      id: "1",
      patientName: "Sarah Chen",
      time: "10:00 AM",
      type: "Follow-up",
      status: "confirmed",
    },
    {
      id: "2",
      patientName: "John Doe",
      time: "11:30 AM",
      type: "Consultation",
      status: "waiting",
    },
    {
      id: "3",
      patientName: "Jane Smith",
      time: "2:00 PM",
      type: "Check-up",
      status: "confirmed",
    },
    {
      id: "4",
      patientName: "Mike Johnson",
      time: "3:30 PM",
      type: "Prescription Review",
      status: "confirmed",
    },
  ]);

  useEffect(() => {
    // Load doctor dashboard data
    loadDashboardData();
    checkProfessionalProfile();
  }, []);

  const loadDashboardData = async () => {
    // In real implementation, these would be API calls
    setStats({
      patientsToday: appointments.length,
      activeAccess: 2,
      pendingRequests: 1,
      prescriptionsWritten: 5,
    });
  };

  const checkProfessionalProfile = async () => {
    try {
      if (!token) {
        setProfessionalProfileComplete(false);
        return;
      }

      const response = await fetch("/api/doctor/professional-info", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        setProfessionalProfileComplete(result.data?.isComplete || false);
      } else if (response.status === 401) {
        // Try to refresh token
        await refreshAuthToken();
        // Don't retry immediately, let the next render handle it
        setProfessionalProfileComplete(false);
      } else {
        setProfessionalProfileComplete(false);
      }
    } catch (error) {
      console.error("Error checking professional profile:", error);
      setProfessionalProfileComplete(false);
    }
  };

  const handleAuthorizationCreated = (data: any) => {
    // Update recent access list
    const newAccess: PatientAccess = {
      grantId: data.grantId,
      patient: {
        name: data.patient.name,
        digitalIdentifier: data.patient.digitalIdentifier,
      },
      status: data.status,
      grantedAt: new Date().toISOString(),
      expiresAt: data.expiresAt,
      accessScope: data.accessScope,
    };

    setRecentAccess((prev) => [newAccess, ...prev.slice(0, 9)]);

    // Update stats
    setStats((prev) => ({
      ...prev,
      pendingRequests: prev.pendingRequests + 1,
    }));

    // Switch to patient access tab to show the result
    setActiveTab("access");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Confirmed
          </Badge>
        );
      case "waiting":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Waiting
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Cancelled
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending
          </Badge>
        );
      case "ACTIVE":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Active
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOrganizationInfo = () => {
    // In real app, this would come from user context or API
    // For now, using demo values based on role
    return {
      organizationId: "org_demo_clinic_123",
      practitionerId: user?.digitalIdentifier || "prac_demo_doctor_456",
      organizationName: "Medical Center",
    };
  };

  const orgInfo = getOrganizationInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Stethoscope className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, Dr. {user?.firstName} {user?.lastName}
          </p>
        </div>
      </div>

      {/* Professional Profile Alert */}
      {professionalProfileComplete === false && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="flex items-center justify-between">
              <span>
                Complete your professional profile to access all healthcare
                provider features.
              </span>
              <Link href="/dashboard/doctor-profile">
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4 flex items-center gap-2"
                >
                  Complete Profile
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.patientsToday}</p>
                <p className="text-sm text-muted-foreground">Patients Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeAccess}</p>
                <p className="text-sm text-muted-foreground">Active Access</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                <p className="text-sm text-muted-foreground">
                  Pending Requests
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Pill className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.prescriptionsWritten}
                </p>
                <p className="text-sm text-muted-foreground">Prescriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="scanner" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Scanner
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Patient Access
            {recentAccess.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {recentAccess.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Appointments
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Profile
            {professionalProfileComplete === false && (
              <div className="w-2 h-2 bg-orange-500 rounded-full ml-1"></div>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Today's Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {appointments.slice(0, 4).map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <p className="font-medium">{appointment.patientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.time} • {appointment.type}
                        </p>
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => setActiveTab("scanner")}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Scan Patient QR Code
                </Button>

                <Button className="w-full justify-start" variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Write Prescription
                </Button>

                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Patient Records
                </Button>

                <Button
                  onClick={() => setActiveTab("access")}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Patient Access
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentAccess.length > 0 ? (
                <div className="space-y-3">
                  {recentAccess.slice(0, 3).map((access) => (
                    <div
                      key={access.grantId}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <p className="font-medium">{access.patient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Access requested •{" "}
                          {new Date(access.grantedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      {getStatusBadge(access.status)}
                    </div>
                  ))}
                  <Separator />
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("access")}
                    className="w-full"
                  >
                    View All Access Requests
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent patient access activity</p>
                  <p className="text-sm">
                    Start by scanning a patient's QR code
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR Scanner Tab */}
        <TabsContent value="scanner" className="space-y-6">
          <QRScannerWidget
            organizationId={orgInfo.organizationId}
            practitionerId={orgInfo.practitionerId}
            organizationName={orgInfo.organizationName}
            onAuthorizationCreated={handleAuthorizationCreated}
            showInstructions={true}
            showRecentScans={false}
          />
        </TabsContent>

        {/* Patient Access Tab */}
        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Patient Access Management
              </CardTitle>
              <CardDescription>
                Track and manage your patient access requests and active
                sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentAccess.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No patient access requests yet</p>
                  <p className="text-sm">
                    Scan a patient QR code to get started
                  </p>
                  <Button
                    onClick={() => setActiveTab("scanner")}
                    className="mt-4"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Open QR Scanner
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {recentAccess.map((access) => (
                      <div
                        key={access.grantId}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {access.patient.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              ID: {access.patient.digitalIdentifier}
                            </p>
                          </div>
                          {getStatusBadge(access.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Grant ID</p>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {access.grantId}
                            </code>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Expires</p>
                            <p className="text-xs">
                              {new Date(access.expiresAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Access Permissions
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <Badge
                              variant={
                                access.accessScope.canViewMedicalHistory
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs justify-center"
                            >
                              {access.accessScope.canViewMedicalHistory
                                ? "✓"
                                : "✗"}{" "}
                              Medical History
                            </Badge>
                            <Badge
                              variant={
                                access.accessScope.canViewPrescriptions
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs justify-center"
                            >
                              {access.accessScope.canViewPrescriptions
                                ? "✓"
                                : "✗"}{" "}
                              Prescriptions
                            </Badge>
                            <Badge
                              variant={
                                access.accessScope.canCreateEncounters
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs justify-center"
                            >
                              {access.accessScope.canCreateEncounters
                                ? "✓"
                                : "✗"}{" "}
                              Create Encounters
                            </Badge>
                            <Badge
                              variant={
                                access.accessScope.canViewAuditLogs
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs justify-center"
                            >
                              {access.accessScope.canViewAuditLogs ? "✓" : "✗"}{" "}
                              Audit Logs
                            </Badge>
                          </div>
                        </div>

                        {access.status === "ACTIVE" && (
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" className="flex-1">
                              <FileText className="h-4 w-4 mr-2" />
                              View Records
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              New Encounter
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Appointments
              </CardTitle>
              <CardDescription>
                Manage your scheduled appointments for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {appointment.patientName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {appointment.time} • {appointment.type}
                        </p>
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        View Records
                      </Button>
                      <Button size="sm" variant="outline">
                        <QrCode className="h-4 w-4 mr-2" />
                        Request Access
                      </Button>
                      {appointment.status === "waiting" && (
                        <Button size="sm">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Start Consultation
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings/Profile Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Professional Profile
              </CardTitle>
              <CardDescription>
                Manage your professional information and credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      professionalProfileComplete
                        ? "bg-green-100"
                        : "bg-orange-100"
                    }`}
                  >
                    <ProfileStatusIcon
                      isComplete={professionalProfileComplete || false}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {professionalProfileComplete
                        ? "Profile Complete"
                        : "Profile Incomplete"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {professionalProfileComplete
                        ? "Your professional information is complete and verified."
                        : "Complete your professional profile to access all features."}
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/doctor-profile">
                  <Button
                    variant={
                      professionalProfileComplete ? "outline" : "default"
                    }
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {professionalProfileComplete
                      ? "Edit Profile"
                      : "Complete Profile"}
                  </Button>
                </Link>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Profile Features</h4>
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Stethoscope className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Medical License & Specialty</p>
                      <p className="text-sm text-muted-foreground">
                        License verification and specialty information
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <BadgeCheck className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Professional Certifications</p>
                      <p className="text-sm text-muted-foreground">
                        Board certifications and additional qualifications
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Building className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Organization & Department</p>
                      <p className="text-sm text-muted-foreground">
                        Hospital or clinic affiliation details
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Shield className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium">Emergency Contact</p>
                      <p className="text-sm text-muted-foreground">
                        Professional emergency contact information
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DoctorDashboard;
