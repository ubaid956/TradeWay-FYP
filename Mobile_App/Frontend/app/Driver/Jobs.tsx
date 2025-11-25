import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';

const { width } = Dimensions.get('window');

const mockJobs = [
  { id: 'j1', title: 'Stone shipment - 5 pallets', distance: '12 km', price: 'PKR 12,000', cargoType: 'Marble', fragility: 'High' },
  { id: 'j2', title: 'Cement bags - 4000kg', distance: '45 km', price: 'PKR 18,000', cargoType: 'Cement', fragility: 'Low' },
  { id: 'j3', title: 'Crane equipment', distance: '5 km', price: 'PKR 22,000', cargoType: 'Equipment', fragility: 'Medium' },
];

export default function Jobs() {
  const [jobs, setJobs] = useState(mockJobs);

  useEffect(() => {
    // TODO: fetch available jobs via API when backend ready
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => console.log('Open job', item.id)}>
      <Text style={styles.title}>{item.title}</Text>
      <View style={styles.row}>
        <Text style={styles.muted}>{item.distance} • {item.cargoType}</Text>
        <Text style={styles.price}>{item.price}</Text>
      </View>
      <Text style={styles.small}>Fragility: {item.fragility}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title="Available Jobs" placeholder="Search jobs" orders={false} profile={true} />
      <View style={{ paddingHorizontal: width * 0.05, marginTop: 12 }}>
        <Text style={styles.info}>Find jobs matched to your capacity and location. Use filters to narrow results.</Text>
        <FlatList
          data={jobs}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { color: '#6b7280' },
  price: { color: '#0758C2', fontWeight: '700' },
  small: { color: '#6b7280', marginTop: 8 },
  info: { color: '#374151', marginBottom: 8 },
});
