"use client";

import { ProviderDashboard } from "@/components/provider-dashboard";

export default function ProviderPage() {
  // Mock data for demo - in a real app, this would come from authentication
  const mockOrganizationId = "org_demo_hospital_001";
  const mockUserId = "user_dr_jane_smith_001";
  const mockUserName = "Dr. Jane Smith";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <ProviderDashboard organizationId={mockOrganizationId} userId={mockUserId} userName={mockUserName} />
      </div>
    </div>
  );
}
