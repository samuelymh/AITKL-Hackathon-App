"use client";

import React, { useState, useEffect } from "react";
import { Heart, AlertCircle, CheckCircle, ArrowRight, Edit, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

interface MedicalProfileSummaryProps {
  userId: string;
  className?: string;
}

interface MedicalProfileStatus {
  completionPercentage: number;
  hasBloodType: boolean;
  hasEmergencyContact: boolean;
  hasAllergies: boolean;
  hasMedicalConditions: boolean;
  lastUpdated?: Date;
}

export function MedicalProfileSummary({ userId, className }: MedicalProfileSummaryProps) {
  const [profileStatus, setProfileStatus] = useState<MedicalProfileStatus>({
    completionPercentage: 0,
    hasBloodType: false,
    hasEmergencyContact: false,
    hasAllergies: false,
    hasMedicalConditions: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfileStatus = async () => {
      try {
        // In a real implementation, this would fetch from the API
        // const response = await fetch(`/api/patient/${userId}/medical-info`);
        // const data = await response.json();

        // Simulate API call - for demo, showing incomplete profile
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock data showing partial completion
        setProfileStatus({
          completionPercentage: 25, // Indicating incomplete profile
          hasBloodType: false,
          hasEmergencyContact: false,
          hasAllergies: false,
          hasMedicalConditions: false,
        });

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load medical profile status:", error);
        setIsLoading(false);
      }
    };

    loadProfileStatus();
  }, [userId]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading profile...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isComplete = profileStatus.completionPercentage >= 100;
  const needsAttention = profileStatus.completionPercentage < 50;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            <CardTitle>Medical Profile</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              if (isComplete) {
                return (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                );
              }
              if (needsAttention) {
                return (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Urgent
                  </Badge>
                );
              }
              return (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  In Progress
                </Badge>
              );
            })()}
          </div>
        </div>
        <CardDescription>
          {isComplete
            ? "Your medical profile is complete and up to date."
            : "Complete your medical profile to ensure optimal healthcare delivery."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Profile Completion</span>
            <span className="font-medium">{profileStatus.completionPercentage}%</span>
          </div>
          <Progress value={profileStatus.completionPercentage} className="h-2" />
        </div>

        {/* Key Information Status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${profileStatus.hasBloodType ? "bg-green-500" : "bg-gray-300"}`} />
            <span className={profileStatus.hasBloodType ? "text-green-700" : "text-gray-600"}>Blood Type</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${profileStatus.hasEmergencyContact ? "bg-green-500" : "bg-gray-300"}`}
            />
            <span className={profileStatus.hasEmergencyContact ? "text-green-700" : "text-gray-600"}>
              Emergency Contact
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${profileStatus.hasAllergies ? "bg-green-500" : "bg-gray-300"}`} />
            <span className={profileStatus.hasAllergies ? "text-green-700" : "text-gray-600"}>Allergies</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${profileStatus.hasMedicalConditions ? "bg-green-500" : "bg-gray-300"}`}
            />
            <span className={profileStatus.hasMedicalConditions ? "text-green-700" : "text-gray-600"}>
              Medical History
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Link href="/dashboard/medical-profile" className="flex-1">
            <Button className="w-full flex items-center gap-2" variant={isComplete ? "outline" : "default"}>
              {isComplete ? (
                <>
                  <Edit className="h-4 w-4" />
                  Update Profile
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4" />
                  Complete Profile
                </>
              )}
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </Link>
        </div>

        {/* Priority Message */}
        {needsAttention && (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Action Required</p>
                <p className="text-red-700">
                  Your medical profile is incomplete. Healthcare providers need this information to provide safe and
                  effective care.
                </p>
              </div>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-800">Profile Complete</p>
                <p className="text-green-700">
                  Your medical information is complete and secure. Healthcare providers can access this information when
                  you grant them permission.
                </p>
                {profileStatus.lastUpdated && (
                  <p className="text-green-600 mt-1">Last updated: {profileStatus.lastUpdated.toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MedicalProfileSummary;
