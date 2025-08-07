import connectToDatabase from "@/lib/mongodb";
import Practitioner from "@/lib/models/Practitioner";
import mongoose from "mongoose";

/**
 * Service for practitioner-related operations
 */

/**
 * Get practitioner by user ID
 * @param userId - The user ID to search for
 * @returns Practitioner document or null
 */
export async function getPractitionerByUserId(userId: string) {
  await connectToDatabase();

  try {
    const practitioner = await Practitioner.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    return practitioner;
  } catch (error) {
    console.error("Error fetching practitioner by user ID:", error);
    throw new Error("Failed to fetch practitioner");
  }
}

/**
 * Get practitioner by ID
 * @param practitionerId - The practitioner ID
 * @returns Practitioner document or null
 */
export async function getPractitionerById(practitionerId: string) {
  await connectToDatabase();

  try {
    const practitioner = await Practitioner.findById(practitionerId);
    return practitioner;
  } catch (error) {
    console.error("Error fetching practitioner by ID:", error);
    throw new Error("Failed to fetch practitioner");
  }
}

/**
 * Get practitioner with user information
 * @param userId - The user ID to search for
 * @returns Practitioner with populated user data
 */
export async function getPractitionerWithUserInfo(userId: string) {
  await connectToDatabase();

  try {
    const practitioner = await Practitioner.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).populate("userId", "personalInfo digitalIdentifier role");

    return practitioner;
  } catch (error) {
    console.error("Error fetching practitioner with user info:", error);
    throw new Error("Failed to fetch practitioner details");
  }
}

/**
 * Get practitioners by type
 * @param practitionerType - The type of practitioner (e.g., 'pharmacist', 'doctor')
 * @param limit - Optional limit for results
 * @returns Array of practitioners
 */
export async function getPractitionersByType(
  practitionerType: string,
  limit?: number,
) {
  await connectToDatabase();

  try {
    let query = Practitioner.find({
      "professionalInfo.practitionerType": practitionerType,
    }).populate("userId", "personalInfo digitalIdentifier");

    if (limit) {
      query = query.limit(limit);
    }

    const practitioners = await query.exec();
    return practitioners;
  } catch (error) {
    console.error("Error fetching practitioners by type:", error);
    throw new Error("Failed to fetch practitioners");
  }
}
