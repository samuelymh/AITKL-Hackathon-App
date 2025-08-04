"use client";

import React, { useState, useEffect } from "react";
import { QrCode, Download, RefreshCw, Shield, Clock, Share2, Copy, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  digitalIdentifier: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface QRCodeManagerProps {
  user: User;
  className?: string;
}

interface QRData {
  type: string;
  digitalIdentifier: string;
  version: string;
  timestamp: string;
}

export function QRCodeManager({ user, className }: QRCodeManagerProps) {
  const [qrCodeURL, setQrCodeURL] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Generate QR data for the patient
  const generateQRData = (): QRData => {
    return {
      type: "health_access_request",
      digitalIdentifier: user.digitalIdentifier,
      version: "1.0",
      timestamp: new Date().toISOString(),
    };
  };

  // Generate QR code using external service
  const generateQRCode = async (data: QRData) => {
    setIsGenerating(true);
    try {
      const qrString = JSON.stringify(data);
      const encodedData = encodeURIComponent(qrString);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}&color=1f2937&bgcolor=ffffff`;
      setQrCodeURL(qrUrl);
      setLastGenerated(new Date());
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      toast({
        title: "Error",
        description: "Failed to generate QR code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Initialize QR code on component mount
  useEffect(() => {
    const qrData = generateQRData();
    generateQRCode(qrData);
  }, [user.digitalIdentifier]);

  // Regenerate QR code
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      // In a real implementation, this would call an API to regenerate the digitalIdentifier
      // For now, we'll just regenerate the QR with a new timestamp
      const qrData = generateQRData();
      await generateQRCode(qrData);
      toast({
        title: "QR Code Regenerated",
        description: "Your QR code has been successfully regenerated.",
      });
    } catch (error) {
      console.error("Failed to regenerate QR code:", error);
      toast({
        title: "Error",
        description: "Failed to regenerate QR code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Download QR code
  const handleDownload = () => {
    if (!qrCodeURL) return;

    const link = document.createElement("a");
    link.href = qrCodeURL;
    link.download = `health-qr-${user.firstName}-${user.lastName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "QR Code Downloaded",
      description: "Your health QR code has been downloaded.",
    });
  };

  // Copy digital identifier
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.digitalIdentifier);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Digital identifier copied to clipboard.",
      });
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  // Share QR code (Web Share API if available)
  const handleShare = async () => {
    if (navigator.share && qrCodeURL) {
      try {
        await navigator.share({
          title: "My Health QR Code",
          text: "Share this QR code with healthcare providers for secure access to my medical records.",
          url: qrCodeURL,
        });
      } catch (error) {
        // Fallback to download if sharing fails
        console.error("Failed to share QR code:", error);
        handleDownload();
      }
    } else {
      // Fallback for browsers without Web Share API
      handleDownload();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <CardTitle>Your Health QR Code</CardTitle>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Shield className="h-3 w-3 mr-1" />
            Secure
          </Badge>
        </div>
        <CardDescription>
          Share this QR code with healthcare providers to grant temporary access to your medical records
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* QR Code Display */}
        <div className="text-center">
          {qrCodeURL ? (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm inline-block">
                <img src={qrCodeURL} alt="Your Health QR Code" className="w-48 h-48 mx-auto" />
              </div>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-center">
                <Button onClick={handleDownload} variant="outline" size="sm" className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button onClick={handleShare} variant="outline" size="sm" className="flex items-center gap-1">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button
                  onClick={handleRegenerate}
                  variant="outline"
                  size="sm"
                  disabled={isRegenerating}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
              {isGenerating ? (
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              ) : (
                <QrCode className="h-8 w-8 text-gray-400" />
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Patient Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label className="font-medium">Patient Information</Label>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">
                  {user.firstName} {user.lastName}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-mono text-sm">{user.email}</p>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Digital Health ID</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-background px-3 py-1 rounded border flex-1 font-mono">
                  {user.digitalIdentifier}
                </code>
                <Button onClick={handleCopyId} variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {lastGenerated && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last generated: {lastGenerated.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">How to Use Your QR Code</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Show this QR code to your healthcare provider</li>
            <li>2. They will scan it to request access to your records</li>
            <li>3. You'll receive a notification to approve or deny the request</li>
            <li>4. Access is time-limited and can be revoked anytime</li>
          </ol>
        </div>

        {/* Security Notice */}
        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Security Notice</p>
              <p className="text-amber-700">
                Your QR code contains only your digital identifier. No sensitive medical data is stored in the QR code
                itself.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default QRCodeManager;
