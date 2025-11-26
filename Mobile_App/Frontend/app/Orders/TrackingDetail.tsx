import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GOOGLE_MAPS_CONFIG, MARKER_COLORS } from '@/src/config/maps';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { apiConfig } from '@/src/config/api';

const { width, height } = Dimensions.get('window');

interface Location {
  latitude: number;
  longitude: number;
}

interface ShipmentData {
  id: string;
  orderId: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  origin: {
    address: string;
    location: Location;
    name?: string;
  };
  destination: {
    address: string;
    location: Location;
    name?: string;
  };
  estimatedDeliveryTime: Date;
  currentStatus: string;
  statusHistory: any[];
  distance?: number;
  items: {
    name: string;
    quantity: number;
    weight?: number;
  }[];
}

export default function OrderTrackingDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const shipmentId = (params as any).shipmentId || 'unknown';
  const orderNumber = (params as any).orderNumber || '';
  const mapRef = useRef<MapView>(null);

  const [shipment, setShipment] = useState<ShipmentData | null>(null);
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // Fetch shipment details
  useEffect(() => {
    fetchShipmentDetails();
    const interval = setInterval(fetchShipmentDetails, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [shipmentId]);

  const fetchShipmentDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found');
        return;
      }

      console.log('Fetching shipment details for order tracking:', shipmentId);

      const response = await axios.get(
        `${apiConfig.baseURL}/tracking/shipment/${shipmentId}`,
        {
          headers: {
            ...apiConfig.headers,
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Shipment details received for order');
      
      // Transform backend GeoJSON format to frontend Location format
      const backendShipment = response.data.shipment;
      const transformedShipment: ShipmentData = {
        id: backendShipment.id,
        orderId: backendShipment.orderId,
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
        estimatedDeliveryTime: new Date(backendShipment.estimatedDeliveryTime),
        currentStatus: backendShipment.currentStatus,
        statusHistory: backendShipment.statusHistory || [],
        distance: backendShipment.distance,
        items: backendShipment.items || [],
      };

      // Transform current location if exists
      if (backendShipment.currentLocation) {
        setDriverLocation({
          latitude: backendShipment.currentLocation.latitude,
          longitude: backendShipment.currentLocation.longitude,
        });
      }

      setShipment(transformedShipment);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching shipment details:', error);
      console.error('Error response:', error.response?.data);
      setLoading(false);
    }
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

  const formatETA = (): string => {
    if (!shipment) return 'N/A';
    const now = new Date();
    const eta = new Date(shipment.estimatedDeliveryTime);
    const diff = eta.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'picked_up': return '#3b82f6';
      case 'in_transit': return '#10b981';
      case 'delivered': return '#6b7280';
      case 'delayed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Pickup';
      case 'picked_up': return 'Picked Up';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'delayed': return 'Delayed';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0758C2" />
        <Text style={styles.loadingText}>Loading tracking details...</Text>
      </View>
    );
  }

  if (!shipment) {
    return (
      <View style={[globalStyles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Shipment not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Validate location data
  if (!shipment.origin?.location?.latitude || !shipment.origin?.location?.longitude ||
      !shipment.destination?.location?.latitude || !shipment.destination?.location?.longitude) {
    return (
      <View style={[globalStyles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Invalid shipment location data</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = getStatusColor(shipment.currentStatus);
  const statusLabel = getStatusLabel(shipment.currentStatus);

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader 
        title={orderNumber ? `Order #${orderNumber}` : 'Track Order'} 
        placeholder="" 
        orders={false} 
        profile={true} 
      />
      
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
                description="Current location"
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
            {driverLocation && (
              <TouchableOpacity style={styles.mapButton} onPress={centerMapOnDriver}>
                <Ionicons name="locate" size={24} color="#0758C2" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.mapButton} onPress={fitMapToRoute}>
              <Ionicons name="resize-outline" size={24} color="#0758C2" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
            <Text style={styles.statusTitle}>{statusLabel}</Text>
          </View>
          <Text style={styles.statusSubtext}>
            Estimated Delivery: {formatETA()}
          </Text>
        </View>

        {/* Driver Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Driver Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#6b7280" />
            <Text style={styles.infoText}>{shipment.driverName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#6b7280" />
            <Text style={styles.infoText}>{shipment.driverPhone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={20} color="#6b7280" />
            <Text style={styles.infoText}>{shipment.vehicleNumber}</Text>
          </View>
        </View>

        {/* Shipment Details Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Shipment Details</Text>
          <View style={styles.locationSection}>
            <Ionicons name="location-outline" size={20} color="#10b981" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationText}>{shipment.origin.address}</Text>
            </View>
          </View>
          <View style={styles.locationDivider} />
          <View style={styles.locationSection}>
            <Ionicons name="flag-outline" size={20} color="#ef4444" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Delivery</Text>
              <Text style={styles.locationText}>{shipment.destination.address}</Text>
            </View>
          </View>
          {shipment.distance && (
            <View style={[styles.infoRow, { marginTop: 12 }]}>
              <Ionicons name="navigate-outline" size={20} color="#6b7280" />
              <Text style={styles.infoText}>
                Distance: {Math.round(shipment.distance)} km
              </Text>
            </View>
          )}
        </View>

        {/* Items Card */}
        {shipment.items && shipment.items.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Items</Text>
            {shipment.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Ionicons name="cube-outline" size={18} color="#6b7280" />
                <Text style={styles.itemText}>
                  {item.name} - Qty: {item.quantity}
                  {item.weight ? ` (${item.weight} kg)` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

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
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 24,
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 12,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  locationDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 12,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
