"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Shield,
  Activity,
  Clock,
  CheckCircle,
  X,
  RefreshCw,
  Bell,
  BellRing,
  Eye,
  ExternalLink,
} from "lucide-react";

interface AlertData {
  id: string;
  type: "security" | "system" | "compliance" | "performance";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  message: string;
  timestamp: string;
  data: Record<string, any>;
}

interface AlertSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: {
    security: number;
    system: number;
    compliance: number;
    performance: number;
  };
}

interface AlertsResponse {
  alerts: AlertData[];
  summary: AlertSummary;
  generatedAt: string;
}

const SEVERITY_CONFIG = {
  critical: {
    color: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: AlertTriangle,
  },
  high: {
    color: "bg-orange-500",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    icon: AlertTriangle,
  },
  medium: {
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    icon: Clock,
  },
  low: {
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: CheckCircle,
  },
};

const TYPE_CONFIG = {
  security: {
    icon: Shield,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  system: {
    icon: Activity,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  compliance: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  performance: {
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
};

export default function AdminAlertsPanel() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");

  const fetchAlerts = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/admin/alerts");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setAlerts(result.data.alerts);
        setSummary(result.data.summary);
        setError(null);
      } else {
        throw new Error(result.error || "Failed to fetch alerts");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Set up polling for real-time updates
    const interval = setInterval(fetchAlerts, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  const getFilteredAlerts = () => {
    return alerts.filter((alert) => {
      if (dismissedAlerts.has(alert.id)) return false;
      if (selectedType !== "all" && alert.type !== selectedType) return false;
      if (selectedSeverity !== "all" && alert.severity !== selectedSeverity) return false;
      return true;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getAlertDetails = (alert: AlertData) => {
    const actions = [];

    if (alert.type === "security" && alert.data.userId) {
      actions.push({
        label: "View User",
        action: () => window.open(`/admin/users/${alert.data.userId}`, "_blank"),
      });
    }

    if (alert.type === "system" && alert.data.organizationId) {
      actions.push({
        label: "View Organization",
        action: () => window.open(`/admin/organizations/${alert.data.organizationId}`, "_blank"),
      });
    }

    return { actions };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading alerts...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const filteredAlerts = getFilteredAlerts();
  const hasActiveAlerts = filteredAlerts.length > 0;

  return (
    <div className="space-y-4">
      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{summary?.critical || 0}</p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High</p>
                <p className="text-2xl font-bold text-orange-600">{summary?.high || 0}</p>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Medium</p>
                <p className="text-2xl font-bold text-yellow-600">{summary?.medium || 0}</p>
              </div>
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.total || 0}</p>
              </div>
              <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                <BellRing className="h-4 w-4 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Alerts Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Active Alerts
                {hasActiveAlerts && (
                  <Badge variant="destructive" className="ml-2">
                    {filteredAlerts.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Real-time system alerts and notifications</CardDescription>
            </div>
            <Button onClick={fetchAlerts} disabled={refreshing} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value="security">Security</option>
              <option value="system">System</option>
              <option value="compliance">Compliance</option>
              <option value="performance">Performance</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {!hasActiveAlerts ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
              <p className="text-gray-600">No active alerts at this time.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredAlerts.map((alert, index) => {
                  const severityConfig = SEVERITY_CONFIG[alert.severity];
                  const typeConfig = TYPE_CONFIG[alert.type];
                  const SeverityIcon = severityConfig.icon;
                  const TypeIcon = typeConfig.icon;
                  const details = getAlertDetails(alert);

                  return (
                    <div key={alert.id}>
                      <div className={`p-4 rounded-lg border ${severityConfig.borderColor} ${severityConfig.bgColor}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className={`p-2 rounded-full ${typeConfig.bgColor}`}>
                              <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900">{alert.title}</h4>
                                <Badge variant="outline" className={`text-xs ${severityConfig.textColor}`}>
                                  {alert.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {alert.type}
                                </Badge>
                              </div>

                              <p className="text-sm text-gray-700 mb-2">{alert.message}</p>

                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">{formatTimestamp(alert.timestamp)}</span>

                                {details.actions.length > 0 && (
                                  <div className="flex gap-2">
                                    {details.actions.map((action, actionIndex) => (
                                      <Button
                                        key={actionIndex}
                                        onClick={action.action}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                      >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        {action.label}
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={() => dismissAlert(alert.id)}
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {index < filteredAlerts.length - 1 && <Separator className="my-2" />}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Alert Type Breakdown */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Alert Breakdown by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(summary.byType).map(([type, count]) => {
                const typeConfig = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
                const TypeIcon = typeConfig.icon;

                return (
                  <div key={type} className="text-center">
                    <div
                      className={`mx-auto w-12 h-12 rounded-full ${typeConfig.bgColor} flex items-center justify-center mb-2`}
                    >
                      <TypeIcon className={`h-6 w-6 ${typeConfig.color}`} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-600 capitalize">{type}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
