import { globalStyles } from '@/Styles/globalStyles'
import React from 'react'
import { Text, View } from 'react-native'

const FeatureText = ({ title }) => {
  return (
    <View style={globalStyles.featureTextContainer}>
      <Text style={globalStyles.featureText}>{title}</Text>
      <Text style={globalStyles.seeAll}>See All {'>>'}</Text>
    </View>
  )
}

export default FeatureText