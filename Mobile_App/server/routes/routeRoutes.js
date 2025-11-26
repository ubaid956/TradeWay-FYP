// Route Optimization Routes
// Handles route optimization using Google Maps API

import express from 'express';
import { protect } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * @route   POST /api/routes/optimize
 * @desc    Get optimized routes with AI suggestions
 * @access  Private
 */
router.post('/optimize', protect, async (req, res) => {
  try {
    const { origin, destination, vehicleType = 'truck', avoidTolls = true } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ message: 'Origin and destination are required' });
    }

    // Generate multiple route options
    const routes = [];

    // Route 1: Fastest route (highways allowed, tolls allowed)
    try {
      const fastestRoute = await getGoogleDirections(
        origin,
        destination,
        { avoidTolls: false, avoidHighways: false }
      );
      if (fastestRoute) {
        routes.push({
          id: 'route_fastest',
          name: 'Fastest Route',
          ...fastestRoute,
          recommendation: 'fastest',
          aiScore: 95,
          truckFriendly: true,
          traffic: 'low',
        });
      }
    } catch (error) {
      console.error('Error fetching fastest route:', error);
    }

    // Route 2: Cheapest route (avoid tolls)
    try {
      const cheapestRoute = await getGoogleDirections(
        origin,
        destination,
        { avoidTolls: true, avoidHighways: false }
      );
      if (cheapestRoute) {
        // Calculate savings
        const savings = routes.length > 0 ? {
          cost: routes[0].estimatedCost - cheapestRoute.estimatedCost,
          time: (cheapestRoute.duration - routes[0].duration) / 60, // minutes
          distance: cheapestRoute.distance - routes[0].distance,
        } : undefined;

        routes.push({
          id: 'route_cheapest',
          name: 'Cheapest Route (No Tolls)',
          ...cheapestRoute,
          recommendation: 'cheapest',
          aiScore: 82,
          truckFriendly: true,
          traffic: 'medium',
          savings,
          warnings: ['May have longer travel time'],
        });
      }
    } catch (error) {
      console.error('Error fetching cheapest route:', error);
    }

    // Route 3: Balanced route
    try {
      const balancedRoute = await getGoogleDirections(
        origin,
        destination,
        { avoidTolls: false, avoidHighways: false },
        true // Alternative route
      );
      if (balancedRoute) {
        routes.push({
          id: 'route_balanced',
          name: 'Balanced Route',
          ...balancedRoute,
          recommendation: 'balanced',
          aiScore: 88,
          truckFriendly: true,
          traffic: 'low',
        });
      }
    } catch (error) {
      console.error('Error fetching balanced route:', error);
    }

    if (routes.length === 0) {
      return res.status(500).json({ message: 'Unable to calculate routes' });
    }

    res.json({
      success: true,
      count: routes.length,
      routes,
    });
  } catch (error) {
    console.error('Error optimizing routes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get directions from Google Maps API
 */
async function getGoogleDirections(origin, destination, options = {}, alternative = false) {
  try {
    const params = {
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      key: GOOGLE_MAPS_API_KEY,
      mode: 'driving',
      alternatives: alternative,
      units: 'metric',
    };

    if (options.avoidTolls) {
      params.avoid = 'tolls';
    }
    if (options.avoidHighways) {
      params.avoid = params.avoid ? `${params.avoid}|highways` : 'highways';
    }

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/directions/json',
      { params }
    );

    if (response.data.status !== 'OK') {
      console.error('Google Maps API error:', response.data.status);
      return null;
    }

    const route = response.data.routes[0];
    if (!route) return null;

    const leg = route.legs[0];
    const distanceKm = leg.distance.value / 1000;
    const durationSec = leg.duration.value;

    // Calculate estimated cost (simplified calculation)
    const fuelCostPerKm = 15; // PKR per km
    const tollCost = options.avoidTolls ? 0 : 2000; // PKR
    const driverCost = (durationSec / 3600) * 500; // PKR per hour
    const estimatedCost = Math.round(
      distanceKm * fuelCostPerKm + tollCost + driverCost
    );

    // Extract waypoints
    const waypoints = [
      {
        location: origin,
        type: 'origin',
        name: leg.start_address,
        address: leg.start_address,
      },
      {
        location: destination,
        type: 'destination',
        name: leg.end_address,
        address: leg.end_address,
      },
    ];

    return {
      distance: distanceKm,
      duration: durationSec,
      estimatedCost,
      waypoints,
      polyline: route.overview_polyline.points,
      avoidsTolls: options.avoidTolls || false,
      avoidsHighways: options.avoidHighways || false,
    };
  } catch (error) {
    console.error('Error calling Google Maps API:', error);
    return null;
  }
}

/**
 * @route   GET /api/routes/distance
 * @desc    Calculate distance between two points
 * @access  Private
 */
router.post('/distance', protect, async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ message: 'Origin and destination are required' });
    }

    const params = {
      origins: `${origin.latitude},${origin.longitude}`,
      destinations: `${destination.latitude},${destination.longitude}`,
      key: GOOGLE_MAPS_API_KEY,
      mode: 'driving',
      units: 'metric',
    };

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/distancematrix/json',
      { params }
    );

    if (response.data.status !== 'OK') {
      return res.status(500).json({ message: 'Failed to calculate distance' });
    }

    const element = response.data.rows[0].elements[0];
    
    if (element.status !== 'OK') {
      return res.status(400).json({ message: 'Route not found' });
    }

    res.json({
      success: true,
      distance: element.distance.value / 1000, // km
      duration: element.duration.value, // seconds
      distanceText: element.distance.text,
      durationText: element.duration.text,
    });
  } catch (error) {
    console.error('Error calculating distance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/routes/geocode
 * @desc    Convert address to coordinates
 * @access  Private
 */
router.post('/geocode', protect, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    const params = {
      address,
      key: GOOGLE_MAPS_API_KEY,
    };

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      { params }
    );

    if (response.data.status !== 'OK') {
      return res.status(400).json({ message: 'Address not found' });
    }

    const result = response.data.results[0];
    const location = result.geometry.location;

    res.json({
      success: true,
      location: {
        latitude: location.lat,
        longitude: location.lng,
      },
      formattedAddress: result.formatted_address,
    });
  } catch (error) {
    console.error('Error geocoding address:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
