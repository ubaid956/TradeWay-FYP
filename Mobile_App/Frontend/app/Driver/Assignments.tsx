import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';

const { width } = Dimensions.get('window');

const mockAssignments = [
  { id: 'a1', title: 'Deliver marble - Order #1021', eta: '2h', status: 'En route', location: 'Karachi' },
  { id: 'a2', title: 'Pickup cement - Order #1108', eta: '4h', status: 'Awaiting pickup', location: 'Lahore' },
];

export default function Assignments() {
  const [assignments, setAssignments] = useState(mockAssignments);

  useEffect(() => {
    // TODO: fetch assignments from API
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => console.log('Open assignment', item.id)}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.small}>{item.location} • ETA: {item.eta} • {item.status}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title="My Assignments" placeholder="Search assignments" orders={false} profile={true} />
      <View style={{ paddingHorizontal: width * 0.05, marginTop: 10 }}>
        <FlatList data={assignments} keyExtractor={i => i.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 120 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginTop: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  small: { color: '#6b7280', marginTop: 6 },
});
