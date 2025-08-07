"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PharmacyOrganizationSelect } from "@/components/ui/organization-select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Save,
  User,
  Building,
  Award,
  Clock,
  Phone,
  Loader2,
} from "lucide-react";

// Pharmacy Professional Info Schema
const PharmacistProfessionalInfoSchema = z.object({
  licenseNumber: z
    .string()
    .min(3, "License number must be at least 3 characters")
    .max(50),
  specialty: z
    .string()
    .min(2, "Specialty must be at least 2 characters")
    .max(100),
  practitionerType: z
    .enum([
      "pharmacist",
      "clinical_pharmacist",
      "hospital_pharmacist",
      "community_pharmacist",
      "industrial_pharmacist",
      "consultant_pharmacist",
    ])
    .default("pharmacist"),
  yearsOfExperience: z
    .number()
    .min(0, "Years of experience cannot be negative")
    .max(70, "Years of experience seems too high"),
  currentPosition: z
    .string()
    .min(2, "Position must be at least 2 characters")
    .max(100),
  department: z.string().optional(),
  organizationId: z.string().optional(),

  certifications: z
    .array(
      z.object({
        name: z.string().min(2, "Certification name required"),
        issuingBody: z.string().min(2, "Issuing body required"),
        issueDate: z.string(),
        expiryDate: z.string().optional(),
        verificationStatus: z
          .enum(["pending", "verified", "expired"])
          .default("pending"),
      }),
    )
    .default([]),

  specializations: z
    .array(z.string().min(2, "Specialization must be at least 2 characters"))
    .default([]),
  languages: z
    .array(z.string().min(2, "Language must be at least 2 characters"))
    .default([]),

  continuingEducation: z
    .object({
      totalHours: z.number().min(0).default(0),
      lastCompletedDate: z.string().optional(),
      certifyingBody: z.string().optional(),
    })
    .optional(),

  emergencyContact: z
    .object({
      name: z.string().min(2, "Emergency contact name required"),
      relationship: z.string().min(2, "Relationship required"),
      phone: z
        .string()
        .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
      email: z.string().email("Invalid email format").optional(),
    })
    .optional(),

  preferences: z
    .object({
      workingHours: z.string().optional(),
      consultationTypes: z.array(z.string()).default([]),
      specialInterests: z.array(z.string()).default([]),
    })
    .optional(),
});

type PharmacistProfessionalInfo = z.infer<
  typeof PharmacistProfessionalInfoSchema
>;

