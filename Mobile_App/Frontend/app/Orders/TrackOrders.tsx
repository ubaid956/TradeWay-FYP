import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://m1p2hrxd-5000.asse.devtunnels.ms/api';

interface OrderWithTracking {
  _id: string;
  orderNumber: string;
  product: {
    title: string;
    images?: string[];
  };
  orderDetails: {
    quantity: number;
    finalAmount: number;
  };
  status: string;
  job?: {
    _id: string;
    status: string;
    shipment?: string;
  };
  delivery: {
    method: string;
    estimatedDelivery?: string;
    trackingNumber?: string;
  };
  orderDate: string;
  buyer?: {
    name: string;
  };
  seller?: {
    name: string;
  };
}

export default function TrackOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      
      if (!token || !userStr) {
        console.warn('No auth data found');
        return;
      }

      const user = JSON.parse(userStr);
      setUserRole(user.role);

      // Determine endpoint based on user role
      const endpoint = user.role === 'buyer' 
        ? `${API_BASE_URL}/orders/buyer`
        : `${API_BASE_URL}/orders/seller`;

      console.log('Fetching orders from:', endpoint);

      // Fetch orders
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Orders response:', response.data);

      if (response.data.success) {
        // Filter orders that have active jobs/shipments
        const ordersWithTracking = response.data.data.filter((order: any) => 
          order.job && ['assigned', 'in_transit'].includes(order.job.status)
        );
        
        console.log('Orders with tracking:', ordersWithTracking.length);
        setOrders(ordersWithTracking);
      }
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return '#f59e0b';
      case 'in_transit': return '#10b981';
      case 'delivered': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned': return 'Assigned to Driver';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return 'time-outline';
      case 'in_transit': return 'navigate-outline';
      case 'delivered': return 'checkmark-done-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const handleTrackOrder = async (order: OrderWithTracking) => {
    if (!order.job?.shipment) {
      console.warn('No shipment ID found for this order');
      return;
    }

    // Navigate to tracking detail with shipment ID
    router.push({
      pathname: '/Orders/TrackingDetail',
      params: { 
        shipmentId: order.job.shipment,
        orderNumber: order.orderNumber 
      }
    });
  };

  const renderOrderCard = ({ item }: { item: OrderWithTracking }) => {
    const productName = item.product?.title || 'Unknown Product';
    const quantity = item.orderDetails?.quantity || 0;
    const amount = item.orderDetails?.finalAmount || 0;
    const jobStatus = item.job?.status || 'unknown';
    const statusColor = getStatusColor(jobStatus);
    const statusLabel = getStatusLabel(jobStatus);
    const statusIcon = getStatusIcon(jobStatus);
    const counterparty = userRole === 'buyer' ? item.seller?.name : item.buyer?.name;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Ionicons name={statusIcon as any} size={24} color={statusColor} />
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>
                {productName}
              </Text>
              <Text style={styles.orderId}>
                Order #{item.orderNumber}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#6b7280" />
          <Text style={styles.infoText} numberOfLines={1}>
            {userRole === 'buyer' ? 'Seller' : 'Buyer'}: {counterparty || 'Unknown'}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="cube-outline" size={14} color="#6b7280" />
            <Text style={styles.detailText}>Qty: {quantity}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={14} color="#6b7280" />
            <Text style={styles.detailText}>PKR {amount.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.trackButton]}
            onPress={() => handleTrackOrder(item)}
          >
            <Ionicons name="location" size={16} color="#fff" />
            <Text style={styles.trackButtonText}>Track Live</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.detailButton]}
            onPress={() => router.push(`/Orders/${item._id}`)}
          >
            <Ionicons name="document-text-outline" size={16} color="#3b82f6" />
            <Text style={styles.detailButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title="Track Orders" placeholder="Search orders" orders={false} profile={true} />
      <View style={{ paddingHorizontal: width * 0.05, marginTop: 12 }}>
        <Text style={styles.info}>
          Real-time tracking for orders with active delivery jobs
        </Text>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No trackable orders</Text>
            <Text style={styles.emptySubText}>
              Orders with active delivery jobs will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={item => item._id}
            renderItem={renderOrderCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  info: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  orderId: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
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
  detailButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  detailButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
});
