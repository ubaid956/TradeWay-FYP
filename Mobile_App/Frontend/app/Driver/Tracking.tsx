import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function Tracking() {
  const router = useRouter();

  // Placeholder UI for live tracking list
  const activeShipments = [
    { id: 's1', title: 'Order #1021', status: 'On route to destination', eta: '1h 20m' },
    { id: 's2', title: 'Order #1108', status: 'Stopped for loading', eta: '3h' },
  ];

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title="Tracking" placeholder="Search shipments" orders={false} profile={true} />
      <View style={{ paddingHorizontal: width * 0.05, marginTop: 12 }}>
        <Text style={styles.info}>Real-time shipment status and quick route tools.</Text>

        {activeShipments.map((s) => (
          <TouchableOpacity key={s.id} style={styles.card} onPress={() => router.push({ pathname: '/Shipment/TrackingDetail', params: { shipmentId: s.id } })}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.small}>{s.status} • ETA: {s.eta}</Text>
            <TouchableOpacity style={styles.routeBtn} onPress={() => router.push('/Shipment/RouteOptimization')}>
              <Text style={{ color: '#fff' }}>Optimize Route</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginTop: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  small: { color: '#6b7280', marginTop: 6 },
  info: { color: '#374151' },
  routeBtn: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#0758C2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
});
