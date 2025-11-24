import React, { useEffect } from "react";
import { StyleSheet, Image, View, Text } from "react-native";
// import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from 'expo-router';

const Splash = () => {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('Splash_Onboarding/OnBoarding1'); // Navigate to Welcome after 3 seconds
    }, 3000);

    return () => clearTimeout(timer);
  }, []);
  return (
    // <LinearGradient
    //   colors={["#002D72", "#004AAD"]}
    //   style={styles.container}
    // >
    //   <View style={styles.content}>
    //     <Image
    //       source={require("../../assets/images/Splash/splash.png")} // make sure this is the logo
    //       style={styles.image}
    //     />
    //     <Text style={styles.text}>TradeWay</Text>
    //   </View>
    // </LinearGradient>
    <View>
      <Text>Splash Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    marginBottom: 10,
  },
  text: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "500",
  },
});

export default Splash;