export default function PharmacistProfessionalProfile() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  const form = useForm<PharmacistProfessionalInfo>({
    resolver: zodResolver(PharmacistProfessionalInfoSchema),
    defaultValues: {
      licenseNumber: "",
      specialty: "",
      practitionerType: "pharmacist",
      yearsOfExperience: 0,
      currentPosition: "",
      department: "",
      organizationId: "",
      certifications: [],
      specializations: [],
      languages: [],
      continuingEducation: {
        totalHours: 0,
        lastCompletedDate: "",
        certifyingBody: "",
      },
      emergencyContact: {
        name: "",
        relationship: "",
        phone: "",
        email: "",
      },
      preferences: {
        workingHours: "",
        consultationTypes: [],
        specialInterests: [],
      },
    },
  });

  const {
    fields: certificationFields,
    append: appendCertification,
    remove: removeCertification,
  } = useFieldArray({
    control: form.control,
    name: "certifications",
  });

  // Load professional information on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/pharmacist/professional-info");

        // Handle profile response
        if (!response.ok) {
          throw new Error(
            `Failed to load profile: ${response.status} ${response.statusText}`,
          );
        }

        const profileData = await response.json();

        if (profileData.success && profileData.data) {
          const profile = profileData.data;

          // Map the data to form fields
          form.reset({
            licenseNumber: profile.licenseNumber || "",
            specialty: profile.specialty || "",
            practitionerType: profile.practitionerType || "pharmacist",
            yearsOfExperience: profile.yearsOfExperience || 0,
            currentPosition: profile.currentPosition || "",
            department: profile.department || "",
            organizationId: profile.organizationId || "",
            certifications: profile.certifications || [],
            specializations: profile.specializations || [],
            languages: profile.languages || [],
            continuingEducation: profile.continuingEducation || {
              totalHours: 0,
              lastCompletedDate: "",
              certifyingBody: "",
            },
            emergencyContact: profile.emergencyContact || {
              name: "",
              relationship: "",
              phone: "",
              email: "",
            },
            preferences: profile.preferences || {
              workingHours: "",
              consultationTypes: [],
              specialInterests: [],
            },
          });

          setCompletionPercentage(profile.completionPercentage || 0);
        } else {
          console.warn(
            "Profile fetch succeeded but returned no data:",
            profileData.message,
          );
          toast({
            title: "Info",
            description:
              profileData.message ||
              "No existing profile found. You can create one now.",
            variant: "default",
          });
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? `Failed to load profile: ${error.message}`
              : "Failed to load profile. Please refresh the page and try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [toast, form]);

  // Legacy functions removed - all data loading now handled in unified useEffect

  const onSubmit = async (data: PharmacistProfessionalInfo) => {
    try {
      setSaving(true);

      const response = await fetch("/api/pharmacist/professional-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save professional information");
      }

      const result = await response.json();

      if (result.success) {
        setCompletionPercentage(result.data.completionPercentage || 0);
        toast({
          title: "Success",
          description: "Professional information saved successfully",
        });
      } else {
        throw new Error(result.message || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving professional info:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save professional information",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addCertification = () => {
    appendCertification({
      name: "",
      issuingBody: "",
      issueDate: "",
      expiryDate: "",
      verificationStatus: "pending",
    });
  };

  const practitionerTypes = [
    { value: "pharmacist", label: "General Pharmacist" },
    { value: "clinical_pharmacist", label: "Clinical Pharmacist" },
    { value: "hospital_pharmacist", label: "Hospital Pharmacist" },
    { value: "community_pharmacist", label: "Community Pharmacist" },
    { value: "industrial_pharmacist", label: "Industrial Pharmacist" },
    { value: "consultant_pharmacist", label: "Consultant Pharmacist" },
  ];

  const specialtyOptions = [
    "Community Pharmacy",
    "Hospital Pharmacy",
    "Clinical Pharmacy",
    "Industrial Pharmacy",
    "Pharmaceutical Research",
    "Regulatory Affairs",
    "Pharmacovigilance",
    "Oncology Pharmacy",
    "Pediatric Pharmacy",
    "Geriatric Pharmacy",
    "Infectious Disease Pharmacy",
    "Cardiology Pharmacy",
    "Psychiatry Pharmacy",
    "Pain Management",
    "Compounding Pharmacy",
    "Nuclear Pharmacy",
    "Veterinary Pharmacy",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading professional information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Profile Completion:
          </span>
          <Badge variant={completionPercentage >= 80 ? "default" : "secondary"}>
            {completionPercentage}%
          </Badge>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Basic Professional Information</span>
            </CardTitle>
            <CardDescription>
              Your core professional details and qualifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">Pharmacy License Number *</Label>
                <Input
                  id="licenseNumber"
                  placeholder="e.g., PH12345"
                  {...form.register("licenseNumber")}
                />
                {form.formState.errors.licenseNumber && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.licenseNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="practitionerType">Pharmacist Type *</Label>
                <Select
                  value={form.watch("practitionerType")}
                  onValueChange={(value) =>
                    form.setValue("practitionerType", value as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pharmacist type" />
                  </SelectTrigger>
                  <SelectContent>
                    {practitionerTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty">Primary Specialty *</Label>
                <Select
                  value={form.watch("specialty")}
                  onValueChange={(value) => form.setValue("specialty", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialtyOptions.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
                <Input
                  id="yearsOfExperience"
                  type="number"
                  min="0"
                  max="70"
                  placeholder="e.g., 5"
                  {...form.register("yearsOfExperience", {
                    valueAsNumber: true,
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentPosition">Current Position *</Label>
                <Input
                  id="currentPosition"
                  placeholder="e.g., Staff Pharmacist, Pharmacy Manager"
                  {...form.register("currentPosition")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g., Outpatient Pharmacy, ICU"
                  {...form.register("department")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Organization</span>
            </CardTitle>
            <CardDescription>
              Select your current organization or workplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PharmacyOrganizationSelect
              value={form.watch("organizationId")}
              onValueChange={(value) => form.setValue("organizationId", value)}
              label="Organization"
              placeholder="Select organization"
              showBadge={true}
              showLocation={true}
            />
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Certifications</span>
            </CardTitle>
            <CardDescription>
              Add your professional certifications and credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {certificationFields.map((field, index) => (
              <div key={field.id} className="border p-4 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Certification {index + 1}</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeCertification(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Certification Name</Label>
                    <Input
                      placeholder="e.g., Board Certified Pharmacist"
                      {...form.register(`certifications.${index}.name`)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Issuing Body</Label>
                    <Input
                      placeholder="e.g., Board of Pharmacy"
                      {...form.register(`certifications.${index}.issuingBody`)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <Input
                      type="date"
                      {...form.register(`certifications.${index}.issueDate`)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      {...form.register(`certifications.${index}.expiryDate`)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addCertification}>
              <Plus className="h-4 w-4 mr-2" />
              Add Certification
            </Button>
          </CardContent>
        </Card>

        {/* Continuing Education */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Continuing Education</span>
            </CardTitle>
            <CardDescription>
              Track your continuing education requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalHours">Total CE Hours</Label>
                <Input
                  id="totalHours"
                  type="number"
                  min="0"
                  placeholder="0"
                  {...form.register("continuingEducation.totalHours", {
                    valueAsNumber: true,
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastCompletedDate">Last Completed</Label>
                <Input
                  id="lastCompletedDate"
                  type="date"
                  {...form.register("continuingEducation.lastCompletedDate")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certifyingBody">Certifying Body</Label>
                <Input
                  id="certifyingBody"
                  placeholder="e.g., ACPE"
                  {...form.register("continuingEducation.certifyingBody")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="h-5 w-5" />
              <span>Emergency Contact</span>
            </CardTitle>
            <CardDescription>
              Professional emergency contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyName">Contact Name</Label>
                <Input
                  id="emergencyName"
                  placeholder="Full name"
                  {...form.register("emergencyContact.name")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyRelationship">Relationship</Label>
                <Input
                  id="emergencyRelationship"
                  placeholder="e.g., Spouse, Parent"
                  {...form.register("emergencyContact.relationship")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Phone Number</Label>
                <Input
                  id="emergencyPhone"
                  placeholder="+1 (555) 123-4567"
                  {...form.register("emergencyContact.phone")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyEmail">Email (Optional)</Label>
                <Input
                  id="emergencyEmail"
                  type="email"
                  placeholder="contact@example.com"
                  {...form.register("emergencyContact.email")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Professional Information
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
