import React from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SimpleLineIcons } from '@expo/vector-icons';

const { height, width } = Dimensions.get('window');

type CustomButtonProps = {
  title: React.ReactNode;
  onPress?: () => void;
  small?: boolean | 'true' | 'false';
  login?: boolean | 'true' | 'false';
  extraSmall?: boolean | 'true' | 'false';
  logout?: boolean | 'true' | 'false';
  disabled?: boolean | 'true' | 'false';
  style?: StyleProp<ViewStyle>;
};

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  small,
  login,
  extraSmall,
  logout,
  disabled,
  style,
}) => {
  const isSmall = small === true || small === 'true';
  const isExtraSmall = extraSmall === true || extraSmall === 'true';
  const isLogin = login === true || login === 'true';
  const isLogout = logout === true || logout === 'true';
  const isDisabled = disabled === true || disabled === 'true';

  const buttonDynamicStyle = {
    width: isExtraSmall
      ? width * 0.25
      : isSmall
        ? width * 0.65
        : width * 0.85,
    height: isExtraSmall ? height * 0.045 : height * 0.06,
    backgroundColor: isLogout ? 'white' : isLogin ? 'white' : '#0758C2',
    borderColor: isLogout ? 'red' : isLogin ? '#0758C2' : 'white',
    borderWidth: isLogout || isLogin ? 1 : 0,
    flexDirection: 'row',
    gap: 8,
    opacity: isDisabled ? 0.6 : 1,
  } as const;

  const textColor = isLogout ? 'red' : isLogin ? '#0758C2' : 'white';
  const textSize = isExtraSmall ? 14 : isSmall ? 14 : 18;

  const buttonContent =
    typeof title === 'string' ? (
      <Text
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: textSize,
          },
        ]}
      >
        {title}
      </Text>
    ) : (
      title
    );

  return (
    <TouchableOpacity
      style={[styles.btn, buttonDynamicStyle, style]}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
    >
      {isLogout && <SimpleLineIcons name="logout" size={20} color="red" />}
      {buttonContent}
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
