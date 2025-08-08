"use client";

import { Suspense } from "react";
import DoctorProfessionalProfile from "@/components/doctor/DoctorProfessionalProfile";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { DoctorLayout } from "@/components/layout/DoctorNavigation";
import { Loader2 } from "lucide-react";

export default function DoctorProfessionalProfilePage() {
  return (
    <PermissionGuard requiredRoles={["doctor", "admin"]}>
      <DoctorLayout
        title="Professional Profile"
        description="Manage your medical credentials and professional information"
        showBackButton={true}
        navigationVariant="tabs"
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading...</span>
            </div>
          }
        >
          <DoctorProfessionalProfile />
        </Suspense>
      </DoctorLayout>
    </PermissionGuard>
  );
}
