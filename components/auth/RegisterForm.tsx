"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

const RegisterSchema = z
  .object({
    personalInfo: z.object({
      firstName: z.string().min(1, "First name is required").max(100),
      lastName: z.string().min(1, "Last name is required").max(100),
      dateOfBirth: z.string().min(1, "Date of birth is required"),
      contact: z.object({
        email: z.string().email("Invalid email address"),
        phone: z.string().regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
      }),
    }),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string(),
    role: z.enum(["patient", "doctor", "pharmacist"]).default("patient"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof RegisterSchema>;

export function RegisterForm() {
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
      // Validate form data
      const validatedData = RegisterSchema.parse(formData);

      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registrationData } = validatedData;

      // Call backend API
      await register(registrationData);

      // Redirect on success
      router.push("/dashboard");
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

    setFormData(newFormData);

    // Clear field error when user starts typing
    if (errors[path]) {
      setErrors({ ...errors, [path]: "" });
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                placeholder="First Name"
                value={formData.personalInfo.firstName}
                onChange={(e) => handleInputChange("personalInfo.firstName", e.target.value)}
                disabled={isLoading}
                className={errors["personalInfo.firstName"] ? "border-red-500" : ""}
              />
              {errors["personalInfo.firstName"] && (
                <p className="text-sm text-red-600 mt-1">{errors["personalInfo.firstName"]}</p>
              )}
            </div>

            <div>
              <Input
                placeholder="Last Name"
                value={formData.personalInfo.lastName}
                onChange={(e) => handleInputChange("personalInfo.lastName", e.target.value)}
                disabled={isLoading}
                className={errors["personalInfo.lastName"] ? "border-red-500" : ""}
              />
              {errors["personalInfo.lastName"] && (
                <p className="text-sm text-red-600 mt-1">{errors["personalInfo.lastName"]}</p>
              )}
            </div>
          </div>

          <div>
            <Input
              type="date"
              placeholder="Date of Birth"
              value={formData.personalInfo.dateOfBirth}
              onChange={(e) => handleInputChange("personalInfo.dateOfBirth", e.target.value)}
              disabled={isLoading}
              className={errors["personalInfo.dateOfBirth"] ? "border-red-500" : ""}
            />
            {errors["personalInfo.dateOfBirth"] && (
              <p className="text-sm text-red-600 mt-1">{errors["personalInfo.dateOfBirth"]}</p>
            )}
          </div>

          <div>
            <Input
              type="email"
              placeholder="Email"
              value={formData.personalInfo.contact.email}
              onChange={(e) => handleInputChange("personalInfo.contact.email", e.target.value)}
              disabled={isLoading}
              className={errors["personalInfo.contact.email"] ? "border-red-500" : ""}
            />
            {errors["personalInfo.contact.email"] && (
              <p className="text-sm text-red-600 mt-1">{errors["personalInfo.contact.email"]}</p>
            )}
          </div>

          <div>
            <Input
              type="tel"
              placeholder="Phone Number"
              value={formData.personalInfo.contact.phone}
              onChange={(e) => handleInputChange("personalInfo.contact.phone", e.target.value)}
              disabled={isLoading}
              className={errors["personalInfo.contact.phone"] ? "border-red-500" : ""}
            />
            {errors["personalInfo.contact.phone"] && (
              <p className="text-sm text-red-600 mt-1">{errors["personalInfo.contact.phone"]}</p>
            )}
          </div>

          <div>
            <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="patient">Patient</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="pharmacist">Pharmacist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              disabled={isLoading}
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
          </div>

          <div>
            <Input
              type="password"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              disabled={isLoading}
              className={errors.confirmPassword ? "border-red-500" : ""}
            />
            {errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>}
          </div>

          {apiError && (
            <Alert variant="destructive">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
