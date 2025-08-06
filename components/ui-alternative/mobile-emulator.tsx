"use client";

import { ReactNode } from "react";
import PatientNavbar from "./navbar/patient-navbar";
import { useAuth } from "@/contexts/AuthContext";

interface MobileEmulatorProps {
  children: ReactNode;
  className?: string;
}

export default function MobileEmulator({
  children,
  className = "",
}: MobileEmulatorProps) {
  const { user } = useAuth();

  const RoleBasedNavbar = () => {
    switch (user?.role) {
      case "patient":
        return <PatientNavbar />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      {/* Mobile Screen Container */}
      <div className="relative mx-auto">
        {/* Screen - iPhone 14 Pro Max */}
        <div className="bg-white rounded-2xl overflow-hidden w-[430px] h-[932px] shadow-2xl border border-gray-200 relative">
          {/* Content Area */}
          <div className="h-full overflow-hidden">
            <div className={`h-full overflow-y-auto pb-16 ${className}`}>
              {children}
            </div>
          </div>
          {/* Navbar positioned absolutely */}

          {user?.role && <RoleBasedNavbar />}
        </div>

        {/* Subtle Shadow */}
        <div className="mt-4 w-64 h-2 bg-black/10 rounded-full mx-auto blur-sm"></div>
      </div>
    </div>
  );
}
