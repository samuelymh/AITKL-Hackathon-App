"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  MessageSquare,
  Settings,
  Eye,
} from "lucide-react";
import { QRScannerWidget } from "@/components/healthcare/QRScannerWidget";
import AuthorizationQueue, {
  createDoctorAuthActions,
  type AuthorizationGrant,
} from "@/components/healthcare/AuthorizationQueue";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProfileStatusIcon } from "@/components/ui/profile-status-icon";

interface DoctorStats {
  activeAuthorizations: number;
  pendingRequests: number;
  myRequests: number;
  patientsToday: number;
  patientsThisWeek: number;
  patientsThisMonth: number;
  prescriptionsWritten: number;
  mostCommonDiagnoses: Array<{
    name: string;
    count: number;
  }>;
}

interface DoctorOrganization {
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

export function DoctorDashboard() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState("patients");
  const [stats, setStats] = useState<DoctorStats>({
    activeAuthorizations: 0,
    pendingRequests: 0,
    myRequests: 0,
    patientsToday: 0,
    patientsThisWeek: 0,
    patientsThisMonth: 0,
    prescriptionsWritten: 0,
    mostCommonDiagnoses: [],
  });
  const [doctorOrg, setDoctorOrg] = useState<DoctorOrganization | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [professionalProfileComplete, setProfessionalProfileComplete] = useState<boolean | null>(null);

  // Authorization Queue State
  const [authorizationQueue, setAuthorizationQueue] = useState<AuthorizationGrant[]>([]);
  const [loadingAuthorizations, setLoadingAuthorizations] = useState(true);

