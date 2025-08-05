"use client"

import React from "react"
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Heart, Shield } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Loader2 } from "lucide-react";

function WelcomeContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Check if user was redirected from registration
    const message = searchParams.get("message");
    if (message === "registration-success") {
      setShowSuccessMessage(true);
      // Clear the URL parameter after showing the message
      const url = new URL(window.location.href);
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="relative">
            <Heart className="w-10 h-10 text-blue-600" />
            <Shield className="w-6 h-6 text-blue-800 absolute -top-1 -right-1" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to HealthPass</h1>
        <p className="text-gray-600">Access and share your medical records securely.</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <Link href="/login2" className="block">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12">
            Login
          </Button>
        </Link>
        <Link href="/register2" className="block">
          <Button variant="outline" className="w-full h-12 border-gray-300">
            Register
          </Button>
        </Link>
      </CardContent>
    </Card>
  </div>
  )
}

export default function WelcomePage() {
  return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
          </div>
        }
      >
        <WelcomeContent />
      </Suspense>
  )
}
