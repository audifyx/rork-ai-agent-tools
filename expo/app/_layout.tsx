import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";
import { ClawBGWallpaper } from "@/hooks/useClawBG";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// All top-level routes that are valid destinations for logged-in users
const AUTHENTICATED_ROUTES = new Set([
  "hub",
  "openclaw",
  "tweeter",
  "vault",
  "analytics",
  "pages",
  "swarm",
  "imagegen",
  "activity",
  "notifications",
  "settings",
  "profile",
  "modal",
]);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (loading) return;

    void SplashScreen.hideAsync();

    const topSegment  = segments[0] as string | undefined;
    const inAuthGroup = topSegment === "(auth)";
    const onIndex     = !topSegment || topSegment === "index";
    const _inAppRoute = topSegment ? AUTHENTICATED_ROUTES.has(topSegment) : false;

    if (session) {
      // Logged in: only redirect if on the welcome screen or auth screens
      if (onIndex || inAuthGroup) {
        router.replace("/hub");
      }
      // If already on a valid app route — leave them there
    } else {
      // Not logged in: send to login unless on welcome or already in auth
      if (!inAuthGroup && !onIndex) {
        router.replace("/(auth)/login");
      }
    }
  }, [session, loading, segments, router]);

  return <>{children}</>;
}

const screenHeader = (title: string, tintColor: string) => ({
  headerShown: true,
  headerTitle: title,
  headerBackTitle: "Home",
  headerStyle: { backgroundColor: 'rgba(0,0,0,0.7)' },
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
              contentStyle: { backgroundColor: 'transparent' },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="hub" />
            <Stack.Screen name="activity"      options={screenHeader("\u26a1 Activity",      Colors.accent)} />
            <Stack.Screen name="notifications" options={screenHeader("\ud83d\udd14 Alerts",       Colors.warning)} />
            <Stack.Screen name="settings"      options={screenHeader("\u2699\ufe0f Settings",     Colors.textSecondary)} />
            <Stack.Screen name="profile"       options={screenHeader("\ud83d\udc64 Profile",      Colors.text)} />
            <Stack.Screen name="openclaw"  options={screenHeader("🦞 OpenClaw",      Colors.accent)} />
            <Stack.Screen name="tweeter"   options={screenHeader("🐦 Agent Tweeter", "#3B82F6")} />
            <Stack.Screen name="vault"     options={screenHeader("🔐 ClawVault",     "#8B5CF6")} />
            <Stack.Screen name="analytics" options={screenHeader("📊 ClawAnalytics", Colors.success)} />
            <Stack.Screen name="pages"     options={screenHeader("🌐 ClawPages",     Colors.info)} />
            <Stack.Screen name="swarm"     options={screenHeader("🐝 ClawSwarm",     "#F59E0B")} />
            <Stack.Screen name="imagegen"  options={screenHeader("🎨 ClawImageGen",  "#A855F7")} />
            <Stack.Screen name="clawbg"    options={screenHeader("🎨 ClawBG",         Colors.accent)} />

          </Stack>
          <ClawBGWallpaper opacity={0.88} />
        </AuthGate>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
