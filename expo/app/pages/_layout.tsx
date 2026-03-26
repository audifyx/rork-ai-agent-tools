import { Tabs } from "expo-router";
import { Globe, Radio, Activity } from "lucide-react-native";
import { Platform, StyleSheet } from "react-native";
import Colors from "@/constants/colors";

export default function PagesLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
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
  tabBar: {
    backgroundColor: "#050505",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: Platform.OS === "ios" ? 72 : 62,
    paddingBottom: Platform.OS === "ios" ? 12 : 6,
    paddingTop: 8,
  },
  tabLabel: { fontSize: 9, fontWeight: "600", marginTop: 2 },
  tabItem: { paddingTop: 4 },
});
