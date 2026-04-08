import React from "react";
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import Colors from "@/constants/colors";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  strong?: boolean;
}

export default function GlassCard({ children, style, intensity = 40, strong = false }: GlassCardProps) {
  const bg = strong ? Colors.glassBgStrong : Colors.glassBg;

  if (Platform.OS === "web") {
    return (
      <View style={[styles.webGlass, strong && styles.webGlassStrong, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  webGlass: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glassBg,
    overflow: "hidden",
  },
  webGlassStrong: {
    backgroundColor: Colors.glassBgStrong,
  },
});
