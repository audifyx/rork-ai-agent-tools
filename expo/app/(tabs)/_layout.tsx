import { Tabs } from "expo-router";
import Colors from "@/constants/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
        tabBarActiveTintColor: Colors.accent,
      }}
    >
      <Tabs.Screen name="hub" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
