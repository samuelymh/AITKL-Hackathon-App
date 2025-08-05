"use client";

import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  type: string;
  city?: string;
  state?: string;
  verified?: boolean;
  isVerified?: boolean;
  registrationNumber?: string;
  description?: string;
}

interface OrganizationSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  errorMessage?: string;

  // API configuration
  endpoint?: string;
  includeUnverified?: boolean;
  organizationTypes?: string[];
  limit?: number;

  // Display options
  showBadge?: boolean;
  showLocation?: boolean;
  showType?: boolean;
  showRegistrationNumber?: boolean;

  // Helper text
  helperText?: string;
  helperLink?: {
    text: string;
    href: string;
    target?: string;
  };
}

export function OrganizationSelect({
  value,
  onValueChange,
  placeholder = "Select organization",
  label,
  required = false,
  disabled = false,
  className = "",
  errorMessage,

  // API configuration
  endpoint,
  includeUnverified = false,
  organizationTypes,
  limit = 100,

  // Display options
  showBadge = true,
  showLocation = true,
  showType = false,
  showRegistrationNumber = false,

  // Helper text
  helperText,
  helperLink,
}: Readonly<OrganizationSelectProps>) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Determine which endpoint to use
  const getApiEndpoint = () => {
    if (endpoint) return endpoint;

    // Default endpoints based on common patterns
    const verifiedParam = includeUnverified ? "false" : "true";
    const limitParam = `limit=${limit}`;

    // Use the general organizations list endpoint as default
    return `/api/organizations/list?verified=${verifiedParam}&${limitParam}`;
  };

  // Helper to get auth headers
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('accessToken') || document.cookie
      .split('; ')
      .find(row => row.startsWith('accessToken='))
      ?.split('=')[1];

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };

  // Helper to filter organizations by type
  const filterOrganizationsByType = (orgs: Organization[]): Organization[] => {
    if (!organizationTypes || organizationTypes.length === 0) {
      return orgs;
    }
    return orgs.filter((org: Organization) => organizationTypes.includes(org.type));
  };

  // Helper to try public fallback
  const tryPublicFallback = async (): Promise<Organization[]> => {
    try {
      const publicResponse = await fetch('/api/organizations/public?verified=true&limit=50');
      if (publicResponse.ok) {
        const publicData = await publicResponse.json();
        if (publicData.success && publicData.data?.organizations) {
          return filterOrganizationsByType(publicData.data.organizations);
        }
      }
    } catch (error) {
      console.error("Public fallback failed:", error);
    }
    return [];
  };

  // Fetch organizations
  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const apiUrl = getApiEndpoint();
      const headers = getAuthHeaders();
      const response = await fetch(apiUrl, { headers });
      
      // Handle authentication errors with fallback
      if (response.status === 401) {
        console.warn("Authentication required, trying public endpoint");
        const fallbackOrgs = await tryPublicFallback();
        setOrganizations(fallbackOrgs);
        return;
      }

      const data = await response.json();

      if (data.success && data.data?.organizations) {
        const filteredOrgs = filterOrganizationsByType(data.data.organizations);
        setOrganizations(filteredOrgs);
      } else {
        console.error("Failed to fetch organizations:", data.error || data.message);
        if (response.status !== 401) {
          toast({
            title: "Error",
            description: data.message || "Failed to load organizations",
            variant: "destructive",
          });
        }
        setOrganizations([]);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast({
        title: "Error",
        description: "Failed to load organizations. Please try again.",
        variant: "destructive",
      });
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  // Load organizations on component mount
  useEffect(() => {
    fetchOrganizations();
  }, [endpoint, includeUnverified, limit, organizationTypes]);

  // Determine if organization is verified
  const isOrganizationVerified = (org: Organization) => {
    return org.verified ?? org.isVerified ?? false;
  };

  // Format organization display text
  const formatOrganizationLabel = (org: Organization) => {
    const parts = [org.name];

    if (showType && org.type) {
      parts.push(org.type);
    }

    if (showLocation && org.city && org.state) {
      parts.push(`${org.city}, ${org.state}`);
    }

    if (showRegistrationNumber && org.registrationNumber) {
      parts.push(`#${org.registrationNumber}`);
    }

    return parts.join(" • ");
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor="organization-select">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
        <SelectTrigger className={errorMessage ? "border-red-500" : ""}>
          <SelectValue placeholder={loading ? "Loading organizations..." : placeholder} />
          {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
        </SelectTrigger>

        <SelectContent>
          {organizations.length > 0 &&
            organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <span className="font-medium">{org.name}</span>
                    <span className="text-sm text-gray-500">{formatOrganizationLabel(org)}</span>
                  </div>
                  {showBadge && isOrganizationVerified(org) && (
                    <Badge variant="secondary" className="text-xs ml-2">
                      Verified
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}

          {loading && (
            <SelectItem value="__loading__" disabled>
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading organizations...
              </div>
            </SelectItem>
          )}

          {!loading && organizations.length === 0 && (
            <SelectItem value="__no_results__" disabled>
              No organizations found
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      {helperText && (
        <p className="text-xs text-gray-500">
          {helperText}
          {helperLink && (
            <>
              {" "}
              <a
                href={helperLink.href}
                target={helperLink.target || "_blank"}
                className="text-blue-600 hover:underline"
              >
                {helperLink.text}
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}

// Preset configurations for common use cases
export const PharmacyOrganizationSelect = (props: Omit<OrganizationSelectProps, "organizationTypes" | "endpoint">) => (
  <OrganizationSelect
    {...props}
    endpoint="/api/pharmacist/organizations?verified=true&limit=100"
    organizationTypes={["pharmacy", "hospital", "clinic", "healthcare_network", "pharmaceutical_company"]}
    helperText="Can't find your organization?"
    helperLink={{
      text: "Register it here",
      href: "/demo/organization-management",
    }}
  />
);

export const GeneralOrganizationSelect = (props: OrganizationSelectProps) => (
  <OrganizationSelect
    {...props}
    endpoint="/api/organizations/public?verified=true&limit=50"
    helperText="Can't find your organization?"
    helperLink={{
      text: "Register it here",
      href: "/demo/organization-management",
    }}
  />
);

export const HospitalOrganizationSelect = (props: Omit<OrganizationSelectProps, "organizationTypes">) => (
  <OrganizationSelect
    {...props}
    endpoint="/api/organizations/public?type=hospital,clinic&verified=true&limit=50"
    organizationTypes={["hospital", "clinic", "healthcare_network"]}
    helperText="Only hospital and clinic organizations are shown"
  />
);
