import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "@/stores/authStore";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

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
  "theme-settings",
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
      if (onIndex || inAuthGroup) {
        router.replace("/hub");
      }
    } else {
      if (!inAuthGroup && !onIndex) {
        router.replace("/(auth)/login");
      }
    }
  }, [session, loading, segments, router]);

  return <>{children}</>;
}

function ThemedStack() {
  const { colors, theme } = useTheme();

  const glassHeader = (title: string, tintColor: string) => ({
    headerShown: true,
    headerTitle: title,
    headerBackTitle: "Home",
    headerStyle: {
      backgroundColor: theme.dark ? "rgba(10, 10, 10, 0.92)" : "rgba(242, 240, 245, 0.85)",
    },
    headerTintColor: tintColor,
    headerTitleStyle: { fontSize: 16, fontWeight: "700" as const, color: colors.text },
    headerShadowVisible: false,
    headerBlurEffect: theme.headerBlur,
  });

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="hub" />
      <Stack.Screen name="activity"      options={glassHeader("⚡ Activity",      colors.text)} />
      <Stack.Screen name="notifications" options={glassHeader("🔔 Alerts",       colors.text)} />
      <Stack.Screen name="settings"      options={glassHeader("⚙️ Settings",     colors.text)} />
      <Stack.Screen name="profile"       options={glassHeader("👤 Profile",      colors.text)} />
      <Stack.Screen name="openclaw"  options={glassHeader("🦞 OpenClaw",      colors.accent)} />
      <Stack.Screen name="tweeter"   options={glassHeader("🐦 Agent Tweeter", "#6366F1")} />
      <Stack.Screen name="vault"     options={glassHeader("🔐 ClawVault",     "#A855F7")} />
      <Stack.Screen name="analytics" options={glassHeader("📊 ClawAnalytics", colors.success)} />
      <Stack.Screen name="pages"     options={glassHeader("🌐 ClawPages",     colors.info)} />
      <Stack.Screen name="swarm"     options={glassHeader("🐝 ClawSwarm",     "#F59E0B")} />
      <Stack.Screen name="imagegen"  options={glassHeader("🎨 ClawImageGen",  "#EC4899")} />
      <Stack.Screen name="clawbg"    options={glassHeader("🎨 ClawBG",         colors.accent)} />
      <Stack.Screen name="theme-settings" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <AuthGate>
            <ThemedStack />
          </AuthGate>
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
