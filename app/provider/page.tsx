"use client";

import ProviderDashboard from "@/components/provider-dashboard";

export default function ProviderPage() {
  // These would typically come from authentication context or props
  const organizationId = "org_demo_hospital_123";
  const practitionerId = "prac_demo_doctor_456";
  const organizationName = "Demo General Hospital";
  const organizationType = "Hospital";

  return (
    <main className="min-h-screen bg-gray-50">
      <ProviderDashboard
        organizationId={organizationId}
        practitionerId={practitionerId}
        organizationName={organizationName}
        organizationType={organizationType}
      />
    </main>
  );
}
