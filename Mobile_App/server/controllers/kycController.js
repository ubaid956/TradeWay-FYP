import Kyc from "../models/Kyc.js";
import User from "../models/User.js";
import cloudinary from "../cloudinaryConfig.js";

const DRIVER_ROLE = "driver";

const ensureDriver = (user) => {
  if (!user || user.role !== DRIVER_ROLE) {
    const error = new Error("KYC is available for driver accounts only.");
    error.statusCode = 403;
    throw error;
  }
};

const normalizeFile = (file) => {
  if (!file) return null;
  return Array.isArray(file) ? file[0] : file;
};

const uploadOptionalFile = async (file, folder) => {
  const normalized = normalizeFile(file);
  if (!normalized?.data) return null;

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `tradeway-kyc/${folder}`,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      )
      .end(normalized.data);
  });
};

const buildResponse = (kycRecord) => {
  if (!kycRecord) {
    return {
      status: "not_submitted",
      driverDetails: null,
      rejectionReason: null,
      submittedAt: null,
      reviewedAt: null,
    };
  }

  return {
    status: kycRecord.status,
    driverDetails: kycRecord.driverDetails,
    rejectionReason: kycRecord.rejectionReason || null,
    submittedAt: kycRecord.submittedAt,
    reviewedAt: kycRecord.reviewedAt,
  };
};

export const getDriverKycStatus = async (req, res) => {
  try {
    ensureDriver(req.user);

    const kycRecord = await Kyc.findOne({ user: req.user._id });
    return res.json({ success: true, data: buildResponse(kycRecord) });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to fetch KYC status",
    });
  }
};

export const getDriverKycDocuments = async (req, res) => {
  try {
    ensureDriver(req.user);

    const kycRecord = await Kyc.findOne({ user: req.user._id });
    return res.json({
      success: true,
      data: kycRecord?.driverDetails || null,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to load KYC documents",
    });
  }
};

export const submitDriverKyc = async (req, res) => {
  try {
    ensureDriver(req.user);

    const {
      cnicNumber,
      licenseNumber,
      licenseExpiry,
      truckRegistrationNumber,
      truckType,
      yearsOfExperience,
      additionalNotes,
    } = req.body;

    const files = req.files || {};
    const existing = await Kyc.findOne({ user: req.user._id });
    const driverDetails = { ...(existing?.driverDetails?.toObject?.() || existing?.driverDetails || {}) };

    const finalCnicNumber = (cnicNumber || driverDetails.cnicNumber || "").trim();
    const finalLicenseNumber = (licenseNumber || driverDetails.licenseNumber || "").trim();
    const finalTruckRegistration = (truckRegistrationNumber || driverDetails.truckRegistrationNumber || "").trim();

    if (!finalCnicNumber || !finalLicenseNumber || !finalTruckRegistration) {
      return res.status(400).json({
        success: false,
        message: "CNIC, driving license number, and truck registration number are required.",
      });
    }

    driverDetails.cnicNumber = finalCnicNumber;
    driverDetails.licenseNumber = finalLicenseNumber;
    driverDetails.truckRegistrationNumber = finalTruckRegistration;

    if (truckType) driverDetails.truckType = truckType.trim();
    if (additionalNotes) driverDetails.additionalNotes = additionalNotes.trim();

    if (licenseExpiry) {
      const expiryDate = new Date(licenseExpiry);
      if (!isNaN(expiryDate)) {
        driverDetails.licenseExpiry = expiryDate;
      }
    }

    if (yearsOfExperience !== undefined) {
      const parsedExperience = Number(yearsOfExperience);
      if (!Number.isNaN(parsedExperience)) {
        driverDetails.drivingExperienceYears = parsedExperience;
      }
    }

    const uploadMap = [
      { key: "cnicFrontImage", file: files.cnicFrontImage, folder: `${req.user._id}/cnic-front` },
      { key: "cnicBackImage", file: files.cnicBackImage, folder: `${req.user._id}/cnic-back` },
      { key: "licensePhoto", file: files.licensePhoto, folder: `${req.user._id}/license` },
      { key: "truckPhoto", file: files.truckPhoto, folder: `${req.user._id}/truck` },
    ];

    for (const item of uploadMap) {
      if (item.file) {
        const uploadedUrl = await uploadOptionalFile(item.file, item.folder);
        if (uploadedUrl) {
          driverDetails[item.key] = uploadedUrl;
        }
      }
    }

    let kycRecord = existing;
    if (!kycRecord) {
      kycRecord = new Kyc({
        user: req.user._id,
        role: DRIVER_ROLE,
      });
    }

    kycRecord.role = DRIVER_ROLE;
    kycRecord.driverDetails = driverDetails;
    kycRecord.status = "pending";
    kycRecord.rejectionReason = undefined;
    kycRecord.submittedAt = new Date();
    kycRecord.reviewedAt = undefined;

    await kycRecord.save();

    await User.findByIdAndUpdate(req.user._id, {
      kycDetails: kycRecord._id,
      isKYCVerified: kycRecord.status === "approved",
    });

    return res.status(200).json({
      success: true,
      message: "Driver KYC submitted successfully.",
      data: buildResponse(kycRecord),
    });
  } catch (error) {
    console.error("Driver KYC submission failed:", error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to submit driver KYC information",
    });
  }
};

