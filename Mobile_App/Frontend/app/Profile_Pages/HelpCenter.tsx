import {
    ScrollView,
    Text,
    Alert,
    View,
    Image,
    Dimensions,
    SafeAreaView,
    ActivityIndicator
} from 'react-native';
import { globalStyles } from '@/Styles/globalStyles';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import CustomHeader from '../Components/Headers/CustomHeader';
import Profile_cart from '../Components/HomePage/Profile_cart';
const { height, width } = Dimensions.get('window')
const HelpCenter = () => {
    const [loading, setLoading] = useState(false);

    const handleDeleteAccount = async () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete Account',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const userToken = await AsyncStorage.getItem('userToken');
                            if (!userToken) {
                                throw new Error('User not authenticated');
                            }

                            // Call backend to delete account
                            const response = await axios.delete(
                                'https://37prw4st-5000.asse.devtunnels.ms/api/auth/users/delete-account',
                                {
                                    headers: {
                                        'Authorization': `Bearer ${userToken}`,
                                        'Content-Type': 'application/json'
                                    }
                                }
                            );

                            if (response.status === 200) {
                                // Clear local data
                                await AsyncStorage.multiRemove(['userToken', 'userData', 'userId', 'pushToken']);
                                Alert.alert('Success', 'Account deleted successfully');
                                router.push('/Screens/Login');
                            }
                        } catch (error) {
                            console.error('Account deletion error:', error);
                            Alert.alert('Error', 'Failed to delete account');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <CustomHeader
                title="Help Center"
                onBackPress={() => router.back()}
            />
            <ScrollView>



                <Image
                    source={require('../../assets/images/Splash/splash_blue.png')} style={[globalStyles.image, {

                        marginTop: height * 0.04,
                    }]} resizeMode='contain' />


                <Text style={{ fontSize: 25, fontWeight: 'bold', textAlign: 'center', marginBottom: height * 0.03 }}>
                    How can we help you?
                </Text>

                <Text style={{ marginLeft: width * 0.06, fontSize: 18 }}>
                    Help Topics
                </Text>

                <View style={{ backgroundColor: '#f4f4f4' }}>
                    <Profile_cart
                        iconComponent={MaterialIcons}
                        text="Getting Started"
                        iconName="flag" />

                    <Profile_cart
                        iconComponent={MaterialIcons}
                        text="Chats"
                        iconName="message" />
                    <Profile_cart
                        iconComponent={MaterialIcons}
                        text="Voice & Video Calls"
                        iconName="phone" />

                    <Profile_cart
                        iconComponent={MaterialIcons}
                        text="Accounts & Bans"
                        iconName="man" />

                    <Profile_cart
                        onPress={loading ? null : handleDeleteAccount}
                        iconComponent={MaterialIcons}
                        text={loading ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#dc2626" style={{ marginRight: 8 }} />
                                <Text style={{ color: '#dc2626' }}>Deleting Account...</Text>
                            </View>
                        ) : 'Delete Account'}
                        iconName="delete" />
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default HelpCenter