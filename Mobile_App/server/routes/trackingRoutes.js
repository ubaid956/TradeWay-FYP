// Tracking Routes
// Handles driver location updates and shipment tracking

import express from 'express';
import { protect, requireRoles } from '../middleware/auth.js';
import Shipment from '../models/Shipment.js';
import DriverLocation from '../models/DriverLocation.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * @route   POST /api/tracking/location
 * @desc    Update driver location
 * @access  Private (Driver only)
 */
router.post('/location', protect, async (req, res) => {
  try {
    const { shipmentId, location, speed, heading, accuracy } = req.body;

    // Verify user is a driver
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'driver') {
      return res.status(403).json({ message: 'Access denied. Driver only.' });
    }

    // Verify shipment exists and belongs to this driver
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    if (shipment.driverId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized for this shipment' });
    }

    // Create or update driver location
    const locationData = {
      driverId: req.user.id,
      shipmentId,
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      },
      speed: speed || 0,
      heading: heading || 0,
      accuracy: accuracy || 0,
      timestamp: new Date(),
    };

    const driverLocation = await DriverLocation.findOneAndUpdate(
      { driverId: req.user.id, shipmentId },
      locationData,
      { upsert: true, new: true }
    );

    // Update shipment current location
    shipment.currentLocation = {
      type: 'Point',
      coordinates: [location.longitude, location.latitude],
    };
    shipment.lastLocationUpdate = new Date();
    await shipment.save();

    res.json({
      success: true,
      location: driverLocation,
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/tracking/location/:shipmentId
 * @desc    Get current driver location for a shipment
 * @access  Private
 */
router.get('/location/:shipmentId', protect, async (req, res) => {
  try {
    const { shipmentId } = req.params;

    const driverLocation = await DriverLocation.findOne({ shipmentId })
      .sort({ timestamp: -1 })
      .populate('driverId', 'name phone');

    if (!driverLocation) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.json({
      success: true,
      location: {
        latitude: driverLocation.location.coordinates[1],
        longitude: driverLocation.location.coordinates[0],
        speed: driverLocation.speed,
        heading: driverLocation.heading,
        accuracy: driverLocation.accuracy,
        timestamp: driverLocation.timestamp,
        driver: driverLocation.driverId,
      },
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/tracking/history/:shipmentId
 * @desc    Get location history for a shipment
 * @access  Private
 */
router.get('/history/:shipmentId', protect, async (req, res) => {
  try {
    const { shipmentId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

    const query = { shipmentId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const locationHistory = await DriverLocation.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    const formattedHistory = locationHistory.map(loc => ({
      latitude: loc.location.coordinates[1],
      longitude: loc.location.coordinates[0],
      speed: loc.speed,
      heading: loc.heading,
      timestamp: loc.timestamp,
    }));

    res.json({
      success: true,
      count: formattedHistory.length,
      history: formattedHistory,
    });
  } catch (error) {
    console.error('Error fetching location history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/tracking/shipment/:shipmentId
 * @desc    Get complete shipment tracking details
 * @access  Private
 */
router.get('/shipment/:shipmentId', protect, async (req, res) => {
  try {
    const { shipmentId } = req.params;

    const shipment = await Shipment.findById(shipmentId)
      .populate('driverId', 'name phone')
      .populate('orderId');

    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    // Get latest driver location
    const driverLocation = await DriverLocation.findOne({ shipmentId })
      .sort({ timestamp: -1 });

    const response = {
      success: true,
      shipment: {
        id: shipment._id,
        orderId: shipment.orderId,
        driverId: shipment.driverId._id,
        driverName: shipment.driverId.name,
        driverPhone: shipment.driverId.phone,
        vehicleNumber: shipment.vehicleNumber,
        origin: shipment.origin,
        destination: shipment.destination,
        pickupTime: shipment.pickupTime,
        estimatedDeliveryTime: shipment.estimatedDeliveryTime,
        actualDeliveryTime: shipment.actualDeliveryTime,
        currentStatus: shipment.status,
        statusHistory: shipment.statusHistory,
        distance: shipment.distance,
        items: shipment.items,
        currentLocation: driverLocation ? {
          latitude: driverLocation.location.coordinates[1],
          longitude: driverLocation.location.coordinates[0],
          speed: driverLocation.speed,
          timestamp: driverLocation.timestamp,
        } : null,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching shipment details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/tracking/status
 * @desc    Update shipment status
 * @access  Private (Driver only)
 */
router.post('/status', protect, async (req, res) => {
  try {
    const { shipmentId, status, message } = req.body;

    // Verify user is a driver
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'driver') {
      return res.status(403).json({ message: 'Access denied. Driver only.' });
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    if (shipment.driverId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized for this shipment' });
    }

    // Update status
    shipment.status = status;
    shipment.statusHistory.push({
      status,
      message: message || `Status updated to ${status}`,
      timestamp: new Date(),
    });

    if (status === 'delivered') {
      shipment.actualDeliveryTime = new Date();
    }

    await shipment.save();

    res.json({
      success: true,
      shipment,
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
