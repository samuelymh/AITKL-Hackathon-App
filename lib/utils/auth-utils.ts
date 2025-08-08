import { getPractitionerByUserId } from "@/lib/services/practitioner-service";
import { OrganizationMemberStatus, ErrorMessages } from "@/lib/constants";
import User from "@/lib/models/User";

/**
 * Validates pharmacist access for API endpoints
 * Shared utility to reduce code duplication and improve security
 */
export async function validatePharmacistAccess(authContext: any, digitalId: string) {
  const pharmacist = await getPractitionerByUserId(authContext.userId);
  if (!pharmacist) {
    throw new Error(ErrorMessages.PHARMACIST_NOT_FOUND);
  }

  const OrganizationMember = (await import("@/lib/models/OrganizationMember")).default;
  const organizationMember = await OrganizationMember.findOne({
    practitionerId: pharmacist._id,
    status: OrganizationMemberStatus.ACTIVE,
  });

  if (!organizationMember) {
    throw new Error("No active organization membership found");
  }

  const patient = await User.findOne({ digitalIdentifier: digitalId });
  if (!patient) {
    throw new Error(ErrorMessages.PATIENT_NOT_FOUND);
  }

  return { pharmacist, organizationMember, patient };
}