  useEffect(() => {
    // Only fetch if user is authenticated and we have a token
    if (!user || !token) {
      setLoadingOrg(false);
      setLoadingStats(false);
      return;
    }

    // Fetch doctor's organization from membership
    const fetchDoctorOrg = async () => {
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        // Add Authorization header if token is available
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch("/api/doctor/organization", {
          method: "GET",
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.organization) {
            setDoctorOrg({
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
            console.error("No organization found for doctor");
            setDoctorOrg(null);
          }
        } else {
          const errorData = await response.json();
          console.error("Failed to fetch doctor organization:", errorData.error);
          setDoctorOrg(null);
        }
      } catch (error) {
        console.error("Error fetching doctor organization:", error);
        setDoctorOrg(null);
      } finally {
        setLoadingOrg(false);
      }
    };

    // Fetch doctor statistics
    const fetchDoctorStats = async () => {
      try {
        const response = await fetch("/api/doctor/stats", {
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
          console.error("Failed to fetch doctor stats:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching doctor stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    // Check professional profile status
    const checkProfessionalProfile = async () => {
      try {
        const response = await fetch("/api/doctor/professional-info", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const result = await response.json();
          setProfessionalProfileComplete(result.data?.isComplete || false);
        } else {
          setProfessionalProfileComplete(false);
        }
      } catch (error) {
        console.error("Error checking professional profile:", error);
        setProfessionalProfileComplete(false);
      }
    };

    fetchDoctorOrg();
    fetchDoctorStats();
    checkProfessionalProfile();
  }, [user, token]);

  // Fetch authorization grants
  useEffect(() => {
    if (!token) {
      setLoadingAuthorizations(false);
      return;
    }

    const fetchAuthorizationQueue = async () => {
      try {
        const response = await fetch(`/api/doctor/authorizations?status=ACTIVE&limit=20`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setAuthorizationQueue(result.data);
          }
        } else {
          console.error("Failed to fetch authorization queue:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching authorization queue:", error);
      } finally {
        setLoadingAuthorizations(false);
      }
    };

    fetchAuthorizationQueue();
  }, [token]);

  // Authorization Queue Handlers
  const handleViewPatientRecordFromAuth = (patientId: string, grantId: string) => {
    console.log("Viewing patient record from authorization:", { patientId, grantId });
    // Navigate to patient record view with the authorization context
    // This ensures the access is properly tracked and authorized
    window.open(`/doctor/patient/${patientId}?grantId=${grantId}`, "_blank");
  };

  const handleViewMedicalHistory = (grantId: string) => {
    console.log("Viewing medical history for grant:", grantId);
    const grant = authorizationQueue.find((g) => g.id === grantId);
    if (grant) {
      window.open(`/doctor/medical-history/${grant.patient.digitalIdentifier}?grantId=${grantId}`, "_blank");
    }
  };

  const handleRequestAccess = (grantId: string) => {
    console.log("Requesting additional access for grant:", grantId);
    // Handle requesting additional access permissions
  };

  const handleCreateEncounter = (grantId: string) => {
    console.log("Creating encounter for grant:", grantId);
    const grant = authorizationQueue.find((g) => g.id === grantId);
    if (grant) {
      window.open(`/doctor/encounter/new/${grant.patient.digitalIdentifier}?grantId=${grantId}`, "_blank");
    }
  };

  const handleWritePrescription = (grantId: string) => {
    console.log("Writing prescription for grant:", grantId);
    const grant = authorizationQueue.find((g) => g.id === grantId);
    if (grant) {
      window.open(`/doctor/prescription/new/${grant.patient.digitalIdentifier}?grantId=${grantId}`, "_blank");
    }
  };

  const handleViewAuditLogs = (grantId: string) => {
    console.log("Viewing audit logs for grant:", grantId);
    const grant = authorizationQueue.find((g) => g.id === grantId);
    if (grant) {
      window.open(`/doctor/audit-logs/${grant.patient.digitalIdentifier}?grantId=${grantId}`, "_blank");
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
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  Welcome, Dr. {user.firstName} {user.lastName}
                </h2>
                <p className="text-gray-600">Licensed Medical Doctor</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Doctor
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Professional Profile Alert */}
      {professionalProfileComplete === false && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="flex items-center justify-between">
              <span>Complete your professional profile to access all healthcare provider features.</span>
              <Link href="/dashboard/doctor-profile">
                <Button variant="outline" size="sm" className="ml-4 flex items-center gap-2">
                  Complete Profile
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Patients Today</p>
                <p className="text-3xl font-bold text-blue-600">{loadingStats ? "..." : stats.patientsToday}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Access</p>
                <p className="text-3xl font-bold text-green-600">{loadingStats ? "..." : stats.activeAuthorizations}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-3xl font-bold text-purple-600">{loadingStats ? "..." : stats.patientsThisWeek}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prescriptions</p>
                <p className="text-3xl font-bold text-orange-600">
                  {loadingStats ? "..." : stats.prescriptionsWritten}
                </p>
              </div>
              <Pill className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="patients" className="flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            Patient Access
          </TabsTrigger>
          <TabsTrigger value="encounters" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Encounters
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Prescriptions
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

        {/* Patient Access Tab */}
        <TabsContent value="patients" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QR Scanner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Patient QR Scanner
                </CardTitle>
                <CardDescription>Scan patient QR codes to request medical record access</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrg && (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-sm text-muted-foreground">Loading scanner...</div>
                  </div>
                )}
                {!loadingOrg && !doctorOrg && (
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">No medical organization found</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Please contact your administrator to add you to a medical organization.
                      </p>
                    </div>
                  </div>
                )}
                {!loadingOrg && doctorOrg && (
                  <div className="space-y-4">
                    {/* Membership Status Banner */}
                    {doctorOrg.isPending && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <AlertTriangle className="w-4 h-4" />
                          <div className="text-sm">
                            <p className="font-medium">Membership Pending Verification</p>
                            <p className="text-xs mt-1">
                              Your medical organization membership is pending administrative approval. You can scan QR
                              codes, but some features may be limited until verification is complete.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Organization Info */}
                    <div className="text-sm text-gray-600 mb-3">
                      <p>
                        <strong>Organization:</strong> {doctorOrg.name}
                      </p>
                      {doctorOrg.department && (
                        <p>
                          <strong>Department:</strong> {doctorOrg.department}
                        </p>
                      )}
                      {doctorOrg.position && (
                        <p>
                          <strong>Position:</strong> {doctorOrg.position}
                        </p>
                      )}
                    </div>

                    <QRScannerWidget
                      organizationId={doctorOrg.id}
                      practitionerId={user?.id}
                      organizationName={doctorOrg.name}
                      compact={true}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Authorization Queue - Shows approved patient access grants */}
            <AuthorizationQueue
              grants={authorizationQueue}
              loading={loadingAuthorizations}
              emptyMessage="No active patient authorizations"
              title="Patient Access Authorizations"
              description="Patients who have granted you access to their records"
              actions={createDoctorAuthActions({
                onViewMedicalHistory: handleViewMedicalHistory,
                onCreateEncounter: handleCreateEncounter,
                onWritePrescription: handleWritePrescription,
                onViewAuditLogs: handleViewAuditLogs,
              })}
              onViewPatientRecord={handleViewPatientRecordFromAuth}
            />
          </div>
        </TabsContent>

        {/* Encounters Tab */}
        <TabsContent value="encounters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Encounters
              </CardTitle>
              <CardDescription>Patient encounters and consultations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900">Today</h4>
                    <p className="text-2xl font-bold text-blue-700">{stats.patientsToday}</p>
                    <p className="text-sm text-blue-600">Patient encounters</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-900">This Week</h4>
                    <p className="text-2xl font-bold text-purple-700">{stats.patientsThisWeek}</p>
                    <p className="text-sm text-purple-600">Total encounters</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900">This Month</h4>
                    <p className="text-2xl font-bold text-green-700">{stats.patientsThisMonth}</p>
                    <p className="text-sm text-green-600">Monthly total</p>
                  </div>
                </div>

                {/* Most Common Diagnoses */}
                {stats.mostCommonDiagnoses.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Most Common Diagnoses This Month</h4>
                    <div className="space-y-2">
                      {stats.mostCommonDiagnoses.map((diagnosis, index) => (
                        <div key={diagnosis.name} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-700">{index + 1}</span>
                            </div>
                            <span className="font-medium">{diagnosis.name}</span>
                          </div>
                          <Badge variant="secondary">{diagnosis.count} cases</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.mostCommonDiagnoses.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No encounter data available</p>
                    <p className="text-sm">Start seeing patients to view encounter statistics</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-5 h-5" />
                Prescription Management
              </CardTitle>
              <CardDescription>Prescriptions written and managed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-900">This Month</h4>
                  <p className="text-2xl font-bold text-orange-700">{stats.prescriptionsWritten}</p>
                  <p className="text-sm text-orange-600">Prescriptions written</p>
                </div>

                <div className="text-center py-8 text-muted-foreground">
                  <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Prescription management system</p>
                  <p className="text-sm">Write and track prescriptions for your patients</p>
                  <Button className="mt-4" variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Write New Prescription
                  </Button>
                </div>
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
              <CardDescription>Your recent medical practice activities</CardDescription>
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
                      <h4 className="font-medium text-blue-900">Active Access</h4>
                      <p className="text-2xl font-bold text-blue-700">{stats.activeAuthorizations}</p>
                      <p className="text-sm text-blue-600">Patient authorizations</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-medium text-yellow-900">Pending</h4>
                      <p className="text-2xl font-bold text-yellow-700">{stats.pendingRequests}</p>
                      <p className="text-sm text-yellow-600">Access requests</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-medium text-purple-900">My Requests</h4>
                      <p className="text-2xl font-bold text-purple-700">{stats.myRequests}</p>
                      <p className="text-sm text-purple-600">Initiated by me</p>
                    </div>
                  </div>

                  {/* Recent Activity Placeholder */}
                  <div className="space-y-3 mt-6">
                    <h4 className="font-medium">Recent Actions</h4>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">System ready for patient consultations</p>
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
                Doctor Settings
              </CardTitle>
              <CardDescription>Configure your medical practice dashboard preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        professionalProfileComplete ? "bg-green-100" : "bg-orange-100"
                      }`}
                    >
                      <ProfileStatusIcon isComplete={professionalProfileComplete || false} />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {professionalProfileComplete ? "Profile Complete" : "Profile Incomplete"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {professionalProfileComplete
                          ? "Your professional information is complete and verified."
                          : "Complete your professional profile to access all features."}
                      </p>
                    </div>
                  </div>
                  <Link href="/dashboard/doctor-profile">
                    <Button variant={professionalProfileComplete ? "outline" : "default"}>
                      <Edit className="h-4 w-4 mr-2" />
                      {professionalProfileComplete ? "Edit Profile" : "Complete Profile"}
                    </Button>
                  </Link>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Medical Practice Features</h4>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Stethoscope className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Medical License & Specialty</p>
                        <p className="text-sm text-muted-foreground">
                          License verification and medical specialty information
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <BadgeCheck className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Board Certifications</p>
                        <p className="text-sm text-muted-foreground">
                          Medical board certifications and additional qualifications
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Building className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Hospital & Department</p>
                        <p className="text-sm text-muted-foreground">
                          Hospital or clinic affiliation and department details
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Shield className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Emergency Contact</p>
                        <p className="text-sm text-muted-foreground">Professional emergency contact information</p>
                      </div>
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
