import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Encounter from "@/lib/models/Encounter";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const encounters = await Encounter.find({}).select("_id prescriptions").lean();

    // Extract all prescriptions from encounters
    const allPrescriptions = encounters.reduce((acc: any[], encounter: any) => {
      if (encounter.prescriptions && encounter.prescriptions.length > 0) {
        encounter.prescriptions.forEach((prescription: any) => {
          acc.push({
            encounterId: encounter._id,
            prescriptionId: prescription._id,
            status: prescription.status,
            medicationName: prescription.medicationName,
            issuedAt: prescription.issuedAt,
          });
        });
      }
      return acc;
    }, []);

    return NextResponse.json({
      success: true,
      totalEncounters: encounters.length,
      totalPrescriptions: allPrescriptions.length,
      prescriptions: allPrescriptions,
    });
  } catch (error) {
    console.error("Error checking prescriptions:", error);
    return NextResponse.json({ success: false, error: "Failed to check prescriptions" }, { status: 500 });
  }
}
