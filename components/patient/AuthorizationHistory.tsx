"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
  Pill,
  Activity,
  RefreshCw,
  Calendar,
  Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AuthorizationGrant {
  grantId: string;
  patient: {
    name: string;
    digitalIdentifier: string;
  };
  organization: {
    _id: string;
    organizationInfo: {
      name: string;
      type: "HOSPITAL" | "CLINIC" | "PHARMACY" | "LABORATORY";
    };
    address: string;
  };
  requester: {
    name: string;
    type: string;
    specialty?: string;
  } | null;
  accessScope: string[] | string | null | undefined;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED" | "DENIED";
  createdAt: Date;
  grantedAt?: Date;
  expiresAt: Date;
  timeWindowHours: number;
}

interface AuthorizationHistoryProps {
  userId: string;
  className?: string;
}

export function AuthorizationHistory({ userId, className }: AuthorizationHistoryProps) {
  const { token } = useAuth();
  const [grants, setGrants] = useState<AuthorizationGrant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const fetchAuthorizationHistory = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: "50",
        includeExpired: "true",
      });

      const response = await fetch(`/api/patient/authorization-history?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch authorization history: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        const formattedGrants = result.data.grants.map((grant: any) => ({
          ...grant,
          createdAt: new Date(grant.createdAt),
          grantedAt: grant.grantedAt ? new Date(grant.grantedAt) : undefined,
          expiresAt: new Date(grant.expiresAt),
        }));
        setGrants(formattedGrants);
      } else {
        throw new Error(result.error || "Failed to fetch authorization history");
      }
    } catch (err) {
      console.error("Error fetching authorization history:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAuthorizationHistory();
  }, [fetchAuthorizationHistory]);

  const getStatusBadge = (status: AuthorizationGrant["status"]) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "EXPIRED":
        return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
      case "REVOKED":
        return <Badge className="bg-red-100 text-red-800">Revoked</Badge>;
      case "DENIED":
        return <Badge className="bg-red-100 text-red-800">Denied</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOrgTypeIcon = (type: string) => {
    switch (type) {
      case "HOSPITAL":
      case "CLINIC":
        return <Building2 className="h-4 w-4" />;
      case "PHARMACY":
        return <Pill className="h-4 w-4" />;
      case "LABORATORY":
        return <Activity className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

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

  const filterGrants = (grants: AuthorizationGrant[], filter: string) => {
    switch (filter) {
      case "active":
        return grants.filter((g) => g.status === "ACTIVE");
      case "pending":
        return grants.filter((g) => g.status === "PENDING");
      case "expired":
        return grants.filter((g) => g.status === "EXPIRED" || g.status === "REVOKED" || g.status === "DENIED");
      default:
        return grants;
    }
  };

  const renderAccessScope = (scope: string[] | string | null | undefined) => {
    // Handle various input types
    if (!scope) return "No specific access defined";

    // Convert to array if it's a string or ensure it's an array
    const scopeArray = Array.isArray(scope) ? scope : [scope];

    if (scopeArray.length === 0) return "No specific access defined";

    const scopeLabels: { [key: string]: string } = {
      canViewMedicalHistory: "Medical History",
      canViewPrescriptions: "Prescriptions",
      canCreateEncounters: "Create Encounters",
      canViewAuditLogs: "Audit Logs",
    };

    return scopeArray.map((s) => scopeLabels[s] || s).join(", ");
  };

  const activeGrants = filterGrants(grants, "active");
  const pendingGrants = filterGrants(grants, "pending");
  const expiredGrants = filterGrants(grants, "expired");

  if (loading && grants.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authorization History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authorization History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Failed to load authorization history</p>
            <Button onClick={fetchAuthorizationHistory} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authorization History
          </CardTitle>
          <Button onClick={fetchAuthorizationHistory} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({grants.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeGrants.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingGrants.length})</TabsTrigger>
            <TabsTrigger value="expired">History ({expiredGrants.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-96">
              {grants.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No authorization grants found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {grants.map((grant) => (
                    <div key={grant.grantId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-white rounded-lg border">
                            {getOrgTypeIcon(grant.organization.organizationInfo.type)}
                          </div>
                          <div>
                            <h4 className="font-medium">{grant.organization.organizationInfo.name}</h4>
                            {grant.requester && (
                              <p className="text-sm text-muted-foreground">
                                {grant.requester.name} • {formatPractitionerType(grant.requester.type)}
                                {grant.requester.specialty && ` • ${grant.requester.specialty}`}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Requested {grant.createdAt.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(grant.status)}
                      </div>

                      <div className="pl-11">
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>Access:</strong> {renderAccessScope(grant.accessScope)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Duration:</strong> {grant.timeWindowHours} hours
                          {grant.expiresAt && ` • Expires ${grant.expiresAt.toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            <ScrollArea className="h-96">
              {activeGrants.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No active authorizations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeGrants.map((grant) => (
                    <div key={grant.grantId} className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-white rounded-lg">
                            {getOrgTypeIcon(grant.organization.organizationInfo.type)}
                          </div>
                          <div>
                            <h4 className="font-medium">{grant.organization.organizationInfo.name}</h4>
                            {grant.requester && (
                              <p className="text-sm text-muted-foreground">
                                {grant.requester.name} • {formatPractitionerType(grant.requester.type)}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Expires {grant.expiresAt.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(grant.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            <ScrollArea className="h-96">
              {pendingGrants.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No pending authorizations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingGrants.map((grant) => (
                    <div key={grant.grantId} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-white rounded-lg">
                            {getOrgTypeIcon(grant.organization.organizationInfo.type)}
                          </div>
                          <div>
                            <h4 className="font-medium">{grant.organization.organizationInfo.name}</h4>
                            {grant.requester && (
                              <p className="text-sm text-muted-foreground">
                                {grant.requester.name} • {formatPractitionerType(grant.requester.type)}
                              </p>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(grant.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="expired" className="mt-4">
            <ScrollArea className="h-96">
              {expiredGrants.length === 0 ? (
                <div className="text-center py-8">
                  <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No expired or revoked authorizations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {expiredGrants.map((grant) => (
                    <div key={grant.grantId} className="border border-gray-200 bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-white rounded-lg">
                            {getOrgTypeIcon(grant.organization.organizationInfo.type)}
                          </div>
                          <div>
                            <h4 className="font-medium">{grant.organization.organizationInfo.name}</h4>
                            {grant.requester && (
                              <p className="text-sm text-muted-foreground">
                                {grant.requester.name} • {formatPractitionerType(grant.requester.type)}
                              </p>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(grant.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
