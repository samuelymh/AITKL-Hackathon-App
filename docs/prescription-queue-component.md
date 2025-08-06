# PrescriptionQueue Component Documentation

## Overview

The `PrescriptionQueue` component is a reusable React component designed to display and manage prescription data across different user roles in a healthcare application. It provides a consistent interface for pharmacists, doctors, and organizations to view and interact with prescription information.

## Features

- **Reusable Design**: Can be used by different user roles with customizable actions
- **Role-based Actions**: Pre-configured action sets for pharmacists, doctors, and organizations
- **Status & Priority Indicators**: Visual badges for prescription status and priority
- **Loading States**: Built-in loading indicator support
- **Customizable Layout**: Configurable height, titles, descriptions, and empty states
- **Patient Record Access**: Optional patient record viewing functionality

## Basic Usage

```tsx
import PrescriptionQueue, { pharmacistActions, type PrescriptionRequest } from "@/components/healthcare/PrescriptionQueue";

// Basic usage
<PrescriptionQueue
  prescriptions={prescriptions}
  loading={loading}
  title="Prescription Queue"
  description="Pending prescriptions requiring attention"
  actions={pharmacistActions}
  onViewPatientRecord={handleViewPatientRecord}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `prescriptions` | `PrescriptionRequest[]` | Required | Array of prescription objects to display |
| `loading` | `boolean` | `false` | Shows loading state when true |
| `emptyMessage` | `string` | `"No pending prescriptions"` | Message shown when no prescriptions are available |
| `title` | `string` | `"Prescription Queue"` | Title displayed in the card header |
| `description` | `string` | `"Pending prescriptions requiring attention"` | Description displayed in the card header |
| `actions` | `PrescriptionAction[]` | `[]` | Array of action buttons to show for each prescription |
| `onViewPatientRecord` | `(patientId: string) => void` | `undefined` | Optional callback for viewing patient records |
| `className` | `string` | `""` | Additional CSS classes for the component |
| `maxHeight` | `string` | `"h-64"` | Maximum height of the scrollable area |

## PrescriptionRequest Interface

```tsx
interface PrescriptionRequest {
  id: string;
  patientName: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  status: "ISSUED" | "FILLED" | "CANCELLED";
  issuedAt: Date;
  prescribingPractitioner: {
    name: string;
    type: string;
  };
  notes?: string;
  priority: "normal" | "urgent" | "stat";
}
```

## PrescriptionAction Interface

```tsx
interface PrescriptionAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
  className?: string;
  onClick: (prescriptionId: string) => void;
  showForStatus?: string[];
}
```

## Pre-configured Action Sets

### Pharmacist Actions

```tsx
import { pharmacistActions } from "@/components/healthcare/PrescriptionQueue";

const actions = pharmacistActions.map(action => ({
  ...action,
  onClick: action.id === "dispense" 
    ? (prescriptionId: string) => handleDispense(prescriptionId)
    : action.id === "cancel"
    ? (prescriptionId: string) => handleCancel(prescriptionId)
    : action.onClick
}));
```

**Available Actions:**
- `dispense`: Green button to mark prescription as dispensed (shows for "ISSUED" status)
- `cancel`: Red outline button to cancel prescription (shows for "ISSUED" status)

### Doctor Actions

```tsx
import { doctorActions } from "@/components/healthcare/PrescriptionQueue";

const actions = doctorActions.map(action => ({
  ...action,
  onClick: action.id === "edit" 
    ? (prescriptionId: string) => handleEdit(prescriptionId)
    : action.id === "cancel"
    ? (prescriptionId: string) => handleCancel(prescriptionId)
    : action.onClick
}));
```

**Available Actions:**
- `edit`: Outline button to edit prescription (shows for "ISSUED" status)
- `cancel`: Destructive button to cancel prescription (shows for "ISSUED" status)

### Organization Actions

```tsx
import { organizationActions } from "@/components/healthcare/PrescriptionQueue";

