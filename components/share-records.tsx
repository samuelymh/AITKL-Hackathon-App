"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Clock, X } from "lucide-react";

interface ShareRecordsProps {
  onBack: () => void;
}

export default function ShareRecords({ onBack }: ShareRecordsProps) {
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [isActive, setIsActive] = useState(true);

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

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Share Medical Records</h1>
      </div>

      {/* QR Code Section */}
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Secure Access Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isActive ? (
            <>
              {/* Large QR Code Placeholder */}
              <div className="mx-auto w-64 h-64 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                <div
                  className="w-56 h-56 bg-black"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='white'/%3E%3Cg fill='black'%3E%3Crect x='0' y='0' width='10' height='10'/%3E%3Crect x='20' y='0' width='10' height='10'/%3E%3Crect x='40' y='0' width='10' height='10'/%3E%3Crect x='60' y='0' width='10' height='10'/%3E%3Crect x='80' y='0' width='10' height='10'/%3E%3Crect x='0' y='20' width='10' height='10'/%3E%3Crect x='40' y='20' width='10' height='10'/%3E%3Crect x='80' y='20' width='10' height='10'/%3E%3Crect x='0' y='40' width='10' height='10'/%3E%3Crect x='20' y='40' width='10' height='10'/%3E%3Crect x='60' y='40' width='10' height='10'/%3E%3Crect x='80' y='40' width='10' height='10'/%3E%3Crect x='0' y='60' width='10' height='10'/%3E%3Crect x='40' y='60' width='10' height='10'/%3E%3Crect x='80' y='60' width='10' height='10'/%3E%3Crect x='0' y='80' width='10' height='10'/%3E%3Crect x='20' y='80' width='10' height='10'/%3E%3Crect x='40' y='80' width='10' height='10'/%3E%3Crect x='60' y='80' width='10' height='10'/%3E%3Crect x='80' y='80' width='10' height='10'/%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundSize: "cover",
                  }}
                />
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
        </CardContent>
      </Card>

      {/* Access Scope */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Access Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Medical History Summary</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Included
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Current Medications</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Included
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Lab Results</span>
            <Badge variant="outline">Excluded</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Full Medical Records</span>
            <Badge variant="outline">Excluded</Badge>
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
            onClick={() => {
              setTimeLeft(30 * 60);
              setIsActive(true);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Generate New QR Code
          </Button>
        )}
      </div>
    </div>
  );
}
