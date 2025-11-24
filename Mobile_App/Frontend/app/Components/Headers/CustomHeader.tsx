import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { globalStyles } from '@/Styles/globalStyles';


const { width, height } = Dimensions.get('window');
const CustomHeader = (props) => {
  const {
    title,
    onBackPress,
    showBackButton = true,
    onRightPress, // 👈 Add this
    rightComponent,
  } = props;

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        {showBackButton && (
          <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
        )}
        <Text style={[globalStyles.homeTitle, styles.title]}>{title}</Text>
      </View>

      {rightComponent && (
        <View style={styles.rightContainer}>
          <TouchableOpacity onPress={onRightPress}>
            <Feather name="share-2" size={20} color="#0758C2" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    width: width,
    flexDirection: 'row',
    paddingTop: height * 0.06,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    elevation: 4,
    // paddingTop: height*0.04,
    borderBottomColor: 'grey',
    borderBottomWidth: 0.5,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightContainer: {
    alignItems: 'flex-end',
    marginRight: width * 0.03,

  },
  backButton: {
    marginRight: width * 0.03,
  },
  title: {
    fontSize: width * 0.045,
    color: '#37475A',
  },
});

export default CustomHeader;