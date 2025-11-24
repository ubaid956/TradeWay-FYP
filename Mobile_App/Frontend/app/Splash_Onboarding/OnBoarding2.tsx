import React from "react";
import {
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Animatable from "react-native-animatable";
import { globalStyles } from "@/Styles/globalStyles";
import ProgressCircleButton from "../Components/ProgressCircleButton";
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get("window");


const Onboarding2 = () => {
  // const navigation = useNavigation();
  const router = useRouter();


  const handleNext = () => {
    // navigation.navigate('Splash_Onboarding/OnBoarding3');
    router.push("/Splash_Onboarding/OnBoarding3");
  };

  const handleSkip = () => {
    router.push("/Splash_Onboarding/Location");
  };

  return (
    <View style={globalStyles.container}>
      <TouchableOpacity onPress={handleSkip} style={globalStyles.skipContainer}>
        <Text style={globalStyles.skipText}>Skip</Text>
      </TouchableOpacity>

      <Animatable.Image
        animation="fadeInDown"
        duration={1000}
        delay={300}
        source={require("../../assets/images/Splash/splash2.png")}
        style={globalStyles.image}
        resizeMode="contain"
      />

      <Animatable.Text
        animation="fadeInUp"
        duration={1000}
        delay={600}
        style={globalStyles.title}
      >
        Connect and Transport Effortlessly
      </Animatable.Text>

      <Animatable.Text
        animation="fadeInUp"
        duration={1000}
        delay={900}
        style={globalStyles.subtitle}
      >
        <Text>
          Post transport jobs, bid competitively, and manage your
          shipments with real-time tracking to ensure smooth deliveries.
        </Text>

      </Animatable.Text>

      <Animatable.View animation="bounceIn" delay={1200} style={globalStyles.nextButton}>
        <ProgressCircleButton
          currentScreen={2}
          totalScreens={3}
          onPress={handleNext}
        />
      </Animatable.View>
    </View>
  );
};

export default Onboarding2;
