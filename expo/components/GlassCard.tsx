import React from "react";
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/providers/ThemeProvider";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  strong?: boolean;
}

export default function GlassCard({ children, style, intensity = 40, strong = false }: GlassCardProps) {
  const { colors, theme } = useTheme();
  const isWin11 = theme.id === "win11_dark" || theme.id === "win11_light";
  const bg = strong ? colors.glassBgStrong : colors.glassBg;
  const tint = theme.dark ? "dark" : "light";

  if (Platform.OS === "web") {
    if (isWin11) {
      return (
        <View style={[
          {
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: strong ? colors.surfaceSolid : colors.surface,
            overflow: "hidden" as const,
          },
          style,
        ]}>
          {children}
        </View>
      );
    }
    return (
      <View style={[
        {
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          backgroundColor: bg,
          overflow: "hidden" as const,
        },
        strong && { backgroundColor: colors.glassBgStrong },
        style,
      ]}>
        {children}
      </View>
    );
  }

  if (isWin11) {
    return (
      <View style={[
        {
          overflow: "hidden" as const,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}>
        <BlurView intensity={30} tint={tint} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: strong ? colors.surfaceSolid : colors.surface }]} />
        {children}
      </View>
    );
  }

  return (
    <View style={[{ overflow: "hidden" as const, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder }, style]}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />
      {children}
    </View>
  );
}
