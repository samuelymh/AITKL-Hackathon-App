"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, FileText, Check, Share2, Calendar, Pill, Activity } from "lucide-react"

interface UploadDocsProps {
  onBack: () => void
  onDataUploaded: (data: any) => void
}

const careTimeline = [
  {
    date: "July 2024",
    type: "diagnosis",
    title: "Hypertension Diagnosis",
    provider: "Dr. Ahmad Hassan",
    icon: Activity,
    color: "red",
  },
  {
    date: "June 2024",
    type: "medication",
    title: "Lisinopril 10mg prescribed",
    provider: "Dr. Ahmad Hassan",
    icon: Pill,
    color: "blue",
  },
  {
    date: "May 2024",
    type: "visit",
    title: "Annual Physical Exam",
    provider: "Dr. Sarah Johnson",
    icon: Calendar,
    color: "green",
  },
  {
    date: "March 2024",
    type: "diagnosis",
    title: "Type 2 Diabetes",
    provider: "Dr. Lisa Chen",
    icon: Activity,
    color: "orange",
  },
]

export default function UploadDocs({ onBack, onDataUploaded }: UploadDocsProps) {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [showTimeline, setShowTimeline] = useState(false)

  const handleFileUpload = (fileName: string) => {
    setUploadedFiles((prev) => [...prev, fileName])
    // Simulate processing delay
    setTimeout(() => {
      setShowTimeline(true)
      onDataUploaded(careTimeline)
    }, 2000)
  }

  const handleShareSummary = () => {
    // This would generate a QR code for the care summary
    alert("QR code generated for care summary sharing!")
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Upload Health Documents</h1>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Document Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
            <Upload className="w-12 h-12 mx-auto text-blue-400 mb-4" />
            <p className="text-lg font-semibold text-gray-700 mb-2">Upload Medical Records</p>
            <p className="text-sm text-gray-500 mb-4">PDF files only, up to 10MB each</p>
            <Button
              onClick={() => handleFileUpload("Lab_Results_July2024.pdf")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Choose Files
            </Button>
          </div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Uploaded Files</h3>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="flex-1 text-sm font-medium">{file}</span>
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI-Generated Care Timeline */}
      {showTimeline && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                AI-Generated Care Timeline
              </CardTitle>
              <p className="text-sm text-gray-600">Based on your uploaded documents</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {careTimeline.map((event, index) => {
                const IconComponent = event.icon
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full bg-${event.color}-100 flex items-center justify-center flex-shrink-0`}
                    >
                      <IconComponent className={`w-5 h-5 text-${event.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{event.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{event.provider}</p>
                      <p className="text-xs text-gray-500">{event.date}</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Share Summary Button */}
          <Button onClick={handleShareSummary} className="w-full bg-blue-600 hover:bg-blue-700 h-12">
            <Share2 className="w-5 h-5 mr-2" />
            Share Summary as QR Code
          </Button>
        </>
      )}
    </div>
  )
}
