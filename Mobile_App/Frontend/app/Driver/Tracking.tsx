import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://m1p2hrxd-5000.asse.devtunnels.ms/api';

interface ShipmentData {
  _id: string;
  orderId?: string;
  jobId?: string;
  status: string;
  origin?: {
    city?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  destination?: {
    city?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  estimatedDeliveryTime?: string;
  currentLocation?: {
    location?: {
      coordinates: [number, number];
    };
  };
  distance?: number;
  items?: Array<{
    name?: string;
    quantity?: number;
  }>;
}

export default function Tracking() {
  const router = useRouter();
  const [shipments, setShipments] = useState<ShipmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActiveShipments = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      // Fetch driver's jobs with shipments
      const response = await axios.get(`${API_BASE_URL}/jobs/driver`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { includeAssigned: true }
      });

      if (response.data.success) {
        // Filter jobs with shipments and extract shipment data
        const activeShipments = response.data.data
          .filter((job: any) => 
            job.shipment && ['assigned', 'in_transit'].includes(job.status)
          )
          .map((job: any) => ({
            ...job.shipment,
            jobId: job._id,
            orderId: job.order,
            origin: job.origin,
            destination: job.destination
          }));
        
        console.log('Active shipments loaded:', activeShipments.length);
        console.log('First shipment data:', activeShipments[0]);
        setShipments(activeShipments);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveShipments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveShipments();
  };

  const calculateETA = (estimatedTime?: string): string => {
    if (!estimatedTime) return 'N/A';
    
    try {
      const eta = new Date(estimatedTime);
      if (isNaN(eta.getTime())) return 'N/A';
      
      const now = new Date();
      const diffMs = eta.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffMs < 0) return 'Overdue';
      if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`;
      return `${diffMinutes}m`;
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return 'N/A';
    }
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
      case 'in_transit': return 'En Route';
      case 'delivered': return 'Delivered';
      case 'delayed': return 'Delayed';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'picked_up': return 'checkmark-circle-outline';
      case 'in_transit': return 'navigate-outline';
      case 'delivered': return 'checkmark-done-circle-outline';
      case 'delayed': return 'alert-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const handleTrackShipment = (shipment: ShipmentData) => {
    console.log('Starting tracking for shipment:', shipment._id);
    
    if (!shipment._id) {
      console.error('Invalid shipment ID');
      return;
    }
    
    router.push({
      pathname: '/Shipment/TrackingDetail',
      params: { shipmentId: shipment._id }
    });
  };

  const handleOptimizeRoute = (shipment: ShipmentData) => {
    router.push({
      pathname: '/Shipment/RouteOptimization',
      params: {
        origin: JSON.stringify({
          latitude: shipment.currentLocation?.location?.coordinates[1] || 24.8607,
          longitude: shipment.currentLocation?.location?.coordinates[0] || 67.0011
        }),
        destination: JSON.stringify({
          latitude: shipment.destination?.latitude || 24.8607,
          longitude: shipment.destination?.longitude || 67.0011
        })
      }
    });
  };

  const renderShipmentCard = ({ item }: { item: ShipmentData }) => {
    const itemName = item.items?.[0]?.name || 'Unknown Item';
    const destination = item.destination?.city || item.destination?.address || 'Unknown';
    const eta = calculateETA(item.estimatedDeliveryTime) || 'N/A';
    const statusColor = getStatusColor(item.status) || '#6b7280';
    const statusLabel = getStatusLabel(item.status) || 'Unknown';
    const statusIcon = getStatusIcon(item.status) || 'help-circle-outline';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Ionicons name={statusIcon as any} size={24} color={statusColor} />
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>
                {itemName}
              </Text>
              <Text style={styles.orderId}>
                {item.orderId ? `Order #${item.orderId.slice(-6)}` : 'No Order ID'}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.origin?.city || 'Unknown'} → {destination}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color="#6b7280" />
            <Text style={styles.detailText}>ETA: {eta}</Text>
          </View>
          {item.distance && (
            <View style={styles.detailItem}>
              <Ionicons name="navigate-outline" size={14} color="#6b7280" />
              <Text style={styles.detailText}>{Math.round(item.distance / 1000)} km</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.trackButton]}
            onPress={() => handleTrackShipment(item)}
          >
            <Ionicons name="location" size={16} color="#fff" />
            <Text style={styles.trackButtonText}>Track Live</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.routeButton]}
            onPress={() => handleOptimizeRoute(item)}
          >
            <Ionicons name="git-branch-outline" size={16} color="#3b82f6" />
            <Text style={styles.routeButtonText}>Optimize Route</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title="Tracking" placeholder="Search shipments" orders={false} profile={true} />
      <View style={{ paddingHorizontal: width * 0.05, marginTop: 12 }}>
        <Text style={styles.info}>Real-time shipment status and quick route tools.</Text>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : shipments.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="map-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No active shipments</Text>
            <Text style={styles.emptySubText}>Accepted jobs with tracking will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={shipments}
            keyExtractor={item => item._id}
            renderItem={renderShipmentCard}
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  orderId: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  trackButton: {
    backgroundColor: '#3b82f6',
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  routeButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  routeButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  info: {
    color: '#374151',
    fontSize: 14,
    marginBottom: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  small: { color: '#6b7280', marginTop: 6 },
  routeBtn: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#0758C2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
});
