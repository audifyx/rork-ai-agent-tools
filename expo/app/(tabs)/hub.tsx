import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Dimensions, Animated, StatusBar, Linking, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";
import { LogOut, Bell, Search } from "lucide-react-native";

const { width } = Dimensions.get("window");
const COLS = 4;
const APP_SIZE = (width - 48) / COLS;
const APP_ICON_SIZE = APP_SIZE * 0.72;

// ── App definitions ──────────────────────────────────────────────
const APPS = [
  // Row 1 — Core
  { id: "openclaw",   name: "OpenClaw",   emoji: "🦞", color: ["#DC2626","#991B1B"], route: "/openclaw",   badge: null },
  { id: "tweeter",    name: "Tweeter",    emoji: "🐦", color: ["#1D4ED8","#1E3A8A"], route: "/tweeter",    badge: "NEW" },
  { id: "vault",      name: "Vault",      emoji: "🔐", color: ["#7C3AED","#5B21B6"], route: "/vault",      badge: null },
  { id: "analytics",  name: "Analytics",  emoji: "📊", color: ["#059669","#065F46"], route: "/analytics",  badge: null },
  // Row 2
  { id: "swarm",      name: "Swarm",      emoji: "🐝", color: ["#D97706","#92400E"], route: "/swarm",      badge: "NEW" },
  { id: "pages",      name: "Pages",      emoji: "🌐", color: ["#0284C7","#075985"], route: "/pages",      badge: null },
  { id: "imagegen",   name: "ImageGen",   emoji: "🎨", color: ["#9333EA","#6B21A8"], route: "/imagegen",   badge: "NEW" },
  { id: "notebook",   name: "Notebook",   emoji: "📓", color: ["#DC2626","#991B1B"], route: null,          badge: "SOON" },
  // Row 3
  { id: "scheduler",  name: "Scheduler",  emoji: "⏰", color: ["#0891B2","#164E63"], route: null,          badge: "SOON" },
  { id: "mailer",     name: "Mailer",     emoji: "📧", color: ["#EA580C","#9A3412"], route: null,          badge: "SOON" },
  { id: "scraper",    name: "Scraper",    emoji: "🕷️", color: ["#4F46E5","#312E81"], route: null,          badge: "SOON" },
  { id: "agentcode",  name: "AgentCode",  emoji: "💻", color: ["#0E7490","#164E63"], route: "https://agentcode.lovable.app/", external: true, badge: null },
  // Row 4
  { id: "nexus",      name: "Nexus",      emoji: "🔮", color: ["#7C3AED","#4C1D95"], route: "https://nexus-skillhub.lovable.app/", external: true, badge: "NEW" },
  { id: "settings",   name: "Settings",   emoji: "⚙️", color: ["#374151","#1F2937"], route: "/settings",   badge: null },
];

const DOCK_APPS = [
  { id: "hub",       emoji: "🏠", label: "Hub",      route: null },
  { id: "activity",  emoji: "⚡", label: "Activity", route: "/activity" },
  { id: "notifs",    emoji: "🔔", label: "Alerts",   route: "/notifications" },
  { id: "profile",   emoji: "👤", label: "Profile",  route: "/settings" },
];

// ── App Icon ─────────────────────────────────────────────────────
function AppIcon({ app, onPress, stats }: { app: any; onPress: () => void; stats?: Record<string, number> }) {
  const scale = useRef(new Animated.Value(1)).current;
  const badgeCount = stats?.[app.id] ?? 0;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.88, tension: 300, friction: 10, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();

  const isSoon = app.badge === "SOON";

  return (
    <TouchableOpacity
      style={st.appCell}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isSoon}
      activeOpacity={1}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {/* Icon */}
        <View style={[st.appIcon, {
          width: APP_ICON_SIZE, height: APP_ICON_SIZE, borderRadius: APP_ICON_SIZE * 0.225,
          backgroundColor: app.color[0],
        }]}>
          {/* Inner gradient simulation */}
          <View style={[st.appIconInner, { borderRadius: APP_ICON_SIZE * 0.225 - 1, backgroundColor: app.color[1] + "40" }]} />
          <Text style={[st.appEmoji, { fontSize: APP_ICON_SIZE * 0.45 }]}>{app.emoji}</Text>
          {isSoon && <View style={st.appSoonOverlay}><Text style={st.appSoonText}>Soon</Text></View>}
        </View>

        {/* Badge */}
        {app.badge && app.badge !== "SOON" && (
          <View style={[st.appBadge, { backgroundColor: app.badge === "NEW" ? Colors.accent : Colors.warning }]}>
            <Text style={st.appBadgeText}>{app.badge}</Text>
          </View>
        )}

        {/* Notification count badge */}
        {badgeCount > 0 && (
          <View style={st.appNotifBadge}>
            <Text style={st.appNotifBadgeText}>{badgeCount > 99 ? "99+" : badgeCount}</Text>
          </View>
        )}
      </Animated.View>
      <Text style={[st.appLabel, isSoon && { opacity: 0.35 }]} numberOfLines={1}>{app.name}</Text>
    </TouchableOpacity>
  );
}

