"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, Home } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You don't have permission to access this page</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Unauthorized Access</CardTitle>
            <CardDescription className="text-center">
              Your current role doesn't have access to this resource. Please contact your administrator if you believe
              this is an error.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <Button onClick={() => router.back()} variant="outline" className="w-full flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
              <Button onClick={() => router.push("/dashboard")} className="w-full flex items-center gap-2">
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact support at{" "}
            <a href="mailto:support@healthrecords.com" className="text-blue-600 hover:text-blue-500">
              support@healthrecords.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
