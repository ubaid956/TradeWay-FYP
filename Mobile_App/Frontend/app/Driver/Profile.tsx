import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';
import { useAppSelector } from '@/src/store/hooks';

const { width, height } = Dimensions.get('window');

export default function DriverProfile() {
  const { user } = useAppSelector(state => state.auth);

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title="Driver Profile" placeholder="" orders={false} profile={true} />
      <View style={{ paddingHorizontal: width * 0.05, marginTop: 12 }}>
        <View style={styles.profileSection}>
          <Image source={!((user as any)?.pic) ? require('../../assets/images/user.jpg') : { uri: (user as any).pic }} style={styles.avatar} />
          <Text style={styles.name}>{(user as any)?.name}</Text>
          <Text style={styles.role}>{(((user as any)?.role) || '').toUpperCase()}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vehicle</Text>
          <Text style={styles.cardText}>{(user as any)?.vehicle?.type || 'Not provided'} • {(user as any)?.vehicle?.plate || '—'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>KYC</Text>
          <Text style={styles.cardText}>{(user as any)?.isKYCVerified ? 'Verified' : 'Not verified'}</Text>
        </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: '#0758C2' }]} onPress={() => console.log('Edit profile')}>
          <Text style={{ color: '#fff' }}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileSection: { alignItems: 'center', paddingVertical: 16, backgroundColor: '#fff', borderRadius: 10 },
  avatar: { width: width * 0.28, height: width * 0.28, borderRadius: 999, marginBottom: 10 },
  name: { fontSize: 18, fontWeight: '700' },
  role: { color: '#6b7280', marginBottom: 8 },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginTop: 12 },
  cardTitle: { fontWeight: '700' },
  cardText: { color: '#6b7280', marginTop: 6 },
  button: { marginTop: 16, padding: 12, borderRadius: 8, alignItems: 'center' },
});
