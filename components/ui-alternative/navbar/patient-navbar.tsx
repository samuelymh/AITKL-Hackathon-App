"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileText, Shield, Upload, Share2, Home } from "lucide-react";

export default function PatientNavbar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "Home",
      icon: Home,
    },
    {
      href: "/dashboard/share-records",
      label: "Share",
      icon: Share2,
    },
    {
      href: "/dashboard/prescriptions",
      label: "Prescriptions",
      icon: FileText,
    },
    {
      href: "/dashboard/audit-log",
      label: "Audit",
      icon: Shield,
    },
    {
      href: "/dashboard/upload-docs",
      label: "Upload",
      icon: Upload,
    },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 rounded-b-2xl">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={`flex flex-col items-center p-2 h-auto min-h-0 ${
                  isActive
                    ? "text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
