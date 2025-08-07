"use client";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useAuth } from "@/contexts/AuthContext";
import { MedicalInformation } from "@/components/patient/MedicalInformation";
import { PatientOnly } from "@/components/auth/PermissionGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MedicalProfilePage() {
  const { user } = useAuth();

  return (
    <ProtectedLayout>
      <PatientOnly>
        <div className="space-y-6">
          {/* Header with back navigation */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Medical Profile
              </h1>
              <p className="mt-2 text-gray-600">
                Complete your medical information to help healthcare providers
                give you the best care
              </p>
            </div>
          </div>

          {/* Medical Information Component */}
          {user && (
            <MedicalInformation userId={user.digitalIdentifier || user.id} />
          )}
        </div>
      </PatientOnly>
    </ProtectedLayout>
  );
}
