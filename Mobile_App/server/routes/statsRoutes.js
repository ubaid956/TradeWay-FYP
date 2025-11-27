import express from 'express';
import { protect } from '../middleware/auth.js';
import { getVendorStats, getBuyerStats } from '../controllers/statsController.js';

const router = express.Router();

router.get('/vendor', protect, getVendorStats);
router.get('/buyer', protect, getBuyerStats);

export default router;
