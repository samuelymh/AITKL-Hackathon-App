import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Check authorization grants collection
    const db = await import("mongoose").then((m) => m.connection.db);

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    let grantsCount = 0;
    let notificationsCount = 0;

    if (collectionNames.includes("authorization_grants")) {
      grantsCount = await db
        .collection("authorization_grants")
        .countDocuments();
    }

    if (collectionNames.includes("notificationjobs")) {
      notificationsCount = await db
        .collection("notificationjobs")
        .countDocuments();
    }

    return NextResponse.json({
      success: true,
      collections: collectionNames,
      authorizationGrants: grantsCount,
      notifications: notificationsCount,
    });
  } catch (error) {
    console.error("Error checking collections:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check collections" },
      { status: 500 },
    );
  }
}
