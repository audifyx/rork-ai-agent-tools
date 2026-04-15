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
  const isWin11 = theme.id === "win11_dark" || theme.id === "win11_light";

  const glassHeader = (title: string, tintColor: string) => ({
    headerShown: true,
    headerTitle: title,
    headerBackTitle: "Back",
    headerStyle: {
      backgroundColor: theme.dark ? "rgba(10, 10, 10, 0.92)" : "rgba(242, 240, 245, 0.85)",
    },
    headerTintColor: tintColor,
    headerTitleStyle: { fontSize: 16, fontWeight: "700" as const, color: colors.text },
    headerShadowVisible: false,
    headerBlurEffect: theme.headerBlur,
  });

  const win11Header = (title: string) => ({
    headerShown: true,
    headerTitle: title,
    headerBackTitle: "Back",
    headerStyle: {
      backgroundColor: "transparent",
    },
    headerTintColor: colors.text,
    headerTitleStyle: { fontSize: 14, fontWeight: "500" as const, color: colors.text },
    headerShadowVisible: false,
    headerBlurEffect: theme.headerBlur,
  });

  const makeHeader = isWin11 ? win11Header : glassHeader;

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
      <Stack.Screen name="activity"      options={makeHeader("Activity")} />
      <Stack.Screen name="notifications" options={makeHeader("Alerts")} />
      <Stack.Screen name="settings"      options={makeHeader("Settings")} />
      <Stack.Screen name="profile"       options={makeHeader("Profile")} />
      <Stack.Screen name="openclaw"  options={makeHeader("OpenClaw")} />
      <Stack.Screen name="tweeter"   options={makeHeader("Agent Tweeter")} />
      <Stack.Screen name="vault"     options={makeHeader("ClawVault")} />
      <Stack.Screen name="analytics" options={makeHeader("ClawAnalytics")} />
      <Stack.Screen name="pages"     options={makeHeader("ClawPages")} />
      <Stack.Screen name="swarm"     options={makeHeader("ClawSwarm")} />
      <Stack.Screen name="imagegen"  options={makeHeader("ClawImageGen")} />
      <Stack.Screen name="clawbg"    options={makeHeader("ClawBG")} />
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
