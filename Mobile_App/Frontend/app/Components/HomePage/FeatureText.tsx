import { globalStyles } from '@/Styles/globalStyles'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

type FeatureTextProps = {
  title: string
  showSeeAll?: boolean
  onPressSeeAll?: () => void
}

const FeatureText = ({ title, showSeeAll = false, onPressSeeAll }: FeatureTextProps) => (
  <View style={globalStyles.featureTextContainer}>
    <Text style={globalStyles.featureText}>{title}</Text>
    {showSeeAll && (
      <TouchableOpacity onPress={onPressSeeAll} disabled={!onPressSeeAll}>
        <Text style={globalStyles.seeAll}>See All {'>>'}</Text>
      </TouchableOpacity>
    )}
  </View>
)

export default FeatureText