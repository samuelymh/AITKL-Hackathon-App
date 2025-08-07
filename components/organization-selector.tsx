"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Building2, MapPin, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Organization {
  _id: string;
  organizationInfo: {
    name: string;
    type: string;
    registrationNumber?: string;
    description?: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  verification: {
    isVerified: boolean;
  };
  metadata: {
    memberCount: number;
  };
}

interface OrganizationSelectorProps {
  onSelect: (organization: Organization | null) => void;
  selectedOrganization?: Organization | null;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function OrganizationSelector({
  onSelect,
  selectedOrganization,
  placeholder = "Search for your organization...",
  className,
  required = false,
}: Readonly<OrganizationSelectorProps>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setOrganizations([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          query: query.trim(),
          limit: "10",
        });

        const response = await fetch(`/api/organizations/search?${params}`);
        const data = await response.json();

        if (data.success) {
          setOrganizations(data.data.organizations);
          setHasSearched(true);
        } else {
          throw new Error(data.message || "Failed to search organizations");
        }
      } catch (error) {
        console.error("Search error:", error);
        toast({
          title: "Search Error",
          description: "Failed to search organizations. Please try again.",
          variant: "destructive",
        });
        setOrganizations([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [toast],
  );

  // Effect to trigger search when query changes
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleSelect = (organization: Organization) => {
    onSelect(organization);
    setSearchQuery(organization.organizationInfo.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setSearchQuery("");
    setOrganizations([]);
    setHasSearched(false);
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsOpen(true);

    // Clear selection if user modifies the search after selecting
    if (
      selectedOrganization &&
      value !== selectedOrganization.organizationInfo.name
    ) {
      onSelect(null);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-10"
          required={required}
        />
        {selectedOrganization && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-8 w-8 p-0"
            onClick={handleClear}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Selected Organization Display */}
      {selectedOrganization && (
        <Card className="mt-2 border-green-200 bg-green-50">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">
                    {selectedOrganization.organizationInfo.name}
                  </span>
                  {selectedOrganization.verification.isVerified && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <MapPin className="h-3 w-3" />
                  {selectedOrganization.address.city},{" "}
                  {selectedOrganization.address.state}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {selectedOrganization.organizationInfo.type}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results Dropdown */}
      {isOpen && !selectedOrganization && (
        <Card className="absolute top-full z-50 mt-1 w-full max-h-96 overflow-auto border shadow-lg">
          <CardContent className="p-0">
            {isLoading && (
              <div className="p-4 space-y-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            )}

            {!isLoading && organizations.length > 0 && (
              <div className="divide-y">
                {organizations.map((org) => (
                  <button
                    key={org._id}
                    type="button"
                    className="w-full p-4 text-left hover:bg-muted transition-colors"
                    onClick={() => handleSelect(org)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {org.organizationInfo.name}
                          </span>
                          {org.verification.isVerified && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {org.organizationInfo.type}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {org.address.street}, {org.address.city},{" "}
                        {org.address.state}
                      </div>

                      {org.organizationInfo.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {org.organizationInfo.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {org.organizationInfo.registrationNumber && (
                          <span>
                            Reg: {org.organizationInfo.registrationNumber}
                          </span>
                        )}
                        <span>{org.metadata.memberCount} members</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!isLoading &&
              hasSearched &&
              organizations.length === 0 &&
              searchQuery.trim() && (
                <div className="p-8 text-center text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    No organizations found for "{searchQuery}"
                  </p>
                  <p className="text-xs mt-1">
                    Try a different search term or check if your organization is
                    registered.
                  </p>
                </div>
              )}

            {!isLoading && !hasSearched && searchQuery.trim() === "" && (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">
                  Start typing to search for organizations
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}
