import Stripe from 'stripe';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import Bid from '../models/Bid.js';
import Product from '../models/Product.js';
import Message from '../models/Message.js';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { sendPushToUsers } from '../utils/push.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' });

// Helper function to format currency
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

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

// Create a PaymentIntent for an invoice
export const createInvoicePaymentIntent = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user?.id || req.user?._id;

    console.log('createInvoicePaymentIntent called for invoiceId:', invoiceId, 'userId:', userId);

    if (!invoiceId) {
      console.error('Missing invoiceId in request');
      return res.status(400).json({ success: false, message: 'Missing invoiceId' });
    }

    const invoice = await Invoice.findById(invoiceId).populate('buyer').populate('seller').populate('product').populate('bid');
    if (!invoice) {
      console.error('Invoice not found for ID:', invoiceId);
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    console.log('Invoice found:', { id: invoice._id, buyer: invoice.buyer?._id, status: invoice.status, totalAmount: invoice.totalAmount });

    if (invoice.buyer?._id?.toString() !== userId?.toString()) {
      console.error('Authorization failed. Invoice buyer:', invoice.buyer?._id, 'User ID:', userId);
      return res.status(403).json({ success: false, message: 'Not authorized to pay this invoice' });
    }

    if (invoice.status === 'paid') {
      console.log('Invoice already paid');
      return res.status(400).json({ success: false, message: 'Invoice already paid' });
    }

    // Convert PKR to USD (assuming totalAmount is in PKR)
    // PKR to USD conversion rate (approximate, update as needed)
    const PKR_TO_USD_RATE = 0.0036; // 1 PKR ≈ 0.0036 USD (278 PKR = 1 USD)
    
    // Invoice totalAmount is in PKR, convert to USD then to cents
    const amountInUSD = Number(invoice.totalAmount || 0) * PKR_TO_USD_RATE;
    const amountCents = Math.round(amountInUSD * 100);
    
    console.log('Amount conversion:', {
      originalPKR: invoice.totalAmount,
      convertedUSD: amountInUSD.toFixed(2),
      stripeCents: amountCents
    });

    // Validate amount is within Stripe limits
    if (amountCents > 99999999) { // $999,999.99 in cents
      console.error('Amount exceeds Stripe maximum limit');
      return res.status(400).json({ 
        success: false, 
        message: `Payment amount (${formatCurrency(amountInUSD, 'USD')}) exceeds Stripe's maximum limit of $999,999.99. Please contact support for large transactions.`
      });
    }

    if (amountCents < 50) { // Stripe minimum is $0.50
      console.error('Amount below Stripe minimum limit');
      return res.status(400).json({ 
        success: false, 
        message: 'Payment amount must be at least $0.50'
      });
    }

    console.log('Creating payment intent for amount:', amountCents, 'cents');

    let paymentIntent = null;
    if (invoice.paymentIntentId) {
      try {
        console.log('Checking existing payment intent:', invoice.paymentIntentId);
        const existingIntent = await stripe.paymentIntents.retrieve(invoice.paymentIntentId);
        console.log('Existing intent status:', existingIntent?.status);
        
        if (existingIntent?.status === 'succeeded') {
          invoice.status = 'paid';
          invoice.paidAt = new Date(existingIntent.created * 1000);
          await invoice.save();
          console.log('Invoice marked as paid from existing intent');
          return res.status(400).json({ success: false, message: 'Invoice already paid' });
        }

        if (existingIntent?.status !== 'canceled') {
          paymentIntent = existingIntent;
          console.log('Reusing existing payment intent');
        }
      } catch (intentError) {
        console.warn('Failed to retrieve existing payment intent:', intentError?.message);
      }
    }

    if (!paymentIntent) {
      console.log('Creating new payment intent with metadata:', {
        invoiceId: invoice._id.toString(),
        bidId: invoice.bid?._id?.toString() || invoice.bid?.toString(),
        buyerId: invoice.buyer?._id?.toString() || invoice.buyer?.toString(),
        sellerId: invoice.seller?._id?.toString() || invoice.seller?.toString()
      });
      
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: invoice.currency || 'usd',
        metadata: {
          invoiceId: invoice._id.toString(),
          bidId: invoice.bid?._id?.toString() || invoice.bid?.toString(),
          buyerId: invoice.buyer?._id?.toString() || invoice.buyer?.toString(),
          sellerId: invoice.seller?._id?.toString() || invoice.seller?.toString()
        }
      });
      
      console.log('Payment intent created successfully:', paymentIntent.id);
    }

    if (!invoice.paymentIntentId || invoice.paymentIntentId !== paymentIntent.id) {
      invoice.paymentIntentId = paymentIntent.id;
      await invoice.save();
      console.log('Payment intent ID saved to invoice');
    }

    console.log('Returning client secret to frontend');
    return res.json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('createInvoicePaymentIntent error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ success: false, message: 'Failed to create invoice payment intent', error: error.message });
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

// Manual webhook trigger for development (when real webhooks don't reach localhost)
export const processInvoicePayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user?.id || req.user?._id;

    const invoice = await Invoice.findById(invoiceId)
      .populate('buyer')
      .populate('seller')
      .populate('product')
      .populate('bid');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.buyer?._id?.toString() !== userId?.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Check if payment intent exists and is paid
    if (!invoice.paymentIntentId) {
      return res.status(400).json({ success: false, message: 'No payment intent found' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(invoice.paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ success: false, message: 'Payment not completed', status: paymentIntent.status });
    }

    // Payment succeeded, process the order
    if (invoice.status !== 'paid') {
      invoice.status = 'paid';
      invoice.paidAt = new Date();

      if (!invoice.order) {
        const bid = await Bid.findById(invoice.bid).populate('product');
        const product = bid?.product || await Product.findById(invoice.product);

        const orderPayload = {
          buyer: invoice.buyer._id,
          seller: invoice.seller._id,
          product: invoice.product,
          bid: invoice.bid,
          orderDetails: {
            quantity: invoice.quantity,
            unitPrice: invoice.unitPrice,
            totalAmount: invoice.subtotal,
            shippingCost: invoice.shippingCost || 0,
            finalAmount: invoice.totalAmount
          },
          payment: {
            method: 'stripe',
            status: 'paid',
            paidAt: new Date(),
            transactionId: paymentIntent.id
          },
          delivery: {
            method: 'pickup',
            estimatedDelivery: product?.shipping?.estimatedDelivery
              ? new Date(Date.now() + product.shipping.estimatedDelivery * 24 * 60 * 60 * 1000)
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        };

        console.log('Manual processing: Creating order with seller:', orderPayload.seller);
        const order = await Order.create(orderPayload);
        console.log('Manual processing: Order created with ID:', order._id);
        invoice.order = order._id;

        if (product) {
          await Product.findByIdAndUpdate(product._id, {
            isSold: true,
            soldTo: invoice.buyer._id,
            soldPrice: invoice.unitPrice,
            soldAt: new Date(),
            isActive: false
          });
        }

        if (bid) {
          bid.awaitingAction = undefined;
          await bid.save();
        }
      }

      await invoice.save();

      if (invoice.messageId) {
        await Message.findByIdAndUpdate(invoice.messageId, {
          $set: {
            'metadata.status': 'paid',
            'metadata.paidAt': new Date()
          }
        });
      }
    }

    // Push notifications: payment success and order creation
    try {
      const buyer = await User.findById(invoice.buyer).select('pushToken');
      const seller = await User.findById(invoice.seller).select('pushToken');
      if (buyer?.pushToken) {
        await sendPushToUsers([buyer], {
          title: 'Payment successful',
          body: `Your payment for invoice ${invoice.invoiceNumber} was successful`,
          data: { type: 'payment_success', invoiceId: String(invoice._id), orderId: String(invoice.order || '') }
        });
      }
      if (seller?.pushToken && invoice.order) {
        await sendPushToUsers([seller], {
          title: 'New order received',
          body: `A new order has been created from a paid invoice`,
          data: { type: 'order_created', orderId: String(invoice.order) }
        });
      }
    } catch (notifyErr) {
      console.warn('Push notify (manual payment) failed:', notifyErr?.message || notifyErr);
    }

    return res.json({ success: true, message: 'Invoice processed successfully', data: invoice });
  } catch (error) {
    console.error('processInvoicePayment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process payment', error: error.message });
  }
};

