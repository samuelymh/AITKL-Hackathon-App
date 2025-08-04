"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type UserRole = "patient" | "doctor" | "pharmacist" | "admin";

interface ProtectedLayoutProps {
  readonly children: React.ReactNode;
  readonly requiredRoles?: UserRole[];
}

function LoadingLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Skeleton className="h-8 w-32" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function RoleBasedHeader({ user }: { readonly user: any }) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "doctor":
        return "bg-blue-100 text-blue-800";
      case "pharmacist":
        return "bg-green-100 text-green-800";
      case "patient":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm text-gray-600">Welcome,</p>
        <p className="font-medium">
          {user.firstName} {user.lastName}
        </p>
      </div>
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}
      >
        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
      </span>
    </div>
  );
}

export function ProtectedLayout({
  children,
  requiredRoles,
}: ProtectedLayoutProps) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user && requiredRoles && !requiredRoles.includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, requiredRoles, router]);

  if (isLoading) {
    return <LoadingLayout />;
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return null; // Will redirect to unauthorized
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-blue-600">
                Health Records System
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {user && <RoleBasedHeader user={user} />}
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation breadcrumb or role-based nav could go here */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
