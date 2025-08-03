"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestQRGeneratorProps {
  readonly className?: string;
}

interface MockQRData {
  type: string;
  digitalIdentifier: string;
  patientName?: string;
  issuedAt: string;
  expiresAt?: string;
  version: string;
}

export function TestQRGenerator({ className }: TestQRGeneratorProps) {
  const [qrImageUrl, setQrImageUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockData, setMockData] = useState<MockQRData>({
    type: "health_access_request",
    digitalIdentifier: "patient_" + Math.random().toString(36).substring(2, 11),
    patientName: "John Doe",
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    version: "1.0",
  });

  const generateQRCode = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Call the patient QR generation endpoint
      const response = await fetch(
        "/api/patient/qr?" +
          new URLSearchParams({
            format: "png",
            width: "300",
            height: "300",
          }),
        {
          method: "GET",
          headers: {
            // In a real app, this would be handled by authentication
            "X-Mock-Patient-Data": JSON.stringify(mockData),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setQrImageUrl(url);
    } catch (err) {
      console.error("QR generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate QR code");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyQRData = () => {
    const qrDataString = JSON.stringify(mockData, null, 2);
    navigator.clipboard.writeText(qrDataString);
  };

  const downloadQR = () => {
    if (qrImageUrl) {
      const link = document.createElement("a");
      link.href = qrImageUrl;
      link.download = `patient_qr_${mockData.digitalIdentifier}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const regenerateData = () => {
    setMockData({
      ...mockData,
      digitalIdentifier: "patient_" + Math.random().toString(36).substring(2, 11),
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setQrImageUrl("");
  };

  // Auto-generate on mount
  useEffect(() => {
    generateQRCode();
  }, [mockData.digitalIdentifier]);

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">Test QR Generator</CardTitle>
        <CardDescription>Generate mock patient QR codes for testing the scanner</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mock Patient Data */}
        <div className="space-y-3">
          <Label htmlFor="patientName">Patient Name</Label>
          <Input
            id="patientName"
            value={mockData.patientName || ""}
            onChange={(e) => setMockData({ ...mockData, patientName: e.target.value })}
            placeholder="Enter patient name"
          />
        </div>

        {/* Digital Identifier Display */}
        <div className="space-y-2">
          <Label>Digital Identifier</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted p-2 rounded font-mono">{mockData.digitalIdentifier}</code>
            <Button onClick={regenerateData} size="sm" variant="outline" className="px-2">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* QR Code Display */}
        <div className="space-y-3">
          {qrImageUrl ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="border-2 border-dashed border-border rounded-lg p-4">
                <img src={qrImageUrl} alt="Patient QR Code" className="w-48 h-48 object-contain" />
              </div>

              <div className="flex gap-2">
                <Button onClick={downloadQR} size="sm" variant="outline">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                <Button onClick={copyQRData} size="sm" variant="outline">
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Data
                </Button>
              </div>
            </div>
          ) : (
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                {isGenerating ? "Generating QR..." : "No QR code"}
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

        {/* Generate Button */}
        <Button onClick={generateQRCode} disabled={isGenerating} className="w-full">
          {isGenerating ? "Generating..." : "Generate New QR Code"}
        </Button>

        {/* QR Data Preview */}
        <div className="space-y-2">
          <Label>QR Code Content</Label>
          <div className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
            <pre>{JSON.stringify(mockData, null, 2)}</pre>
          </div>
        </div>

        {/* Status Info */}
        <div className="flex gap-2 text-xs">
          <Badge variant="outline">Version {mockData.version}</Badge>
          <Badge variant="outline">{mockData.type}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default TestQRGenerator;
