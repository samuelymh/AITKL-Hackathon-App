"use client";

import { Suspense } from "react";
import PharmacistProfessionalProfile from "@/components/pharmacist/PharmacistProfessionalProfile";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Loader2 } from "lucide-react";

export default function PharmacistProfessionalProfilePage() {
  return (
    <PermissionGuard requiredRoles={["pharmacist", "admin"]}>
      <div className="min-h-screen bg-background">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading...</span>
            </div>
          }
        >
          <PharmacistProfessionalProfile />
        </Suspense>
      </div>
    </PermissionGuard>
  );
}
