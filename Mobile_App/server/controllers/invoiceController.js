import Invoice from '../models/Invoice.js';
import Bid from '../models/Bid.js';
import Message from '../models/Message.js';

export const createInvoiceFromBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { notes } = req.body || {};
    const sellerId = (req.user?._id || req.user?.id || '').toString();

    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Not authorized to create invoice' });
    }

    const bid = await Bid.findById(bidId)
      .populate('product')
      .populate('bidder');

    if (!bid) {
      return res.status(404).json({ success: false, message: 'Bid not found' });
    }

    if (!bid.product) {
      return res.status(400).json({ success: false, message: 'Bid product not available' });
    }

    if (bid.product.seller.toString() !== sellerId) {
      return res.status(403).json({ success: false, message: 'Not authorized to invoice this bid' });
    }

    if (bid.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Only accepted bids can be invoiced' });
    }

    let existingInvoice = null;

    if (bid.invoice) {
      const referencedInvoice = await Invoice.findById(bid.invoice);
      if (referencedInvoice && ['sent', 'paid'].includes(referencedInvoice.status)) {
        existingInvoice = referencedInvoice;
      } else if (!referencedInvoice || referencedInvoice.status === 'cancelled') {
        bid.invoice = null;
      }
    }

    if (!existingInvoice) {
      existingInvoice = await Invoice.findOne({ bid: bidId, status: { $in: ['sent', 'paid'] } });
    }

    if (existingInvoice) {
      return res.status(400).json({ success: false, message: 'Invoice already sent for this bid', data: existingInvoice });
    }

    const quantity = bid.agreement?.quantity || bid.quantity || 1;
    const unitPrice = bid.agreement?.amount || bid.bidAmount || 0;
    const subtotal = Number(unitPrice) * Number(quantity);
    const shippingCost = bid.product.shipping?.shippingCost ? Number(bid.product.shipping.shippingCost) : 0;
    const totalAmount = subtotal + shippingCost;

    const invoice = new Invoice({
      bid: bid._id,
      buyer: bid.bidder,
      seller: bid.product.seller,
      product: bid.product._id,
      quantity,
      unitPrice,
      subtotal,
      shippingCost,
      totalAmount,
      notes: notes || undefined,
      metadata: {
        productTitle: bid.product.title,
      }
    });

    await invoice.save();

    const messageMetadata = {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      totalAmount,
      currency: invoice.currency,
      productTitle: bid.product.title,
      quantity,
      unitPrice,
      subtotal,
      shippingCost,
      bidId: bid._id,
      sellerId,
      buyerId: bid.bidder?._id?.toString() || bid.bidder?.toString(),
    };

    const message = await Message.create({
      sender: sellerId,
      recipient: bid.bidder?._id || bid.bidder,
      text: `Invoice ${invoice.invoiceNumber} for ${bid.product.title}`,
      type: 'invoice',
      metadata: messageMetadata,
      isPrivate: true
    });

    invoice.messageId = message._id;
    await invoice.save();

  bid.awaitingAction = 'buyer';
  bid.invoice = invoice._id;
    await bid.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('buyer', 'name email phone pic')
      .populate('seller', 'name email phone pic')
      .populate('product', 'title price images');

    const populatedMessage = await Message.populate(message, {
      path: 'sender recipient',
      select: 'name pic'
    });

    return res.status(201).json({
      success: true,
      message: 'Invoice sent to buyer successfully',
      data: {
        invoice: populatedInvoice,
        message: populatedMessage
      }
    });
  } catch (error) {
    console.error('createInvoiceFromBid error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create invoice', error: error.message });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user._id || req.user.id;

    const invoice = await Invoice.findById(invoiceId)
      .populate('buyer', 'name email phone pic')
      .populate('seller', 'name email phone pic')
      .populate('product', 'title price images')
      .populate('bid');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const isBuyer = invoice.buyer?._id?.toString() === userId.toString();
    const isSeller = invoice.seller?._id?.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this invoice' });
    }

    return res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('getInvoiceById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch invoice', error: error.message });
  }
};
