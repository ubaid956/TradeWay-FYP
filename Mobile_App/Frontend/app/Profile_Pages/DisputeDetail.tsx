import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { disputesService } from '@/src/services/disputes';

export default function DisputeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [dispute, setDispute] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const d = await disputesService.getDispute(String(id));
      setDispute(d);
    })();
  }, [id]);

  if (!dispute) {
    return (
      <View style={styles.container}><Text>Loading dispute...</Text></View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Dispute for Order #{dispute.orderId?.orderNumber || dispute.orderId}</Text>
      <Text>Status: {dispute.status}</Text>
      <Text>Reason: {dispute.reason}</Text>
      <TouchableOpacity style={styles.chatBtn} onPress={() => router.push(`/messages?groupId=${dispute.groupId}`)}>
        <Text style={styles.chatBtnText}>Open Dispute Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  chatBtn: { marginTop: 20, backgroundColor: '#0758C2', padding: 12, borderRadius: 10 },
  chatBtnText: { color: '#fff', fontWeight: '600', textAlign: 'center' }
});
