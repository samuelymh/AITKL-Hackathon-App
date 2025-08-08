"use client";

import { useParams, useRouter } from "next/navigation";
import ViewPatientRecords from "@/components/pharmacist/ViewPatientRecords";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";

export default function PharmacistPatientRecordsPage() {
  const params = useParams();
  const router = useRouter();
  const digitalId = params.digitalId as string;

  const handleBack = () => {
    router.push("/dashboard");
  };

  return (
    <ProtectedLayout requiredRoles={["pharmacist"]}>
      <ViewPatientRecords digitalId={digitalId} onBack={handleBack} />
    </ProtectedLayout>
  );
}
