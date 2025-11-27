import Dispute from '../models/Dispute.js';
import Order from '../models/Order.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { sendPushToUsers } from '../utils/push.js';

// Create a dispute for an order and open a group chat with buyer, vendor, and admins
export const createDispute = async (req, res, next) => {
  try {
    const { orderId, reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!orderId || !reason) {
      return res.status(400).json({ message: 'orderId and reason are required' });
    }

  // Order schema uses 'buyer' and 'seller' (not buyerId/vendorId)
  const order = await Order.findById(orderId).populate('buyer seller');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only the buyer (or admin) can raise a dispute
    const buyerId = order.buyer?._id || order.buyer;
    const vendorId = order.seller?._id || order.seller;
    if (userRole !== 'admin') {
      if (String(userId) !== String(buyerId)) {
        return res.status(403).json({ message: 'Only the buyer can raise a dispute for this order' });
      }
    }

    // Prevent multiple open disputes on same order
    const existingOpen = await Dispute.findOne({ orderId, status: 'open' });
    if (existingOpen) {
      return res.status(409).json({ message: 'An open dispute already exists for this order', disputeId: existingOpen._id });
    }

    // Determine participants: buyer, vendor, and all admins
  // buyerId and vendorId resolved above
    const admins = await User.find({ role: 'admin' }, '_id');
    const participantIds = [buyerId, vendorId, ...admins.map(a => a._id)];

    // Create a group for dispute chat
    const group = await Group.create({
      name: `Dispute: ${order.orderNumber || order._id.toString().slice(-6)}`,
      members: participantIds,
      type: 'dispute',
      createdBy: userId,
    });

    const dispute = await Dispute.create({
      orderId,
      createdBy: userId,
      buyerId,
      vendorId,
      groupId: group._id,
      reason,
      status: 'open',
    });

    // Notify vendor and admins about the dispute
    try {
      const vendorUser = await User.findById(vendorId).select('pushToken');
      const adminUsers = await User.find({ role: 'admin' }).select('pushToken');
      const targets = [vendorUser, ...adminUsers].filter(u => u?.pushToken);
      if (targets.length) {
        await sendPushToUsers(targets, {
          title: 'New dispute opened',
          body: `A dispute has been opened for order ${order.orderNumber || order._id.toString().slice(-6)}`,
          data: { type: 'dispute_created', disputeId: String(dispute._id), groupId: String(group._id), orderId: String(order._id) }
        });
      }
    } catch (notifyErr) {
      console.warn('Push notify (dispute create) failed:', notifyErr?.message || notifyErr);
    }

    return res.status(201).json({ success: true, dispute });
  } catch (error) {
    next(error);
  }
};

// List disputes for current user (buyer or vendor or admin)
export const listMyDisputes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const disputes = await Dispute.find({
      $or: [{ buyerId: userId }, { vendorId: userId }, { createdBy: userId }]
    })
      .populate('orderId', 'orderNumber status')
      .populate('groupId', 'name');

    return res.json({ success: true, disputes });
  } catch (error) {
    next(error);
  }
};

export const getDisputeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dispute = await Dispute.findById(id)
      .populate('orderId', 'orderNumber status')
      .populate('buyerId', 'name email')
      .populate('vendorId', 'name email')
      .populate('groupId');

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    return res.json({ success: true, dispute });
  } catch (error) {
    next(error);
  }
};

export const updateDisputeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const dispute = await Dispute.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    return res.json({ success: true, dispute });
  } catch (error) {
    next(error);
  }
};
