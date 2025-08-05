"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function HomePage() {
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
        <div>Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Health Records System</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Secure, comprehensive digital health records management for patients, healthcare professionals, and
            administrators.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="px-8 py-3">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="px-8 py-3">
                Create Account
              </Button>
            </Link>
          </div>

          {/* Demo Links */}
          <div className="mt-8 p-4 bg-blue-100 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-blue-800 font-medium mb-3">Demo Features:</p>
            <div className="flex flex-col gap-2">
              <Link href="/demo/qr-scanning">
                <Button variant="outline" size="sm" className="w-full text-blue-700 border-blue-300 hover:bg-blue-50">
                  QR Code Scanner Demo
                </Button>
              </Link>
              <Link href="/demo/organization-management">
                <Button variant="outline" size="sm" className="w-full text-blue-700 border-blue-300 hover:bg-blue-50">
                  Create Organization Demo
                </Button>
              </Link>
              <Link href="/provider">
                <Button variant="outline" size="sm" className="w-full text-blue-700 border-blue-300 hover:bg-blue-50">
                  Provider Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-blue-600">For Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• Access your medical records securely</li>
                <li>• View prescription history</li>
                <li>• Share records with healthcare providers</li>
                <li>• Update personal information</li>
                <li>• Track medical appointments</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center text-green-600">For Doctors</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• Manage patient records</li>
                <li>• Create and update prescriptions</li>
                <li>• Access shared patient data</li>
                <li>• View comprehensive audit logs</li>
                <li>• Collaborate with healthcare teams</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center text-green-600">For Healthcare Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• Register and manage organization profiles</li>
                <li>• Manage member healthcare professionals</li>
                <li>• Verify practitioner credentials</li>
                <li>• Authorize patient record access</li>
                <li>• Monitor organizational compliance</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center text-purple-600">For Pharmacists</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• View prescription details</li>
                <li>• Update medication status</li>
                <li>• Manage drug interactions</li>
                <li>• Access patient medication history</li>
                <li>• Coordinate with prescribing doctors</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Secure & Compliant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Our system features enterprise-grade security with JWT authentication, comprehensive audit logging,
                role-based access control, and secure data encryption to protect your health information.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
