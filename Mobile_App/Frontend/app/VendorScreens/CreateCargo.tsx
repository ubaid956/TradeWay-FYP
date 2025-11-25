import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';

const { width } = Dimensions.get('window');

export default function CreateCargo() {
  const [title, setTitle] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [destination, setDestination] = useState('');
  const [fragility, setFragility] = useState('Medium');
  const [vehicleType, setVehicleType] = useState('Truck');

  const handleSubmit = () => {
    console.log('Create cargo', { title, weight, dimensions, destination, fragility, vehicleType });
    // TODO: call API to create cargo job posting
  };

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title="Post Cargo" placeholder="" orders={false} profile={true} />
      <ScrollView style={{ paddingHorizontal: width * 0.05, marginTop: 12 }}>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Marble slabs to Karachi" />

        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" />

        <Text style={styles.label}>Dimensions (LxWxH)</Text>
        <TextInput style={styles.input} value={dimensions} onChangeText={setDimensions} />

        <Text style={styles.label}>Destination</Text>
        <TextInput style={styles.input} value={destination} onChangeText={setDestination} />

        <Text style={styles.label}>Fragility</Text>
        <TextInput style={styles.input} value={fragility} onChangeText={setFragility} />

        <Text style={styles.label}>Preferred vehicle</Text>
        <TextInput style={styles.input} value={vehicleType} onChangeText={setVehicleType} />

        <TouchableOpacity style={styles.btn} onPress={handleSubmit}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Post Cargo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 12, color: '#374151', fontWeight: '600' },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginTop: 8 },
  btn: { marginTop: 18, backgroundColor: '#0758C2', padding: 14, borderRadius: 10, alignItems: 'center' },
});
