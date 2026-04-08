import { Tabs } from "expo-router";
import { LayoutDashboard, FolderOpen, Users, Webhook, FileText } from "lucide-react-native";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";

export default function OpenClawLayout() {
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
      <Tabs.Screen name="index"  options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tabs.Screen name="files"  options={{ title: "Files",     tabBarIcon: ({ color, size }) => <FolderOpen size={size} color={color} /> }} />
      <Tabs.Screen name="leads"  options={{ title: "Leads",     tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
      <Tabs.Screen name="logs"   options={{ title: "Logs",      tabBarIcon: ({ color, size }) => <Webhook size={size} color={color} /> }} />
      <Tabs.Screen name="docs"   options={{ title: "Docs",      tabBarIcon: ({ color, size }) => <FileText size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: { fontSize: 9, fontWeight: "600" as const, marginTop: 2 },
  tabItem: { paddingTop: 4 },
});
