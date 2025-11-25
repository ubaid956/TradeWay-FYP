import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';
import { useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

export default function TrackingDetail() {
  const params = useLocalSearchParams();
  const shipmentId = (params as any).shipmentId || 'unknown';

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title={`Shipment ${shipmentId}`} placeholder="" orders={false} profile={true} />
      <View style={{ paddingHorizontal: width * 0.05, marginTop: 12 }}>
        <Text style={styles.info}>Live GPS breadcrumbs, status updates and ETA will show here for shipment {shipmentId}.</Text>
        <View style={styles.card}>
          <Text style={styles.title}>Current Status</Text>
          <Text style={styles.small}>On route • Next checkpoint in 12 km</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  info: { color: '#374151', marginBottom: 10 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginTop: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  small: { color: '#6b7280', marginTop: 6 },
});
