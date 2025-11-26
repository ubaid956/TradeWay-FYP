import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';
import { useLocalSearchParams } from 'expo-router';
import { GOOGLE_MAPS_CONFIG, MARKER_COLORS } from '@/src/config/maps';
import { locationTrackingService } from '@/src/services/locationTrackingService';
import { Shipment, LocationWithTimestamp } from '@/src/types/shipment';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { apiConfig } from '@/src/config/api';

const { width, height } = Dimensions.get('window');

export default function TrackingDetail() {
  const params = useLocalSearchParams();
  const shipmentId = (params as any).shipmentId || 'unknown';
  const mapRef = useRef<MapView>(null);

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [driverLocation, setDriverLocation] = useState<LocationWithTimestamp | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // Fetch shipment details
  useEffect(() => {
    fetchShipmentDetails();
    const interval = setInterval(fetchShipmentDetails, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [shipmentId]);

  // Start location tracking for driver
  useEffect(() => {
    initializeTracking();
    return () => {
      locationTrackingService.stopTracking();
    };
  }, []);

  // Update driver location periodically
  useEffect(() => {
    const locationInterval = setInterval(async () => {
      const location = await locationTrackingService.getCurrentLocation();
      if (location) {
        setDriverLocation(location);
      }
    }, GOOGLE_MAPS_CONFIG.locationUpdateInterval);

    return () => clearInterval(locationInterval);
  }, []);

  const fetchShipmentDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found');
        return;
      }

      console.log('Fetching shipment details for ID:', shipmentId);

      const response = await axios.get(
        `${apiConfig.baseURL}/tracking/shipment/${shipmentId}`,
        {
          headers: {
            ...apiConfig.headers,
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Shipment details received:', response.data);
      
      // Transform backend GeoJSON format to frontend Location format
      const backendShipment = response.data.shipment;
      const transformedShipment: Shipment = {
        id: backendShipment.id,
        orderId: backendShipment.orderId,
        driverId: backendShipment.driverId,
        driverName: backendShipment.driverName,
        driverPhone: backendShipment.driverPhone,
        vehicleNumber: backendShipment.vehicleNumber,
        origin: {
          address: backendShipment.origin.address,
          location: {
            latitude: backendShipment.origin.location.coordinates[1],
            longitude: backendShipment.origin.location.coordinates[0],
          },
          name: backendShipment.origin.name,
        },
        destination: {
          address: backendShipment.destination.address,
          location: {
            latitude: backendShipment.destination.location.coordinates[1],
            longitude: backendShipment.destination.location.coordinates[0],
          },
          name: backendShipment.destination.name,
        },
        pickupTime: backendShipment.pickupTime ? new Date(backendShipment.pickupTime) : undefined,
        estimatedDeliveryTime: new Date(backendShipment.estimatedDeliveryTime),
        actualDeliveryTime: backendShipment.actualDeliveryTime ? new Date(backendShipment.actualDeliveryTime) : undefined,
        currentStatus: {
          id: backendShipment.id,
          status: backendShipment.currentStatus,
          message: backendShipment.statusHistory?.[backendShipment.statusHistory.length - 1]?.message || 'In transit',
          lastUpdate: new Date(),
        },
        statusHistory: backendShipment.statusHistory || [],
        distance: backendShipment.distance,
        items: backendShipment.items || [],
      };

      // Transform current location if exists
      if (backendShipment.currentLocation) {
        setDriverLocation({
          latitude: backendShipment.currentLocation.latitude,
          longitude: backendShipment.currentLocation.longitude,
          timestamp: new Date(backendShipment.currentLocation.timestamp),
          speed: backendShipment.currentLocation.speed,
        });
      }

      setShipment(transformedShipment);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching shipment details:', error);
      console.error('Error response:', error.response?.data);
      console.error('Shipment ID attempted:', shipmentId);
      // Use mock data for demonstration
      setShipment(getMockShipment());
      setLoading(false);
    }
  };

  const initializeTracking = async () => {
    const hasPermission = await locationTrackingService.requestPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Location Permission Required',
        'Please enable location services to track your shipment.'
      );
      return;
    }

    const started = await locationTrackingService.startTracking(shipmentId);
    setIsTracking(started);

    // Get initial location
    const location = await locationTrackingService.getCurrentLocation();
    if (location) {
      setDriverLocation(location);
    }
  };

  const handleStartTracking = async () => {
    const started = await locationTrackingService.startTracking(shipmentId);
    if (started) {
      setIsTracking(true);
      Alert.alert('Success', 'Location tracking started');
    } else {
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const handleStopTracking = async () => {
    await locationTrackingService.stopTracking();
    setIsTracking(false);
    Alert.alert('Success', 'Location tracking stopped');
  };

  const centerMapOnDriver = () => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const fitMapToRoute = () => {
    if (shipment && mapRef.current) {
      const coordinates = [
        shipment.origin.location,
        ...(driverLocation ? [driverLocation] : []),
        shipment.destination.location,
      ];

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const calculateProgress = (): number => {
    if (!shipment || !driverLocation) return 0;

    const totalDistance = locationTrackingService.calculateDistance(
      shipment.origin.location.latitude,
      shipment.origin.location.longitude,
      shipment.destination.location.latitude,
      shipment.destination.location.longitude
    );

    const remainingDistance = locationTrackingService.calculateDistance(
      driverLocation.latitude,
      driverLocation.longitude,
      shipment.destination.location.latitude,
      shipment.destination.location.longitude
    );

    return Math.max(0, Math.min(100, ((totalDistance - remainingDistance) / totalDistance) * 100));
  };

  const formatETA = (): string => {
    if (!shipment) return 'N/A';
    const now = new Date();
    const eta = new Date(shipment.estimatedDeliveryTime);
    const diff = eta.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0758C2" />
        <Text style={styles.loadingText}>Loading shipment details...</Text>
      </View>
    );
  }

  if (!shipment) {
    return (
      <View style={[globalStyles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Shipment not found</Text>
      </View>
    );
  }

  // Validate location data
  if (!shipment.origin?.location?.latitude || !shipment.origin?.location?.longitude ||
      !shipment.destination?.location?.latitude || !shipment.destination?.location?.longitude) {
    return (
      <View style={[globalStyles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Invalid shipment location data</Text>
      </View>
    );
  }

  const progress = calculateProgress();

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title={`Shipment ${shipmentId}`} placeholder="" orders={false} profile={true} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Map View */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: shipment.origin.location.latitude,
              longitude: shipment.origin.location.longitude,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5,
            }}
            onMapReady={() => {
              setMapReady(true);
              setTimeout(fitMapToRoute, 500);
            }}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsTraffic={true}
          >
            {/* Origin Marker */}
            <Marker
              coordinate={shipment.origin.location}
              title="Pickup Location"
              description={shipment.origin.address}
              pinColor={MARKER_COLORS.origin}
            />

            {/* Destination Marker */}
            <Marker
              coordinate={shipment.destination.location}
              title="Delivery Location"
              description={shipment.destination.address}
              pinColor={MARKER_COLORS.destination}
            />

            {/* Driver Location Marker */}
            {driverLocation && (
              <Marker
                coordinate={driverLocation}
                title="Driver Location"
                description={`Speed: ${driverLocation.speed?.toFixed(1) || 0} km/h`}
              >
                <View style={styles.driverMarker}>
                  <Ionicons name="car" size={24} color="#fff" />
                </View>
              </Marker>
            )}

            {/* Route Directions */}
            {mapReady && (
              <MapViewDirections
                origin={shipment.origin.location}
                destination={shipment.destination.location}
                apikey={GOOGLE_MAPS_CONFIG.apiKey}
                strokeWidth={4}
                strokeColor="#0758C2"
                optimizeWaypoints={true}
                mode="DRIVING"
                onError={(error) => console.error('Directions error:', error)}
              />
            )}
          </MapView>

          {/* Map Controls */}
          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.mapButton} onPress={centerMapOnDriver}>
              <Ionicons name="locate" size={24} color="#0758C2" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapButton} onPress={fitMapToRoute}>
              <Ionicons name="resize" size={24} color="#0758C2" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Delivery Progress</Text>
            <Text style={styles.progressPercent}>{progress.toFixed(0)}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Ionicons name="information-circle" size={24} color="#0758C2" />
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Current Status</Text>
              <Text style={styles.statusValue}>{shipment.currentStatus.status}</Text>
              <Text style={styles.statusMessage}>{shipment.currentStatus.message}</Text>
            </View>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#6b7280" />
            <Text style={styles.detailLabel}>Estimated Delivery:</Text>
            <Text style={styles.detailValue}>{formatETA()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="speedometer-outline" size={20} color="#6b7280" />
            <Text style={styles.detailLabel}>Current Speed:</Text>
            <Text style={styles.detailValue}>
              {driverLocation?.speed?.toFixed(1) || 0} km/h
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={20} color="#6b7280" />
            <Text style={styles.detailLabel}>Driver:</Text>
            <Text style={styles.detailValue}>{shipment.driverName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={20} color="#6b7280" />
            <Text style={styles.detailLabel}>Contact:</Text>
            <Text style={styles.detailValue}>{shipment.driverPhone}</Text>
          </View>
        </View>

        {/* Tracking Controls */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location Tracking</Text>
          <View style={styles.trackingStatus}>
            <View style={[styles.statusIndicator, { backgroundColor: isTracking ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.trackingStatusText}>
              {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.trackingButton, { backgroundColor: isTracking ? '#EF4444' : '#10B981' }]}
            onPress={isTracking ? handleStopTracking : handleStartTracking}
          >
            <Ionicons
              name={isTracking ? 'stop' : 'play'}
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.trackingButtonText}>
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Mock data for demonstration
const getMockShipment = (): Shipment => ({
  id: 's1',
  orderId: 'ORD-1021',
  driverId: 'driver123',
  driverName: 'Ahmed Khan',
  driverPhone: '+92 300 1234567',
  vehicleNumber: 'KHI-1234',
  origin: {
    address: 'Karachi Port, Karachi',
    location: { latitude: 24.8607, longitude: 67.0011 },
    name: 'Karachi Warehouse',
  },
  destination: {
    address: 'Mall Road, Lahore',
    location: { latitude: 31.5204, longitude: 74.3587 },
    name: 'Lahore Distribution Center',
  },
  estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
  currentStatus: {
    id: 'status1',
    status: 'in_transit',
    message: 'On route to destination',
    lastUpdate: new Date(),
  },
  statusHistory: [],
  distance: 1200,
  items: [
    { name: 'Marble Tiles', quantity: 500, weight: 2000 },
  ],
});

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  mapContainer: {
    width: width,
    height: height * 0.4,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 16,
    gap: 8,
  },
  mapButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  driverMarker: {
    backgroundColor: MARKER_COLORS.driver,
    borderRadius: 20,
    padding: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  progressContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: width * 0.05,
    marginTop: 12,
    borderRadius: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0758C2',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0758C2',
    borderRadius: 4,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginHorizontal: width * 0.05,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'capitalize',
  },
  statusMessage: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  trackingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  trackingStatusText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  trackingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
});
