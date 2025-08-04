"use client";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DoctorOrAdmin,
  PatientOnly,
  HealthcareStaff,
} from "@/components/auth/PermissionGuard";

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
            {user.role
              ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
              : "Patient"}
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PatientOnly>
            <div className="space-y-2">
              <h4 className="font-medium">Patient Actions</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• View medical records</li>
                <li>• Check prescriptions</li>
                <li>• Update profile information</li>
                <li>• Share records with QR code</li>
              </ul>
            </div>
          </PatientOnly>

          <DoctorOrAdmin>
            <div className="space-y-2">
              <h4 className="font-medium">Healthcare Professional Actions</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Manage patient records</li>
                <li>• Create prescriptions</li>
                <li>• View audit logs</li>
                <li>• Access shared records</li>
              </ul>
            </div>
          </DoctorOrAdmin>

          <HealthcareStaff>
            <div className="space-y-2">
              <h4 className="font-medium">System Features</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• User management</li>
                <li>• Document upload</li>
                <li>• Prescription management</li>
                <li>• System monitoring</li>
              </ul>
            </div>
          </HealthcareStaff>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemStatusCard() {
  return (
    <DoctorOrAdmin>
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
          </div>
        </CardContent>
      </Card>
    </DoctorOrAdmin>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome to your Health Records System
          </p>
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

        {/* Additional role-specific content */}
        <DoctorOrAdmin>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                This section will show recent user activities, system logs, and
                important notifications.
              </p>
              <div className="mt-4 text-sm text-gray-500">
                Feature coming soon: Real-time activity monitoring
              </div>
            </CardContent>
          </Card>
        </DoctorOrAdmin>

        <PatientOnly>
          <Card>
            <CardHeader>
              <CardTitle>Your Health Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                View your latest medical information, upcoming appointments, and
                prescription status.
              </p>
              <div className="mt-4 text-sm text-gray-500">
                Feature coming soon: Personal health dashboard
              </div>
            </CardContent>
          </Card>
        </PatientOnly>
      </div>
    </ProtectedLayout>
  );
}
