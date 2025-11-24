import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    label: { type: String },
    url: { type: String },
  },
  { _id: false }
);

const driverDetailsSchema = new mongoose.Schema(
  {
    cnicNumber: { type: String },
    cnicFrontImage: { type: String },
    cnicBackImage: { type: String },
    licenseNumber: { type: String },
    licenseExpiry: { type: Date },
    licensePhoto: { type: String },
    truckRegistrationNumber: { type: String },
    truckType: { type: String },
    truckPhoto: { type: String },
    drivingExperienceYears: { type: Number },
    additionalNotes: { type: String },
  },
  { _id: false }
);

const kycSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    role: { type: String, enum: ["driver", "vendor", "buyer"], required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    rejectionReason: { type: String },
    documents: [documentSchema],
    driverDetails: driverDetailsSchema,
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Kyc = mongoose.model("Kyc", kycSchema);
export default Kyc;