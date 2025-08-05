"use client";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useAuth } from "@/contexts/AuthContext";
import { AccessControl } from "@/components/patient/AccessControl";
import { PatientOnly } from "@/components/auth/PermissionGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Header with back navigation */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Settings
            </h1>
            <p className="mt-2 text-gray-600">Manage your account preferences and privacy settings</p>
          </div>
        </div>

        {/* Settings Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Settings Categories</CardTitle>
                <CardDescription>Configure your account and privacy preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <nav className="space-y-2">
                  <PatientOnly>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="font-medium text-blue-900">Access Control</h3>
                      <p className="text-sm text-blue-700 mt-1">Manage who can access your medical records</p>
                    </div>
                  </PatientOnly>

                  {/* Future settings categories can be added here */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-60">
                    <h3 className="font-medium text-gray-600">Profile Settings</h3>
                    <p className="text-sm text-gray-500 mt-1">Update your personal information (Coming Soon)</p>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-60">
                    <h3 className="font-medium text-gray-600">Notifications</h3>
                    <p className="text-sm text-gray-500 mt-1">Configure email and SMS preferences (Coming Soon)</p>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-60">
                    <h3 className="font-medium text-gray-600">Security</h3>
                    <p className="text-sm text-gray-500 mt-1">Password and authentication settings (Coming Soon)</p>
                  </div>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Settings Content */}
          <div className="lg:col-span-2">
            <PatientOnly>
              {user && <AccessControl userId={user.digitalIdentifier || user.id} className="w-full" />}
            </PatientOnly>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
