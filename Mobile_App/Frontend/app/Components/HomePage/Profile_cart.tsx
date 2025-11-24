import EvilIcons from "@expo/vector-icons/EvilIcons";
import React from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
const { height } = Dimensions.get("window");

const Profile_cart = ({ iconComponent: Icon, iconName, text, onPress }) => {
  return (
    <TouchableOpacity style={styles.bottom}
    onPress={onPress}>
      <View style={styles.icon_cont}>
        {/* Render the icon dynamically with fixed size and color */}
        <Icon name={iconName} size={24} color="#555" />
        <Text style={styles.text}>{text}</Text>
      </View>
      <EvilIcons name="chevron-right" size={38} color="#555" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bottom: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "white",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 10,
    marginBottom: height * 0.002,
  },
  icon_cont: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    color: "black",
    marginLeft: 10,
    fontSize: 16,
  },
});

export default Profile_cart;
