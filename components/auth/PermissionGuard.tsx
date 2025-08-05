import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type UserRole = "patient" | "doctor" | "pharmacist" | "admin";

interface PermissionGuardProps {
  readonly requiredRoles: UserRole[];
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
  readonly showError?: boolean;
}

export function PermissionGuard({ requiredRoles, children, fallback, showError = true }: PermissionGuardProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  if (!isAuthenticated) {
    return (
      fallback ||
      (showError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>You must be logged in to access this content.</span>
            <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
              Login
            </Button>
          </AlertDescription>
        </Alert>
      ) : null)
    );
  }

  if (!user || !requiredRoles.includes(user.role)) {
    return (
      fallback ||
      (showError ? (
        <Alert variant="destructive">
          <AlertDescription>
            You don't have permission to access this content. Required roles: {requiredRoles.join(", ")}
          </AlertDescription>
        </Alert>
      ) : null)
    );
  }

  return <>{children}</>;
}

// Convenience components for common permission scenarios
export function AdminOnly({ children, fallback }: { readonly children: ReactNode; readonly fallback?: ReactNode }) {
  return (
    <PermissionGuard requiredRoles={["admin"]} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function DoctorOrAdmin({ children, fallback }: { readonly children: ReactNode; readonly fallback?: ReactNode }) {
  return (
    <PermissionGuard requiredRoles={["doctor", "admin"]} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function HealthcareStaff({
  children,
  fallback,
}: {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}) {
  return (
    <PermissionGuard requiredRoles={["doctor", "pharmacist", "admin"]} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function PatientOnly({ children, fallback }: { readonly children: ReactNode; readonly fallback?: ReactNode }) {
  return (
    <PermissionGuard requiredRoles={["patient"]} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function PharmacistOrAdmin({
  children,
  fallback,
}: {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}) {
  return (
    <PermissionGuard requiredRoles={["pharmacist", "admin"]} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}
