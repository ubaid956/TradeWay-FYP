import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  productId: { type: mongoose.Types.ObjectId, ref: 'Product', index: true },
  buyerId:   { type: mongoose.Types.ObjectId, ref: 'User', index: true },
  sellerId:  { type: mongoose.Types.ObjectId, ref: 'User', index: true },
  quantity: Number,
  unitPrice: Number, // locked-in price at order time
  status: { type: String, enum: ['placed','confirmed','cancelled','delivered'], default: 'placed', index: true },
  originRegion: String,      // optional: for regional analytics
  destinationRegion: String  // optional
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
