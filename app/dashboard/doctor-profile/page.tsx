"use client";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useAuth } from "@/contexts/AuthContext";
import { DoctorProfessionalInformation } from "@/components/healthcare/DoctorProfessionalInformation";
import { DoctorOrAdmin } from "@/components/auth/PermissionGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DoctorProfilePage() {
  const { user } = useAuth();

  return (
    <ProtectedLayout>
      <DoctorOrAdmin>
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
                Professional Profile
              </h1>
              <p className="mt-2 text-gray-600">
                Complete your professional information to access all healthcare
                provider features
              </p>
            </div>
          </div>

          {/* Professional Information Component */}
          {user && (
            <DoctorProfessionalInformation
              userId={user.digitalIdentifier || user.id}
            />
          )}
        </div>
      </DoctorOrAdmin>
    </ProtectedLayout>
  );
}
