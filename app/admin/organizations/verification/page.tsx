"use client";

import { useAuth } from "@/contexts/AuthContext";
import { OrganizationVerificationPanel } from "@/components/admin/OrganizationVerificationPanel";
import { AdminNavBar, AdminBreadcrumb } from "@/components/admin/AdminNavBar";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminOrganizationVerificationPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>Please log in to access the admin panel.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>Access denied. Admin privileges required.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavBar />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <AdminBreadcrumb
          items={[
            { title: "Dashboard", href: "/dashboard" },
            { title: "Organizations", href: "/admin/organizations" },
            { title: "Verification" },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Organization Verification</h1>
          <p className="text-gray-600 mt-2">
            Review and approve organization registration requests to ensure platform security and compliance.
          </p>
        </div>

        <OrganizationVerificationPanel />
      </div>
    </div>
  );
}
