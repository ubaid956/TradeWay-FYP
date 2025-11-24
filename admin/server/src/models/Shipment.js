import mongoose from 'mongoose';

const shipmentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Types.ObjectId, ref: 'Order', index: true },
  driverId: { type: mongoose.Types.ObjectId, ref: 'User', index: true },
  status: { type: String, enum: ['open','assigned','in_transit','delivered'], default: 'open', index: true },
  routeDistanceKm: Number
}, { timestamps: true });

export default mongoose.model('Shipment', shipmentSchema);
