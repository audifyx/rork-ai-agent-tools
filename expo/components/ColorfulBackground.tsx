import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";

const { width: W, height: H } = Dimensions.get("window");

interface BlobProps {
  color: string;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

function Blob({ color, size, top, left, right, bottom }: BlobProps) {
  return (
    <View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        top,
        left,
        right,
        bottom,
      }}
    />
  );
}

interface ColorfulBackgroundProps {
  variant?: "home" | "login" | "detail";
}

export default function ColorfulBackground({ variant = "home" }: ColorfulBackgroundProps) {
  if (variant === "login") {
    return (
      <View style={styles.container} pointerEvents="none">
        <Blob color="rgba(99, 102, 241, 0.25)" size={W * 0.9} top={-H * 0.08} left={-W * 0.2} />
        <Blob color="rgba(255, 107, 157, 0.22)" size={W * 0.7} top={H * 0.15} right={-W * 0.25} />
        <Blob color="rgba(249, 115, 22, 0.18)" size={W * 0.6} bottom={H * 0.05} left={-W * 0.15} />
        <Blob color="rgba(20, 184, 166, 0.15)" size={W * 0.5} bottom={-H * 0.05} right={-W * 0.1} />
        <Blob color="rgba(251, 191, 36, 0.12)" size={W * 0.4} top={H * 0.45} left={W * 0.3} />
      </View>
    );
  }

  if (variant === "detail") {
    return (
      <View style={styles.container} pointerEvents="none">
        <Blob color="rgba(99, 102, 241, 0.14)" size={W * 0.7} top={-H * 0.06} right={-W * 0.2} />
        <Blob color="rgba(255, 107, 157, 0.12)" size={W * 0.5} top={H * 0.3} left={-W * 0.2} />
        <Blob color="rgba(14, 165, 233, 0.10)" size={W * 0.45} bottom={H * 0.1} right={-W * 0.1} />
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Blob color="rgba(255, 107, 157, 0.28)" size={W * 0.85} top={-H * 0.1} left={-W * 0.15} />
      <Blob color="rgba(99, 102, 241, 0.22)" size={W * 0.75} top={H * 0.08} right={-W * 0.3} />
      <Blob color="rgba(249, 115, 22, 0.20)" size={W * 0.6} top={H * 0.35} left={-W * 0.1} />
      <Blob color="rgba(20, 184, 166, 0.16)" size={W * 0.55} bottom={H * 0.12} right={-W * 0.15} />
      <Blob color="rgba(168, 85, 247, 0.14)" size={W * 0.5} bottom={-H * 0.04} left={W * 0.15} />
      <Blob color="rgba(251, 191, 36, 0.12)" size={W * 0.35} top={H * 0.55} right={W * 0.05} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
