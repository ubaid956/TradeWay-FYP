import { View, Text, Dimensions, TouchableOpacity} from 'react-native'
import React from 'react'
import { globalStyles } from '@/Styles/globalStyles'
import AntDesign from '@expo/vector-icons/AntDesign';
const { height, width } = Dimensions.get('window')

const LoginHeader = ({ onPress, title, subtitle }) => {
    return (
        <View style={globalStyles.loginHeader}>
            <TouchableOpacity onPress={onPress}>
            <AntDesign name="arrowleft" size={28} color="#626856" onPress={onPress} style={{marginLeft: width*0.08, marginBottom: height*0.03}}/>
            </TouchableOpacity>
            <Text style={globalStyles.title}>{title}</Text>
            <Text style={[globalStyles.msgText, {marginBottom: height*0.03}]}>{subtitle}</Text>
        </View>
    )
}


export default LoginHeader