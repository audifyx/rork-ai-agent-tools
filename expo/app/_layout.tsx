import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    const currentPath = segments.join("/");
    const isSplashRoute = currentPath.length === 0;
    if (isSplashRoute) { void SplashScreen.hideAsync(); return; }
    if (!session && !inAuthGroup) router.replace("/(auth)/login");
    else if (session && inAuthGroup) router.replace("/(tabs)/hub");
    void SplashScreen.hideAsync();
  }, [session, loading, router, segments]);

  return <>{children}</>;
}

const screenHeader = (title: string, tintColor: string) => ({
  headerShown: true,
  headerTitle: title,
  headerBackTitle: "Home",
  headerStyle: { backgroundColor: "#000" },
  headerTintColor: tintColor,
  headerTitleStyle: { fontSize: 16, fontWeight: "700" as const },
  headerShadowVisible: false,
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthGate>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.background },
              headerTintColor: Colors.text,
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="openclaw" options={screenHeader("🦞 OpenClaw", Colors.accent)} />
            <Stack.Screen name="tweeter" options={screenHeader("🐦 Agent Tweeter", "#3B82F6")} />
            <Stack.Screen name="vault" options={screenHeader("🔐 ClawVault", "#8B5CF6")} />
            <Stack.Screen name="analytics" options={screenHeader("📊 ClawAnalytics", Colors.success)} />
            <Stack.Screen name="pages" options={screenHeader("🌐 ClawPages", Colors.info)} />
            <Stack.Screen name="swarm" options={screenHeader("🐝 ClawSwarm", "#F59E0B")} />
            <Stack.Screen name="imagegen" options={screenHeader("🎨 ClawImageGen", "#A855F7")} />
            <Stack.Screen name="settings" options={screenHeader("⚙️ Settings", Colors.textSecondary)} />
          </Stack>
        </AuthGate>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
