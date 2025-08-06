import { useAuth } from "@/contexts/AuthContext";
import ProtectedLayout from "@/components/ui-alternative/protected-layout";
import PatientDashboard from "@/components/ui-alternative/dashboard/patient-dashboard";

export default function DashboardAlternative() {
  const { user } = useAuth();

  const RoleBasedDashboard = () => {
    switch (user?.role) {
      case "patient":
        return <PatientDashboard />;
    }
  };

  return (
    <ProtectedLayout>
      <RoleBasedDashboard />
    </ProtectedLayout>
  );
}
