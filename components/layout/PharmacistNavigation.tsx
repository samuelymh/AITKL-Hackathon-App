"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LayoutDashboard, User, Settings, ArrowLeft, ChevronRight } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const pharmacistNavItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Main pharmacist dashboard with prescriptions and activities",
  },
  {
    href: "/dashboard/pharmacist/professional-profile",
    label: "Professional Profile",
    icon: User,
    description: "Manage your pharmacist credentials and professional information",
  },
];

interface PharmacistNavigationProps {
  className?: string;
  variant?: "sidebar" | "breadcrumb" | "tabs";
}

export function PharmacistNavigation({ className, variant = "sidebar" }: PharmacistNavigationProps) {
  const pathname = usePathname();

  if (variant === "breadcrumb") {
    return (
      <nav className={cn("flex items-center space-x-2 text-sm text-muted-foreground", className)}>
        <Link href="/dashboard" className="flex items-center hover:text-foreground transition-colors">
          <LayoutDashboard className="h-4 w-4 mr-1" />
          Dashboard
        </Link>
        {pathname !== "/dashboard" && (
          <>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">
              {pathname.includes("professional-profile") ? "Professional Profile" : "Dashboard"}
            </span>
          </>
        )}
      </nav>
    );
  }

  if (variant === "tabs") {
    return (
      <div className={cn("border-b", className)}>
        <nav className="flex space-x-8">
          {pharmacistNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  // Default sidebar variant
  return (
    <Card className={cn("w-64", className)}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Settings className="h-5 w-5 text-primary" />
          <span className="font-semibold">Pharmacist Portal</span>
        </div>

        <nav className="space-y-2">
          {pharmacistNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start", isActive && "bg-primary/10 text-primary")}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <Separator className="my-6" />

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Quick Info</h4>
          {pharmacistNavItems.map((item) => {
            const isActive = pathname === item.href;
            if (!isActive || !item.description) return null;

            return (
              <p key={item.href} className="text-xs text-muted-foreground">
                {item.description}
              </p>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface PharmacistLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showBackButton?: boolean;
  navigationVariant?: "sidebar" | "breadcrumb" | "tabs";
}

export function PharmacistLayout({
  children,
  title,
  description,
  showBackButton = false,
  navigationVariant = "breadcrumb",
}: PharmacistLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header with Navigation */}
        <div className="mb-6 space-y-4">
          {showBackButton && (
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          )}

          {/* Navigation */}
          <PharmacistNavigation variant={navigationVariant} />

          {/* Page Title */}
          {title && (
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{title}</h1>
              {description && <p className="text-muted-foreground">{description}</p>}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {navigationVariant === "sidebar" && <PharmacistNavigation variant="sidebar" className="flex-shrink-0" />}

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
