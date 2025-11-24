import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getDriverKycStatus,
  submitDriverKyc,
  getDriverKycDocuments,
} from "../controllers/kycController.js";

const router = express.Router();

router.get("/status", protect, getDriverKycStatus);
router.get("/documents", protect, getDriverKycDocuments);
router.post("/submit", protect, submitDriverKyc);

export default router;
