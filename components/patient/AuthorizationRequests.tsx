"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
  Calendar,
  Shield,
  Eye,
  FileText,
  Pill,
  Activity,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
// import { useNotificationPolling } from "@/hooks/usePolling";

interface Organization {
  id: string;
  name: string;
  type: "HOSPITAL" | "CLINIC" | "PHARMACY" | "LABORATORY";
  address?: string;
}

interface Practitioner {
  id: string;
  firstName: string;
  lastName: string;
  role: "DOCTOR" | "PHARMACIST" | "NURSE" | "SPECIALIST";
  specialty?: string;
}

interface AccessScope {
  canViewMedicalHistory: boolean;
  canViewPrescriptions: boolean;
  canCreateEncounters: boolean;
  canViewAuditLogs: boolean;
}

interface AuthorizationRequest {
  grantId: string;
  organization: Organization;
  practitioner: Practitioner;
  requestedScope: AccessScope;
  timeWindowHours: number;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED";
  createdAt: Date;
  expiresAt?: Date;
  ipAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface AuthorizationRequestsProps {
  userId: string;
  className?: string;
}

export function AuthorizationRequests({ userId, className }: AuthorizationRequestsProps) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { token } = useAuth();

  // Debug: Add component instance ID
  const componentId = useRef(Math.random().toString(36).substring(2, 9));
  console.log(`🧩 AuthorizationRequests component mounted with ID: ${componentId.current}`);

