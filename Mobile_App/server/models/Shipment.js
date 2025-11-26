// Shipment Model
// MongoDB schema for shipment tracking

import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
});

const shipmentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  vehicleNumber: {
    type: String,
    required: true,
  },
  origin: {
    address: { type: String, required: true },
    location: locationSchema,
    name: String,
  },
  destination: {
    address: { type: String, required: true },
    location: locationSchema,
    name: String,
  },
  currentLocation: locationSchema,
  lastLocationUpdate: Date,
  pickupTime: Date,
  estimatedDeliveryTime: {
    type: Date,
    required: true,
  },
  actualDeliveryTime: Date,
  status: {
    type: String,
    enum: ['pending', 'picked_up', 'in_transit', 'delivered', 'delayed', 'cancelled'],
    default: 'pending',
  },
  statusHistory: [
    {
      status: {
        type: String,
        required: true,
      },
      message: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  distance: Number, // in kilometers
  items: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      weight: Number, // in kg
    },
  ],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create geospatial indexes
shipmentSchema.index({ 'origin.location': '2dsphere' });
shipmentSchema.index({ 'destination.location': '2dsphere' });
shipmentSchema.index({ currentLocation: '2dsphere' });

// Update timestamp on save
shipmentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Shipment', shipmentSchema);
