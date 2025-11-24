import { globalStyles } from '@/Styles/globalStyles'
import React from 'react'
import { Dimensions, Image, Text, View } from 'react-native'
import CustomButton from '../Components/CustomButton'
import { useNavigation } from '@react-navigation/native'
import { useRouter } from 'expo-router';


const { height, width } = Dimensions.get('window')
const Welcome = () => {
    // const navigation = useNavigation()
    const router = useRouter();

    return (
        <View style={globalStyles.container}>
            <Image source={require('../../assets/images/Splash/splash_blue.png')} style={[globalStyles.image,{alignSelf: 'center'}]} resizeMode='contain' />
            <Text style={globalStyles.title}>Welcome to TradeWay</Text>

            <Text style={globalStyles.subtitle}>
                TradeWay is a trading platform that allows you to trade stocks, options, and cryptocurrencies with ease.
            </Text>

            <View style={{ marginTop: height * 0.18 }}>
                <CustomButton title='Create an Account' onPress={() => router.push("/Signup-Login/Signup")} />
            </View>

            <View style={{ marginTop: height * 0.016 }}>
                <CustomButton title='Login' onPress={() => router.push("/Signup-Login/Login")} login={true} />
            </View>
        </View>
    )
}

export default Welcome
