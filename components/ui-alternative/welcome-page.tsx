"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Heart, Shield } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";


export default function WelcomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) {
    return null;
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
          <Link href="/login">
            <Button className="w-full mb-2 bg-blue-600 hover:bg-blue-700 h-12">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" className="w-full h-12 border-gray-300">
              <Link href="/register">Register</Link>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
