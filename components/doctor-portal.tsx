"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Stethoscope,
  User,
  Calendar,
  Pill,
  Activity,
  FileText,
  Edit,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DoctorPortalProps {
  onNavigate: (screen: string) => void;
  sharedData: any;
}

export default function DoctorPortal({
  onNavigate,
  sharedData,
}: DoctorPortalProps) {
  const [scannedPatient, setScannedPatient] = useState(false);

  const patientData = {
    name: "Sarah Johnson",
    age: 34,
    id: "P-2024-001",
    lastVisit: "March 15, 2024",
  };

  const handleScanQR = () => {
    setScannedPatient(true);
  };

  if (!scannedPatient) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Doctor Portal
          </h1>
          <p className="text-gray-600">Dr. Ahmad Rahman</p>
          <p className="text-sm text-gray-500">
            Klinik Setia • Internal Medicine
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            Scan patient's QR code to access their medical records securely.
          </p>
        </div>

        {/* Scan Button */}
        <div className="text-center">
          <Button
            onClick={handleScanQR}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg"
          >
            <QrCode className="w-5 h-5 mr-2" />
            Scan Patient QR Code
          </Button>
        </div>

        {/* Today's Appointments */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Today's Appointments
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">
                  Sarah Chen - 10:00 AM
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Confirmed
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">John Doe - 11:30 AM</p>
              </div>
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                Waiting
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">
                  Jane Smith - 2:00 PM
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                Scheduled
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Stats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">8</div>
              <div className="text-sm text-gray-600">Patients Today</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">15</div>
              <div className="text-sm text-gray-600">Prescriptions</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Rest of the component remains the same for when patient is scanned
  return (
    <div className="p-4 space-y-4">
      {/* Patient Header */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{patientData.name}</h2>
              <p className="text-sm text-gray-600">
                Age {patientData.age} • ID: {patientData.id}
              </p>
            </div>
            <Badge className="bg-green-100 text-green-800">
              Access Granted
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* AI Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            AI Care Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <Activity className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="font-semibold">Hypertension Diagnosis</p>
              <p className="text-sm text-gray-600">
                July 2024 • Dr. Ahmad Hassan
              </p>
              <p className="text-xs text-gray-500">
                BP: 145/95 mmHg, Started on Lisinopril
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Pill className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold">Current Medications</p>
              <p className="text-sm text-gray-600">Lisinopril 10mg daily</p>
              <p className="text-xs text-gray-500">
                Good compliance, BP improving
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-semibold">Last Physical Exam</p>
              <p className="text-sm text-gray-600">
                May 2024 • Dr. Sarah Johnson
              </p>
              <p className="text-xs text-gray-500">
                Overall health good, continue monitoring
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={() => onNavigate("prescription")}
          className="w-full bg-blue-600 hover:bg-blue-700 h-12"
        >
          <Edit className="w-5 h-5 mr-2" />
          Write Prescription
        </Button>

        <Button variant="outline" className="w-full bg-transparent">
          <FileText className="w-5 h-5 mr-2" />
          View Full Records
        </Button>
      </div>
    </div>
  );
}
