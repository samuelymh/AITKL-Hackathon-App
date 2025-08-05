"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

interface Organization {
  id: string;
  name: string;
  type: string;
  registrationNumber?: string;
  address: string;
  contact: {
    email: string;
    phone: string;
  };
  verification: {
    isVerified: boolean;
    verifiedAt?: string;
    verificationNotes?: string;
  };
  submittedAt: string;
}

interface PaginationInfo {
  current: number;
  total: number;
  count: number;
  totalCount: number;
}

export function OrganizationVerificationPanel() {
  const { token } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [status, setStatus] = useState("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchOrganizations();
  }, [status]);

  const fetchOrganizations = async (page = 1) => {
    setLoading(true);
    setError("");

    try {
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/admin/organizations/verification?status=${status}&page=${page}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        setError("Authentication required. Please log in again.");
        return;
      }

      if (data.success) {
        setOrganizations(data.data.organizations);
        setPagination(data.data.pagination);
      } else {
        setError(data.error || "Failed to fetch organizations");
      }
    } catch (err) {
      setError("Network error occurred");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationDecision = async (organizationId: string, action: "verify" | "reject") => {
    setProcessingId(organizationId);
    setError("");
    setSuccess("");

    try {
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setProcessingId(null);
        return;
      }

      const requestBody: any = { organizationId, action };

      // Add notes if provided
      if (verificationNotes[organizationId]) {
        requestBody.notes = verificationNotes[organizationId];
      }

      // Add rejection reason if rejecting
      if (action === "reject" && rejectionReasons[organizationId]) {
        requestBody.rejectionReason = rejectionReasons[organizationId];
      }

      const response = await fetch("/api/admin/organizations/verification", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.status === 401) {
        setError("Authentication required. Please log in again.");
        return;
      }

      if (data.success) {
        setSuccess(`Organization ${action === "verify" ? "verified" : "rejected"} successfully`);
        // Refresh the list
        await fetchOrganizations();
        // Clear the notes
        setVerificationNotes((prev) => ({ ...prev, [organizationId]: "" }));
        setRejectionReasons((prev) => ({ ...prev, [organizationId]: "" }));
      } else {
        setError(data.error || `Failed to ${action} organization`);
      }
    } catch (err) {
      setError("Network error occurred");
      console.error("Verification error:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (isVerified: boolean) => {
    return <Badge variant={isVerified ? "default" : "secondary"}>{isVerified ? "Verified" : "Pending"}</Badge>;
  };

  const formatAddress = (address: any) => {
    if (!address) return "No address provided";

    // Handle encrypted address object
    if (typeof address === "object" && address.data && address.iv) {
      // This is an encrypted field, return a placeholder
      return "Address data (encrypted)";
    }

    // Handle regular address object
    if (typeof address === "object") {
      const parts = [];
      if (address.street) parts.push(address.street);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.postalCode) parts.push(address.postalCode);
      if (address.country) parts.push(address.country);
      return parts.join(", ") || "Address information incomplete";
    }

    // Handle string address (fallback)
    return String(address);
  };

  const formatContact = (contact: any, field: string) => {
    if (!contact?.[field]) return "Not provided";

    const value = contact[field];

    // Handle encrypted field
    if (typeof value === "object" && value.data && value.iv) {
      return `${field} (encrypted)`;
    }

    return String(value);
  };

  const formatSimpleField = (value: any, fieldName: string = "field") => {
    if (!value) return "Not provided";

    // Handle encrypted field
    if (typeof value === "object" && value.data && value.iv) {
      return `${fieldName} (encrypted)`;
    }

    return String(value);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      HOSPITAL: "bg-blue-100 text-blue-800",
      CLINIC: "bg-green-100 text-green-800",
      PHARMACY: "bg-purple-100 text-purple-800",
      LABORATORY: "bg-orange-100 text-orange-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Organization Verification</h2>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {loading && <div className="text-center py-8">Loading organizations...</div>}

      {!loading && organizations.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No organizations found for status: {status}</p>
        </div>
      )}

      {!loading && organizations.length > 0 && (
        <div className="space-y-4">
          {organizations.map((org) => (
            <Card key={org.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{formatSimpleField(org.name, "Organization name")}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      {getStatusBadge(org.verification.isVerified)}
                      <Badge className={getTypeColor(org.type)}>{formatSimpleField(org.type, "Type")}</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">Submitted: {formatDate(org.submittedAt)}</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Organization Details</h4>
                    <div className="space-y-1 text-sm">
                      {org.registrationNumber && (
                        <p>
                          <span className="font-medium">Registration:</span>{" "}
                          {formatSimpleField(org.registrationNumber, "Registration number")}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Address:</span> {formatAddress(org.address)}
                      </p>
                      <p>
                        <span className="font-medium">Email:</span> {formatContact(org.contact, "email")}
                      </p>
                      <p>
                        <span className="font-medium">Phone:</span> {formatContact(org.contact, "phone")}
                      </p>
                    </div>
                  </div>

                  {status === "pending" && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Verification Actions</h4>
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Add verification notes (optional)"
                          value={verificationNotes[org.id] || ""}
                          onChange={(e) =>
                            setVerificationNotes((prev) => ({
                              ...prev,
                              [org.id]: e.target.value,
                            }))
                          }
                          className="text-sm"
                          rows={2}
                        />

                        <Textarea
                          placeholder="Rejection reason (required if rejecting)"
                          value={rejectionReasons[org.id] || ""}
                          onChange={(e) =>
                            setRejectionReasons((prev) => ({
                              ...prev,
                              [org.id]: e.target.value,
                            }))
                          }
                          className="text-sm"
                          rows={2}
                        />

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleVerificationDecision(org.id, "verify")}
                            disabled={processingId === org.id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processingId === org.id ? "Processing..." : "Verify"}
                          </Button>
                          <Button
                            onClick={() => handleVerificationDecision(org.id, "reject")}
                            disabled={processingId === org.id || !rejectionReasons[org.id]}
                            variant="destructive"
                            size="sm"
                          >
                            {processingId === org.id ? "Processing..." : "Reject"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {org.verification.verificationNotes && (
                    <div className="md:col-span-2">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Verification Notes</h4>
                      <p className="text-sm bg-gray-50 p-2 rounded">
                        {formatSimpleField(org.verification.verificationNotes, "Verification notes")}
                      </p>
                      {org.verification.verifiedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Verified: {formatDate(org.verification.verifiedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagination && pagination.total > 1 && (
        <div className="flex justify-center space-x-2">
          {Array.from({ length: pagination.total }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === pagination.current ? "default" : "outline"}
              size="sm"
              onClick={() => fetchOrganizations(page)}
            >
              {page}
            </Button>
          ))}
        </div>
      )}

      {pagination && (
        <div className="text-center text-sm text-gray-500">
          Showing {pagination.count} of {pagination.totalCount} organizations
        </div>
      )}
    </div>
  );
}
