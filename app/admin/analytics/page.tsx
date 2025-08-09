"use client";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import EnhancedAdminDashboard from "@/components/admin/EnhancedAdminDashboard";
import AdminAlertsPanel from "@/components/admin/AdminAlertsPanel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, TrendingUp, Users, Activity, Shield, Database, ArrowLeft, Download, RefreshCw } from "lucide-react";
import Link from "next/link";

function AnalyticsHeader() {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive system metrics, user activity, and performance insights</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>
    </div>
  );
}

function AnalyticsOverview() {
  const metrics = [
    {
      title: "Total Users",
      value: "2,847",
      change: "+12.5%",
      changeType: "positive" as const,
      icon: Users,
      color: "blue",
    },
    {
      title: "Active Sessions",
      value: "1,234",
      change: "+8.2%",
      changeType: "positive" as const,
      icon: Activity,
      color: "green",
    },
    {
      title: "Security Events",
      value: "23",
      change: "-15.3%",
      changeType: "negative" as const,
      icon: Shield,
      color: "red",
    },
    {
      title: "Database Performance",
      value: "98.7%",
      change: "+2.1%",
      changeType: "positive" as const,
      icon: Database,
      color: "purple",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp
                    className={`h-4 w-4 mr-1 ${metric.changeType === "positive" ? "text-green-600" : "text-red-600"}`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      metric.changeType === "positive" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {metric.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className={`p-3 rounded-full bg-${metric.color}-100`}>
                <metric.icon className={`h-6 w-6 text-${metric.color}-600`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();

  // Redirect non-admin users
  if (user?.role !== "admin") {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">You need administrator privileges to access this page.</p>
              <Link href="/dashboard">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Navigation */}
        <div className="bg-white rounded-lg border border-gray-200">
          <AdminNavigation />
        </div>

        {/* Header */}
        <AnalyticsHeader />

        {/* Overview Metrics */}
        <AnalyticsOverview />

        {/* Real-time Alerts */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">System Alerts</h2>
            <Badge variant="outline" className="ml-auto">
              Live
            </Badge>
          </div>
          <AdminAlertsPanel />
        </div>

        {/* Detailed Analytics Dashboard */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Detailed Analytics</h2>
            <Badge variant="secondary" className="ml-auto">
              Enhanced
            </Badge>
          </div>
          <EnhancedAdminDashboard />
        </div>
      </div>
    </ProtectedLayout>
  );
}
