"use client";

import React, { useState, useEffect } from "react";
import { Download, RefreshCw, QrCode, User, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface TestQRData {
  type: string;
  digitalIdentifier: string;
  version: string;
  timestamp: string;
}

export function TestQRGenerator() {
  const [qrData, setQrData] = useState<TestQRData>({
    type: "health_access_request",
    digitalIdentifier: "",
    version: "1.0",
    timestamp: "",
  });
  const [qrCodeURL, setQrCodeURL] = useState<string>("");
  const [customIdentifier, setCustomIdentifier] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate a random digital identifier
  const generateRandomHID = () => {
    const uuid = crypto.randomUUID();
    return `HID_${uuid}`;
  };

  // Generate QR data string
  const generateQRString = (data: TestQRData) => {
    return JSON.stringify(data);
  };

  // Generate QR code using external service (for testing purposes)
  const generateQRCode = async (data: string) => {
    setIsGenerating(true);
    try {
      // Using a free QR code generation service for testing
      const encodedData = encodeURIComponent(data);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`;
      setQrCodeURL(qrUrl);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Initialize with random data
  useEffect(() => {
    const initialData: TestQRData = {
      type: "health_access_request",
      digitalIdentifier: generateRandomHID(),
      version: "1.0",
      timestamp: new Date().toISOString(),
    };
    setQrData(initialData);

    const qrString = generateQRString(initialData);
    generateQRCode(qrString);
  }, []);

  const handleRefresh = () => {
    const newData: TestQRData = {
      type: "health_access_request",
      digitalIdentifier: customIdentifier || generateRandomHID(),
      version: "1.0",
      timestamp: new Date().toISOString(),
    };
    setQrData(newData);

    const qrString = generateQRString(newData);
    generateQRCode(qrString);
  };

  const handleCustomGenerate = () => {
    if (!customIdentifier.trim()) return;

    const newData: TestQRData = {
      type: "health_access_request",
      digitalIdentifier: customIdentifier.trim(),
      version: "1.0",
      timestamp: new Date().toISOString(),
    };
    setQrData(newData);

    const qrString = generateQRString(newData);
    generateQRCode(qrString);
  };

  const downloadQR = () => {
    if (!qrCodeURL) return;

    const link = document.createElement("a");
    link.href = qrCodeURL;
    link.download = `patient-qr-${qrData.digitalIdentifier}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyQRData = () => {
    const qrString = generateQRString(qrData);
    navigator.clipboard.writeText(qrString);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Test QR Code Generator
        </CardTitle>
        <CardDescription>
          Generate test patient QR codes for scanning demo
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Generated QR Code */}
        <div className="text-center">
          {qrCodeURL ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 inline-block">
                <img
                  src={qrCodeURL}
                  alt="Patient QR Code"
                  className="w-64 h-64 mx-auto"
                />
              </div>

              <div className="flex gap-2 justify-center">
                <Button onClick={downloadQR} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button onClick={copyQRData} variant="outline" size="sm">
                  Copy Data
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
              {isGenerating ? (
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              ) : (
                <QrCode className="h-8 w-8 text-gray-400" />
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* QR Data Information */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <User className="h-4 w-4" />
            Patient Information
          </h3>

          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="font-mono">{qrData.type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Version</Label>
                <p className="font-mono">{qrData.version}</p>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">
                Digital Identifier (HID)
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-background px-2 py-1 rounded border flex-1">
                  {qrData.digitalIdentifier}
                </code>
                <Badge variant="outline">
                  {qrData.digitalIdentifier.startsWith("HID_")
                    ? "Valid"
                    : "Custom"}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Timestamp
              </Label>
              <p className="text-sm font-mono">
                {new Date(qrData.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Controls */}
        <div className="space-y-4">
          <h3 className="font-semibold">Generate New QR Code</h3>

          <div className="space-y-3">
            <div>
              <Label htmlFor="customId">
                Custom Digital Identifier (Optional)
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="customId"
                  placeholder="Enter custom HID or leave empty for random"
                  value={customIdentifier}
                  onChange={(e) => setCustomIdentifier(e.target.value)}
                />
                <Button
                  onClick={handleCustomGenerate}
                  disabled={!customIdentifier.trim() || isGenerating}
                  variant="outline"
                >
                  Generate
                </Button>
              </div>
            </div>

            <Button
              onClick={handleRefresh}
              disabled={isGenerating}
              className="w-full"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`}
              />
              Generate Random QR Code
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">How to Test</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Generate a QR code above</li>
            <li>2. Go to the QR Scanning Demo page</li>
            <li>3. Click "Start Camera" and scan this QR code</li>
            <li>4. Watch the authorization request flow in action</li>
          </ol>
        </div>

        {/* Raw Data */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Raw QR Data (JSON)</Label>
          <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto">
            {generateQRString(qrData)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TestQRGenerator;
