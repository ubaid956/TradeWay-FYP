import express from 'express';
import { protect } from '../middleware/auth.js';
import { createDispute, listMyDisputes, getDisputeById, updateDisputeStatus } from '../controllers/disputeController.js';

const router = express.Router();

router.post('/', protect, createDispute);
router.get('/my', protect, listMyDisputes);
router.get('/:id', protect, getDisputeById);
router.patch('/:id/status', protect, updateDisputeStatus);

export default router;
