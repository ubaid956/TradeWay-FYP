import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View, ActivityIndicator, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import apiService from '../services/apiService';
import { useAppSelector } from '../store/hooks';
import { useState } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { globalStyles } from '@/Styles/globalStyles';

const { width } = Dimensions.get('window');

const OrderDetail = () => {
  const params = useLocalSearchParams();
  const id = String(params.id || '');

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const auth = useAppSelector(state => state.auth);
  const currentUser = auth.user;

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      const resp = await apiService.orders.getOrderById(id);
      if (resp.success) {
        const data = resp.data?.data || resp.data;
        setOrder(data || null);
      } else {
        setError(resp.error || 'Failed to load order');
      }
      setLoading(false);
    };
    fetchOrder();
  }, [id]);

  const productImage = useMemo(() => {
    const imgs = order?.product?.images;
    if (Array.isArray(imgs) && imgs.length > 0) return { uri: imgs[0] };
    return { uri: 'https://i.ibb.co/z7ZYYkg/marble.png' } as any;
  }, [order]);

  if (loading && !order) {
    return (
      <SafeAreaView style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center', marginTop: 70 }]}> 
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (!!error && !order) {
    return (
      <SafeAreaView style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center', marginTop: 70 }]}> 
        <Text style={{ color: 'red' }}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <Text>No order found</Text>
      </SafeAreaView>
    );
  }

  const orderId = order.orderNumber || order._id;
  const orderDate = new Date(order.orderDate || order.createdAt).toLocaleDateString();
  const status = order.status || 'Active';
  const productName = order.product?.title || 'Product';
  const quantity = Number(order.orderDetails?.quantity || 0);
  const unitPrice = Number(order.orderDetails?.unitPrice || 0);
  const total = Number(order.orderDetails?.finalAmount || order.orderDetails?.totalAmount || 0);
  const estimatedDelivery = order.delivery?.estimatedDelivery
    ? new Date(order.delivery.estimatedDelivery).toLocaleDateString()
    : '—';

  return (
    <SafeAreaView style={[globalStyles.container, { backgroundColor: '#f9fafb' , marginTop: 70 }]}> 
      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: '#f9fafb' }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backTxt}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Order Details</Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Order</Text>
          <Text style={styles.value}>{orderId}</Text>
          <Text style={[styles.subtle, { marginTop: 4 }]}>Placed on {orderDate}</Text>
          <Text style={[styles.status, status === 'Completed' ? styles.completed : status === 'Canceled' ? styles.canceled : styles.active]}>Status: {status}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Product</Text>
          <View style={styles.productRow}>
            <Image source={productImage} style={styles.productImage} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.value}>{productName}</Text>
              <Text style={styles.subtle}>Qty: {quantity}</Text>
              <Text style={styles.subtle}>Unit Price: ${unitPrice.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Amounts</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.subtle}>Subtotal</Text>
            <Text style={styles.value}>${(unitPrice * quantity).toFixed(2)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.subtle}>Shipping</Text>
            <Text style={styles.value}>${Number(order.orderDetails?.shippingCost || 0).toFixed(2)}</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: 6 }]}> 
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Delivery</Text>
          <Text style={styles.value}>Estimated: {estimatedDelivery}</Text>
          {order.delivery?.trackingNumber ? (
            <Text style={styles.subtle}>Tracking: {order.delivery.trackingNumber}</Text>
          ) : null}
        </View>

        <View style={[styles.section, { marginBottom: 24 }]}>
          <Text style={styles.label}>Buyer</Text>
          <Text style={styles.value}>{order.buyer?.name}</Text>
          <Text style={styles.subtle}>{order.buyer?.email}</Text>
          <Text style={styles.subtle}>{order.buyer?.phone}</Text>
        </View>

        {/* Pay Now button for buyer when order is unpaid */}
        {currentUser && (currentUser._id === order.buyer?._id) && order.payment?.status !== 'paid' && (
          <View style={{ paddingHorizontal: width * 0.05, marginBottom: 40 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#0758C2', padding: 14, borderRadius: 10, alignItems: 'center' }}
              disabled={processingPayment}
              onPress={async () => {
                try {
                  setProcessingPayment(true);
                  // create payment intent on server
                  const resp = await apiService.payments.createPaymentIntent(order._id);
                  if (!resp.success) {
                    throw new Error(resp.error || 'Failed to create payment intent');
                  }
                  const clientSecret = resp.data?.clientSecret || resp.data?.client_secret || resp.data;

                  // initialize payment sheet
                  const initResult = await initPaymentSheet({ paymentIntentClientSecret: clientSecret, merchantDisplayName: 'TradeWay' });
                  if (initResult.error) {
                    throw new Error(initResult.error.message || 'Failed to init payment sheet');
                  }

                  const presentResult = await presentPaymentSheet();
                  if (presentResult.error) {
                    throw new Error(presentResult.error.message || 'Payment failed');
                  }

                  // Payment succeeded — refresh order (webhook will also update)
                  await apiService.orders.getOrderById(order._id);
                  const refreshed = await apiService.orders.getOrderById(order._id);
                  if (refreshed.success) setOrder(refreshed.data?.data || refreshed.data || null);
                } catch (err: any) {
                  console.error('Payment error:', err);
                  alert(err.message || 'Payment failed');
                } finally {
                  setProcessingPayment(false);
                }
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{processingPayment ? 'Processing…' : `Pay $${total.toFixed(2)}`}</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderDetail;

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingVertical: 16,
  },
  backBtn: {
    width: 70,
    paddingVertical: 6,
  },
  backTxt: {
    color: '#2563EB',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: width * 0.05,
    marginTop: 12,
    borderRadius: 10,
    padding: 14,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  subtle: {
    fontSize: 13,
    color: '#6b7280',
  },
  status: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  completed: { color: '#065F46' },
  canceled: { color: '#991B1B' },
  active: { color: '#2563EB' },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
});
