"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Clock, X, QrCode, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface QRData {
  type: string;
  digitalIdentifier: string;
  version: string;
  timestamp: string;
}

export default function ShareRecordsPage() {
  const { user, token } = useAuth();

  const [qrData, setQrData] = useState<QRData>({
    type: "health_access_request",
    digitalIdentifier: "",
    version: "1.0",
    timestamp: "",
  });
  const [qrCodeURL, setQrCodeURL] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");

  const generateQRCode = async () => {
    if (!token) {
      setError("Authentication required");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      // Call the authenticated API endpoint
      const response = await fetch(
        "/api/patient/qr?format=svg&width=300&height=300",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError("Session expired. Please log in again.");
          return;
        }
        throw new Error(`Failed to generate QR code: ${response.statusText}`);
      }

      // Get the SVG content
      const svgContent = await response.text();

      // Validate that we received SVG content
      if (!svgContent.includes("<svg")) {
        throw new Error("Invalid SVG content received");
      }

      // Create a blob URL for the SVG
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const blobURL = URL.createObjectURL(blob);

      setQrCodeURL(blobURL);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      setError(
        error instanceof Error ? error.message : "Failed to generate QR code"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const initialData: QRData = {
      type: "health_access_request",
      digitalIdentifier: user?.digitalIdentifier || "",
      version: "1.0",
      timestamp: new Date().toISOString(),
    };
    setQrData(initialData);

    // Generate QR code when component mounts and user is available
    if (user?.digitalIdentifier && token) {
      generateQRCode();
    }
  }, [user, token]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (qrCodeURL && qrCodeURL.startsWith("blob:")) {
        URL.revokeObjectURL(qrCodeURL);
      }
    };
  }, [qrCodeURL]);

  // Timer state with localStorage persistence
  const [timeLeft, setTimeLeft] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("qrTimer");
      if (saved) {
        const { endTime, isActive } = JSON.parse(saved);
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

        // If timer has expired, clear localStorage
        if (remaining <= 0) {
          localStorage.removeItem("qrTimer");
          return 30 * 60; // 30 minutes in seconds
        }

        return remaining;
      }
    }
    return 30 * 60; // 30 minutes in seconds
  });

  const [isActive, setIsActive] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("qrTimer");
      if (saved) {
        const { endTime } = JSON.parse(saved);
        const now = Date.now();
        return endTime > now;
      }
    }
    return true;
  });

  // Save timer state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && isActive && timeLeft > 0) {
      const endTime = Date.now() + timeLeft * 1000;
      localStorage.setItem("qrTimer", JSON.stringify({ endTime, isActive }));
    } else if (typeof window !== "undefined" && (!isActive || timeLeft <= 0)) {
      localStorage.removeItem("qrTimer");
    }
  }, [timeLeft, isActive]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((time) => {
        if (time <= 1) {
          setIsActive(false);
          return 0;
        }
        return time - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRevoke = () => {
    setIsActive(false);
    setTimeLeft(0);
  };

  const handleRegenerate = async () => {
    setTimeLeft(30 * 60);
    setIsActive(true);
    await generateQRCode();
  };

  if (!user) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-gray-600">Please log in to access this feature.</p>
        </div>
      </div>
    );
  }

  if (!user.digitalIdentifier) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-gray-600">
            Digital identifier not found. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Share Medical Records</h1>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm mb-2">{error}</p>
          <Button
            onClick={generateQRCode}
            size="sm"
            variant="outline"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </>
            )}
          </Button>
        </div>
      )}

      {/* QR Code Section with Fixed Height */}
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Secure Access Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-96 flex flex-col justify-center">
            {isActive ? (
              <>
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

                {/* Countdown Timer */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-gray-600">Expires in</span>
                  </div>
                  <div className="text-3xl font-mono font-bold text-orange-600">
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-16 space-y-4">
                <X className="w-16 h-16 mx-auto text-gray-400" />
                <div className="text-lg font-semibold text-gray-600">
                  Access Expired
                </div>
                <p className="text-sm text-gray-500">
                  Generate a new QR code to share your records
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        {isActive ? (
          <Button
            onClick={handleRevoke}
            variant="destructive"
            className="w-full"
          >
            Revoke Access
          </Button>
        ) : (
          <Button
            onClick={handleRegenerate}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate New QR Code"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
