import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';
import { apiService } from '@/src/services/apiService';
import { formatCurrency } from '@/src/utils/currency';

const { width } = Dimensions.get('window');

interface CargoJob {
  _id: string;
  status: 'open' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  product?: {
    title?: string;
  };
  vendor?: {
    name?: string;
    phone?: string;
  };
  origin?: { city?: string; address?: string };
  destination?: { city?: string; address?: string };
  cargoDetails?: { cargoType?: string; weight?: number; unit?: string };
  price?: number;
}

const statusColors: Record<CargoJob['status'], string> = {
  open: '#10B981',
  assigned: '#3B82F6',
  in_transit: '#F59E0B',
  delivered: '#065F46',
  cancelled: '#B91C1C',
};

const Jobs = () => {
  const [jobs, setJobs] = useState<CargoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [includeAssigned, setIncludeAssigned] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.jobs.getDriverJobs(includeAssigned);
      if (!response.success) {
        throw new Error(response.error || 'Could not load jobs');
      }
      const payload = response.data as any;
      const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
      setJobs(list);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [includeAssigned]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs();
  }, [fetchJobs]);

  const handleClaim = async (jobId: string) => {
    Alert.alert('Accept job', 'Claim this job and start coordinating with the vendor?', [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          try {
            setAcceptingId(jobId);
            const response = await apiService.jobs.assignJob(jobId);
            if (response.success) {
              Alert.alert('Assigned', 'This job is now in your assignments.');
              fetchJobs();
            } else {
              throw new Error(response.error || 'Unable to assign job');
            }
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to assign job');
          } finally {
            setAcceptingId(null);
          }
        },
      },
    ]);
  };

  const renderJob = ({ item }: { item: CargoJob }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{item.product?.title || 'Cargo Job'}</Text>
        <View style={[styles.statusChip, { backgroundColor: `${statusColors[item.status]}20` }]}>
          <Text style={[styles.statusText, { color: statusColors[item.status] }]}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>
      <Text style={styles.route}>{item.origin?.city || 'Unknown'} → {item.destination?.city || 'Unknown'}</Text>
      <Text style={styles.metaText}>
        {item.cargoDetails?.cargoType || 'General cargo'}
        {item.cargoDetails?.weight ? ` • ${item.cargoDetails.weight}${item.cargoDetails.unit || 'kg'}` : ''}
      </Text>
      <Text style={styles.price}>{formatCurrency(item.price || 0, { currency: 'PKR', fractionDigits: 0 })}</Text>
      {item.status === 'open' && (
        <TouchableOpacity
          style={[styles.claimButton, acceptingId === item._id && { opacity: 0.7 }]}
          onPress={() => handleClaim(item._id)}
          disabled={acceptingId === item._id}
        >
          {acceptingId === item._id ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.claimText}>Accept Job</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const listEmpty = useMemo(() => (
    <View style={styles.emptyState}>
      {loading ? (
        <ActivityIndicator size="large" color="#0758C2" />
      ) : (
        <Text style={styles.emptyText}>No jobs available right now.</Text>
      )}
    </View>
  ), [loading]);

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title="Available Jobs" placeholder="Search jobs" orders={false} profile={true} />
      <View style={{ paddingHorizontal: width * 0.05, marginTop: 12, flex: 1 }}>
    
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          renderItem={renderJob}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 160, flexGrow: jobs.length ? 0 : 1 }}
          ListEmptyComponent={listEmpty}
        />
      </View>
    </View>
  );
};

export default Jobs;

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLabel: {
    color: '#374151',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  route: { color: '#6b7280', fontWeight: '600' },
  metaText: { color: '#6b7280' },
  price: { color: '#0758C2', fontWeight: '700', marginTop: 4, fontSize: 16 },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  claimButton: {
    marginTop: 10,
    backgroundColor: '#0758C2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  claimText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
  },
});
