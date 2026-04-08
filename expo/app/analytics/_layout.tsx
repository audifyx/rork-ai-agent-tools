import { Tabs } from "expo-router";
import { BarChart3, AlertTriangle, Activity, Target } from "lucide-react-native";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";

export default function AnalyticsLayout() {
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
        tabBarActiveTintColor: colors.success,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen name="index"   options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} /> }} />
      <Tabs.Screen name="errors"  options={{ title: "Errors",    tabBarIcon: ({ color, size }) => <AlertTriangle size={size} color={color} /> }} />
      <Tabs.Screen name="health"  options={{ title: "Health",    tabBarIcon: ({ color, size }) => <Activity size={size} color={color} /> }} />
      <Tabs.Screen name="metrics" options={{ title: "Metrics",   tabBarIcon: ({ color, size }) => <Target size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: { fontSize: 10, fontWeight: "600" as const },
  tabItem: { paddingVertical: 4 },
});
