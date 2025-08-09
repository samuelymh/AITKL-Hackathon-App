"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Users,
  Shield,
  Settings,
  FileText,
  AlertTriangle,
  Building2,
  Activity,
  Database,
  UserCheck,
  ChevronDown,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface AdminNavigationProps {
  className?: string;
  variant?: "horizontal" | "vertical";
}

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Overview and quick actions",
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    description: "System metrics and reports",
    badge: "Enhanced",
  },
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
    description: "Manage users and roles",
    children: [
      { title: "All Users", href: "/admin/users", icon: Users },
      { title: "Admin Users", href: "/admin/users/admins", icon: UserCheck },
      { title: "Create Admin", href: "/admin/users/create", icon: Users },
    ],
  },
  {
    title: "Organizations",
    href: "/admin/organizations",
    icon: Building2,
    description: "Healthcare organizations",
    children: [
      { title: "All Organizations", href: "/admin/organizations", icon: Building2 },
      { title: "Verification", href: "/admin/organizations/verification", icon: UserCheck },
      { title: "Pending Requests", href: "/admin/organizations/requests", icon: FileText },
    ],
  },
  {
    title: "Security",
    href: "/admin/security",
    icon: Shield,
    description: "Security monitoring",
    children: [
      { title: "Alerts", href: "/admin/security/alerts", icon: AlertTriangle },
      { title: "Audit Logs", href: "/admin/security/audit", icon: FileText },
      { title: "Access Control", href: "/admin/security/access", icon: Shield },
    ],
  },
  {
    title: "System",
    href: "/admin/system",
    icon: Activity,
    description: "System health and performance",
    children: [
      { title: "Performance", href: "/admin/system/performance", icon: Activity },
      { title: "Database", href: "/admin/system/database", icon: Database },
      { title: "Maintenance", href: "/admin/system/maintenance", icon: Settings },
    ],
  },
];

export function AdminNavigation({ className, variant = "horizontal" }: AdminNavigationProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  if (variant === "vertical") {
    return (
      <nav className={cn("w-64 bg-white border-r border-gray-200 p-4", className)}>
        <div className="space-y-2">
          {navigationItems.map((item) => (
            <div key={item.href}>
              {item.children ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={isActive(item.href) ? "secondary" : "ghost"} className="w-full justify-start">
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                      <ChevronDown className="ml-auto h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {item.children.map((child) => (
                      <DropdownMenuItem key={child.href} asChild>
                        <Link
                          href={child.href}
                          className={cn("flex items-center", isActive(child.href) && "bg-primary/10 font-medium")}
                        >
                          <child.icon className="mr-2 h-4 w-4" />
                          {child.title}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant={isActive(item.href) ? "secondary" : "ghost"} className="w-full justify-start" asChild>
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                    {item.badge && (
                      <span className="ml-auto rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className={cn("flex items-center space-x-1 bg-white border-b border-gray-200 p-4", className)}>
      {navigationItems.map((item) => (
        <div key={item.href}>
          {item.children ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={isActive(item.href) ? "secondary" : "ghost"} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.title}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <div className="px-3 py-2 text-sm text-gray-500">{item.description}</div>
                <DropdownMenuSeparator />
                {item.children.map((child) => (
                  <DropdownMenuItem key={child.href} asChild>
                    <Link
                      href={child.href}
                      className={cn("flex items-center", isActive(child.href) && "bg-primary/10 font-medium")}
                    >
                      <child.icon className="mr-2 h-4 w-4" />
                      {child.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant={isActive(item.href) ? "secondary" : "ghost"} className="flex items-center gap-2" asChild>
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.title}
                {item.badge && (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">{item.badge}</span>
                )}
              </Link>
            </Button>
          )}
        </div>
      ))}
    </nav>
  );
}

export function AdminQuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Link href="/admin/analytics" className="block">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white hover:from-blue-600 hover:to-blue-700 transition-colors">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">Analytics</h3>
              <p className="text-sm opacity-90">View detailed metrics</p>
            </div>
          </div>
        </div>
      </Link>

      <Link href="/admin/organizations/verification" className="block">
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white hover:from-green-600 hover:to-green-700 transition-colors">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">Organizations</h3>
              <p className="text-sm opacity-90">Manage healthcare orgs</p>
            </div>
          </div>
        </div>
      </Link>

      <Link href="/admin/security/alerts" className="block">
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-lg text-white hover:from-red-600 hover:to-red-700 transition-colors">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">Security</h3>
              <p className="text-sm opacity-90">Monitor threats</p>
            </div>
          </div>
        </div>
      </Link>

      <Link href="/admin/users" className="block">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white hover:from-purple-600 hover:to-purple-700 transition-colors">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">Users</h3>
              <p className="text-sm opacity-90">User management</p>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
