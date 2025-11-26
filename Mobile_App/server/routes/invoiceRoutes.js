import express from 'express';
import { protect, requireRoles } from '../middleware/auth.js';
import { createInvoiceFromBid, getInvoiceById } from '../controllers/invoiceController.js';

const router = express.Router();

router.use(protect);

router.post('/from-bid/:bidId', requireRoles('vendor'), createInvoiceFromBid);
router.get('/:invoiceId', getInvoiceById);

export default router;
