import { View, Text, Dimensions, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import LoginHeader from '../Components/LoginHeader';
import CustomButton from '../Components/CustomButton';
import InputField from '../Components/InputFiled';
import { globalStyles } from '@/Styles/globalStyles';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useRouter } from 'expo-router';

const { height, width } = Dimensions.get('window');

const ForgotPassword = () => {
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSendCode = async () => {
        if (!email) {
            setErrorMessage('Please enter your email.');
            return;
        }

        setLoading(true);
        setErrorMessage('');
        try {
            const res = await axios.post('https://3d488f18f175.ngrok-free.app/api/auth/users/forgot', { email });

            if (res.status === 200) {
                navigation.navigate('Signup-Login/Verification', { email });
            }
        } catch (error: any) {
            const message =
                error?.response?.data?.message || 'Something went wrong. Please try again.';
            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={globalStyles.container}>
            <LoginHeader
                title="Forgot Password"
                subtitle="Enter your email or phone number and we'll send you a code to reset your password"
                onPress={() => { }}
            />

            <InputField
                placeholder="Email"
                icon="mail"
                value={email}
                onChangeText={(text) => {
                    setEmail(text);
                    setErrorMessage('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            {errorMessage !== '' && (
                <Text style={{ color: 'red', marginTop: 4, marginLeft: width * 0.09, fontSize: 12, }}>
                    {errorMessage}
                </Text>
            )}

            <View style={{ marginTop: height * 0.03 }}>
                <CustomButton
                    title={
                        loading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            "Send Code"
                        )
                    }
                    onPress={handleSendCode}
                    disabled={loading}
                />
            </View>
        </View>
    );
};

export default ForgotPassword;
