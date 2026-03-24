import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path } from "react-native-svg";
import Colors from "@/constants/colors";

interface LobsterWatermarkProps {
  size?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}

export function LobsterWatermark({ size = 190, opacity = 0.04, style }: LobsterWatermarkProps) {
  return (
    <View pointerEvents="none" style={[styles.container, { opacity }, style]} testID="lobster-watermark">
      <Svg width={size} height={size * 1.1} viewBox="0 0 200 220">
        <G transform="translate(100,115)">
          <Ellipse cx={0} cy={10} rx={34} ry={52} fill={Colors.accent} />
          <Path d="M-22,55 Q0,82 22,55 Q12,72 0,78 Q-12,72 -22,55Z" fill={Colors.accent} />
          <Path d="M-30,-10 C-58,-15 -72,-42 -62,-58 C-57,-63 -47,-60 -50,-50 C-52,-42 -44,-30 -30,-25Z" fill={Colors.accent} />
          <Path d="M-62,-58 C-78,-76 -92,-58 -75,-44 C-68,-37 -57,-47 -62,-58Z" fill={Colors.accentBright} />
          <Path d="M30,-10 C58,-15 72,-42 62,-58 C57,-63 47,-60 50,-50 C52,-42 44,-30 30,-25Z" fill={Colors.accent} />
          <Path d="M62,-58 C78,-76 92,-58 75,-44 C68,-37 57,-47 62,-58Z" fill={Colors.accentBright} />
          <Circle cx={-15} cy={-24} r={12} fill={Colors.accent} />
          <Circle cx={15} cy={-24} r={12} fill={Colors.accent} />
          <Path d="M-10,-40 C-28,-66 -38,-82 -30,-94" stroke={Colors.accent} strokeWidth={3} fill="none" />
          <Path d="M10,-40 C28,-66 38,-82 30,-94" stroke={Colors.accent} strokeWidth={3} fill="none" />
          <Line x1={-26} y1={20} x2={-52} y2={40} stroke={Colors.accent} strokeWidth={3} />
          <Line x1={-23} y1={30} x2={-46} y2={52} stroke={Colors.accent} strokeWidth={3} />
          <Line x1={26} y1={20} x2={52} y2={40} stroke={Colors.accent} strokeWidth={3} />
          <Line x1={23} y1={30} x2={46} y2={52} stroke={Colors.accent} strokeWidth={3} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: -20,
    top: 10,
  },
});
