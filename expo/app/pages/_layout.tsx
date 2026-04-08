import { Tabs } from "expo-router";
import { Globe, Radio, Activity } from "lucide-react-native";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";

export default function PagesLayout() {
  const { colors, theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.dark ? colors.surfaceSolid : colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 72 : 62,
          paddingBottom: Platform.OS === "ios" ? 12 : 6,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Sites", tabBarIcon: ({ color, size }) => <Globe size={size} color={color} /> }} />
      <Tabs.Screen name="live"  options={{ title: "Live",  tabBarIcon: ({ color, size }) => <Radio size={size} color={color} /> }} />
      <Tabs.Screen name="logs"  options={{ title: "Logs",  tabBarIcon: ({ color, size }) => <Activity size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: { fontSize: 9, fontWeight: "600" as const, marginTop: 2 },
  tabItem: { paddingTop: 4 },
});
