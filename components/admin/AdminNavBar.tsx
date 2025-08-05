"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Home, Building, Users, Shield, Settings, Menu, LogOut, ChevronLeft, User } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string;
}

const adminNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Overview and statistics",
  },
  {
    title: "Organizations",
    href: "/admin/organizations/verification",
    icon: Building,
    description: "Manage organization verification",
    badge: "pending",
  },
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
    description: "Manage system users",
  },
  {
    title: "Security",
    href: "/admin/security",
    icon: Shield,
    description: "Security monitoring",
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    description: "System configuration",
  },
];

interface AdminNavBarProps {
  className?: string;
}

export function AdminNavBar({ className }: AdminNavBarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`flex ${isMobile ? "flex-col h-full" : "items-center justify-between w-full"}`}>
      {/* Logo and User Info */}
      <div className={`flex ${isMobile ? "flex-col space-y-4" : "items-center space-x-6"}`}>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <span className="font-semibold text-lg">Health Admin</span>
        </div>

        {user && (
          <div className={`flex items-center space-x-3 ${isMobile ? "p-4 bg-gray-50 rounded-lg" : ""}`}>
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className={isMobile ? "flex-1" : ""}>
              <p className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </p>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                </Badge>
                <span className="text-xs text-gray-500">{user.email}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className={`${isMobile ? "flex-1 py-6" : "flex space-x-1"}`}>
        <div className={`${isMobile ? "space-y-2" : "flex space-x-1"}`}>
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} onClick={() => isMobile && setIsOpen(false)}>
                <div
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  } ${isMobile ? "w-full" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                  {item.badge && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                {isMobile && item.description && <p className="text-xs text-gray-500 ml-7 mb-2">{item.description}</p>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Actions */}
      <div className={`flex ${isMobile ? "flex-col space-y-2 pt-6 border-t" : "items-center space-x-2"}`}>
        <Button variant="outline" size="sm" onClick={handleLogout} className={isMobile ? "w-full justify-start" : ""}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <div className={`hidden md:block bg-white border-b border-gray-200 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16">
            <NavContent />
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-semibold text-lg">Health Admin</span>
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <NavContent isMobile />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}

interface AdminBreadcrumbProps {
  items: Array<{
    title: string;
    href?: string;
  }>;
}

export function AdminBreadcrumb({ items }: AdminBreadcrumbProps) {
  const router = useRouter();

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-1 h-auto">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index > 0 && <span>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-gray-900">
              {item.title}
            </Link>
          ) : (
            <span className="font-medium text-gray-900">{item.title}</span>
          )}
        </div>
      ))}
    </div>
  );
}
