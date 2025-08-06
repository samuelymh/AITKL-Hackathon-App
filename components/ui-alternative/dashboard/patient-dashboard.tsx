"use client";

import { Button } from "@/components/ui/button";
import { Share2, FileText, Shield, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function PatientDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-6">
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          Your records are secure and only shared with your explicit consent.
        </p>
      </div>

      {/* Main Actions */}
      <div className="space-y-4">
        <Button
          variant="outline"
          className="w-full h-16 justify-start bg-white border-gray-200 hover:bg-gray-50"
        >
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">Share My Records</div>
            <div className="text-sm text-gray-600">
              Generate QR code for doctor access
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full h-16 justify-start bg-white border-gray-200 hover:bg-gray-50"
        >
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-4">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">My Prescriptions</div>
            <div className="text-sm text-gray-600">
              View active and past prescriptions
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full h-16 justify-start bg-white border-gray-200 hover:bg-gray-50"
        >
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">Audit Log</div>
            <div className="text-sm text-gray-600">
              See who accessed your records
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full h-16 justify-start bg-white border-gray-200 hover:bg-gray-50"
        >
          <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center mr-4">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">
              Upload Health Docs
            </div>
            <div className="text-sm text-gray-600">
              Add medical documents to your record
            </div>
          </div>
        </Button>
      </div>

      {/* Quick Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Stats
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">3</div>
            <div className="text-sm text-gray-600">Active Prescriptions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">12</div>
            <div className="text-sm text-gray-600">Documents Uploaded</div>
          </div>
        </div>
      </div>
    </div>
  );
}
