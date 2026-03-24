import { Tabs } from "expo-router";
import { BarChart3, AlertTriangle, Activity, Target } from "lucide-react-native";
import { StyleSheet } from "react-native";
import Colors from "@/constants/colors";

export default function AnalyticsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.success,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} /> }} />
      <Tabs.Screen name="errors" options={{ title: "Errors", tabBarIcon: ({ color, size }) => <AlertTriangle size={size} color={color} /> }} />
      <Tabs.Screen name="health" options={{ title: "Health", tabBarIcon: ({ color, size }) => <Activity size={size} color={color} /> }} />
      <Tabs.Screen name="metrics" options={{ title: "Metrics", tabBarIcon: ({ color, size }) => <Target size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#000000',
    borderTopColor: '#1a1a1a',
    borderTopWidth: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  tabItem: {
    paddingVertical: 4,
  },
});
