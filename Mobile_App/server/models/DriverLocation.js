// Driver Location Model
// MongoDB schema for tracking driver locations

import mongoose from 'mongoose';

const driverLocationSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  shipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  speed: {
    type: Number, // km/h
    default: 0,
  },
  heading: {
    type: Number, // degrees (0-360)
    default: 0,
  },
  accuracy: {
    type: Number, // meters
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create geospatial index
driverLocationSchema.index({ location: '2dsphere' });

// Create compound index for efficient queries
driverLocationSchema.index({ driverId: 1, shipmentId: 1, timestamp: -1 });

// TTL index to automatically delete old location data after 30 days
driverLocationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model('DriverLocation', driverLocationSchema);
