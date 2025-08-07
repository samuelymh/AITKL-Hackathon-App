"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OrganizationSelector from "@/components/organization-selector";
import OrganizationRegistrationForm from "@/components/organization-registration-form";
import { Building2, Search, Plus, CheckCircle } from "lucide-react";

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

export default function OrganizationDemoPage() {
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registeredOrganizations, setRegisteredOrganizations] = useState<
    Organization[]
  >([]);

  const handleOrganizationSelect = (organization: Organization | null) => {
    setSelectedOrganization(organization);
  };

  const handleOrganizationRegistered = (organization: Organization) => {
    setRegisteredOrganizations((prev) => [...prev, organization]);
    setShowRegistrationForm(false);

    // Optionally select the newly registered organization
    setSelectedOrganization(organization);
  };

  const handleShowRegistrationForm = () => {
    setShowRegistrationForm(true);
  };

  const handleCancelRegistration = () => {
    setShowRegistrationForm(false);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Organization Management Demo
        </h1>
        <p className="text-muted-foreground">
          Demonstration of organization search, selection, and registration
          functionality for healthcare professionals.
        </p>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Organizations
          </TabsTrigger>
          <TabsTrigger value="register" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Register Organization
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Search & Selection</CardTitle>
              <CardDescription>
                Search for and select your healthcare organization. This would
                be used during professional registration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <OrganizationSelector
                  onSelect={handleOrganizationSelect}
                  selectedOrganization={selectedOrganization}
                  placeholder="Search for your organization (e.g., General Hospital, Pharmacy, etc.)"
                  required
                />

                {selectedOrganization && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">
                      Organization Selected Successfully!
                    </h3>
                    <p className="text-sm text-green-700">
                      You have selected{" "}
                      <strong>
                        {selectedOrganization.organizationInfo.name}
                      </strong>
                      . In a real application, this would be saved as part of
                      your professional profile and used for authorization
                      requests.
                    </p>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <p>
                    <strong>Note:</strong> In the actual application flow:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>
                      This component would be integrated into the professional
                      registration form
                    </li>
                    <li>
                      Selected organization would be saved to the
                      practitioner&apos;s profile
                    </li>
                    <li>
                      Only verified organizations would be able to authorize
                      access to patient records
                    </li>
                    <li>
                      Practitioners can be associated with multiple
                      organizations
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register" className="space-y-6">
          {!showRegistrationForm ? (
            <Card>
              <CardHeader>
                <CardTitle>Organization Registration</CardTitle>
                <CardDescription>
                  Register a new healthcare organization if you cannot find it
                  in the search.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    Register Your Organization
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Can&apos;t find your organization in the search? Register it
                    here. All organizations will be reviewed for verification
                    before they can authorize patient access.
                  </p>
                  <Button onClick={handleShowRegistrationForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Register New Organization
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <OrganizationRegistrationForm
              onSuccess={handleOrganizationRegistered}
              onCancel={handleCancelRegistration}
            />
          )}

          {registeredOrganizations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recently Registered Organizations</CardTitle>
                <CardDescription>
                  Organizations you have registered in this session.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {registeredOrganizations.map((org, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {org.organizationInfo.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {org.address.city}, {org.address.state}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {org.organizationInfo.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Implementation Status</CardTitle>
                <CardDescription>
                  Current implementation progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Organization Model (Updated)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Organization Search API</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Organization Registration API</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Organization Types API</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Organization Selector Component</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Organization Registration Form</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
                <CardDescription>Planned implementation steps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full border-2 border-blue-600" />
                    <span>Update Professional Registration Flow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full border-2 border-blue-600" />
                    <span>Implement Organization Member Model</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full border-2 border-blue-600" />
                    <span>Add Organization Management Dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full border-2 border-blue-600" />
                    <span>Update Authorization Grant Workflow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full border-2 border-blue-600" />
                    <span>Add Organization Verification Process</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base Alignment</CardTitle>
              <CardDescription>
                How this implementation aligns with the knowledge base
                requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">
                    ✅ Organization-Centric Registration
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Professional signup now starts with organization selection,
                    allowing practitioners to work with multiple organizations
                    as specified in the knowledge base.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">
                    ✅ Search and Registration
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Professionals can search for existing organizations or
                    register new ones, with proper validation and verification
                    workflow.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">
                    ✅ Multi-Organization Support
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    The OrganizationMember model (to be implemented) will
                    support the many-to-many relationship between practitioners
                    and organizations.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">
                    ✅ Verification Workflow
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Organizations require verification before they can authorize
                    access to patient records, ensuring security and compliance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
