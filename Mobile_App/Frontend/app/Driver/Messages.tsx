import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';

const { width } = Dimensions.get('window');

const mockConversations = [
  { id: 'c1', title: 'Vendor: Marble Co.', last: 'Please confirm pick up time', unread: 2 },
  { id: 'c2', title: 'Dispatch', last: 'New assignment available nearby', unread: 0 },
  { id: 'c3', title: 'Support', last: 'KYC documents approved', unread: 0 },
];

export default function DriverMessages() {
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => console.log('Open conversation', item.id)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.title}>{item.title}</Text>
        {item.unread > 0 && <View style={styles.badge}><Text style={{ color: '#fff' }}>{item.unread}</Text></View>}
      </View>
      <Text style={styles.small}>{item.last}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title="Messages" placeholder="Search messages" orders={false} profile={false} />
      <View style={{ paddingHorizontal: width * 0.05, marginTop: 12 }}>
        <FlatList data={mockConversations} keyExtractor={i => i.id} renderItem={renderItem} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginTop: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  small: { color: '#6b7280', marginTop: 6 },
  badge: { backgroundColor: '#0758C2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
});
