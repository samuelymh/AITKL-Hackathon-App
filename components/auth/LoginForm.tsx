"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export function LoginForm() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setApiError("");
    setErrors({});

    try {
      // Validate form data
      const validatedData = LoginSchema.parse(formData);

      // Call backend API
      await login(validatedData.email, validatedData.password);

      // Redirect on success
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
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

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={isLoading}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
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

          {apiError && (
            <Alert variant="destructive">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
