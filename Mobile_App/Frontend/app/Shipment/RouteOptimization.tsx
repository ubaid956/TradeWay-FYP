import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';

const { width } = Dimensions.get('window');

export default function RouteOptimization() {
  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title="Route Optimization" placeholder="" orders={false} profile={true} />
      <View style={{ paddingHorizontal: width * 0.05, marginTop: 12 }}>
        <Text style={styles.info}>AI-suggested routes will appear here. Integration with Google Maps and routing engine will provide optimized routes that avoid tolls and restricted roads for trucks.</Text>
        <View style={styles.card}>
          <Text style={styles.title}>Suggested Route 1</Text>
          <Text style={styles.small}>ETA: 2h 10m • Cost estimate: PKR 1,200</Text>
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
