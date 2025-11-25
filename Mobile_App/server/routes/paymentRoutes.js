import express from 'express';
import { createPaymentIntent, getPublishableKey } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protected endpoint for buyer to create a PaymentIntent for an order
router.post('/create-payment-intent', protect, createPaymentIntent);

// Public endpoint to fetch publishable key for client initialization
router.get('/publishable-key', getPublishableKey);

export default router;
