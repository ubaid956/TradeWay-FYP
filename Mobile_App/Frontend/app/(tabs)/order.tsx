import { globalStyles } from '@/Styles/globalStyles';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import SearchBar from 'react-native-dynamic-search-bar';
import { router } from 'expo-router';
import HomeHeader from '../Components/HomePage/HomeHeader';
import OrderCard from '../Components/HomePage/OrderCard';
import apiService from '../services/apiService';

const sortOptions = [
  'Most Recent',
  'Oldest First',
  'Price: High to Low',
  'Price: Low to High',
];

const { height, width } = Dimensions.get('window');

const Order = () => {
  const [selectedOption, setSelectedOption] = useState('Most Recent');
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  const handleSelect = (option: string) => {
    setSelectedOption(option);
    setDropdownVisible(false);
  };

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError('');
      const resp = await apiService.orders.getSellerOrders();
      if (resp.success) {
        const list = (resp.data?.data || resp.data || []) as any[];
        setOrders(Array.isArray(list) ? list : []);
      } else {
        setError(resp.error || 'Failed to load orders');
      }
      setLoading(false);
    };
    fetchOrders();
  }, []);

  const sortedOrders = useMemo(() => {
    // Apply search filter first
    const term = searchText.trim().toLowerCase();
    const filtered = term
      ? orders.filter((o) => {
          const name = (o.product?.title || '').toLowerCase();
          const orderNo = (o.orderNumber || o._id || '').toString().toLowerCase();
          return name.includes(term) || orderNo.includes(term);
        })
      : [...orders];

    const arr = filtered;
    switch (selectedOption) {
      case 'Oldest First':
        return arr.sort((a, b) => new Date(a.createdAt || a.orderDate).getTime() - new Date(b.createdAt || b.orderDate).getTime());
      case 'Price: High to Low':
        return arr.sort((a, b) => (b.orderDetails?.finalAmount || 0) - (a.orderDetails?.finalAmount || 0));
      case 'Price: Low to High':
        return arr.sort((a, b) => (a.orderDetails?.finalAmount || 0) - (b.orderDetails?.finalAmount || 0));
      default:
        return arr.sort((a, b) => new Date(b.createdAt || b.orderDate).getTime() - new Date(a.createdAt || a.orderDate).getTime());
    }
  }, [orders, selectedOption, searchText]);

  return (
    <SafeAreaView style={[globalStyles.container, { backgroundColor: '#f9fafb' }]}> 
      <HomeHeader title="Orders" placeholder="Search orders" orders={true} profile={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: '#f9fafb' }}>

        <SearchBar
          style={{
            height: height * 0.055,
            width: width * 0.9,
            borderRadius: 10,
            borderColor: 'grey',
            borderWidth: 1,
            alignSelf: 'center',
            marginTop: 10,
          }}
          value={searchText}
          placeholder="Search orders"
          onChangeText={setSearchText}
          onPress={() => {}}
        />

        {/* Status tabs removed as requested */}

        <View style={{ marginTop: height * 0.02, width: width * 0.9, marginHorizontal: width * 0.05, }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              // paddingHorizontal: 16,
              alignItems: 'center'

            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '500' }}>{sortedOrders.length} Orders Found</Text>
            <View style={styles.container}>
              <TouchableOpacity
                style={styles.dropdownToggle}
                onPress={() => setDropdownVisible(!isDropdownVisible)}
              >
                <Ionicons name="swap-vertical" size={18} color="#4B5563" />
                <Text style={styles.dropdownText}>{selectedOption}</Text>
                <Ionicons
                  name={isDropdownVisible ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#4B5563"
                />
              </TouchableOpacity>

              {isDropdownVisible && (
                <View style={styles.dropdown}>
                  {sortOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => handleSelect(option)}
                      style={styles.option}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          option === selectedOption && styles.selectedText,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>


        {loading && (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        )}

        {!!error && (
          <Text style={{ color: 'red', alignSelf: 'center', marginTop: 8 }}>{error}</Text>
        )}

        {!loading && !error && sortedOrders.map((o) => {
          const displayId = o.orderNumber || o._id;
          const mongoId = o._id;
          const orderDate = new Date(o.orderDate || o.createdAt).toLocaleDateString();
          const status = o.status || 'Active';
          const productName = o.product?.title || 'Product';
          const quantity = Number(o.orderDetails?.quantity || 0);
          const unitPrice = Number(o.orderDetails?.unitPrice || 0);
          const total = Number(o.orderDetails?.finalAmount || o.orderDetails?.totalAmount || 0);
          const estimatedDelivery = o.delivery?.estimatedDelivery
            ? new Date(o.delivery.estimatedDelivery).toLocaleDateString()
            : '—';
          const productImage = Array.isArray(o.product?.images) && o.product.images.length > 0
            ? o.product.images[0]
            : 'https://i.ibb.co/z7ZYYkg/marble.png';
          return (
            <OrderCard
              key={String(mongoId || displayId)}
              orderId={displayId}
              orderDate={orderDate}
              status={status}
              productName={productName}
              quantity={quantity}
              unitPrice={unitPrice}
              total={total}
              estimatedDelivery={estimatedDelivery}
              productImage={productImage}
              onPressViewDetails={() => router.push({ pathname: '/order/[id]', params: { id: String(mongoId) } })}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Order;

const styles = StyleSheet.create({
  container: {
    zIndex: 999,
  },
  dropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownText: {
    marginHorizontal: 8,
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  dropdown: {
    backgroundColor: 'white',
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    position: 'absolute',
    right: 0,
    top: 50,
    zIndex: 1000,
  },
  option: {
    padding: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedText: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
});
