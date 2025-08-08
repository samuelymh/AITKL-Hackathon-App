"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, Download, Printer, Share2, CheckCircle, AlertTriangle, Copy, RefreshCw, Shield } from "lucide-react";
import { QRCodeService, PrescriptionData } from "@/lib/services/qr-code-service";

interface PrescriptionQRProps {
  prescriptionData: {
    encounterId: string;
    prescriptionIndex: number;
    medicationName: string;
    dosage: string;
    frequency: string;
    patientName: string;
    patientDigitalId: string;
    doctorId: string;
    doctorName: string;
    doctorLicenseNumber?: string;
    organizationId: string;
    organizationName: string;
    issuedAt: string;
    expiresAt?: string;
  };
  onClose?: () => void;
  className?: string;
}

export function PrescriptionQRGenerator({ prescriptionData, onClose, className = "" }: Readonly<PrescriptionQRProps>) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateQRCode();
  }, [prescriptionData]);

  const generateQRCode = async () => {
    setGenerating(true);
    setError(null);

    try {
      // Create secure prescription data
      const prescriptionQRData: PrescriptionData = {
        encounterId: prescriptionData.encounterId,
        prescriptionIndex: prescriptionData.prescriptionIndex,
        medication: {
          name: prescriptionData.medicationName,
          dosage: prescriptionData.dosage,
          frequency: prescriptionData.frequency,
        },
        patient: {
          digitalId: prescriptionData.patientDigitalId,
        },
        prescriber: {
          id: prescriptionData.doctorId,
          licenseNumber: prescriptionData.doctorLicenseNumber,
        },
        organization: {
          id: prescriptionData.organizationId,
          name: prescriptionData.organizationName,
        },
        issuedAt: prescriptionData.issuedAt,
        expiresAt: prescriptionData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
      };

      // Generate secure QR code using the QRCodeService
      const qrCodeDataURL = await QRCodeService.generatePrescriptionQR(prescriptionQRData, {
        width: 256,
        margin: 2,
      });

      setQrCodeUrl(qrCodeDataURL);
      // Store encrypted data for potential copying (though not recommended for security)
      setQrCodeData("secure-prescription-qr-data");
    } catch (err) {
      console.error("Error generating QR code:", err);
      setError("Failed to generate secure QR code. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement("a");
    link.download = `prescription-${prescriptionData.medicationName}-${Date.now()}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const printQRCode = () => {
    if (!qrCodeUrl) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const htmlContent = `
        <html>
          <head>
            <title>Prescription QR Code</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
              }
              .qr-container {
                border: 2px solid #000;
                padding: 20px;
                margin: 20px auto;
                max-width: 400px;
              }
              .prescription-info {
                margin-bottom: 20px;
                text-align: left;
              }
              .prescription-info h3 {
                margin: 0 0 10px 0;
                color: #333;
              }
              .prescription-info p {
                margin: 5px 0;
                color: #666;
              }
              .qr-code {
                margin: 20px 0;
              }
              .footer {
                margin-top: 20px;
                font-size: 12px;
                color: #888;
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="prescription-info">
                <h3>Digital Prescription</h3>
                <p><strong>Patient:</strong> ${prescriptionData.patientName}</p>
                <p><strong>Medication:</strong> ${prescriptionData.medicationName}</p>
                <p><strong>Dosage:</strong> ${prescriptionData.dosage}</p>
                <p><strong>Frequency:</strong> ${prescriptionData.frequency}</p>
                <p><strong>Prescribed by:</strong> ${prescriptionData.doctorName}</p>
                <p><strong>Organization:</strong> ${prescriptionData.organizationName}</p>
                <p><strong>Date:</strong> ${new Date(prescriptionData.issuedAt).toLocaleDateString()}</p>
              </div>
              <div class="qr-code">
                <img src="${qrCodeUrl}" alt="Prescription QR Code" style="max-width: 200px;" />
              </div>
              <div class="footer">
                <p>Present this QR code to your pharmacy for verification</p>
                <p>Issued: ${new Date().toLocaleString()}</p>
              </div>
            </div>
          </body>
        </html>
      `;

      printWindow.document.open();
      // eslint-disable-next-line deprecation/deprecation
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const copyQRData = async () => {
    try {
      // For security reasons, we don't copy the actual encrypted QR data
      // Instead, provide a secure reference or instruction
      const copyText = `Secure Prescription QR Code - ${prescriptionData.medicationName}\nGenerated: ${new Date().toLocaleString()}\nPresent this QR code to your pharmacy for verification.`;
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy QR data:", err);
    }
  };

  const shareQRCode = async () => {
    if (navigator.share && qrCodeUrl) {
      try {
        // Convert data URL to blob
        const response = await fetch(qrCodeUrl);
        const blob = await response.blob();
        const file = new File([blob], `prescription-${prescriptionData.medicationName}.png`, { type: "image/png" });

        await navigator.share({
          title: "Prescription QR Code",
          text: `Prescription for ${prescriptionData.medicationName}`,
          files: [file],
        });
      } catch (err) {
        console.error("Error sharing QR code:", err);
        // Fallback to download
        downloadQRCode();
      }
    } else {
      // Fallback to download
      downloadQRCode();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Prescription QR Code
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </CardTitle>
        <CardDescription>QR code for pharmacy verification of {prescriptionData.medicationName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Prescription Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Prescription Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Patient:</span>
              <p className="font-medium">{prescriptionData.patientName}</p>
            </div>
            <div>
              <span className="text-gray-500">Medication:</span>
              <p className="font-medium">{prescriptionData.medicationName}</p>
            </div>
            <div>
              <span className="text-gray-500">Dosage:</span>
              <p className="font-medium">{prescriptionData.dosage}</p>
            </div>
            <div>
              <span className="text-gray-500">Frequency:</span>
              <p className="font-medium">{prescriptionData.frequency}</p>
            </div>
            <div>
              <span className="text-gray-500">Prescribed by:</span>
              <p className="font-medium">{prescriptionData.doctorName}</p>
            </div>
            <div>
              <span className="text-gray-500">Date:</span>
              <p className="font-medium">{new Date(prescriptionData.issuedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* QR Code Display */}
        <div className="text-center">
          {generating && (
            <div className="flex flex-col items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Generating QR code...</p>
            </div>
          )}

          {!generating && qrCodeUrl && (
            <div className="space-y-4">
              <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                <img src={qrCodeUrl} alt="Prescription QR Code" className="w-64 h-64 mx-auto" />
              </div>

              <div className="text-sm text-gray-600">
                <p>Present this QR code to your pharmacy for verification</p>
                <p className="text-xs mt-1">Generated: {new Date().toLocaleString()}</p>
              </div>
            </div>
          )}

          {!generating && !qrCodeUrl && (
            <div className="py-8 text-gray-500">
              <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>QR code not available</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {qrCodeUrl && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={downloadQRCode} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={printQRCode} variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={shareQRCode} variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button onClick={copyQRData} variant="outline">
                {copied ? <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied!" : "Copy Data"}
              </Button>
            </div>

            <Button onClick={generateQRCode} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </div>
        )}

        {/* Security Info */}
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-green-600 mt-0.5" />
            <div className="text-sm">
              <p className="text-green-800 font-medium">Digitally Signed Prescription</p>
              <p className="text-green-600 mt-1">
                This QR code contains a cryptographically signed prescription with tamper detection. Only authorized
                pharmacies can verify and dispense this prescription. The digital signature ensures authenticity and
                prevents forgery.
              </p>
              <div className="mt-2 text-xs text-green-700">
                <p>🔒 JWT + HMAC-SHA256 Digital Signature</p>
                <p>⏰ Time-limited validity (30 days)</p>
                <p>🏥 Organization verified</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PrescriptionQRGenerator;
