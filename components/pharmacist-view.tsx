"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCode, Pill, Check, Clock } from "lucide-react";

interface PharmacistViewProps {
  onBack: () => void;
}

export default function PharmacistView({ onBack }: PharmacistViewProps) {
  const [scannedPrescription, setScannedPrescription] = useState(false);

  const handleScanQR = () => {
    setScannedPrescription(true);
  };

  if (!scannedPrescription) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Pharmacist Portal
          </h1>
          <p className="text-gray-600">PharmaCare Malaysia</p>
          <p className="text-sm text-gray-500">
            Licensed Pharmacist: Pn. Fatimah Abdul
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">
            Scan prescription QR codes to verify and fulfill patient medications
            securely.
          </p>
        </div>

        {/* Scan Button */}
        <div className="text-center">
          <Button
            onClick={handleScanQR}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg"
          >
            <QrCode className="w-5 h-5 mr-2" />
            Scan Prescription QR
          </Button>
        </div>

        {/* Today's Summary */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Today's Summary
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">24</div>
              <div className="text-sm text-gray-600">Prescriptions Filled</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">8</div>
              <div className="text-sm text-gray-600">Pending Verifications</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  Metformin 500mg dispensed
                </p>
                <p className="text-sm text-gray-600">John Doe • 2:30 PM</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  Prescription verified
                </p>
                <p className="text-sm text-gray-600">Jane Smith • 1:15 PM</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  Lisinopril 10mg dispensed
                </p>
                <p className="text-sm text-gray-600">Sarah Chen • 12:45 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Rest of the component for scanned prescription view
  return (
    <div className="p-4 space-y-4">
      <div className="bg-green-50 border-green-200 p-4 rounded-lg">
        <p className="text-green-800">Prescription scanned successfully</p>
      </div>
      <Button className="w-full bg-green-600 hover:bg-green-700">
        Mark as Fulfilled
      </Button>
    </div>
  );
}
