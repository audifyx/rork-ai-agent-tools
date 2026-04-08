import { Tabs } from "expo-router";
import { Bot, MessageSquare, Activity } from "lucide-react-native";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";

export default function SwarmLayout() {
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
      <Tabs.Screen name="index" options={{ title: "Agents", tabBarIcon: ({ color, size }) => <Bot size={size} color={color} /> }} />
      <Tabs.Screen name="chat"  options={{ title: "Chat",   tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} /> }} />
      <Tabs.Screen name="logs"  options={{ title: "Logs",   tabBarIcon: ({ color, size }) => <Activity size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: { fontSize: 9, fontWeight: "600" as const, marginTop: 2 },
  tabItem: { paddingTop: 4 },
});
