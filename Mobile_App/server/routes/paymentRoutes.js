import express from 'express';
import { createPaymentIntent, createInvoicePaymentIntent, getPublishableKey, processInvoicePayment } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protected endpoint for buyer to create a PaymentIntent for an order
router.post('/create-payment-intent', protect, createPaymentIntent);
router.post('/invoices/:invoiceId/create-payment-intent', protect, createInvoicePaymentIntent);

// Manual invoice payment processing (for dev when webhooks don't reach localhost)
router.post('/invoices/:invoiceId/process-payment', protect, processInvoicePayment);

// Public endpoint to fetch publishable key for client initialization
router.get('/publishable-key', getPublishableKey);

export default router;
