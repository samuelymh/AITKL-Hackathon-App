"use client";

import { Suspense } from "react";
import PharmacistProfessionalProfile from "@/components/pharmacist/PharmacistProfessionalProfile";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PharmacistLayout } from "@/components/layout/PharmacistNavigation";
import { Loader2 } from "lucide-react";

export default function PharmacistProfessionalProfilePage() {
  return (
    <PermissionGuard requiredRoles={["pharmacist", "admin"]}>
      <PharmacistLayout
        title="Professional Profile"
        description="Manage your pharmacist credentials and professional information"
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
          <PharmacistProfessionalProfile />
        </Suspense>
      </PharmacistLayout>
    </PermissionGuard>
  );
}
