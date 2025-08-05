"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, MapPin, Phone, Mail, Globe, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// Form validation schema
const organizationFormSchema = z.object({
  organizationInfo: z.object({
    name: z.string().min(1, "Organization name is required").max(200),
    type: z.enum(["HOSPITAL", "CLINIC", "PHARMACY", "LABORATORY"], {
      required_error: "Please select an organization type",
    }),
    registrationNumber: z.string().max(100).optional(),
    description: z.string().max(1000).optional(),
  }),
  address: z.object({
    street: z.string().min(1, "Street address is required").max(200),
    city: z.string().min(1, "City is required").max(100),
    state: z.string().min(1, "State is required").max(100),
    postalCode: z.string().min(1, "Postal code is required").max(20),
    country: z.string().max(100).default("Malaysia"),
  }),
  contact: z.object({
    phone: z
      .string()
      .min(1, "Phone number is required")
      .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
    email: z.string().email("Invalid email address"),
    website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  }),
  metadata: z
    .object({
      establishedDate: z.string().optional(),
    })
    .optional(),
});

type OrganizationFormData = z.infer<typeof organizationFormSchema>;

interface OrganizationType {
  value: string;
  label: string;
  description: string;
}

interface OrganizationRegistrationFormProps {
  onSuccess?: (organization: any) => void;
  onCancel?: () => void;
  className?: string;
}

export default function OrganizationRegistrationForm({
  onSuccess,
  onCancel,
  className,
}: OrganizationRegistrationFormProps) {
  const [organizationTypes, setOrganizationTypes] = useState<OrganizationType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      organizationInfo: {
        name: "",
        type: undefined,
        registrationNumber: "",
        description: "",
      },
      address: {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "Malaysia",
      },
      contact: {
        phone: "",
        email: "",
        website: "",
      },
      metadata: {
        establishedDate: "",
      },
    },
  });

  // Load organization types
  useEffect(() => {
    const loadOrganizationTypes = async () => {
      try {
        const response = await fetch("/api/organizations/types");
        const data = await response.json();

        if (data.success) {
          setOrganizationTypes(data.data.types);
        } else {
          throw new Error("Failed to load organization types");
        }
      } catch (error) {
        console.error("Error loading organization types:", error);
        toast({
          title: "Error",
          description: "Failed to load organization types. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    loadOrganizationTypes();
  }, [toast]);

  const onSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true);

    try {
      // Clean up the data
      const submitData = {
        ...data,
        contact: {
          ...data.contact,
          website: data.contact.website || undefined,
        },
        metadata: data.metadata?.establishedDate
          ? {
              establishedDate: new Date(data.metadata.establishedDate).toISOString(),
            }
          : undefined,
      };

      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: "Organization registered successfully! It will be reviewed for verification.",
        });

        onSuccess?.(result.data.organization);
        form.reset();
      } else {
        throw new Error(result.message || "Failed to register organization");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Register Your Organization
        </CardTitle>
        <CardDescription>
          Register your healthcare organization to allow practitioners to join and request access to patient records.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            All organizations will be reviewed for verification. Only verified organizations can authorize access to
            patient records.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Organization Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Organization Information</h3>

              <FormField
                control={form.control}
                name="organizationInfo.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., General Hospital" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organizationInfo.type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select organization type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {organizationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organizationInfo.registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Government registration ID (optional)" {...field} />
                    </FormControl>
                    <FormDescription>Official registration number from relevant authorities</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organizationInfo.description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of your organization and services"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </h3>

              <FormField
                control={form.control}
                name="address.street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="Kuala Lumpur" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <FormControl>
                        <Input placeholder="Selangor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="50000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>

              <FormField
                control={form.control}
                name="contact.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="+60 3-1234 5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact.email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address *
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@hospital.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact.website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.hospital.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>

              <FormField
                control={form.control}
                name="metadata.establishedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Established Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>When was your organization established?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-6">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Registering..." : "Register Organization"}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
