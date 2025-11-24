import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Dimensions, Image, TouchableOpacity } from 'react-native';
import { globalStyles } from '@/Styles/globalStyles';
import CustomButton from '../Components/CustomButton';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');
const Location = () => {

    const navigation = useNavigation()
    const router = useRouter();

    const handleNext = ()=>{
        // navigation.navigate("Signup-Login/Welcome")
        router.push("/Signup-Login/Welcome")
    }
    return (
        <ImageBackground
            source={require('../../assets/images/Splash/map.png')}
            style={styles.background}
            resizeMode="cover"
        >

            <View style={styles.overlayContainer}>
                <Image source={require('../../assets/images/Splash/marker.png')} style={{ width: 50, height: 50, marginTop: height * 0.05, marginBottom: height * 0.03 }} />
                <Text style={[globalStyles.title, { fontSize: 25, marginHorizontal: '0px' }]}>Enable your locations</Text>
                <Text style={globalStyles.subtitle}>Choose your location to start find the request around you </Text>
                <CustomButton title={"Enable Location"} onPress={handleNext} small="true" />
                <TouchableOpacity onPress={handleNext}>
                    <Text style={[globalStyles.subtitle, { fontWeight: 'bold', marginTop: height * 0.02 }]}>Skip for now </Text>

                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: 'black', // Optional: adjust based on image
        fontSize: 24,
        fontWeight: 'bold',
    },
    overlayContainer: {

        alignItems: 'center',
        width: width * 0.8,

        alignSelf: 'center',
        backgroundColor: 'white',
        borderRadius: 30,
    }
});

export default Location;