// Stripe webhook handler
export const stripeWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    if (webhookSecret) {
      // Production: verify webhook signature
      try {
        // req.rawBody is populated by express json verify middleware in index.js
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
      } catch (err) {
        console.error('⚠️  Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      // Development: skip signature verification if secret is not configured
      console.warn('⚠️  STRIPE_WEBHOOK_SECRET not set. Skipping webhook signature verification (development only).');
      event = req.body;
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

        const invoiceId = pi.metadata?.invoiceId;
        if (invoiceId) {
          console.log('Webhook: Processing invoice payment for invoiceId:', invoiceId);
          const invoice = await Invoice.findById(invoiceId);
          if (invoice && invoice.status !== 'paid') {
            console.log('Webhook: Invoice found. Buyer:', invoice.buyer, 'Seller:', invoice.seller);
            invoice.status = 'paid';
            invoice.paidAt = new Date();
            invoice.paymentIntentId = pi.id;

            // Create order after successful invoice payment if not already created
            if (!invoice.order) {
              const bid = await Bid.findById(invoice.bid).populate('product');
              const product = bid?.product || await Product.findById(invoice.product);

              const orderPayload = {
                buyer: invoice.buyer,
                seller: invoice.seller,
                product: invoice.product,
                bid: invoice.bid,
                orderDetails: {
                  quantity: invoice.quantity,
                  unitPrice: invoice.unitPrice,
                  totalAmount: invoice.subtotal,
                  shippingCost: invoice.shippingCost || 0,
                  finalAmount: invoice.totalAmount
                },
                payment: {
                  method: 'stripe',
                  status: 'paid',
                  paidAt: new Date(),
                  transactionId: pi.id
                },
                delivery: {
                  method: 'pickup',
                  estimatedDelivery: product?.shipping?.estimatedDelivery
                    ? new Date(Date.now() + product.shipping.estimatedDelivery * 24 * 60 * 60 * 1000)
                    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
              };

              console.log('Webhook: Creating order with seller:', orderPayload.seller);
              const order = await Order.create(orderPayload);
              console.log('Webhook: Order created with ID:', order._id, 'for seller:', order.seller);
              invoice.order = order._id;

              if (product) {
                await Product.findByIdAndUpdate(product._id, {
                  isSold: true,
                  soldTo: invoice.buyer,
                  soldPrice: invoice.unitPrice,
                  soldAt: new Date(),
                  isActive: false
                });
              }

              if (bid) {
                bid.awaitingAction = undefined;
                await bid.save();
              }
            }

            await invoice.save();

            // Push notifications via webhook: payment success and order creation
            try {
              const buyer = await User.findById(invoice.buyer).select('pushToken');
              const seller = await User.findById(invoice.seller).select('pushToken');
              if (buyer?.pushToken) {
                await sendPushToUsers([buyer], {
                  title: 'Payment successful',
                  body: `Your payment for invoice ${invoice.invoiceNumber} was successful`,
                  data: { type: 'payment_success', invoiceId: String(invoice._id), orderId: String(invoice.order || '') }
                });
              }
              if (seller?.pushToken && invoice.order) {
                await sendPushToUsers([seller], {
                  title: 'New order received',
                  body: `A new order has been created from a paid invoice`,
                  data: { type: 'order_created', orderId: String(invoice.order) }
                });
              }
            } catch (notifyErr) {
              console.warn('Push notify (webhook payment) failed:', notifyErr?.message || notifyErr);
            }

            if (invoice.messageId) {
              await Message.findByIdAndUpdate(invoice.messageId, {
                $set: {
                  'metadata.status': 'paid',
                  'metadata.paidAt': new Date()
                }
              });
            }
          }
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
        const invoiceId = pi.metadata?.invoiceId;
        if (invoiceId) {
          await Invoice.findByIdAndUpdate(invoiceId, {
            status: 'sent',
            paymentIntentId: pi.id
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
