import React, { useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Check, Palette } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import type { ThemeDefinition } from "@/constants/themes";
import * as Haptics from "expo-haptics";

const { width: W } = Dimensions.get("window");
const CARD_W = (W - 48 - 12) / 3;
const CARD_H = CARD_W * 1.35;

function ThemeCard({ t, isActive, onSelect, activeAccent }: { t: ThemeDefinition; isActive: boolean; onSelect: () => void; activeAccent: string }) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.92, tension: 300, friction: 10, useNativeDriver: true }).start();
  }, [scale]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();
  }, [scale]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onSelect}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View style={[styles.card, isActive && [styles.cardActive, { borderColor: activeAccent }], { transform: [{ scale }] }]}>
        <View style={styles.cardPreview}>
          {t.preview.map((c, i) => (
            <View key={i} style={[styles.previewStripe, { backgroundColor: c, flex: 1 }]} />
          ))}
          {isActive && (
            <View style={styles.checkOverlay}>
              <View style={[styles.checkCircle, { backgroundColor: activeAccent }]}>
                <Check size={14} color="#fff" strokeWidth={3} />
              </View>
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardEmoji}>{t.emoji}</Text>
          <Text style={[styles.cardName, { color: t.dark ? "#aaa" : "#666" }, isActive && [styles.cardNameActive, { color: activeAccent }]]} numberOfLines={1}>{t.name}</Text>
        </View>
        {t.dark && (
          <View style={styles.darkBadge}>
            <Text style={styles.darkBadgeText}>DARK</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function ThemeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { themeId, setTheme, allThemes, colors, theme } = useTheme();

  const darkThemes = allThemes.filter(t => t.dark);
  const lightThemes = allThemes.filter(t => !t.dark);

  const handleSelect = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTheme(id);
  }, [setTheme]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Themes",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: 17, fontWeight: "700" as const, color: colors.text },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerArea}>
          <View style={[styles.headerIcon, { backgroundColor: colors.accentDim }]}>
            <Palette size={28} color={colors.accent} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Choose Your Vibe</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {allThemes.length} themes · {darkThemes.length} dark · {lightThemes.length} light
          </Text>
        </View>

        <View style={[styles.currentBanner, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
          <View style={styles.currentPreviewRow}>
            {theme.preview.map((c, i) => (
              <View key={i} style={[styles.currentPreviewDot, { backgroundColor: c }]} />
            ))}
          </View>
          <View style={styles.currentInfo}>
            <Text style={[styles.currentLabel, { color: colors.textMuted }]}>ACTIVE THEME</Text>
            <Text style={[styles.currentName, { color: colors.text }]}>{theme.emoji} {theme.name}</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DARK THEMES ({darkThemes.length})</Text>
        <View style={styles.grid}>
          {darkThemes.map(t => (
            <ThemeCard key={t.id} t={t} isActive={themeId === t.id} onSelect={() => handleSelect(t.id)} activeAccent={colors.accent} />
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>LIGHT THEMES ({lightThemes.length})</Text>
        <View style={styles.grid}>
          {lightThemes.map(t => (
            <ThemeCard key={t.id} t={t} isActive={themeId === t.id} onSelect={() => handleSelect(t.id)} activeAccent={colors.accent} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  headerArea: { alignItems: "center", paddingTop: 16, paddingBottom: 20 },
  headerIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, marginTop: 4 },

  currentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 24,
  },
  currentPreviewRow: { flexDirection: "row", gap: 4 },
  currentPreviewDot: { width: 20, height: 20, borderRadius: 6 },
  currentInfo: { flex: 1 },
  currentLabel: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 1.2 },
  currentName: { fontSize: 17, fontWeight: "700" as const, marginTop: 2 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 20,
  },

  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(128,128,128,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(128,128,128,0.12)",
  },
  cardActive: {
    borderWidth: 2,
  },
  cardPreview: {
    flex: 1,
    flexDirection: "row",
    overflow: "hidden",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  previewStripe: {},
  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  cardEmoji: { fontSize: 12 },
  cardName: { fontSize: 10, fontWeight: "600" as const, flex: 1 },
  cardNameActive: { fontWeight: "700" as const },
  darkBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  darkBadgeText: { fontSize: 7, fontWeight: "800" as const, color: "rgba(255,255,255,0.7)", letterSpacing: 0.5 },
});
