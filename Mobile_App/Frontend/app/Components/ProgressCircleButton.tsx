import React from "react";
import { TouchableOpacity, View, Dimensions } from "react-native";
import Svg, { Circle } from "react-native-svg";
import AntDesign from "@expo/vector-icons/AntDesign";

const { width } = Dimensions.get("window");

const ProgressCircleButton = ({ currentScreen, totalScreens, onPress }) => {
  const CIRCLE_RADIUS = 90;
  const STROKE_WIDTH = 6;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

  const progress = currentScreen / totalScreens;
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

  return (
    <View style={{ position: "relative", width: width * 0.2, height: width * 0.2 }}>
      <Svg height="100%" width="100%" viewBox="0 0 200 200">
        <Circle
          cx="100"
          cy="100"
          r={CIRCLE_RADIUS}
          stroke="#e0e0e0"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <Circle
          cx="100"
          cy="100"
          r={CIRCLE_RADIUS}
          stroke="#0057D8"
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={CIRCLE_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin="100,100"
        />
      </Svg>

      <TouchableOpacity
        style={{
          position: "absolute",
          top: width * 0.02,
          left: width * 0.02,
          width: width * 0.16,
          height: width * 0.16,
          borderRadius: width * 0.08,
          backgroundColor: "#0057D8",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={onPress}
      >
        <AntDesign name="arrowright" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default ProgressCircleButton;
