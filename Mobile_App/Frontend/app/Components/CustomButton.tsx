import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SimpleLineIcons } from '@expo/vector-icons';

const { height, width } = Dimensions.get('window');

const CustomButton = ({ title, onPress, small, login, extraSmall, logout }) => {
  return (
    <TouchableOpacity
      style={[styles.btn, {
        width: extraSmall
          ? width * 0.25
          : small
            ? width * 0.65
            : width * 0.85,
        height: extraSmall
          ? height * 0.045
          : height * 0.06,
        backgroundColor: logout
          ? 'white'
          : login
            ? 'white'
            : '#0758C2',
        borderColor: logout
          ? 'red'
          : login
            ? '#0758C2'
            : 'white',
        borderWidth: logout || login ? 1 : 0,
        flexDirection: 'row',
        gap: 8,
      }]}
      onPress={onPress}
    >
      {logout && <SimpleLineIcons name="logout" size={20} color="red" />}
      <Text style={[styles.text, {
        color: logout
          ? 'red'
          : login
            ? '#0758C2'
            : 'white',
        fontSize: extraSmall ? 14 : small ? 14 : 18,
      }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    height: height * 0.06,
    backgroundColor: '#0758C2',
    borderRadius: 10,
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    alignSelf: 'center',
  },
  text: {
    color: 'white',
    fontSize: 18,
  },
});

export default CustomButton;
