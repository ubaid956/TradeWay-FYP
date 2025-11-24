import { View, Text, Alert } from 'react-native'
import React, { useState } from 'react'
import LoginHeader from '../Components/LoginHeader'
import Box from '../Components/Box'
import CustomButton from '../Components/CustomButton'
import { useNavigation } from '@react-navigation/native'

const Verification = () => {
  const navigation = useNavigation()
  const [otp, setOtp] = useState('')  // You'll need to update your Box component to accept onChangeText or similar to update OTP
  const [loading, setLoading] = useState(false);
  const handleVerify = async () => {
    try {
      const response = await fetch('https://3d488f18f175.ngrok-free.app/api/auth/users/verifyOtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ OTP: otp }), // ✅ Use "OTP" (uppercase)
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Verification Failed', data.message || 'Invalid OTP');
        return;
      }

      // ✅ OTP verified, pass userId to NewPassword screen
      navigation.navigate('Signup-Login/NewPassword', {
        userId: data.userId,
      })

    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('OTP Verification error:', error);
    }
  };


  return (
    <View>
      <LoginHeader
        title="Verification"
        subtitle="Enter the code sent to your email or phone number"
        onPress={() => { }}
      />

      <Box value={otp} onChangeText={setOtp} />

      <CustomButton title="Verify" onPress={handleVerify} />

      <Text style={{ textAlign: 'center', marginTop: 20 }}>
        Didn't receive the code? <Text style={{ color: '#0758C2' }}>Resend</Text>
      </Text>
    </View>
  )
}

export default Verification
