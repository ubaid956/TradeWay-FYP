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
import AntDesign from "@expo/vector-icons/AntDesign";
import ProgressCircleButton from "../Components/ProgressCircleButton";
import { useRouter } from 'expo-router';
const { width, height } = Dimensions.get("window");


const Onboarding1 = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const handleNext = () => {
    // navigation.navigate('Splash_Onboarding/OnBoarding2');

    router.push("/Splash_Onboarding/OnBoarding2");

  };

  const handleSkip = () => {
    // console.log("Skip pressed");
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
        source={require("../../assets/images/Splash/splash1.png")}
        style={globalStyles.image}
        resizeMode="contain"
      />

      <Animatable.Text
        animation="fadeInUp"
        duration={1000}
        delay={600}
        style={globalStyles.title}
      >
        <Text>
          Trade Smarter, Faster
        </Text>

      </Animatable.Text>

      <Animatable.Text
        animation="fadeInUp"
        duration={1000}
        delay={900}
        style={globalStyles.subtitle}
      >
        <Text>
          Discover premium marble products, place orders easily, and get
          AI-powered recommendations
        </Text>

      </Animatable.Text>

      <Animatable.View animation="bounceIn" delay={1200} style={globalStyles.nextButton}>
        <ProgressCircleButton
          currentScreen={1}
          totalScreens={3}
          onPress={handleNext}
        />
      </Animatable.View>
    </View>
  );
};

export default Onboarding1;
