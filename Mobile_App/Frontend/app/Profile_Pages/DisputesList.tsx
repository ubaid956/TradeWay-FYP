import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, FlatList } from 'react-native';
import { disputesService } from '@/src/services/disputes';
import { useRouter } from 'expo-router';
import CustomHeader from '../Components/Headers/CustomHeader';

export default function DisputesList() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const data = await disputesService.getMyDisputes();
        setDisputes(data || []);
      } catch (e) {
        console.log('Failed to fetch disputes', e);
      }
    })();
  }, []);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/Profile_Pages/DisputeDetail?id=${item._id}`)}>
      <Text style={styles.title}>Order #{item.orderId?.orderNumber || item.orderId}</Text>
      <Text style={styles.subtitle}>Status: {item.status}</Text>
      <Text style={styles.reason}>Reason: {item.reason}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <CustomHeader
        title="Disputes"
        onBackPress={() => router.back()}
      />
      <View style={styles.container}>
        {(!disputes || disputes.length === 0) ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No Disputed order yet</Text>
          </View>
        ) : (
          <FlatList
            data={disputes}
            keyExtractor={(d) => d._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: 12 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  card: { padding: 12, borderRadius: 12, backgroundColor: '#f3f4f6', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { color: '#6b7280', marginTop: 4 },
  reason: { color: '#374151', marginTop: 6 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 }
});
