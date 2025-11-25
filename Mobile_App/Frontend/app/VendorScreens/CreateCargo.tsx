import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';
import { apiService, CreateJobPayload } from '../services/apiService';

const { width } = Dimensions.get('window');

type CargoParams = {
  productId?: string;
  buyerId?: string;
  orderId?: string;
  bidId?: string;
};

const CreateCargo = () => {
  const params = useLocalSearchParams<CargoParams>();
  const [orderId, setOrderId] = useState(params.orderId || '');
  const [productId, setProductId] = useState(params.productId || '');
  const [buyerId, setBuyerId] = useState(params.buyerId || '');
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [cargoType, setCargoType] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupContact, setPickupContact] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [deliveryContact, setDeliveryContact] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean((orderId || productId) && originCity && destinationCity);
  }, [orderId, productId, originCity, destinationCity]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Missing information', 'Please provide at least order/product reference and both cities.');
      return;
    }

    const payload: CreateJobPayload = {
      orderId: orderId || undefined,
      productId: productId || undefined,
      buyerId: buyerId || undefined,
      origin: {
        city: originCity,
        address: originAddress,
      },
      destination: {
        city: destinationCity,
        address: destinationAddress,
      },
      pickupContact: pickupContact
        ? {
            name: pickupContact,
            phone: pickupPhone,
          }
        : undefined,
      deliveryContact: deliveryContact
        ? {
            name: deliveryContact,
            phone: deliveryPhone,
          }
        : undefined,
      cargoDetails: {
        weight: weight ? Number(weight) : undefined,
        unit: weight ? 'kg' : undefined,
        dimensions: dimensions || undefined,
        cargoType: cargoType || undefined,
      },
      price: price ? Number(price) : undefined,
      notes: notes || undefined,
    };

    setSubmitting(true);
    try {
      const response = await apiService.jobs.createJob(payload);
      if (response.success) {
        Alert.alert('Cargo posted', 'Drivers can now see this job.', [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
          { text: 'Post Another' },
        ]);
        setNotes('');
      } else {
        throw new Error(response.error || 'Failed to create job');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Unable to post cargo job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title="Post Cargo Job" placeholder="" orders={false} profile={true} />
      <ScrollView style={{ paddingHorizontal: width * 0.05, marginTop: 12 }} contentContainerStyle={{ paddingBottom: 160 }}>
        <Text style={styles.sectionLabel}>Reference</Text>
        <TextInput
          style={styles.input}
          value={orderId}
          onChangeText={setOrderId}
          placeholder="Order ID (if available)"
          autoCapitalize="characters"
        />
        <TextInput
          style={styles.input}
          value={productId}
          onChangeText={setProductId}
          placeholder="Product ID"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={buyerId}
          onChangeText={setBuyerId}
          placeholder="Buyer ID"
          autoCapitalize="none"
        />

        <Text style={styles.sectionLabel}>Route</Text>
        <Text style={styles.label}>Origin City</Text>
        <TextInput style={styles.input} value={originCity} onChangeText={setOriginCity} placeholder="e.g. Karachi" />
        <Text style={styles.label}>Origin Address</Text>
        <TextInput style={styles.input} value={originAddress} onChangeText={setOriginAddress} placeholder="Pickup address" />
        <Text style={styles.label}>Destination City</Text>
        <TextInput style={styles.input} value={destinationCity} onChangeText={setDestinationCity} placeholder="e.g. Lahore" />
        <Text style={styles.label}>Destination Address</Text>
        <TextInput
          style={styles.input}
          value={destinationAddress}
          onChangeText={setDestinationAddress}
          placeholder="Drop-off address"
        />

        <Text style={styles.sectionLabel}>Cargo Details</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="Budget / payout"
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          placeholder="Weight (kg)"
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          value={cargoType}
          onChangeText={setCargoType}
          placeholder="Cargo type (e.g. marble slabs)"
        />
        <TextInput
          style={styles.input}
          value={dimensions}
          onChangeText={setDimensions}
          placeholder="Dimensions or pallet info"
        />

        <Text style={styles.sectionLabel}>Contacts</Text>
        <TextInput
          style={styles.input}
          value={pickupContact}
          onChangeText={setPickupContact}
          placeholder="Pickup contact name"
        />
        <TextInput
          style={styles.input}
          value={pickupPhone}
          onChangeText={setPickupPhone}
          placeholder="Pickup contact phone"
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          value={deliveryContact}
          onChangeText={setDeliveryContact}
          placeholder="Delivery contact name"
        />
        <TextInput
          style={styles.input}
          value={deliveryPhone}
          onChangeText={setDeliveryPhone}
          placeholder="Delivery contact phone"
          keyboardType="phone-pad"
        />

        <Text style={styles.sectionLabel}>Notes</Text>
        <TextInput
          style={[styles.input, { height: 100 }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any special handling instructions"
          multiline
        />

        <TouchableOpacity
          style={[styles.btn, (!canSubmit || submitting) && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700' }}>Post Cargo</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default CreateCargo;

const styles = StyleSheet.create({
  sectionLabel: {
    marginTop: 20,
    marginBottom: 6,
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
  },
  label: { marginTop: 12, color: '#374151', fontWeight: '600' },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  btn: { marginTop: 24, backgroundColor: '#0758C2', padding: 16, borderRadius: 12, alignItems: 'center' },
});
