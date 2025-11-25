import Stripe from 'stripe';
import Order from '../models/Order.js';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' });

// Create a PaymentIntent for an order
export const createPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!orderId) return res.status(400).json({ success: false, message: 'Missing orderId' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.buyer.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to pay for this order' });
    }

    if (order.payment?.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Order already paid' });
    }

    const amountCents = Math.round((order.orderDetails?.finalAmount || 0) * 100);

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: { orderId: order._id.toString(), userId: userId.toString() },
    });

    // Persist PaymentIntent id on order for traceability
    order.payment = { ...order.payment, transactionId: paymentIntent.id, status: 'pending' };
    await order.save();

    return res.json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('createPaymentIntent error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create payment intent', error: error.message });
  }
};

// Return Stripe publishable key (safe to expose to clients)
export const getPublishableKey = async (req, res) => {
  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || null;
    return res.json({ success: true, publishableKey });
  } catch (error) {
    console.error('getPublishableKey error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get publishable key' });
  }
};

// Stripe webhook handler
export const stripeWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      // req.rawBody is populated by express json verify middleware in index.js
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('⚠️  Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            'payment.status': 'paid',
            'payment.paidAt': new Date(),
            'payment.transactionId': pi.id,
            'payment.method': 'stripe',
          });
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            'payment.status': 'failed',
            'payment.transactionId': pi.id,
          });
        }
        break;
      }
      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error:', error);
    res.status(500).send('Server error');
  }
};
