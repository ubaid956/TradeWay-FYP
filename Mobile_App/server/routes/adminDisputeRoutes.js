import express from 'express';
import { protect, requireRoles } from '../middleware/auth.js';
import Dispute from '../models/Dispute.js';
import Message from '../models/Message.js';

const router = express.Router();

// Admin: Get all disputes
router.get('/', protect, requireRoles('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (status && ['open', 'resolved', 'closed'].includes(status)) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .populate('orderId', 'orderNumber status totalAmount')
        .populate('buyerId', 'name email pic')
        .populate('vendorId', 'name email pic')
        .populate('createdBy', 'name email')
        .populate('groupId', 'name members')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Dispute.countDocuments(query)
    ]);

    return res.json({
      success: true,
      disputes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get disputes error:', error);
    return res.status(500).json({ message: 'Failed to fetch disputes' });
  }
});

// Admin: Get dispute details
router.get('/:id', protect, requireRoles('admin'), async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('orderId', 'orderNumber status totalAmount')
      .populate('buyerId', 'name email pic phone')
      .populate('vendorId', 'name email pic phone')
      .populate('createdBy', 'name email')
      .populate('groupId', 'name members');

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    return res.json({ success: true, dispute });
  } catch (error) {
    console.error('Admin get dispute error:', error);
    return res.status(500).json({ message: 'Failed to fetch dispute' });
  }
});

// Admin: Update dispute status
router.patch('/:id/status', protect, requireRoles('admin'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['open', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('orderId', 'orderNumber status')
      .populate('buyerId', 'name email')
      .populate('vendorId', 'name email')
      .populate('groupId');

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Post a system message to the dispute group when resolved/closed
    let messageDoc = null;
    if (['resolved', 'closed'].includes(status) && dispute.groupId) {
      try {
        const text = status === 'resolved'
          ? 'Dispute Resolved Successfully'
          : 'Dispute Closed Successfully';
        messageDoc = await Message.create({
          sender: req.user._id, // admin performing action
          group: dispute.groupId._id || dispute.groupId,
          text,
          type: 'text'
        });
        // minimal populate sender name for client display
        messageDoc = await Message.populate(messageDoc, { path: 'sender', select: 'name email' });
      } catch (e) {
        console.error('Failed to create system message for dispute status change:', e);
      }
    }

    return res.json({ success: true, dispute, message: messageDoc });
  } catch (error) {
    console.error('Admin update dispute status error:', error);
    return res.status(500).json({ message: 'Failed to update dispute' });
  }
});

export default router;