  // Transform notification data to authorization requests
  const transformNotificationsToRequests = useCallback((notifications: any[]) => {
    if (!notifications) return [];

    return notifications
      .filter((item: any) => item.type === "AUTHORIZATION_REQUEST")
      .map((item: any) => ({
        grantId: item.data?.grantId || item.id,
        organization: {
          id: item.organization?._id || item.data?.organizationId || "",
          name: item.organization?.organizationInfo?.name || item.data?.organizationName || "Unknown Organization",
          type: (item.organization?.organizationInfo?.type || "UNKNOWN") as any,
          address: item.organization?.address || "",
        },
        practitioner: {
          id: item.practitioner?._id || item.data?.requestingPractitionerId || "",
          // Simplified name parsing using destructuring and nullish coalescing
          ...(() => {
            const [firstName, ...rest] = item.practitionerName?.split(" ") || [];
            return {
              firstName: firstName || "Unknown",
              lastName: rest.join(" ") || "Practitioner",
            };
          })(),
          role: item.practitionerType || ((item.practitioner?.professionalInfo?.practitionerType || "doctor") as any),
          specialty: item.practitioner?.professionalInfo?.specialty,
        },
        requestedScope: item.accessScope ||
          item.data?.accessScope || {
            canViewMedicalHistory: true,
            canViewPrescriptions: true,
            canCreateEncounters: false,
            canViewAuditLogs: false,
          },
        timeWindow: {
          hours: item.data?.timeWindowHours || 24,
          requestedAt: new Date(item.createdAt),
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        timeWindowHours: item.data?.timeWindowHours || 24,
        createdAt: new Date(item.createdAt),
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: item.grantStatus || (item.status === "COMPLETED" ? "APPROVED" : "PENDING"),
        urgency: item.priority >= 8 ? "urgent" : "normal",
        metadata: {
          title: item.title,
          body: item.body,
          notificationId: item.id,
        },
      }));
  }, []);

  // Simple single-fetch implementation (no polling)
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      console.log(`🔄 [${componentId.current}] Manual fetch triggered`);

      const response = await fetch(`/api/notifications?limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      setNotifications(result.data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred");
      setError(error);
      console.error(`❌ [${componentId.current}] Error fetching notifications:`, error);

      // Check if it's a JWT expiration error
      if (
        error.message.includes("401") ||
        error.message.includes("jwt expired") ||
        error.message.includes("unauthorized")
      ) {
        toast({
          title: "Session Expired",
          description: "Please log in again to view authorization requests.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch authorization requests",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  // Fetch once on mount
  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const refresh = useCallback(() => {
    console.log(`🔄 [${componentId.current}] Manual refresh triggered`);
    fetchNotifications();
  }, [fetchNotifications]);

  console.log(
    `📊 [${componentId.current}] Notifications state - loading: ${loading}, count: ${notifications?.length || 0}`
  );

  // Transform notifications to requests
  const requests = transformNotificationsToRequests(notifications || []);

  // Handle approve/deny actions
  const handleRequestAction = async (grantId: string, action: "approve" | "deny") => {
    setProcessingIds((prev) => new Set(prev).add(grantId));

    try {
      const endpoint = action === "approve" ? "/api/v1/authorizations/approve" : "/api/v1/authorizations/deny";

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ grantId }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: `Authorization request ${action}d successfully`,
        });

        // Refresh the data
        refresh();

        // Mark notification as read
        const request = requests.find((r) => r.grantId === grantId);
        if (request?.metadata?.notificationId) {
          try {
            await fetch("/api/notifications", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                notificationId: request.metadata.notificationId,
                status: "COMPLETED",
              }),
            });
          } catch (notificationError) {
            console.warn("Failed to mark notification as read:", notificationError);
          }
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || `Failed to ${action} authorization request`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing authorization request:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} authorization request`,
        variant: "destructive",
      });
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(grantId);
        return newSet;
      });
    }
  };

  // Handle approval
  const handleApprove = async (grantId: string) => {
    await handleRequestAction(grantId, "approve");
  };

  // Handle denial
  const handleDeny = async (grantId: string) => {
    await handleRequestAction(grantId, "deny");
  };
  // Handle revoke (for active grants)
  const handleRevoke = async (grantId: string) => {
    await handleRequestAction(grantId, "deny"); // Revoke uses deny endpoint
  };

  // Get status badge
  const getStatusBadge = (status: AuthorizationRequest["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "ACTIVE":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <XCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case "REVOKED":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Revoked
          </Badge>
        );
    }
  };

  // Get organization type icon
  const getOrgTypeIcon = (type: Organization["type"]) => {
    switch (type) {
      case "HOSPITAL":
        return <Building2 className="h-4 w-4" />;
      case "CLINIC":
        return <Building2 className="h-4 w-4" />;
      case "PHARMACY":
        return <Pill className="h-4 w-4" />;
      case "LABORATORY":
        return <Activity className="h-4 w-4" />;
    }
  };

  // Format practitioner type for display
  const formatPractitionerType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      doctor: "Doctor",
      pharmacist: "Pharmacist",
      nurse: "Nurse",
      technician: "Technician",
      admin: "Administrator",
      other: "Healthcare Professional",
    };
    return typeMap[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Render access scope
  const renderAccessScope = (scope: AccessScope) => {
    const permissions = [
      { label: "Medical History", enabled: scope.canViewMedicalHistory, icon: FileText },
      { label: "Prescriptions", enabled: scope.canViewPrescriptions, icon: Pill },
      { label: "Create Records", enabled: scope.canCreateEncounters, icon: FileText },
      { label: "Audit Logs", enabled: scope.canViewAuditLogs, icon: Eye },
    ];

    return (
      <div className="grid grid-cols-2 gap-2">
        {permissions.map((permission) => (
          <div
            key={permission.label}
            className={`flex items-center gap-2 text-xs p-2 rounded ${
              permission.enabled ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"
            }`}
          >
            <permission.icon className="h-3 w-3" />
            <span>{permission.enabled ? "✓" : "✗"}</span>
            <span className="truncate">{permission.label}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Access Requests</CardTitle>
          <CardDescription>Loading authorization requests...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const activeRequests = requests.filter((r) => r.status === "ACTIVE");
  const inactiveRequests = requests.filter((r) => ["EXPIRED", "REVOKED"].includes(r.status));

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Access Requests
            </CardTitle>
            <CardDescription>Manage healthcare provider access to your medical records</CardDescription>
          </div>
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="bg-red-100 text-red-700">
              <AlertCircle className="h-3 w-3 mr-1" />
              {pendingRequests.length} Pending
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Label className="font-medium text-yellow-700">Pending Approval</Label>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                {pendingRequests.length}
              </Badge>
            </div>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.grantId} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg">{getOrgTypeIcon(request.organization.type)}</div>
                      <div>
                        <h4 className="font-medium">{request.organization.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {request.practitioner.firstName} {request.practitioner.lastName}
                          {request.practitioner.role && ` • ${formatPractitionerType(request.practitioner.role)}`}
                          {request.practitioner.specialty && ` • ${request.practitioner.specialty}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Requested {request.createdAt.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Requested Access ({request.timeWindowHours}h)</Label>
                    {renderAccessScope(request.requestedScope)}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(request.grantId)}
                      disabled={processingIds.has(request.grantId)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleDeny(request.grantId)}
                      disabled={processingIds.has(request.grantId)}
                      variant="outline"
                      size="sm"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Requests */}
        {activeRequests.length > 0 && (
          <>
            {pendingRequests.length > 0 && <Separator />}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Label className="font-medium text-green-700">Active Access</Label>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {activeRequests.length}
                </Badge>
              </div>
              <div className="space-y-4">
                {activeRequests.map((request) => (
                  <div key={request.grantId} className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg">{getOrgTypeIcon(request.organization.type)}</div>
                        <div>
                          <h4 className="font-medium">{request.organization.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {request.practitioner.firstName} {request.practitioner.lastName}
                            {request.practitioner.role && ` • ${formatPractitionerType(request.practitioner.role)}`}
                            {request.practitioner.specialty && ` • ${request.practitioner.specialty}`}
                          </p>
                          {request.expiresAt && (
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Expires {request.expiresAt.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Current Access</Label>
                      {renderAccessScope(request.requestedScope)}
                    </div>

                    <Button
                      onClick={() => handleRevoke(request.grantId)}
                      disabled={processingIds.has(request.grantId)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Revoke Access
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* No Requests */}
        {requests.length === 0 && (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-muted-foreground">No Access Requests</h3>
            <p className="text-sm text-muted-foreground mt-1">
              When healthcare providers scan your QR code, their access requests will appear here.
            </p>
          </div>
        )}

        {/* Recent History (collapsed) */}
        {inactiveRequests.length > 0 && (
          <>
            <Separator />
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Recent History ({inactiveRequests.length})
              </Label>
              <ScrollArea className="h-32 mt-2">
                <div className="space-y-2">
                  {inactiveRequests.map((request) => (
                    <div
                      key={request.grantId}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                    >
                      <div>
                        <span className="font-medium">{request.organization.name}</span>
                        <span className="text-muted-foreground ml-2">
                          {request.practitioner.firstName} {request.practitioner.lastName}
                          {request.practitioner.role && ` • ${formatPractitionerType(request.practitioner.role)}`}
                        </span>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AuthorizationRequests;
