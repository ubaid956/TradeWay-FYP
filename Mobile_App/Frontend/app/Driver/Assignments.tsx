import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://m1p2hrxd-5000.asse.devtunnels.ms/api';

interface Assignment {
  _id: string;
  product?: {
    title: string;
  };
  origin?: {
    city?: string;
    address?: string;
  };
  destination?: {
    city?: string;
    address?: string;
  };
  status: string;
  shipment?: {
    _id: string;
    status: string;
    estimatedDeliveryTime?: string;
    distance?: number;
  };
  cargoDetails?: {
    weight?: number;
    quantity?: number;
  };
}

export default function Assignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchAssignments = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/jobs/driver`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { includeAssigned: true }
      });

      if (response.data.success) {
        // Filter only assigned and in_transit jobs
        const activeJobs = response.data.data.filter((job: Assignment) => 
          ['assigned', 'in_transit'].includes(job.status)
        );
        setAssignments(activeJobs);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments();
  };

  const calculateETA = (estimatedTime?: string) => {
    if (!estimatedTime) return 'N/A';
    const eta = new Date(estimatedTime);
    const now = new Date();
    const diffMs = eta.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return diffHours > 0 ? `${diffHours}h` : 'Overdue';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return '#3b82f6';
      case 'in_transit': return '#10b981';
      case 'delivered': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned': return 'Awaiting Pickup';
      case 'in_transit': return 'En Route';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  const handleTrackShipment = (assignment: Assignment) => {
    if (assignment.shipment?._id) {
      router.push({
        pathname: '/Shipment/TrackingDetail',
        params: { shipmentId: assignment.shipment._id }
      });
    }
  };

  const renderItem = ({ item }: { item: Assignment }) => {
    const productTitle = item.product?.title || 'Unknown Product';
    const location = item.destination?.city || item.destination?.address || 'Unknown';
    const eta = calculateETA(item.shipment?.estimatedDeliveryTime);
    const status = getStatusLabel(item.shipment?.status || item.status);
    const statusColor = getStatusColor(item.shipment?.status || item.status);
    const distance = item.shipment?.distance ? `${Math.round(item.shipment.distance / 1000)} km` : '';
    const weight = item.cargoDetails?.weight ? `${item.cargoDetails.weight} kg` : '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title} numberOfLines={1}>
            {productTitle}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color="#6b7280" />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.origin?.city || 'Unknown'} → {location}
          </Text>
        </View>

        {(distance || weight) && (
          <View style={styles.detailsRow}>
            {distance && (
              <View style={styles.detailItem}>
                <Ionicons name="navigate-outline" size={14} color="#6b7280" />
                <Text style={styles.detailText}>{distance}</Text>
              </View>
            )}
            {weight && (
              <View style={styles.detailItem}>
                <Ionicons name="cube-outline" size={14} color="#6b7280" />
                <Text style={styles.detailText}>{weight}</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color="#6b7280" />
              <Text style={styles.detailText}>ETA: {eta}</Text>
            </View>
          </View>
        )}

        {item.shipment?._id && (
          <TouchableOpacity style={styles.trackButton} onPress={() => handleTrackShipment(item)}>
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={styles.trackButtonText}>Track Shipment</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title="My Assignments" placeholder="Search assignments" orders={false} profile={true} />
      <View style={{ paddingHorizontal: width * 0.05, marginTop: 10 }}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : assignments.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="briefcase-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No active assignments</Text>
            <Text style={styles.emptySubText}>Accepted jobs will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={assignments}
            keyExtractor={item => item._id}
            renderItem={renderItem}
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
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
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 12,
    gap: 16,
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
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
});
