"use client";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import AdminAlertsPanel from "@/components/admin/AdminAlertsPanel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, AlertTriangle, Lock, Activity, ArrowLeft, RefreshCw, Settings, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

function SecurityHeader() {
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
            <Shield className="h-8 w-8 text-red-600" />
            Security Alerts
          </h1>
          <p className="text-gray-600 mt-1">Monitor security events, threats, and system anomalies</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Configure
        </Button>
      </div>
    </div>
  );
}

function SecurityMetrics() {
  const metrics = [
    {
      title: "Active Threats",
      value: "3",
      status: "critical",
      icon: AlertTriangle,
      color: "red",
      description: "Immediate attention required",
    },
    {
      title: "Failed Logins",
      value: "47",
      status: "warning",
      icon: Lock,
      color: "yellow",
      description: "Last 24 hours",
    },
    {
      title: "System Health",
      value: "98.7%",
      status: "healthy",
      icon: Activity,
      color: "green",
      description: "All systems operational",
    },
    {
      title: "Monitored Events",
      value: "1,234",
      status: "info",
      icon: Eye,
      color: "blue",
      description: "Events processed today",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "text-red-600 bg-red-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "healthy":
        return "text-green-600 bg-green-100";
      default:
        return "text-blue-600 bg-blue-100";
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "red":
        return { bg: "bg-red-100", text: "text-red-600" };
      case "yellow":
        return { bg: "bg-yellow-100", text: "text-yellow-600" };
      case "green":
        return { bg: "bg-green-100", text: "text-green-600" };
      default:
        return { bg: "bg-blue-100", text: "text-blue-600" };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric) => {
        const colorClasses = getColorClasses(metric.color);
        return (
          <Card key={metric.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${colorClasses.bg}`}>
                  <metric.icon className={`h-5 w-5 ${colorClasses.text}`} />
                </div>
                <Badge className={`${getStatusColor(metric.status)} border-0`}>{metric.status}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                <p className="text-sm text-gray-500 mt-1">{metric.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RecentSecurityEvents() {
  const events = [
    {
      id: "1",
      type: "Failed Login",
      severity: "medium",
      user: "unknown@suspicious.com",
      timestamp: "2 minutes ago",
      ip: "192.168.1.100",
      description: "Multiple failed login attempts detected",
      status: "investigating",
    },
    {
      id: "2",
      type: "Suspicious API Call",
      severity: "high",
      user: "api-user@test.com",
      timestamp: "15 minutes ago",
      ip: "10.0.0.5",
      description: "Unusual API access pattern detected",
      status: "blocked",
    },
    {
      id: "3",
      type: "Admin Access",
      severity: "low",
      user: "admin@test.com",
      timestamp: "1 hour ago",
      ip: "192.168.1.50",
      description: "Admin user accessed sensitive data",
      status: "normal",
    },
    {
      id: "4",
      type: "Data Export",
      severity: "medium",
      user: "doctor@hospital.com",
      timestamp: "2 hours ago",
      ip: "172.16.0.10",
      description: "Large dataset exported",
      status: "reviewed",
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "blocked":
        return "bg-red-100 text-red-800";
      case "investigating":
        return "bg-orange-100 text-orange-800";
      case "reviewed":
        return "bg-blue-100 text-blue-800";
      case "normal":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Security Events</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
            <Button variant="outline" size="sm">
              <EyeOff className="h-4 w-4 mr-2" />
              Hide Resolved
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-medium text-gray-900">{event.type}</h4>
                  <Badge className={`${getSeverityColor(event.severity)} border-0`}>{event.severity}</Badge>
                  <Badge className={`${getStatusColor(event.status)} border-0`}>{event.status}</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-1">{event.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>User: {event.user}</span>
                  <span>IP: {event.ip}</span>
                  <span>{event.timestamp}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  View Details
                </Button>
                {event.status === "investigating" && (
                  <Button size="sm" variant="destructive">
                    Block
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SecurityAlertsPage() {
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
        <SecurityHeader />

        {/* Security Metrics */}
        <SecurityMetrics />

        {/* Live Alerts Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Live Security Alerts
            </h2>
            <Badge variant="outline" className="animate-pulse">
              Real-time
            </Badge>
          </div>
          <AdminAlertsPanel />
        </div>

        {/* Recent Security Events */}
        <RecentSecurityEvents />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin/security/audit" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Activity className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Audit Logs</h3>
                <p className="text-sm text-gray-600">View detailed system audit trails</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/security/access" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Lock className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Access Control</h3>
                <p className="text-sm text-gray-600">Manage permissions and access rules</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Settings className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Security Settings</h3>
              <p className="text-sm text-gray-600">Configure security policies and rules</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}
