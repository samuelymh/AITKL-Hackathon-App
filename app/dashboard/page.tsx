"use client";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { PharmacistLayout } from "@/components/layout/PharmacistNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QRCodeManager } from "@/components/patient/QRCodeManager";
import { AuthorizationRequests } from "@/components/patient/AuthorizationRequests";
import { MedicalProfileSummary } from "@/components/patient/MedicalProfileSummary";
import UploadDocs from "@/components/upload-docs";
import { DoctorDashboard } from "@/components/healthcare/DoctorDashboard";
import { PharmacistDashboard } from "@/components/healthcare/PharmacistDashboard";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Settings, ArrowRight } from "lucide-react";
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
        {user?.role === "admin" && <AdminDashboard />}

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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <QRCodeManager user={user} className="xl:col-span-1" />
              <div className="space-y-6">
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
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