// ── Main screen ──────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const [stats, setStats] = useState<any>({});
  const [unread, setUnread] = useState(0);
  const [greeting, setGreeting] = useState("");
  const screenFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");

    Animated.timing(screenFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    if (!user) return;
    (async () => {
      const [{ count: notifCount }, { count: tweetCount }, { count: swarmCount }, { count: imgCount }] = await Promise.all([
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
        supabase.from("agent_tweets").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("swarm_agents").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active"),
        supabase.from("generated_images").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setUnread(notifCount ?? 0);
      setStats({ tweeter: tweetCount ?? 0, swarm: swarmCount ?? 0, imagegen: imgCount ?? 0 });
    })();
  }, [user]);

  const handleApp = (app: any) => {
    if (app.badge === "SOON") return;
    if (app.external) { Linking.openURL(app.route); return; }
    if (app.route) router.push(app.route as any);
  };

  return (
    <Animated.View style={[st.root, { opacity: screenFade }]}>
      <StatusBar barStyle="light-content" />

      {/* Subtle background glows */}
      <View style={st.glow1} />
      <View style={st.glow2} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={st.topBar}>
          <View>
            <Text style={st.greeting}>{greeting}</Text>
            <Text style={st.userEmail} numberOfLines={1}>{user?.email?.split("@")[0] ?? "agent"}</Text>
          </View>
          <View style={st.topActions}>
            <TouchableOpacity style={st.topBtn} onPress={() => router.push("/notifications" as any)}>
              <Bell size={18} color={Colors.text} />
              {unread > 0 && <View style={st.topBtnBadge}><Text style={st.topBtnBadgeText}>{unread}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={st.topBtn} onPress={signOut}>
              <LogOut size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Widget — Stats row */}
        <View style={st.widget}>
          <View style={st.widgetGlow} />
          <Text style={st.widgetLabel}>🦞 OPENCLAW OS</Text>
          <View style={st.widgetStats}>
            {[
              { icon: "🐦", label: "Tweets",  val: stats.tweeter ?? 0 },
              { icon: "🐝", label: "Agents",  val: stats.swarm ?? 0 },
              { icon: "🎨", label: "Images",  val: stats.imagegen ?? 0 },
              { icon: "🔔", label: "Alerts",  val: unread },
            ].map(s => (
              <View key={s.label} style={st.widgetStat}>
                <Text style={st.widgetStatIcon}>{s.icon}</Text>
                <Text style={st.widgetStatVal}>{s.val}</Text>
                <Text style={st.widgetStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* App grid */}
        <View style={st.appGrid}>
          {APPS.map(app => (
            <AppIcon key={app.id} app={app} onPress={() => handleApp(app)} stats={stats} />
          ))}
        </View>
      </ScrollView>

      {/* Dock */}
      <View style={[st.dock, { paddingBottom: insets.bottom + 8 }]}>
        <View style={st.dockBlur} />
        {DOCK_APPS.map(d => (
          <TouchableOpacity
            key={d.id}
            style={st.dockItem}
            onPress={() => { if (d.route) router.push(d.route as any); }}
          >
            <View style={[st.dockIcon, d.id === "hub" && st.dockIconActive]}>
              <Text style={st.dockEmoji}>{d.emoji}</Text>
            </View>
            <Text style={[st.dockLabel, d.id === "hub" && { color: Colors.accent }]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  glow1: { position: "absolute", top: -80, left: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(220,38,38,0.06)" },
  glow2: { position: "absolute", bottom: 200, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(220,38,38,0.04)" },

  // Top bar
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  greeting: { fontSize: 13, color: Colors.textMuted, fontWeight: "500" },
  userEmail: { fontSize: 22, fontWeight: "800", color: Colors.text, letterSpacing: -0.5 },
  topActions: { flexDirection: "row", gap: 8 },
  topBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", position: "relative" },
  topBtnBadge: { position: "absolute", top: -4, right: -4, backgroundColor: Colors.accent, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  topBtnBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },

  // Widget
  widget: {
    marginHorizontal: 16, marginBottom: 24, padding: 16,
    backgroundColor: "rgba(220,38,38,0.07)", borderRadius: 22,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.15)", overflow: "hidden",
  },
  widgetGlow: { position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(220,38,38,0.1)" },
  widgetLabel: { fontSize: 10, fontWeight: "800", color: Colors.accent, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" },
  widgetStats: { flexDirection: "row", justifyContent: "space-between" },
  widgetStat: { alignItems: "center", gap: 4 },
  widgetStatIcon: { fontSize: 20 },
  widgetStatVal: { fontSize: 22, fontWeight: "900", color: Colors.text },
  widgetStatLabel: { fontSize: 9, fontWeight: "600", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },

  // App grid
  appGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12 },
  appCell: { width: APP_SIZE, alignItems: "center", paddingVertical: 10, gap: 6, position: "relative" },
  appIcon: { alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  appIconInner: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  appEmoji: { zIndex: 1 },
  appSoonOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "flex-end", paddingBottom: 4 },
  appSoonText: { fontSize: 8, fontWeight: "800", color: "rgba(255,255,255,0.5)", letterSpacing: 0.5 },
  appLabel: { fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.85)", textAlign: "center" },
  appBadge: { position: "absolute", top: -4, right: 6, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  appBadgeText: { fontSize: 7, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  appNotifBadge: { position: "absolute", top: -6, right: 4, backgroundColor: Colors.danger, borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 2, borderColor: "#000" },
  appNotifBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },

  // Dock
  dock: {
    position: "absolute", bottom: 0, left: 16, right: 16,
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 32,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    paddingTop: 10, marginBottom: 8,
    overflow: "hidden",
  },
  dockBlur: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" },
  dockItem: { alignItems: "center", gap: 3, paddingHorizontal: 4 },
  dockIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dockIconActive: { backgroundColor: "rgba(220,38,38,0.15)", borderWidth: 1, borderColor: "rgba(220,38,38,0.3)" },
  dockEmoji: { fontSize: 24 },
  dockLabel: { fontSize: 10, fontWeight: "600", color: Colors.textMuted },
});
