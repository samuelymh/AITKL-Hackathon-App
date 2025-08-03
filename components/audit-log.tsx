"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Eye, FileText, Clock } from "lucide-react"

interface AuditLogProps {
  onBack: () => void
}

const auditEvents = [
  {
    id: 1,
    doctor: "Dr. Ahmad Hassan",
    clinic: "Klinik Setia",
    time: "July 19, 10:45am",
    accessType: "Summary History",
    icon: Eye,
    color: "blue",
  },
  {
    id: 2,
    doctor: "Dr. Lisa Chen",
    clinic: "City Medical Center",
    time: "July 18, 2:30pm",
    accessType: "Full Records",
    icon: FileText,
    color: "green",
  },
  {
    id: 3,
    doctor: "Dr. Michael Rodriguez",
    clinic: "Emergency Care Unit",
    time: "July 17, 11:15pm",
    accessType: "Emergency Access",
    icon: Clock,
    color: "red",
  },
  {
    id: 4,
    doctor: "Dr. Sarah Johnson",
    clinic: "Family Health Clinic",
    time: "July 15, 9:20am",
    accessType: "Summary History",
    icon: Eye,
    color: "blue",
  },
  {
    id: 5,
    doctor: "Dr. Ahmad Hassan",
    clinic: "Klinik Setia",
    time: "July 12, 3:45pm",
    accessType: "Lab Results",
    icon: FileText,
    color: "purple",
  },
]

export default function AuditLog({ onBack }: AuditLogProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Access History</h1>
      </div>

      {/* Summary Stats */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">15</div>
              <div className="text-xs text-blue-700">This Month</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">5</div>
              <div className="text-xs text-green-700">This Week</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">2</div>
              <div className="text-xs text-orange-700">Today</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>

        {auditEvents.map((event, index) => {
          const IconComponent = event.icon
          return (
            <Card key={event.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Timeline dot */}
                  <div
                    className={`w-10 h-10 rounded-full bg-${event.color}-100 flex items-center justify-center flex-shrink-0 mt-1`}
                  >
                    <IconComponent className={`w-5 h-5 text-${event.color}-600`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{event.doctor}</p>
                        <p className="text-sm text-gray-600">{event.clinic}</p>
                        <p className="text-sm text-gray-500 mt-1">{event.time}</p>
                      </div>
                      <Badge variant="secondary" className={`bg-${event.color}-100 text-${event.color}-800 text-xs`}>
                        {event.accessType}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Timeline line */}
                {index < auditEvents.length - 1 && <div className="absolute left-8 top-14 w-0.5 h-6 bg-gray-200" />}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Load More */}
      <Button variant="outline" className="w-full bg-transparent">
        Load More History
      </Button>
    </div>
  )
}
