"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  Users,
  Settings,
  Activity,
  Database,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  History,
  Building,
  FileText,
  TrendingUp,
  Lock,
  UserPlus,
  Eye,
  Trash2,
  RefreshCw,
  BarChart3,
  Clock,
  Globe,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SystemStats {
  totalUsers: number;
  activeAdmins: number;
  pendingOrganizations: number;
  systemHealth: "healthy" | "warning" | "critical";
  auditLogs: number;
  dailyLogins: number;
}

interface RecentActivity {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: "user" | "organization" | "system" | "security";
  status: "success" | "warning" | "error";
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  lastLogin: string;
  status: "active" | "inactive";
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  verificationStatus: "pending" | "verified" | "rejected";
  createdAt: string;
}

export function AdminDashboard() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeAdmins: 0,
    pendingOrganizations: 0,
    systemHealth: "healthy",
    auditLogs: 0,
    dailyLogins: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationStats, setOrganizationStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);

  useEffect(() => {
    loadSystemStats();
    loadRecentActivity();
    loadAdminUsers();
    loadOrganizations();
  }, []);

  const loadSystemStats = async () => {
    try {
      setIsLoading(true);

      if (!token) {
        // No token, use mock data
        setStats({
          totalUsers: 847,
          activeAdmins: 3,
          pendingOrganizations: 12,
          systemHealth: "healthy",
          auditLogs: 15234,
          dailyLogins: 127,
        });
        return;
      }

      // Try to load real system stats from API
      const response = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStats(result.data);
          return; // Don't use fallback data if API succeeds
        }
      }

      // Fallback to mock data if API fails
      setStats({
        totalUsers: 847,
        activeAdmins: 3,
        pendingOrganizations: 12,
        systemHealth: "healthy",
        auditLogs: 15234,
        dailyLogins: 127,
      });
    } catch (error) {
      console.error("Error loading system stats:", error);
      // Use fallback data on error
      setStats({
        totalUsers: 847,
        activeAdmins: 3,
        pendingOrganizations: 12,
        systemHealth: "healthy",
        auditLogs: 15234,
        dailyLogins: 127,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      if (!token) {
        // No token, use mock data
        setRecentActivity([
          {
            id: "1",
            action: "Admin user created",
            user: "system-admin@healthcare.com",
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            type: "user",
            status: "success",
          },
          {
            id: "2",
            action: "Organization verification request",
            user: "City General Hospital",
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            type: "organization",
            status: "warning",
          },
          {
            id: "3",
            action: "System backup completed",
            user: "automated-system",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            type: "system",
            status: "success",
          },
          {
            id: "4",
            action: "Failed login attempt detected",
            user: "unknown-user@suspicious.com",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
            type: "security",
            status: "error",
          },
          {
            id: "5",
            action: "Doctor profile updated",
            user: "dr.smith@medicenter.com",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
            type: "user",
            status: "success",
          },
        ]);
        return;
      }

      // Try to load real activity from API
      const response = await fetch("/api/admin/activity", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setRecentActivity(result.data);
          return; // Don't use fallback data if API succeeds
        }
      }

      // Fallback to mock data if API fails
      setRecentActivity([
        {
          id: "1",
          action: "Admin user created",
          user: "system-admin@healthcare.com",
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          type: "user",
          status: "success",
        },
        {
          id: "2",
          action: "Organization verification request",
          user: "City General Hospital",
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          type: "organization",
          status: "warning",
        },
        {
          id: "3",
          action: "System backup completed",
          user: "automated-system",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          type: "system",
          status: "success",
        },
        {
          id: "4",
          action: "Failed login attempt detected",
          user: "unknown-user@suspicious.com",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
          type: "security",
          status: "error",
        },
        {
          id: "5",
          action: "Doctor profile updated",
          user: "dr.smith@medicenter.com",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
          type: "user",
          status: "success",
        },
      ]);
    } catch (error) {
      console.error("Error loading recent activity:", error);
      // Use fallback data on error
      setRecentActivity([]);
    }
  };

  const loadAdminUsers = async () => {
    try {
      if (!token) return;

      // Try to load admin users from API
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.admins) {
          setAdminUsers(
            result.data.admins.map((admin: any) => ({
              id: admin.id,
              name: admin.name,
              email: admin.email,
              lastLogin: admin.lastLogin || "Never",
              status: admin.emailVerified ? "active" : "inactive",
              createdAt: admin.createdAt,
            }))
          );
          return; // Don't use fallback data if API succeeds
        }
      } else {
        // Fallback to mock data if API fails
        setAdminUsers([
          {
            id: "1",
            name: "Test Admin",
            email: "admin@test.com",
            lastLogin: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            status: "active",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
          },
          {
            id: "2",
            name: "Jane Smith",
            email: "admin2@healthcare.com",
            lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            status: "active",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
          },
          {
            id: "3",
            name: "System Administrator",
            email: "admin3@system.com",
            lastLogin: "Never",
            status: "inactive",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error loading admin users:", error);
    }
  };

  const loadOrganizations = async () => {
    try {
      setIsLoadingOrganizations(true);
      if (!token) return;

      // Try to load organizations from API
      const response = await fetch("/api/admin/organizations", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setOrganizations(result.data.organizations || []);
          setOrganizationStats(
            result.data.stats || {
              total: 0,
              verified: 0,
              pending: 0,
              rejected: 0,
            }
          );
          return; // Don't use fallback data if API succeeds
        }
      }

      // Fallback to empty array if API fails
      setOrganizations([]);
      setOrganizationStats({
        total: 0,
        verified: 0,
        pending: 0,
        rejected: 0,
      });
    } catch (error) {
      console.error("Error loading organizations:", error);
      setOrganizations([]);
      setOrganizationStats({
        total: 0,
        verified: 0,
        pending: 0,
        rejected: 0,
      });
    } finally {
      setIsLoadingOrganizations(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user":
        return <Users className="h-4 w-4" />;
      case "organization":
        return <Building className="h-4 w-4" />;
      case "system":
        return <Settings className="h-4 w-4" />;
      case "security":
        return <Shield className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Success</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Warning</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
        return "text-green-600 bg-green-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "critical":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getVerificationStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Verified</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
          <Shield className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
          <p className="text-gray-600">
            Welcome back, {user?.firstName} {user?.lastName} - System Administrator
          </p>
        </div>
      </div>

      {/* System Health Alert */}
      {stats.systemHealth !== "healthy" && (
        <Alert
          className={stats.systemHealth === "critical" ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}
        >
          <AlertTriangle
            className={`h-4 w-4 ${stats.systemHealth === "critical" ? "text-red-600" : "text-yellow-600"}`}
          />
          <AlertDescription className={stats.systemHealth === "critical" ? "text-red-800" : "text-yellow-800"}>
            <div className="flex items-center justify-between">
              <span>
                System health status: {stats.systemHealth}. Please review system logs and take necessary action.
              </span>
              <Button variant="outline" size="sm" className="ml-4">
                View Details
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.activeAdmins}</p>
                <p className="text-xs text-muted-foreground">Admin Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Building className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.pendingOrganizations}</p>
                <p className="text-xs text-muted-foreground">Pending Orgs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${getSystemHealthColor(stats.systemHealth)}`}
              >
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold capitalize">{stats.systemHealth}</p>
                <p className="text-xs text-muted-foreground">System Status</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.auditLogs.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Audit Logs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.dailyLogins}</p>
                <p className="text-xs text-muted-foreground">Daily Logins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
            {adminUsers.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {adminUsers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="organizations" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Organizations
            {organizationStats.total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {organizationStats.total}
              </Badge>
            )}
            {organizationStats.pending > 0 && (
              <Badge variant="destructive" className="ml-1">
                {organizationStats.pending} pending
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent System Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{activity.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {getActivityStatusBadge(activity.status)}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Admin Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => setActiveTab("users")} className="w-full justify-start" variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create New Admin User
                </Button>

                <Button
                  onClick={() => setActiveTab("organizations")}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Building className="h-4 w-4 mr-2" />
                  Review Organization Requests
                  {organizationStats.pending > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {organizationStats.pending}
                    </Badge>
                  )}
                </Button>

                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Audit Logs
                </Button>

                <Button onClick={() => setActiveTab("security")} className="w-full justify-start" variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Security Dashboard
                </Button>

                <Button onClick={() => setActiveTab("system")} className="w-full justify-start" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  System Configuration
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* System Performance Cards */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection Pool</span>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Query Performance</span>
                    <Badge className="bg-green-100 text-green-800">Optimal</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Storage Usage</span>
                    <span className="text-sm">67%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  API Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Response Time</span>
                    <span className="text-sm">142ms avg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Success Rate</span>
                    <Badge className="bg-green-100 text-green-800">99.8%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Rate Limiting</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SSL/TLS</span>
                    <Badge className="bg-green-100 text-green-800">Secure</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Failed Logins</span>
                    <span className="text-sm">3 today</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Sessions</span>
                    <span className="text-sm">{stats.dailyLogins}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Admin User Management
                </div>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Admin
                </Button>
              </CardTitle>
              <CardDescription>Manage system administrators and their access levels</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {adminUsers.map((admin) => (
                    <div key={admin.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{admin.name}</h3>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        </div>
                        {getStatusBadge(admin.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Last Login</p>
                          <p className="text-xs">
                            {admin.lastLogin === "Never" ? "Never" : new Date(admin.lastLogin).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="text-xs">{new Date(admin.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button size="sm" variant="outline">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reset Password
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deactivate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Organizations Management
                </div>
                <div className="flex gap-2">
                  <Link href="/admin/organizations/verification">
                    <Button variant="outline">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Verification Panel
                    </Button>
                  </Link>
                </div>
              </CardTitle>
              <CardDescription>All organizations in the system - verified, pending, and rejected</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Organization Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{organizationStats.total}</p>
                  <p className="text-sm text-blue-600">Total</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{organizationStats.verified}</p>
                  <p className="text-sm text-green-600">Verified</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{organizationStats.pending}</p>
                  <p className="text-sm text-yellow-600">Pending</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{organizationStats.rejected}</p>
                  <p className="text-sm text-red-600">Rejected</p>
                </div>
              </div>

              {/* Organizations List */}
              {organizations.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {organizations.map((org) => (
                      <div key={org.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{org.name}</h3>
                            <p className="text-sm text-muted-foreground">{org.email}</p>
                          </div>
                          {getVerificationStatusBadge(org.verificationStatus)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Phone</p>
                            <p className="text-xs">{org.phone}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Address</p>
                            <p className="text-xs">{org.address}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Created</p>
                            <p className="text-xs">{new Date(org.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          {org.verificationStatus === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Link href="/admin/organizations/verification">
                            <Button size="sm" variant="outline">
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Manage
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">No organizations found in the system.</p>
                  <Link href="/admin/organizations/verification">
                    <Button>
                      View Verification Panel
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Dashboard
              </CardTitle>
              <CardDescription>Monitor system security and access controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Security monitoring dashboard</p>
                <p className="text-sm">Feature in development</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>Manage system settings and configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>System configuration panel</p>
                <p className="text-sm">Feature in development</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminDashboard;
