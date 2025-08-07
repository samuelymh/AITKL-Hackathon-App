import { NextResponse } from "next/server";
import { OrganizationType } from "@/lib/models/Organization";

export async function GET() {
  try {
    // Return organization types for dropdown
    const organizationTypes = Object.values(OrganizationType).map((type) => ({
      value: type,
      label: type.charAt(0) + type.slice(1).toLowerCase(),
      description: getTypeDescription(type),
    }));

    return NextResponse.json({
      success: true,
      data: {
        types: organizationTypes,
      },
    });
  } catch (error) {
    console.error("Organization types error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve organization types",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function getTypeDescription(type: OrganizationType): string {
  switch (type) {
    case OrganizationType.HOSPITAL:
      return "Large medical facility providing comprehensive healthcare services";
    case OrganizationType.CLINIC:
      return "Smaller healthcare facility for outpatient care and consultations";
    case OrganizationType.PHARMACY:
      return "Facility for dispensing medications and pharmaceutical services";
    case OrganizationType.LABORATORY:
      return "Medical testing facility for diagnostic services";
    default:
      return "";
  }
}
