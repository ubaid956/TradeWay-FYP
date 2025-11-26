// Location Tracking Service
// Handles real-time location updates, tracking, and GPS management

import * as Location from 'expo-location';
import { LocationWithTimestamp, DriverLocation } from '../types/shipment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiConfig } from '../config/api';
import axios from 'axios';

class LocationTrackingService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private isTracking: boolean = false;
  private currentShipmentId: string | null = null;
  private updateInterval: number = 5000; // 5 seconds

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.warn('Foreground location permission not granted');
        return false;
      }

      // Request background location for tracking while app is in background
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission not granted');
        // Still return true as foreground is enough for basic tracking
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Check if location services are enabled
   */
  async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  /**
   * Get current location once
   */
  async getCurrentLocation(): Promise<LocationWithTimestamp | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(location.timestamp),
        speed: location.coords.speed || undefined,
        heading: location.coords.heading || undefined,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Start tracking location for a shipment
   */
  async startTracking(shipmentId: string): Promise<boolean> {
    try {
      if (this.isTracking) {
        console.warn('Already tracking location');
        return false;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission not granted');
      }

      this.currentShipmentId = shipmentId;
      this.isTracking = true;

      // Start watching location
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: this.updateInterval,
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      // Store tracking status
      await AsyncStorage.setItem('tracking_active', 'true');
      await AsyncStorage.setItem('tracking_shipment_id', shipmentId);

      console.log(`Started tracking for shipment ${shipmentId}`);
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      this.isTracking = false;
      return false;
    }
  }

  /**
   * Stop tracking location
   */
  async stopTracking(): Promise<void> {
    try {
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      this.isTracking = false;
      this.currentShipmentId = null;

      // Clear tracking status
      await AsyncStorage.removeItem('tracking_active');
      await AsyncStorage.removeItem('tracking_shipment_id');

      console.log('Stopped location tracking');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  /**
   * Handle location updates
   */
  private async handleLocationUpdate(location: Location.LocationObject): Promise<void> {
    try {
      if (!this.currentShipmentId) {
        return;
      }

      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      if (!token || !userId) {
        console.warn('No auth token or user ID found');
        console.warn('Token:', !!token, 'UserId:', !!userId);
        return;
      }

      const driverLocation: DriverLocation = {
        driverId: userId,
        shipmentId: this.currentShipmentId,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        timestamp: new Date(location.timestamp),
        speed: location.coords.speed || 0,
        heading: location.coords.heading || 0,
        accuracy: location.coords.accuracy || 0,
      };

      // Send location to backend
      await this.sendLocationToBackend(driverLocation, token);

      // Store locally for offline support
      await this.storeLocationLocally(driverLocation);
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  /**
   * Send location data to backend
   */
  private async sendLocationToBackend(
    location: DriverLocation,
    token: string
  ): Promise<void> {
    try {
      await axios.post(
        `${apiConfig.baseURL}/tracking/location`,
        location,
        {
          headers: {
            ...apiConfig.headers,
            Authorization: `Bearer ${token}`,
          },
          timeout: apiConfig.timeout,
        }
      );
    } catch (error) {
      console.error('Error sending location to backend:', error);
      // Don't throw - we'll retry on next update
    }
  }

  /**
   * Store location locally for offline support
   */
  private async storeLocationLocally(location: DriverLocation): Promise<void> {
    try {
      const key = `location_${this.currentShipmentId}_${Date.now()}`;
      await AsyncStorage.setItem(key, JSON.stringify(location));
    } catch (error) {
      console.error('Error storing location locally:', error);
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get tracking status
   */
  getTrackingStatus(): { isTracking: boolean; shipmentId: string | null } {
    return {
      isTracking: this.isTracking,
      shipmentId: this.currentShipmentId,
    };
  }

  /**
   * Resume tracking from saved state (after app restart)
   */
  async resumeTracking(): Promise<boolean> {
    try {
      const isTrackingActive = await AsyncStorage.getItem('tracking_active');
      const shipmentId = await AsyncStorage.getItem('tracking_shipment_id');

      if (isTrackingActive === 'true' && shipmentId) {
        return await this.startTracking(shipmentId);
      }

      return false;
    } catch (error) {
      console.error('Error resuming tracking:', error);
      return false;
    }
  }
}

// Export singleton instance
export const locationTrackingService = new LocationTrackingService();
