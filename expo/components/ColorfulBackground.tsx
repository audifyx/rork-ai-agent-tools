import React from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";

const { width: W, height: H } = Dimensions.get("window");

interface Win11AccentProps {
  color: string;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

function Win11Accent({ color, size, top, left, right, bottom }: Win11AccentProps) {
  return (
    <View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size * 0.5,
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
  const { theme } = useTheme();
  const isWin11 = theme.id === "win11_dark" || theme.id === "win11_light";

  if (isWin11) {
    const isDark = theme.dark;
    const baseColor = isDark ? "rgba(0, 120, 212, 0.06)" : "rgba(0, 120, 212, 0.04)";
    const accentColor = isDark ? "rgba(96, 205, 255, 0.04)" : "rgba(0, 90, 158, 0.03)";

    return (
      <View style={styles.container} pointerEvents="none">
        <Win11Accent color={baseColor} size={W * 1.8} top={-H * 0.4} right={-W * 0.6} />
        <Win11Accent color={accentColor} size={W * 1.2} bottom={-H * 0.3} left={-W * 0.4} />
        {variant === "home" && (
          <Win11Accent
            color={isDark ? "rgba(197, 134, 192, 0.04)" : "rgba(135, 100, 184, 0.03)"}
            size={W * 0.7}
            top={H * 0.3}
            left={-W * 0.15}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {theme.blobs.map((blob, i) => (
        <View
          key={`${theme.id}-${i}`}
          style={{
            position: "absolute",
            width: W * blob.size,
            height: W * blob.size,
            borderRadius: (W * blob.size) / 2,
            backgroundColor: variant === "detail"
              ? blob.color.replace(/[\d.]+\)$/, (m: string) => `${parseFloat(m) * 0.6})`)
              : blob.color,
            top: blob.top != null ? H * blob.top : undefined,
            left: blob.left != null ? W * blob.left : undefined,
            right: blob.right != null ? W * blob.right : undefined,
            bottom: blob.bottom != null ? H * blob.bottom : undefined,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
