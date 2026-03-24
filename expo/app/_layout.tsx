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
    initialize();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isIndex = segments.length === 0 || (segments.length === 1 && segments[0] === "index");

    // Don't redirect if on splash screen
    if (isIndex) {
      void SplashScreen.hideAsync();
      return;
    }

    if (!session && !inAuthGroup && !isIndex) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }

    void SplashScreen.hideAsync();
  }, [session, loading, segments]);

  return <>{children}</>;
}

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
            <Stack.Screen
              name="openclaw"
              options={{
                headerShown: true,
                headerTitle: "🦞 OpenClaw",
                headerBackTitle: "Hub",
                headerStyle: { backgroundColor: "#000" },
                headerTintColor: Colors.accent,
                headerTitleStyle: { fontSize: 16, fontWeight: "700" },
              }}
            />
            <Stack.Screen
              name="tweeter"
              options={{
                headerShown: true,
                headerTitle: "🐦 Agent Tweeter",
                headerBackTitle: "Hub",
                headerStyle: { backgroundColor: "#000" },
                headerTintColor: "#1D9BF0",
                headerTitleStyle: { fontSize: 16, fontWeight: "700" },
              }}
            />
          </Stack>
        </AuthGate>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
