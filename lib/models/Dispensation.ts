import mongoose from "mongoose";
import { auditFields } from "./BaseSchema";

const DispensationSchema = new mongoose.Schema(
  {
    prescriptionRef: {
      encounterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      prescriptionIndex: {
        type: Number,
        required: true,
      },
    },

    // Pharmacy details
    pharmacyOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    dispensingPractitionerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Practitioner",
      required: true,
    },

    dispensationDetails: {
      fillDate: {
        type: Date,
        required: true,
      },
      quantityDispensed: {
        type: String,
        required: true,
      },
      daysSupply: {
        type: Number,
        required: true,
      },
      lotNumber: String,
      expirationDate: Date,
      substitutions: [
        {
          original: String,
          substitute: String,
          reason: String,
        },
      ],
      counselingNotes: String,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["DISPENSED", "PARTIAL", "REFUND_REQUESTED", "REFUNDED"],
      default: "DISPENSED",
    },

    ...auditFields,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
DispensationSchema.index({ "prescriptionRef.encounterId": 1, "prescriptionRef.prescriptionIndex": 1 });
DispensationSchema.index({ pharmacyOrganizationId: 1, "dispensationDetails.fillDate": -1 });
DispensationSchema.index({ dispensingPractitionerId: 1, "dispensationDetails.fillDate": -1 });

const Dispensation = mongoose.models.Dispensation || mongoose.model("Dispensation", DispensationSchema);

export default Dispensation;
