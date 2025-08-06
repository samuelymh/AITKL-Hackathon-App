"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GeneralOrganizationSelect } from "@/components/ui/organization-select";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2,
  ArrowLeft,
  UserPlus,
  User,
  Stethoscope,
  Pill,
} from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";

const RegisterSchema = z
  .object({
    personalInfo: z.object({
      firstName: z.string().min(1, "First name is required").max(100),
      lastName: z.string().min(1, "Last name is required").max(100),
      dateOfBirth: z.string().min(1, "Date of birth is required"),
      contact: z.object({
        email: z.string().email("Invalid email address"),
        phone: z
          .string()
          .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
      }),
    }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    confirmPassword: z.string(),
    role: z.enum(["patient", "doctor", "pharmacist"]).default("patient"),
    organizationId: z.string().optional(),
    professionalInfo: z
      .object({
        licenseNumber: z.string().optional(),
        specialty: z.string().optional(),
        yearsOfExperience: z.number().optional(),
        currentPosition: z.string().optional(),
        department: z.string().optional(),
      })
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      // If role is doctor or pharmacist, organizationId and professional info are required
      if (data.role === "doctor" || data.role === "pharmacist") {
        return (
          data.organizationId &&
          data.organizationId.length > 0 &&
          data.professionalInfo?.licenseNumber &&
          data.professionalInfo?.specialty &&
          data.professionalInfo?.yearsOfExperience !== undefined
        );
      }
      return true;
    },
    {
      message:
        "Organization and professional information are required for healthcare professionals",
      path: ["organizationId"],
    }
  );

type RegisterFormData = z.infer<typeof RegisterSchema>;

function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormData>({
    personalInfo: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      contact: {
        email: "",
        phone: "",
      },
    },
    password: "",
    confirmPassword: "",
    role: "patient",
    organizationId: "",
    professionalInfo: {
      licenseNumber: "",
      specialty: "",
      yearsOfExperience: 0,
      currentPosition: "",
      department: "",
    },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setApiError("");
    setErrors({});

    try {
      // Clean up empty strings in formData
      if (formData.role === "patient") {
        formData.organizationId = undefined;
        formData.professionalInfo = undefined;
      }

      // Validate form data
      const validatedData = RegisterSchema.parse(formData);

      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registrationData } = validatedData;

      // Call backend API
      await register(registrationData);

      // Redirect to login page with success message
      router.push("/login?message=registration-success");
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          fieldErrors[path] = err.message;
        });
        setErrors(fieldErrors);
      } else if (error instanceof Error) {
        // Handle API errors
        setApiError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (path: string, value: string) => {
    const keys = path.split(".");
    let newFormData = { ...formData };
    let current: any = newFormData;

    // Navigate to the nested property
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }

    // Set the final value
    current[keys[keys.length - 1]] = value;

    // Reset organizationId and professionalInfo when role changes to patient
    if (path === "role" && value === "patient") {
      newFormData.organizationId = undefined;
      newFormData.professionalInfo = undefined;
    }

    setFormData(newFormData);

    // Clear field error when user starts typing
    if (errors[path]) {
      setErrors({ ...errors, [path]: "" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              First Name
            </label>
            <Input
              placeholder="Enter your first name"
              value={formData.personalInfo.firstName}
              onChange={(e) =>
                handleInputChange("personalInfo.firstName", e.target.value)
              }
              disabled={isLoading}
              className={`h-12 rounded-xl ${errors["personalInfo.firstName"] ? "border-red-500" : ""}`}
            />
            {errors["personalInfo.firstName"] && (
              <p className="text-sm text-red-600 mt-1">
                {errors["personalInfo.firstName"]}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Last Name
            </label>
            <Input
              placeholder="Enter your last name"
              value={formData.personalInfo.lastName}
              onChange={(e) =>
                handleInputChange("personalInfo.lastName", e.target.value)
              }
              disabled={isLoading}
              className={`h-12 rounded-xl ${errors["personalInfo.lastName"] ? "border-red-500" : ""}`}
            />
            {errors["personalInfo.lastName"] && (
              <p className="text-sm text-red-600 mt-1">
                {errors["personalInfo.lastName"]}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Email
            </label>
            <Input
              type="email"
              placeholder="Enter your email"
              value={formData.personalInfo.contact.email}
              onChange={(e) =>
                handleInputChange("personalInfo.contact.email", e.target.value)
              }
              disabled={isLoading}
              className={`h-12 rounded-xl ${errors["personalInfo.contact.email"] ? "border-red-500" : ""}`}
            />
            {errors["personalInfo.contact.email"] && (
              <p className="text-sm text-red-600 mt-1">
                {errors["personalInfo.contact.email"]}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Phone Number
            </label>
            <Input
              type="tel"
              placeholder="Enter your phone number"
              value={formData.personalInfo.contact.phone}
              onChange={(e) =>
                handleInputChange("personalInfo.contact.phone", e.target.value)
              }
              disabled={isLoading}
              className={`h-12 rounded-xl ${errors["personalInfo.contact.phone"] ? "border-red-500" : ""}`}
            />
            {errors["personalInfo.contact.phone"] && (
              <p className="text-sm text-red-600 mt-1">
                {errors["personalInfo.contact.phone"]}
              </p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Date of Birth
            </label>
            <Input
              type="date"
              value={formData.personalInfo.dateOfBirth}
              onChange={(e) =>
                handleInputChange("personalInfo.dateOfBirth", e.target.value)
              }
              disabled={isLoading}
              className={`h-12 rounded-xl ${errors["personalInfo.dateOfBirth"] ? "border-red-500" : ""}`}
            />
            {errors["personalInfo.dateOfBirth"] && (
              <p className="text-sm text-red-600 mt-1">
                {errors["personalInfo.dateOfBirth"]}
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Role
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  value: "patient",
                  label: "Patient",
                  icon: <User className="w-5 h-5" />,
                },
                {
                  value: "doctor",
                  label: "Doctor",
                  icon: <Stethoscope className="w-5 h-5" />,
                },
                {
                  value: "pharmacist",
                  label: "Pharmacist",
                  icon: <Pill className="w-5 h-5" />,
                },
              ].map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => handleInputChange("role", role.value)}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                    ${
                      formData.role === role.value
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-gray-300 bg-white text-gray-900 hover:border-gray-400"
                    }
                  `}
                >
                  {role.icon}
                  <span className="text-sm font-medium">{role.label}</span>
                  {(role.value === "doctor" || role.value === "pharmacist") && (
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-lg">
                      Licensed
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Organization Selection for Healthcare Professionals */}
          {(formData.role === "doctor" || formData.role === "pharmacist") && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Organization
              </label>
              <GeneralOrganizationSelect
                value={formData.organizationId}
                onValueChange={(value) =>
                  handleInputChange("organizationId", value)
                }
                placeholder="Select your organization"
                required={true}
                errorMessage={errors.organizationId}
                includeUnverified={process.env.NODE_ENV === "development"}
                showBadge={true}
                showLocation={true}
                showType={true}
                helperText="Can't find your organization?"
                helperLink={{
                  text: "Register it here",
                  href: "/demo/organization-management",
                }}
              />
            </div>
          )}

          {/* Professional Information for Healthcare Professionals */}
          {(formData.role === "doctor" || formData.role === "pharmacist") && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border">
              <h3 className="text-lg font-medium text-gray-900">
                Professional Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    License Number
                  </label>
                  <Input
                    placeholder="License no."
                    value={formData.professionalInfo?.licenseNumber}
                    onChange={(e) =>
                      handleInputChange(
                        "professionalInfo.licenseNumber",
                        e.target.value
                      )
                    }
                    disabled={isLoading}
                    className={`h-12 rounded-xl ${errors["professionalInfo.licenseNumber"] ? "border-red-500" : ""}`}
                  />
                  {errors["professionalInfo.licenseNumber"] && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors["professionalInfo.licenseNumber"]}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Specialty
                  </label>
                  <Input
                    placeholder="Specialty"
                    value={formData.professionalInfo?.specialty}
                    onChange={(e) =>
                      handleInputChange(
                        "professionalInfo.specialty",
                        e.target.value
                      )
                    }
                    disabled={isLoading}
                    className={`h-12 rounded-xl ${errors["professionalInfo.specialty"] ? "border-red-500" : ""}`}
                  />
                  {errors["professionalInfo.specialty"] && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors["professionalInfo.specialty"]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Years of Experience
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter years"
                    min="0"
                    max="70"
                    value={formData.professionalInfo?.yearsOfExperience?.toString()}
                    onChange={(e) => {
                      const value = e.target.value
                        ? parseInt(e.target.value)
                        : undefined;
                      setFormData((prev) => ({
                        ...prev,
                        professionalInfo: {
                          ...prev.professionalInfo,
                          yearsOfExperience: value,
                        },
                      }));
                    }}
                    disabled={isLoading}
                    className={`h-12 rounded-xl ${errors["professionalInfo.yearsOfExperience"] ? "border-red-500" : ""}`}
                  />
                  {errors["professionalInfo.yearsOfExperience"] && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors["professionalInfo.yearsOfExperience"]}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Current Position
                  </label>
                  <Input
                    placeholder="Enter position"
                    value={formData.professionalInfo?.currentPosition}
                    onChange={(e) =>
                      handleInputChange(
                        "professionalInfo.currentPosition",
                        e.target.value
                      )
                    }
                    disabled={isLoading}
                    className={`h-12 rounded-xl ${errors["professionalInfo.currentPosition"] ? "border-red-500" : ""}`}
                  />
                  {errors["professionalInfo.currentPosition"] && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors["professionalInfo.currentPosition"]}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Department
                </label>
                <Input
                  placeholder="Enter department (optional)"
                  value={formData.professionalInfo?.department}
                  onChange={(e) =>
                    handleInputChange(
                      "professionalInfo.department",
                      e.target.value
                    )
                  }
                  disabled={isLoading}
                  className={`h-12 rounded-xl ${errors["professionalInfo.department"] ? "border-red-500" : ""}`}
                />
                {errors["professionalInfo.department"] && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors["professionalInfo.department"]}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Password
            </label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              disabled={isLoading}
              className={`h-12 rounded-xl ${errors.password ? "border-red-500" : ""}`}
            />
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) =>
                handleInputChange("confirmPassword", e.target.value)
              }
              disabled={isLoading}
              className={`h-12 rounded-xl ${errors.confirmPassword ? "border-red-500" : ""}`}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600 mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {apiError && (
            <Alert variant="destructive">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterAlternative() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
