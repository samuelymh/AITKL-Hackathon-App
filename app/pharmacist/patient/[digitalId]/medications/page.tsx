"use client";

import { useParams, useRouter } from "next/navigation";
import ViewMedications from "@/components/pharmacist/ViewMedications";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";

export default function PharmacistPatientMedicationsPage() {
  const params = useParams();
  const router = useRouter();
  const digitalId = params.digitalId as string;

  const handleBack = () => {
    router.push("/dashboard");
  };

  return (
    <ProtectedLayout requiredRoles={["pharmacist"]}>
      <ViewMedications digitalId={digitalId} onBack={handleBack} />
    </ProtectedLayout>
  );
}
