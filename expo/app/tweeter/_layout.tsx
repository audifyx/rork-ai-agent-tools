import { Tabs } from "expo-router";
import { Brain, Activity, Flame, BarChart3, Calendar, Sliders } from "lucide-react-native";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";

export default function TweeterLayout() {
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
      <Tabs.Screen name="index"       options={{ title: "Feed",      tabBarIcon: ({ color, size }) => <Flame size={size} color={color} /> }} />
      <Tabs.Screen name="personality" options={{ title: "Brain",     tabBarIcon: ({ color, size }) => <Brain size={size} color={color} /> }} />
      <Tabs.Screen name="logs"        options={{ title: "Logs",      tabBarIcon: ({ color, size }) => <Activity size={size} color={color} /> }} />
      <Tabs.Screen name="analytics"   options={{ title: "Analytics", tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} /> }} />
      <Tabs.Screen name="calendar"    options={{ title: "Calendar",  tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} /> }} />
      <Tabs.Screen name="tuner"       options={{ title: "Tuner",     tabBarIcon: ({ color, size }) => <Sliders size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: { fontSize: 9, fontWeight: "700" as const, marginTop: 2, letterSpacing: 0.3 },
  tabItem: { paddingTop: 4 },
});
