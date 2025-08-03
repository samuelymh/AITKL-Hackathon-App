"use client";

import type React from "react";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pill, Clock, Shield, Check } from "lucide-react";

interface PrescriptionEntryProps {
  onBack: () => void;
}

export default function PrescriptionEntry({ onBack }: PrescriptionEntryProps) {
  const [formData, setFormData] = useState({
    drugName: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  });
  const [prescriptionGenerated, setPrescriptionGenerated] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPrescriptionGenerated(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (prescriptionGenerated) {
    return (
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Prescription Generated</h1>
        </div>

        {/* Success Message */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6 text-center">
            <Check className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-xl font-semibold text-green-800 mb-2">
              Prescription Created Successfully
            </h2>
            <p className="text-green-700">
              Secure e-Prescription has been generated
            </p>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              e-Prescription QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {/* Large QR Code */}
            <div className="mx-auto w-64 h-64 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
              <div
                className="w-56 h-56 bg-black"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='white'/%3E%3Cg fill='black'%3E%3Crect x='10' y='10' width='10' height='10'/%3E%3Crect x='30' y='10' width='10' height='10'/%3E%3Crect x='50' y='10' width='10' height='10'/%3E%3Crect x='70' y='10' width='10' height='10'/%3E%3Crect x='10' y='30' width='10' height='10'/%3E%3Crect x='50' y='30' width='10' height='10'/%3E%3Crect x='70' y='30' width='10' height='10'/%3E%3Crect x='10' y='50' width='10' height='10'/%3E%3Crect x='30' y='50' width='10' height='10'/%3E%3Crect x='70' y='50' width='10' height='10'/%3E%3Crect x='10' y='70' width='10' height='10'/%3E%3Crect x='50' y='70' width='10' height='10'/%3E%3Crect x='70' y='70' width='10' height='10'/%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: "cover",
                }}
              />
            </div>

            {/* Security Features */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Secure & Encrypted</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-sm">Valid for 30 days</span>
              </div>
              <Badge className="bg-red-100 text-red-800">
                One-time use only
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Prescription Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Prescription Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Drug:</span>
              <span className="font-semibold">{formData.drugName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Dosage:</span>
              <span className="font-semibold">{formData.dosage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Frequency:</span>
              <span className="font-semibold">{formData.frequency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-semibold">{formData.duration}</span>
            </div>
          </CardContent>
        </Card>

        <Button onClick={onBack} className="w-full">
          Return to Patient Records
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Write Prescription</h1>
      </div>

      {/* Patient Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold">Sarah Johnson</p>
              <p className="text-sm text-gray-600">
                Age 34 • Patient ID: P-2024-001
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prescription Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Prescription Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="drugName">Drug Name *</Label>
              <Input
                id="drugName"
                value={formData.drugName}
                onChange={(e) => handleInputChange("drugName", e.target.value)}
                placeholder="e.g., Lisinopril"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dosage">Dosage *</Label>
                <Input
                  id="dosage"
                  value={formData.dosage}
                  onChange={(e) => handleInputChange("dosage", e.target.value)}
                  placeholder="e.g., 10mg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Input
                  id="frequency"
                  value={formData.frequency}
                  onChange={(e) =>
                    handleInputChange("frequency", e.target.value)
                  }
                  placeholder="e.g., Once daily"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration *</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => handleInputChange("duration", e.target.value)}
                placeholder="e.g., 30 days"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Special Instructions</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) =>
                  handleInputChange("instructions", e.target.value)
                }
                placeholder="Take with food, avoid alcohol, etc."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 h-12"
          disabled={
            !formData.drugName ||
            !formData.dosage ||
            !formData.frequency ||
            !formData.duration
          }
        >
          Generate e-Prescription
        </Button>
      </form>
    </div>
  );
}
