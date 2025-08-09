"use client";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { PharmacistLayout } from "@/components/layout/PharmacistNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QRCodeManager } from "@/components/patient/QRCodeManager";
import { AuthorizationRequests } from "@/components/patient/AuthorizationRequests";
import { AuthorizationHistory } from "@/components/patient/AuthorizationHistory";
import { MedicalProfileSummary } from "@/components/patient/MedicalProfileSummary";
import UploadDocs from "@/components/upload-docs";
import { DoctorDashboard } from "@/components/healthcare/DoctorDashboard";
import { PharmacistDashboard } from "@/components/healthcare/PharmacistDashboard";
import EnhancedAdminDashboard from "@/components/admin/EnhancedAdminDashboard";
import AdminAlertsPanel from "@/components/admin/AdminAlertsPanel";
import { AdminNavigation, AdminQuickActions } from "@/components/admin/AdminNavigation";
import ChatTriggerButton from "@/components/ai/ChatTriggerButton";
import { Settings, ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";

function WelcomeCard() {
  const { user } = useAuth();

  if (!user) return null;

  const getRoleDescription = (role: string | undefined) => {
    switch (role) {
      case "admin":
        return "System Administrator - Full access to all features";
      case "doctor":
        return "Medical Professional - Manage patients and prescriptions";
      case "pharmacist":
        return "Pharmacy Staff - Manage prescriptions and medications";
      case "patient":
        return "Patient - View your medical records and prescriptions";
      default:
        return "Patient - View your medical records and prescriptions";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            Welcome, {user.firstName} {user.lastName}
          </span>
          <Badge variant="secondary">
            {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Patient"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">{getRoleDescription(user.role)}</p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Email:</span>
            <span className="text-sm">{user.email}</span>
            {user.emailVerified && (
              <Badge variant="outline" className="text-xs">
                Verified
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Phone:</span>
            <span className="text-sm">{user.phone}</span>
            {user.phoneVerified && (
              <Badge variant="outline" className="text-xs">
                Verified
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">ID:</span>
            <span className="text-sm font-mono">{user.digitalIdentifier}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionsCard() {
  const { user } = useAuth();

  if (!user) return null;

  const renderRoleSpecificActions = () => {
    switch (user.role) {
      case "admin":
        return (
          <div className="space-y-2">
            <h4 className="font-medium">System Administration</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Manage admin users</li>
              <li>• Review organization requests</li>
              <li>• Monitor system health</li>
              <li>• View audit logs</li>
              <li>• Configure security settings</li>
              <li>• System backup and maintenance</li>
            </ul>
          </div>
        );
      case "doctor":
        return (
          <div className="space-y-2">
            <h4 className="font-medium">Healthcare Professional Actions</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Scan patient QR codes</li>
              <li>• Manage patient records</li>
              <li>• Create prescriptions</li>
              <li>• View audit logs</li>
              <li>• Access shared records</li>
              <li>• Schedule appointments</li>
            </ul>
          </div>
        );
      case "pharmacist":
        return (
          <div className="space-y-2">
            <h4 className="font-medium">Pharmacy Actions</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Process prescriptions</li>
              <li>• Verify medications</li>
              <li>• Scan patient QR codes</li>
              <li>• Check drug interactions</li>
              <li>• Update inventory</li>
              <li>• Patient consultation</li>
            </ul>
          </div>
        );
      case "patient":
      default:
        return (
          <div className="space-y-2">
            <h4 className="font-medium">Patient Actions</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Complete medical profile</li>
              <li>• View medical records</li>
              <li>• Check prescriptions</li>
              <li>• Update profile information</li>
              <li>• Share records with QR code</li>
              <li>• Manage access control settings</li>
            </ul>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4">{renderRoleSpecificActions()}</div>
      </CardContent>
    </Card>
  );
}

function SystemStatusCard() {
  const { user } = useAuth();

  // Only show system status for admin and doctor roles
  if (!user || !["admin", "doctor"].includes(user.role)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Database Connection</span>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Active
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Authentication Service</span>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Operational
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Audit Logging</span>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Recording
            </Badge>
          </div>
          {user.role === "admin" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Performance</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  142ms avg
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Security Status</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Secure
                </Badge>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome to your Health Records System</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <WelcomeCard />
            <SystemStatusCard />
          </div>

          <div>
            <QuickActionsCard />
          </div>
        </div>

        {/* Role-specific dashboards */}
        {user?.role === "admin" && (
          <div className="space-y-6">
            {/* Admin Navigation */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
                <p className="text-sm text-gray-600">System administration and management</p>
              </div>
              <AdminNavigation />
            </div>

            {/* Quick Actions */}
            <AdminQuickActions />

            {/* Alerts and Dashboard */}
            <AdminAlertsPanel />
            <EnhancedAdminDashboard />
          </div>
        )}

        {user?.role === "doctor" && <DoctorDashboard />}

        {user?.role === "pharmacist" && (
          <PharmacistLayout
            title="Pharmacist Dashboard"
            description="Manage prescriptions, patient consultations, and pharmacy operations"
            navigationVariant="tabs"
          >
            <PharmacistDashboard />
          </PharmacistLayout>
        )}

        {user?.role === "patient" && (
          <div className="space-y-6">
            {/* Medical Profile Summary - Links to dedicated page */}
            <MedicalProfileSummary userId={user.digitalIdentifier || user.id} />

            {/* QR Code and Authorization Management */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <QRCodeManager user={user} className="xl:col-span-1" />

              {/* AI Health Assistant */}
              <div className="xl:col-span-1">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                      <MessageCircle className="h-5 w-5" />
                      AI Health Assistant
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-blue-700">
                      Get instant health guidance powered by Groq + Llama 3.3 70B
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <ChatTriggerButton
                        sessionType="general"
                        variant="outline"
                        className="justify-start border-blue-200 hover:bg-blue-100"
                      >
                        General Health Questions
                      </ChatTriggerButton>

                      <ChatTriggerButton
                        sessionType="consultation_prep"
                        variant="outline"
                        className="justify-start border-green-200 hover:bg-green-100"
                      >
                        Prepare for Doctor Visit
                      </ChatTriggerButton>

                      <ChatTriggerButton
                        sessionType="medication_education"
                        variant="outline"
                        className="justify-start border-purple-200 hover:bg-purple-100"
                      >
                        Medication Information
                      </ChatTriggerButton>

                      <ChatTriggerButton
                        sessionType="emergency_triage"
                        variant="outline"
                        className="justify-start border-red-200 hover:bg-red-100 text-red-700"
                      >
                        Emergency Guidance
                      </ChatTriggerButton>
                    </div>

                    <div className="text-xs text-gray-600 mt-4">
                      💡 Click any option to start a conversation with our AI assistant
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6 xl:col-span-1">
                <UploadDocs onBack={() => {}} onDataUploaded={() => {}} userId={user.digitalIdentifier || user.id} />
                <AuthorizationRequests userId={user.digitalIdentifier || user.id} />

                {/* Settings Card - Link to dedicated settings page */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Settings & Privacy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      Manage your access control settings, privacy preferences, and account configuration.
                    </p>
                    <Link href="/dashboard/settings">
                      <Button className="w-full flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Open Settings
                        <ArrowRight className="h-4 w-4 ml-auto" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Full-width Authorization Grant History */}
            <AuthorizationHistory userId={user.digitalIdentifier || user.id} />
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
