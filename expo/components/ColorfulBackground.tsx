import React from "react";
import { View, StyleSheet, Dimensions, Image } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";

const { width: W, height: H } = Dimensions.get("window");

const BLOOD_GLASS_BG = "https://r2-pub.rork.com/projects/h7ed0qpftp3eanen3adn7/assets/43a3092b-154f-4181-9c8b-18ab30426943.png";

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
  const { theme } = useTheme();
  const blobs = theme.blobs;
  const showBgImage = theme.id === "blood_gold" && variant === "home";

  return (
    <View style={styles.container} pointerEvents="none">
      {showBgImage && (
        <Image
          source={{ uri: BLOOD_GLASS_BG }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.35 }]}
          resizeMode="cover"
        />
      )}
      {blobs.map((blob, i) => (
        <Blob
          key={`${theme.id}-${i}`}
          color={variant === "detail" ? blob.color.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.6})`) : blob.color}
          size={W * blob.size}
          top={blob.top != null ? H * blob.top : undefined}
          left={blob.left != null ? W * blob.left : undefined}
          right={blob.right != null ? W * blob.right : undefined}
          bottom={blob.bottom != null ? H * blob.bottom : undefined}
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
