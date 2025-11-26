import Kyc from "../models/Kyc.js";
import User from "../models/User.js";
import cloudinary from "../cloudinaryConfig.js";

const DRIVER_ROLE = "driver";

const mapKycStatusToProfileStatus = (status = "pending") => {
  if (status === "approved") return "verified";
  if (status === "rejected") return "rejected";
  if (status === "pending") return "pending";
  return "unverified";
};

const cloneDriverProfile = (profile) => {
  if (!profile) return {};
  if (typeof profile.toObject === "function") {
    return profile.toObject();
  }
  return { ...profile };
};

const syncDriverVerificationState = async ({
  userId,
  driverDetails = {},
  kycStatus,
  rejectionReason,
  kycId,
  submittedAt = new Date()
}) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const profile = cloneDriverProfile(user.driverProfile);

  if (driverDetails.cnicNumber) profile.cnicNumber = driverDetails.cnicNumber;
  if (driverDetails.licenseNumber) profile.licenseNumber = driverDetails.licenseNumber;
  if (driverDetails.truckRegistrationNumber) {
    profile.truckRegistrationNumber = driverDetails.truckRegistrationNumber;
  }

  const profileStatus = mapKycStatusToProfileStatus(kycStatus);
  profile.verificationStatus = profileStatus;

  if (!profile.verificationRequestedAt || profileStatus === "pending") {
    profile.verificationRequestedAt = submittedAt || new Date();
  }

  if (profileStatus === "verified") {
    profile.verifiedAt = new Date();
    profile.verificationNote = undefined;
  } else if (profileStatus === "rejected") {
    profile.verifiedAt = undefined;
    profile.verificationNote = rejectionReason || "Rejected by admin";
  } else if (profileStatus === "pending") {
    profile.verifiedAt = undefined;
    profile.verificationNote = undefined;
  }

  user.driverProfile = Object.keys(profile).length ? profile : undefined;
  if (kycId) {
    user.kycDetails = kycId;
  }
  user.isKYCVerified = profileStatus === "verified";

  await user.save();
  return user;
};

const formatAdminKycRecord = (record) => {
  if (!record) return null;
  const base = typeof record.toObject === "function" ? record.toObject() : record;
  return {
    _id: base._id,
    status: base.status,
    rejectionReason: base.rejectionReason || null,
    submittedAt: base.submittedAt,
    reviewedAt: base.reviewedAt,
    driverDetails: base.driverDetails,
    role: base.role,
    user: base.user
      ? {
          _id: base.user._id,
          name: base.user.name,
          email: base.user.email,
          phone: base.user.phone,
          driverProfile: base.user.driverProfile,
          isKYCVerified: base.user.isKYCVerified,
          createdAt: base.user.createdAt,
        }
      : null,
  };
};

const handleDriverKycReview = async ({
  kycId,
  reviewerId,
  status,
  rejectionReason,
}) => {
  if (!kycId) {
    const error = new Error("KYC record id is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!["approved", "rejected"].includes(status)) {
    const error = new Error("Invalid review status supplied.");
    error.statusCode = 400;
    throw error;
  }

  const kycRecord = await Kyc.findOne({ _id: kycId, role: DRIVER_ROLE });
  if (!kycRecord) {
    const error = new Error("Driver KYC record not found.");
    error.statusCode = 404;
    throw error;
  }

  kycRecord.status = status;
  kycRecord.reviewedAt = new Date();
  kycRecord.reviewer = reviewerId;
  kycRecord.rejectionReason = status === "rejected" ? rejectionReason : undefined;

  await kycRecord.save();

  await syncDriverVerificationState({
    userId: kycRecord.user,
    driverDetails: kycRecord.driverDetails,
    kycStatus: status,
    rejectionReason,
    kycId: kycRecord._id,
    submittedAt: kycRecord.submittedAt,
  });

  await kycRecord.populate("user", "name email phone driverProfile isKYCVerified createdAt");
  return kycRecord;
};

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

    await syncDriverVerificationState({
      userId: req.user._id,
      driverDetails,
      kycStatus: kycRecord.status,
      kycId: kycRecord._id,
      submittedAt: kycRecord.submittedAt,
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

export const listDriverKycRequests = async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 20 } = req.query;
    const normalizedStatus = String(status).toLowerCase();

    const query = { role: DRIVER_ROLE };
    if (normalizedStatus !== "all") {
      query.status = normalizedStatus;
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [records, total] = await Promise.all([
      Kyc.find(query)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .populate("user", "name email phone driverProfile isKYCVerified createdAt"),
      Kyc.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: records.map(formatAdminKycRecord),
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.max(Math.ceil(total / limitNumber), 1),
      },
    });
  } catch (error) {
    console.error("Failed to list driver KYC requests:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Unable to load driver verification requests",
    });
  }
};

export const getDriverKycRequest = async (req, res) => {
  try {
    const { kycId } = req.params;
    const record = await Kyc.findOne({ _id: kycId, role: DRIVER_ROLE }).populate(
      "user",
      "name email phone driverProfile isKYCVerified createdAt"
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Driver KYC record not found",
      });
    }

    return res.json({ success: true, data: formatAdminKycRecord(record) });
  } catch (error) {
    console.error("Failed to fetch driver KYC record:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Unable to load driver KYC record",
    });
  }
};

export const approveDriverKyc = async (req, res) => {
  try {
    const { kycId } = req.params;
    const record = await handleDriverKycReview({
      kycId,
      reviewerId: req.user?._id,
      status: "approved",
    });

    return res.json({
      success: true,
      message: "Driver verification approved.",
      data: formatAdminKycRecord(record),
    });
  } catch (error) {
    console.error("Failed to approve driver KYC:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Unable to approve driver verification",
    });
  }
};

export const rejectDriverKyc = async (req, res) => {
  try {
    const { kycId } = req.params;
    const reason = req.body?.reason?.trim();

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required.",
      });
    }

    const record = await handleDriverKycReview({
      kycId,
      reviewerId: req.user?._id,
      status: "rejected",
      rejectionReason: reason,
    });

    return res.json({
      success: true,
      message: "Driver verification rejected.",
      data: formatAdminKycRecord(record),
    });
  } catch (error) {
    console.error("Failed to reject driver KYC:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Unable to reject driver verification",
    });
  }
};

