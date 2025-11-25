import { globalStyles } from '@/Styles/globalStyles'
import React from 'react'
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native'
import CustomButton from '../CustomButton'
import { formatCurrency } from '../../utils/currency'

const { width, height } = Dimensions.get('window')
const TrasnportCard = ({ companyName, pricePerKm, location, rating, availability, image, specilization }) => {
  return (
    <View style={styles.card}>
      <Image source={image} style={styles.image} />
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',  width: width * 0.61, marginBottom: height * 0.008 }}>
          <Text style={globalStyles.homeTitle}>{companyName}</Text>
          <Text style={{ fontSize: 14, color: '#555', marginRight: 10, }}>{rating} ⭐</Text>
        </View>
        <Text style={globalStyles.homeSubtitle}>
          {specilization}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>


          <Text style={{ fontSize: 14, color: '#555', marginRight: width*0.05 }}> {formatCurrency(pricePerKm, { fractionDigits: 0 })}/km</Text>
          <Text style={{ fontSize: 14, color: '#555' ,marginRight: width*0.05}}>{location}</Text>
          <CustomButton extraSmall title="Request Quote" onPress={() => console.log("Request Quote")} />
        </View>
      </View>

    </View>
  )
}
const styles = StyleSheet.create({
  card: {
    width: width * 0.94,
    display: 'flex',
    flexDirection: 'row',
    borderRadius: 10,
    marginBottom: height * 0.02,
    padding: 7,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,

  },
  image: {
    width: width * 0.2,
    height: 100,
    resizeMode: 'cover',
    borderRadius: 10,
  }
})
export default TrasnportCard