"use client";

import React, { useState } from "react";
import {
  Settings,
  Shield,
  Clock,
  Eye,
  FileText,
  Pill,
  MapPin,
  Save,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface AccessScope {
  canViewMedicalHistory: boolean;
  canViewPrescriptions: boolean;
  canCreateEncounters: boolean;
  canViewAuditLogs: boolean;
}

interface AccessControlSettings {
  defaultScope: AccessScope;
  defaultTimeWindowHours: number;
  requireLocationVerification: boolean;
  autoApprovePharmacies: boolean;
  maxConcurrentGrants: number;
  notificationsEnabled: boolean;
}

interface AccessControlProps {
  userId: string;
  className?: string;
}

export function AccessControl({ userId, className }: AccessControlProps) {
  const [settings, setSettings] = useState<AccessControlSettings>({
    defaultScope: {
      canViewMedicalHistory: true,
      canViewPrescriptions: true,
      canCreateEncounters: false,
      canViewAuditLogs: false,
    },
    defaultTimeWindowHours: 4,
    requireLocationVerification: false,
    autoApprovePharmacies: false,
    maxConcurrentGrants: 3,
    notificationsEnabled: true,
  });

  const [originalSettings, setOriginalSettings] =
    useState<AccessControlSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Update settings and track changes
  const updateSettings = (updates: Partial<AccessControlSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setHasChanges(
      JSON.stringify(newSettings) !== JSON.stringify(originalSettings),
    );
  };

  // Update scope settings
  const updateScope = (updates: Partial<AccessScope>) => {
    updateSettings({
      defaultScope: { ...settings.defaultScope, ...updates },
    });
  };

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, this would call the API
      // await updateAccessControlSettings(userId, settings);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setOriginalSettings(settings);
      setHasChanges(false);

      toast({
        title: "Settings Saved",
        description: "Your access control preferences have been updated.",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset to original settings
  const handleReset = () => {
    setSettings(originalSettings);
    setHasChanges(false);
    toast({
      title: "Settings Reset",
      description: "Your changes have been discarded.",
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Access Control Settings</CardTitle>
          </div>
          {hasChanges && (
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200"
            >
              Unsaved Changes
            </Badge>
          )}
        </div>
        <CardDescription>
          Configure default permissions and security settings for QR code access
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Default Permissions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <Label className="font-medium">Default Permissions</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            These permissions will be used as defaults when healthcare providers
            request access. You can still approve or modify permissions for each
            individual request.
          </p>

          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-blue-600" />
                <div>
                  <Label className="font-medium">Medical History</Label>
                  <p className="text-sm text-muted-foreground">
                    Past diagnoses, treatments, and clinical notes
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.defaultScope.canViewMedicalHistory}
                onCheckedChange={(checked) =>
                  updateScope({ canViewMedicalHistory: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Pill className="h-4 w-4 text-green-600" />
                <div>
                  <Label className="font-medium">Prescriptions</Label>
                  <p className="text-sm text-muted-foreground">
                    Current and past medication prescriptions
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.defaultScope.canViewPrescriptions}
                onCheckedChange={(checked) =>
                  updateScope({ canViewPrescriptions: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-purple-600" />
                <div>
                  <Label className="font-medium">Create New Records</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow creating new encounters and diagnoses
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.defaultScope.canCreateEncounters}
                onCheckedChange={(checked) =>
                  updateScope({ canCreateEncounters: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg opacity-60">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-gray-500" />
                <div>
                  <Label className="font-medium text-gray-500">
                    Audit Logs
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Access history (not recommended for general access)
                  </p>
                </div>
              </div>
              <Switch checked={false} disabled onCheckedChange={() => {}} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Time Window Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <Label className="font-medium">Default Access Duration</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            How long should access typically last? You can adjust this for
            individual requests.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                Duration: {settings.defaultTimeWindowHours} hours
              </Label>
              <Badge variant="outline">
                {(() => {
                  if (settings.defaultTimeWindowHours <= 2)
                    return "Quick Visit";
                  if (settings.defaultTimeWindowHours <= 8) return "Standard";
                  if (settings.defaultTimeWindowHours <= 24) return "Extended";
                  return "Long Term";
                })()}
              </Badge>
            </div>
            <Slider
              value={[settings.defaultTimeWindowHours]}
              onValueChange={([value]) =>
                updateSettings({ defaultTimeWindowHours: value })
              }
              max={24}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 hour</span>
              <span>12 hours</span>
              <span>24 hours</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Security Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <Label className="font-medium">Security & Automation</Label>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-orange-600" />
                <div>
                  <Label className="font-medium">Location Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Require location match for access requests
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.requireLocationVerification}
                onCheckedChange={(checked) =>
                  updateSettings({ requireLocationVerification: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Pill className="h-4 w-4 text-green-600" />
                <div>
                  <Label className="font-medium">Auto-approve Pharmacies</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically approve prescription-only access for
                    pharmacies
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.autoApprovePharmacies}
                onCheckedChange={(checked) =>
                  updateSettings({ autoApprovePharmacies: checked })
                }
              />
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="font-medium">
                    Maximum Concurrent Access
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Limit how many providers can access your records
                    simultaneously
                  </p>
                </div>
                <Badge variant="outline">
                  {settings.maxConcurrentGrants}{" "}
                  {settings.maxConcurrentGrants === 1
                    ? "provider"
                    : "providers"}
                </Badge>
              </div>
              <Slider
                value={[settings.maxConcurrentGrants]}
                onValueChange={([value]) =>
                  updateSettings({ maxConcurrentGrants: value })
                }
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>1</span>
                <span>5</span>
                <span>10+</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Notification Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className="h-4 w-4" />
            <Label className="font-medium">Notifications</Label>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="font-medium">
                Access Request Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when healthcare providers request access to your
                records
              </p>
            </div>
            <Switch
              checked={settings.notificationsEnabled}
              onCheckedChange={(checked) =>
                updateSettings({ notificationsEnabled: checked })
              }
            />
          </div>
        </div>

        {/* Action Buttons */}
        {hasChanges && (
          <>
            <Separator />
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                disabled={saving}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </>
        )}

        {/* Security Notice */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">Privacy Protection</p>
              <p className="text-blue-700">
                These settings provide defaults for access requests. You always
                maintain final control and can approve, modify, or deny any
                specific request regardless of these default settings.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AccessControl;
