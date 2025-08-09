"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  Building,
  Activity,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  MapPin,
  FileText,
  Lock,
  Download,
  RefreshCw,
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { AnalyticsData, createAnalyticsService } from "@/services/analyticsService";

const COLORS = {
  primary: "#3b82f6",
  secondary: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#6366f1",
  success: "#22c55e",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.warning,
  COLORS.danger,
  COLORS.info,
  COLORS.success,
  "#8b5cf6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
];

export default function EnhancedAdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [authToken] = useLocalStorage<string | null>('auth-token', null);

  // Create analytics service instance with proper auth token getter
  const analyticsService = useMemo(() => {
    return createAnalyticsService(() => authToken);
  }, [authToken]);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      console.log('🔍 Fetching analytics with token:', authToken ? 'Present' : 'Missing');
      
      const data = await analyticsService.getAnalytics();
      
      console.log('✅ Analytics data received:', {
        totalUsers: data.userAnalytics.activity.totalUsers,
        activeUsers: data.userAnalytics.activity.activeUsers,
        generatedAt: data.generatedAt
      });
      
      setAnalytics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      console.error('❌ Analytics fetch failed:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const downloadReport = () => {
    if (!analytics) return;
    const reportData = {
      generatedAt: analytics.generatedAt,
      summary: {
        totalUsers: analytics.userAnalytics.activity.totalUsers,
        activeUsers: analytics.userAnalytics.activity.activeUsers,
        totalOrganizations: analytics.organizationAnalytics.byType.reduce((sum, org) => sum + org.count, 0),
        systemHealth: analytics.performance.systemHealth,
      },
      fullAnalytics: analytics,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-analytics-report-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading advanced analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No analytics data available.</AlertDescription>
      </Alert>
    );
  }

  // Prepare chart data
  const userGrowthData = analytics.userAnalytics.trends.reduce((acc, item) => {
    const existing = acc.find((d) => d.date === item._id.date);
    if (existing) {
      existing[item._id.role] = item.count;
    } else {
      acc.push({
        date: item._id.date,
        [item._id.role]: item.count,
      });
    }
    return acc;
  }, [] as any[]);

  const roleDistribution = analytics.userAnalytics.growth.map((item) => ({
    name: item._id,
    value: item.count,
  }));

  const organizationData = analytics.organizationAnalytics.byType.map((item) => ({
    name: `${item._id.type} (${item._id.verified ? "Verified" : "Unverified"})`,
    value: item.count,
    verified: item._id.verified,
  }));

  const encounterTrends = analytics.healthcareWorkflow.encounters.reduce((acc, item) => {
    const existing = acc.find((d) => d.date === item._id.date);
    if (existing) {
      existing.encounters += item.count;
      existing.prescriptions += item.totalPrescriptions;
    } else {
      acc.push({
        date: item._id.date,
        encounters: item.count,
        prescriptions: item.totalPrescriptions,
      });
    }
    return acc;
  }, [] as any[]);

  const topMedications = analytics.healthcareWorkflow.prescriptions.slice(0, 8);

  const securityTrends = analytics.security.failedLogins.map((item) => ({
    date: item._id.date,
    failedAttempts: item.failedAttempts,
    affectedUsers: item.uniqueUsers,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Generated at {new Date(analytics.generatedAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAnalytics} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={downloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.userAnalytics.activity.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.userAnalytics.activity.activeUsers} active (7 days)
            </p>
            <Progress
              value={(analytics.userAnalytics.activity.activeUsers / analytics.userAnalytics.activity.totalUsers) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.organizationAnalytics.byType.reduce((sum, org) => sum + org.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.organizationAnalytics.byType
                .filter((org) => org._id.verified)
                .reduce((sum, org) => sum + org.count, 0)}{" "}
              verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                ((analytics.userAnalytics.activity.totalUsers -
                  analytics.security.accountSecurity.lockedAccounts -
                  analytics.security.accountSecurity.unverifiedEmails) /
                  analytics.userAnalytics.activity.totalUsers) *
                  100
              )}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.security.accountSecurity.lockedAccounts} locked accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                (analytics.performance.dataQuality.usersWithMedicalInfo /
                  analytics.performance.dataQuality.totalUsers) *
                  100
              )}
              %
            </div>
            <p className="text-xs text-muted-foreground">Complete profiles</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="healthcare">Healthcare</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>User Registration Trends</CardTitle>
                <CardDescription>Daily new user registrations by role</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="patient" stackId="1" stroke={COLORS.primary} fill={COLORS.primary} />
                    <Area
                      type="monotone"
                      dataKey="doctor"
                      stackId="1"
                      stroke={COLORS.secondary}
                      fill={COLORS.secondary}
                    />
                    <Area
                      type="monotone"
                      dataKey="pharmacist"
                      stackId="1"
                      stroke={COLORS.warning}
                      fill={COLORS.warning}
                    />
                    <Area type="monotone" dataKey="admin" stackId="1" stroke={COLORS.danger} fill={COLORS.danger} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Distribution</CardTitle>
                <CardDescription>Current user distribution by role</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Email Verified</span>
                  <Badge variant="secondary">
                    {Math.round(
                      (analytics.userAnalytics.activity.verifiedEmails / analytics.userAnalytics.activity.totalUsers) *
                        100
                    )}
                    %
                  </Badge>
                </div>
                <Progress
                  value={
                    (analytics.userAnalytics.activity.verifiedEmails / analytics.userAnalytics.activity.totalUsers) *
                    100
                  }
                />

                <div className="flex justify-between">
                  <span>Phone Verified</span>
                  <Badge variant="secondary">
                    {Math.round(
                      (analytics.userAnalytics.activity.verifiedPhones / analytics.userAnalytics.activity.totalUsers) *
                        100
                    )}
                    %
                  </Badge>
                </div>
                <Progress
                  value={
                    (analytics.userAnalytics.activity.verifiedPhones / analytics.userAnalytics.activity.totalUsers) *
                    100
                  }
                />

                <div className="flex justify-between">
                  <span>Active Users (7d)</span>
                  <Badge variant="secondary">
                    {Math.round(
                      (analytics.userAnalytics.activity.activeUsers / analytics.userAnalytics.activity.totalUsers) * 100
                    )}
                    %
                  </Badge>
                </div>
                <Progress
                  value={
                    (analytics.userAnalytics.activity.activeUsers / analytics.userAnalytics.activity.totalUsers) * 100
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Locked Accounts</span>
                    <Badge variant={analytics.userAnalytics.activity.lockedAccounts > 0 ? "destructive" : "secondary"}>
                      {analytics.userAnalytics.activity.lockedAccounts}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Unverified Emails</span>
                    <Badge variant="outline">{analytics.security.accountSecurity.unverifiedEmails}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Recent Password Resets</span>
                    <Badge variant="outline">{analytics.security.accountSecurity.recentPasswordResets}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile Completeness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Profile Pictures</span>
                    <span>
                      {Math.round(
                        (analytics.performance.dataQuality.usersWithProfilePictures /
                          analytics.performance.dataQuality.totalUsers) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (analytics.performance.dataQuality.usersWithProfilePictures /
                        analytics.performance.dataQuality.totalUsers) *
                      100
                    }
                  />

                  <div className="flex justify-between">
                    <span>Emergency Contact</span>
                    <span>
                      {Math.round(
                        (analytics.performance.dataQuality.usersWithEmergencyContact /
                          analytics.performance.dataQuality.totalUsers) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (analytics.performance.dataQuality.usersWithEmergencyContact /
                        analytics.performance.dataQuality.totalUsers) *
                      100
                    }
                  />

                  <div className="flex justify-between">
                    <span>Medical Info</span>
                    <span>
                      {Math.round(
                        (analytics.performance.dataQuality.usersWithMedicalInfo /
                          analytics.performance.dataQuality.totalUsers) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (analytics.performance.dataQuality.usersWithMedicalInfo /
                        analytics.performance.dataQuality.totalUsers) *
                      100
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Distribution</CardTitle>
                <CardDescription>Organizations by type and verification status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={organizationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
                <CardDescription>Top locations by organization count</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {analytics.organizationAnalytics.geography.slice(0, 10).map((location, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">
                            {location._id.city}, {location._id.state}
                          </div>
                          <div className="text-sm text-gray-600">{location.types.join(", ")}</div>
                        </div>
                        <Badge>{location.count}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Organizations by Member Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.performance.topOrganizations.slice(0, 10).map((org, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">Organization {org._id}</div>
                      <div className="text-sm text-gray-600">Roles: {org.roles.join(", ")}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{org.memberCount}</div>
                      <div className="text-sm text-gray-600">members</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Healthcare Tab */}
        <TabsContent value="healthcare" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Healthcare Activity Trends</CardTitle>
                <CardDescription>Encounters and prescriptions over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={encounterTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="encounters" stroke={COLORS.primary} strokeWidth={2} />
                    <Line type="monotone" dataKey="prescriptions" stroke={COLORS.secondary} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Medications</CardTitle>
                <CardDescription>Most prescribed medications</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topMedications} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="_id.medication" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.info} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Encounter Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from(new Set(analytics.healthcareWorkflow.encounters.map((e) => e._id.type))).map(
                    (type, index) => {
                      const count = analytics.healthcareWorkflow.encounters
                        .filter((e) => e._id.type === type)
                        .reduce((sum, e) => sum + e.count, 0);
                      return (
                        <div key={index} className="flex justify-between">
                          <span className="capitalize">{type}</span>
                          <Badge>{count}</Badge>
                        </div>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dispensation Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from(new Set(analytics.healthcareWorkflow.dispensations.map((d) => d._id.status))).map(
                    (status, index) => {
                      const count = analytics.healthcareWorkflow.dispensations
                        .filter((d) => d._id.status === status)
                        .reduce((sum, d) => sum + d.count, 0);
                      return (
                        <div key={index} className="flex justify-between">
                          <span className="capitalize">{status}</span>
                          <Badge variant={status === "fulfilled" ? "default" : "secondary"}>{count}</Badge>
                        </div>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Authorization Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Requests</span>
                    <Badge>{analytics.healthcareWorkflow.authorizations.reduce((sum, a) => sum + a.count, 0)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Time Window</span>
                    <Badge>
                      {Math.round(
                        analytics.healthcareWorkflow.authorizations.reduce(
                          (sum, a) => sum + (a.avgTimeWindow || 0),
                          0
                        ) / analytics.healthcareWorkflow.authorizations.length
                      )}
                      h
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Failed Login Attempts</CardTitle>
                <CardDescription>Security incidents over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={securityTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="failedAttempts"
                      stroke={COLORS.danger}
                      fill={COLORS.danger}
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="affectedUsers"
                      stroke={COLORS.warning}
                      fill={COLORS.warning}
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Overview</CardTitle>
                <CardDescription>Current security status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                        <span className="font-medium">Locked Accounts</span>
                      </div>
                      <Badge variant="destructive">{analytics.security.accountSecurity.lockedAccounts}</Badge>
                    </div>
                  </div>

                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                        <span className="font-medium">Unverified Emails</span>
                      </div>
                      <Badge variant="outline">{analytics.security.accountSecurity.unverifiedEmails}</Badge>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Lock className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="font-medium">Password Resets (7d)</span>
                      </div>
                      <Badge variant="secondary">{analytics.security.accountSecurity.recentPasswordResets}</Badge>
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span className="font-medium">Security Score</span>
                      </div>
                      <Badge variant="secondary">
                        {Math.round(
                          ((analytics.security.accountSecurity.totalUsers -
                            analytics.security.accountSecurity.lockedAccounts -
                            analytics.security.accountSecurity.unverifiedEmails) /
                            analytics.security.accountSecurity.totalUsers) *
                            100
                        )}
                        %
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail Compliance</CardTitle>
                <CardDescription>Data audit trail coverage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {Math.round(
                      (analytics.compliance.auditCompliance.recordsWithAuditTrail /
                        analytics.compliance.auditCompliance.totalRecords) *
                        100
                    )}
                    %
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {analytics.compliance.auditCompliance.recordsWithAuditTrail.toLocaleString()} of{" "}
                    {analytics.compliance.auditCompliance.totalRecords.toLocaleString()} records
                  </p>
                  <Progress
                    value={
                      (analytics.compliance.auditCompliance.recordsWithAuditTrail /
                        analytics.compliance.auditCompliance.totalRecords) *
                      100
                    }
                    className="mt-3"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Retention</CardTitle>
                <CardDescription>Records requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {analytics.compliance.dataRetention.oldRecords}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Records over 7 years old</p>
                  <div className="mt-3 text-xs text-gray-500">
                    Total encounters: {analytics.compliance.dataRetention.totalEncounters.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Encryption Status</CardTitle>
                <CardDescription>Field-level encryption coverage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {Math.round(
                      (analytics.compliance.encryption.encryptedFields / analytics.compliance.encryption.totalUsers) *
                        100
                    )}
                    %
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Encrypted sensitive fields</p>
                  <Progress
                    value={
                      (analytics.compliance.encryption.encryptedFields / analytics.compliance.encryption.totalUsers) *
                      100
                    }
                    className="mt-3"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Summary</CardTitle>
              <CardDescription>Overall compliance status and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Audit Trail Compliance</AlertTitle>
                  <AlertDescription>
                    Excellent audit trail coverage at{" "}
                    {Math.round(
                      (analytics.compliance.auditCompliance.recordsWithAuditTrail /
                        analytics.compliance.auditCompliance.totalRecords) *
                        100
                    )}
                    %. All critical operations are being tracked.
                  </AlertDescription>
                </Alert>

                {analytics.compliance.dataRetention.oldRecords > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Data Retention Action Required</AlertTitle>
                    <AlertDescription>
                      {analytics.compliance.dataRetention.oldRecords} encounters are older than 7 years and may need
                      archival or deletion per retention policies.
                    </AlertDescription>
                  </Alert>
                )}

                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertTitle>Encryption Status</AlertTitle>
                  <AlertDescription>
                    Field-level encryption is{" "}
                    {Math.round(
                      (analytics.compliance.encryption.encryptedFields / analytics.compliance.encryption.totalUsers) *
                        100
                    )}
                    % deployed.
                    {analytics.compliance.encryption.encryptedFields === analytics.compliance.encryption.totalUsers
                      ? " All sensitive data is properly encrypted."
                      : " Some records may need encryption updates."}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Health Metrics</CardTitle>
                <CardDescription>Authentication and system performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Average Login Attempts</span>
                      <Badge variant="outline">{analytics.performance.systemHealth.avgLoginAttempts.toFixed(2)}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Lower is better (target: &lt; 1.5)</p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Max Login Attempts</span>
                      <Badge
                        variant={analytics.performance.systemHealth.maxLoginAttempts > 5 ? "destructive" : "secondary"}
                      >
                        {analytics.performance.systemHealth.maxLoginAttempts}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Highest failed attempts by single user</p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Users with Failed Logins</span>
                      <Badge variant="outline">{analytics.performance.systemHealth.usersWithFailedLogins}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {Math.round(
                        (analytics.performance.systemHealth.usersWithFailedLogins /
                          analytics.userAnalytics.activity.totalUsers) *
                          100
                      )}
                      % of total users
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
                <CardDescription>Top organizations by activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {analytics.financial.resourceUtilization.slice(0, 10).map((org, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">Org {org._id}</div>
                            <div className="text-sm text-gray-600">
                              Avg {org.avgPrescriptionsPerEncounter.toFixed(1)} prescriptions/encounter
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{org.encounterCount}</div>
                            <div className="text-sm text-gray-600">encounters</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Organization Metrics</CardTitle>
              <CardDescription>Performance by organization type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analytics.financial.organizationMetrics.map((metric, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold capitalize">{metric._id}</div>
                    <div className="text-2xl font-bold text-blue-600">{metric.count}</div>
                    <div className="text-sm text-gray-600">Avg {metric.avgMemberCount.toFixed(1)} members</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
