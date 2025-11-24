import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Dimensions } from 'react-native';

const { height, width } = Dimensions.get('window');

const Box = ({ value = '', onChangeText }) => {
  const [values, setValues] = useState(['', '', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    const chars = value.split('');
    if (chars.length === 5) {
      setValues(chars);
    }
  }, [value]);

  const handleChangeText = (text, index) => {
    if (!/^\d*$/.test(text)) return;

    const newValues = [...values];
    newValues[index] = text;
    setValues(newValues);

    const combined = newValues.join('');
    onChangeText && onChangeText(combined);

    if (text && index < 4) {
      inputRefs.current[index + 1]?.focus();
    } else if (!text && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {values.map((value, index) => (
        <View key={index} style={styles.box}>
          <TextInput
            ref={(ref) => (inputRefs.current[index] = ref)}
            keyboardType="numeric"
            textAlign="center"
            caretHidden={true}
            maxLength={1}
            style={styles.textInput}
            value={value}
            onChangeText={(text) => handleChangeText(text, index)}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width * 0.85,
    marginHorizontal: width * 0.08,
    flexDirection: 'row',
    alignContent: 'center',
  },
  box: {
    width: width * 0.13,
    height: height * 0.07,
    borderRadius: 20,
    backgroundColor: '#CFCECE',
    marginRight: width * 0.05,
    marginBottom: height * 0.05,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    fontSize: 24,
    padding: 0,
    margin: 0,
    height: '100%',
    width: '100%',
  },
});

export default Box;
