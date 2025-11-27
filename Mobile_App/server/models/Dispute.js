import mongoose from 'mongoose';

const DisputeSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  reason: { type: String, required: true },
  status: { type: String, enum: ['open', 'resolved', 'closed'], default: 'open', index: true },
  messagesCount: { type: Number, default: 0 },
}, { timestamps: true });

DisputeSchema.index({ orderId: 1, status: 1 });

export default mongoose.model('Dispute', DisputeSchema);