const actions = organizationActions.map(action => ({
  ...action,
  onClick: action.id === "review" 
    ? (prescriptionId: string) => handleReview(prescriptionId)
    : action.onClick
}));
```

**Available Actions:**
- `review`: Outline button to review prescription details (shows for "ISSUED" and "FILLED" status)

## Usage Examples

### Pharmacist Dashboard

```tsx
<PrescriptionQueue
  prescriptions={prescriptionQueue}
  loading={loadingPrescriptions}
  emptyMessage="No pending prescriptions"
  title="Prescription Queue"
  description="Pending prescriptions requiring attention"
  actions={pharmacistActions.map(action => ({
    ...action,
    onClick: action.id === "dispense" 
      ? (prescriptionId: string) => handlePrescriptionAction(prescriptionId, "dispense")
      : action.id === "cancel"
      ? (prescriptionId: string) => handlePrescriptionAction(prescriptionId, "cancel")
      : action.onClick
  }))}
  onViewPatientRecord={handleViewPatientRecord}
/>
```

### Doctor Dashboard (Multiple Views)

```tsx
// Active prescriptions
<PrescriptionQueue
  prescriptions={prescriptions.filter(p => p.status === "ISSUED")}
  title="Active Prescriptions"
  description="Prescriptions you've issued that are still pending"
  actions={doctorPrescriptionActions}
  onViewPatientRecord={handleViewPatientRecord}
  maxHeight="h-80"
/>

// Recently filled prescriptions (no actions needed)
<PrescriptionQueue
  prescriptions={prescriptions.filter(p => p.status === "FILLED")}
  title="Recently Filled"
  description="Prescriptions that have been dispensed by pharmacies"
  actions={[]}
  onViewPatientRecord={handleViewPatientRecord}
  maxHeight="h-64"
/>
```

### Organization Overview with Tabs

```tsx
<Tabs defaultValue="pending">
  <TabsContent value="pending">
    <PrescriptionQueue
      prescriptions={pendingPrescriptions}
      title="Pending Prescriptions"
      description="Prescriptions awaiting pharmacy dispensing"
      actions={organizationPrescriptionActions}
      onViewPatientRecord={handleViewPatientRecord}
      maxHeight="h-96"
    />
  </TabsContent>
  
  <TabsContent value="filled">
    <PrescriptionQueue
      prescriptions={filledPrescriptions}
      title="Filled Prescriptions"
      description="Prescriptions that have been successfully dispensed"
      actions={organizationPrescriptionActions}
      onViewPatientRecord={handleViewPatientRecord}
      maxHeight="h-96"
    />
  </TabsContent>
</Tabs>
```

## Custom Actions

You can create custom actions for specific use cases:

```tsx
const customActions: PrescriptionAction[] = [
  {
    id: "approve",
    label: "Approve",
    icon: <CheckCircle className="w-4 h-4 mr-1" />,
    variant: "default",
    className: "bg-blue-600 hover:bg-blue-700",
    onClick: (prescriptionId: string) => handleApprove(prescriptionId),
    showForStatus: ["ISSUED"],
  },
  {
    id: "request-info",
    label: "Request Info",
    icon: <MessageSquare className="w-4 h-4 mr-1" />,
    variant: "outline",
    onClick: (prescriptionId: string) => handleRequestInfo(prescriptionId),
    showForStatus: ["ISSUED"],
  },
];
```

## Styling and Customization

The component uses Tailwind CSS classes and can be customized with:

- `className`: Add custom styles to the root card component
- `maxHeight`: Control the height of the scrollable prescription list
- Action `className`: Style individual action buttons
- Action `variant`: Use different button variants from the UI library

## Dependencies

- `@/components/ui/card`
- `@/components/ui/scroll-area`
- `@/components/ui/button`
- `@/components/ui/badge`
- `lucide-react` icons
- React 18+

## File Locations

- **Main Component**: `/components/healthcare/PrescriptionQueue.tsx`
- **Pharmacist Integration**: `/components/healthcare/PharmacistDashboard.tsx`
- **Doctor Example**: `/components/healthcare/DoctorPrescriptionsView.tsx`
- **Organization Example**: `/components/healthcare/OrganizationPrescriptionOverview.tsx`
