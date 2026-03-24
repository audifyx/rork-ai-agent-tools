import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, RefreshControl, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import {
  FolderOpen, Users, Webhook, Bot, HardDrive, TrendingUp,
  Shield, Globe, Zap, Activity, CircleDot,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}

// Glass card wrapper — iOS 26 frosted translucent material
function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={20} tint="dark" style={[styles.glassCard, style]}>
        <View style={styles.glassInner}>{children}</View>
      </BlurView>
    );
  }
  // Fallback for Android/web
  return (
    <View style={[styles.glassCardFallback, style]}>
      {children}
    </View>
  );
}

// Section header like iOS Settings
function SectionHeader({ title, icon: Icon }: { title: string; icon?: any }) {
  return (
    <View style={styles.sectionHeader}>
      {Icon && <Icon size={14} color={Colors.textMuted} />}
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

export default function HomeTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    files: 0, leads: 0, webhooks: 0, agents: 0,
    totalSize: 0, recentFiles: 0, apiKeyActive: false,
  });

  const loadStats = async () => {
    if (!user) return;
    const [f, l, w, a, files, keys] = await Promise.all([
      supabase.from("stored_files").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("webhook_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("agent_configs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("stored_files").select("file_size, created_at").eq("user_id", user.id),
      supabase.from("api_keys").select("is_active").eq("user_id", user.id).eq("is_active", true).limit(1),
    ]);
    const allFiles = files.data ?? [];
    const totalSize = allFiles.reduce((acc, f) => acc + (f.file_size ?? 0), 0);
    const dayAgo = Date.now() - 86400000;
    const recentFiles = allFiles.filter(f => new Date(f.created_at).getTime() > dayAgo).length;
    setStats({
      files: f.count ?? 0, leads: l.count ?? 0, webhooks: w.count ?? 0, agents: a.count ?? 0,
      totalSize, recentFiles, apiKeyActive: (keys.data?.length ?? 0) > 0,
    });
  };

  useEffect(() => { loadStats(); }, [user]);
  const onRefresh = async () => { setRefreshing(true); await loadStats(); setRefreshing(false); };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>🦞 OpenClaw</Text>
          <Text style={styles.headerSub}>Command Center</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      {/* ━━━ Primary Stats — 2x2 grid of glass widgets ━━━ */}
      <SectionHeader title="OVERVIEW" icon={Activity} />
      <View style={styles.widgetGrid}>
        {/* Files widget — large left */}
        <GlassCard style={styles.widgetLarge}>
          <View style={styles.widgetRow}>
            <View style={[styles.widgetIcon, { backgroundColor: "rgba(56,189,248,0.12)" }]}>
              <FolderOpen size={20} color="#38BDF8" />
            </View>
            <View style={styles.widgetTrend}>
              <TrendingUp size={12} color={Colors.textMuted} />
              <Text style={styles.widgetTrendText}>{stats.recentFiles} today</Text>
            </View>
          </View>
          <Text style={[styles.widgetValue, { color: "#38BDF8" }]}>{stats.files}</Text>
          <Text style={styles.widgetLabel}>Files</Text>
          <View style={styles.widgetMeter}>
            <View style={[styles.widgetMeterFill, { width: `${Math.min((stats.totalSize / 104857600) * 100, 100)}%`, backgroundColor: "#38BDF8" }]} />
          </View>
          <Text style={styles.widgetMeta}>{formatBytes(stats.totalSize)} used</Text>
        </GlassCard>

        {/* Right column — stacked */}
        <View style={styles.widgetStackRight}>
          <GlassCard style={styles.widgetSmall}>
            <View style={[styles.widgetIconSm, { backgroundColor: "rgba(52,211,153,0.12)" }]}>
              <Users size={16} color="#34D399" />
            </View>
            <Text style={[styles.widgetValueSm, { color: "#34D399" }]}>{stats.leads}</Text>
            <Text style={styles.widgetLabelSm}>Leads</Text>
          </GlassCard>

          <GlassCard style={styles.widgetSmall}>
            <View style={[styles.widgetIconSm, { backgroundColor: "rgba(251,191,36,0.12)" }]}>
              <Webhook size={16} color="#FBBF24" />
            </View>
            <Text style={[styles.widgetValueSm, { color: "#FBBF24" }]}>{stats.webhooks}</Text>
            <Text style={styles.widgetLabelSm}>API Calls</Text>
          </GlassCard>
        </View>
      </View>

      {/* Agent card — full width */}
      <GlassCard style={styles.agentCard}>
        <View style={styles.agentRow}>
          <View style={[styles.widgetIcon, { backgroundColor: Colors.accentDim }]}>
            <Bot size={20} color={Colors.accent} />
          </View>
          <View style={styles.agentInfo}>
            <Text style={styles.agentTitle}>Agent Status</Text>
            <Text style={styles.agentSub}>
              {stats.agents} configured · API key {stats.apiKeyActive ? "active" : "inactive"}
            </Text>
          </View>
          <View style={[styles.agentBadge, stats.apiKeyActive && styles.agentBadgeActive]}>
            <Text style={[styles.agentBadgeText, stats.apiKeyActive && styles.agentBadgeTextActive]}>
              {stats.apiKeyActive ? "Ready" : "Setup"}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* ━━━ Quick Metrics — horizontal inline items ━━━ */}
      <SectionHeader title="METRICS" icon={Zap} />
      <GlassCard style={styles.metricsCard}>
        <View style={styles.metricsGrid}>
          {[
            { label: "Storage", value: formatBytes(stats.totalSize), icon: HardDrive },
            { label: "24h Uploads", value: String(stats.recentFiles), icon: TrendingUp },
            { label: "API Key", value: stats.apiKeyActive ? "Active" : "None", icon: Shield },
            { label: "Endpoint", value: "Online", icon: Globe },
          ].map((m, i) => (
            <View key={m.label} style={[styles.metricItem, i < 2 && styles.metricItemBorder]}>
              <m.icon size={14} color={Colors.textMuted} />
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      {/* ━━━ System Status — grouped list ━━━ */}
      <SectionHeader title="SYSTEM" icon={CircleDot} />
      <GlassCard style={styles.statusCard}>
        {["Database", "File Storage", "API Endpoint", "Realtime"].map((name, i, arr) => (
          <View key={name} style={[styles.statusRow, i < arr.length - 1 && styles.statusRowBorder]}>
            <View style={styles.statusDotWrap}>
              <View style={styles.statusDotOuter} />
              <View style={styles.statusDotInner} />
            </View>
            <Text style={styles.statusName}>{name}</Text>
            <Text style={styles.statusValue}>Online</Text>
          </View>
        ))}
      </GlassCard>

      {/* Quick Start — minimal */}
      <SectionHeader title="QUICK START" icon={Zap} />
      <GlassCard style={styles.quickStartCard}>
        {[
          { num: "1", text: "Generate an API key in Settings" },
          { num: "2", text: "Configure your Agent with permissions" },
          { num: "3", text: "Copy the Docs into your agent" },
          { num: "4", text: "Start chatting — files, leads & more" },
        ].map((step, i, arr) => (
          <View key={step.num} style={[styles.stepRow, i < arr.length - 1 && styles.stepRowBorder]}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{step.num}</Text>
            </View>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 28, paddingTop: 4,
  },
  headerLeft: {},
  greeting: { fontSize: 26, fontWeight: "800", color: Colors.text, letterSpacing: -0.8 },
  headerSub: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(52,211,153,0.1)", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(52,211,153,0.15)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34D399" },
  liveText: { fontSize: 12, fontWeight: "700", color: "#34D399" },

  // Section headers
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginBottom: 10, marginTop: 24,
  },
  sectionHeaderText: {
    fontSize: 11, fontWeight: "700", color: Colors.textMuted,
    letterSpacing: 1.5,
  },

  // Glass card
  glassCard: {
    borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  glassInner: { padding: 0 },
  glassCardFallback: {
    borderRadius: 20, overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },

  // Widget grid — iOS 26 style asymmetric
  widgetGrid: { flexDirection: "row", gap: 10 },
  widgetLarge: { flex: 1.2, padding: 18 },
  widgetStackRight: { flex: 1, gap: 10 },
  widgetSmall: { flex: 1, padding: 16, alignItems: "center" },

  widgetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  widgetIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  widgetIconSm: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  widgetTrend: { flexDirection: "row", alignItems: "center", gap: 4 },
  widgetTrendText: { fontSize: 11, color: Colors.textMuted },
  widgetValue: { fontSize: 36, fontWeight: "800", letterSpacing: -1.5 },
  widgetValueSm: { fontSize: 28, fontWeight: "800", letterSpacing: -1 },
  widgetLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  widgetLabelSm: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  widgetMeter: {
    height: 3, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2,
    marginTop: 14, overflow: "hidden",
  },
  widgetMeterFill: { height: 3, borderRadius: 2 },
  widgetMeta: { fontSize: 10, color: Colors.textMuted, marginTop: 6 },

  // Agent card
  agentCard: { marginTop: 10, padding: 16 },
  agentRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  agentInfo: { flex: 1 },
  agentTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  agentSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  agentBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: Colors.border,
  },
  agentBadgeActive: {
    backgroundColor: Colors.accentDim, borderColor: "rgba(220,38,38,0.2)",
  },
  agentBadgeText: { fontSize: 11, fontWeight: "700", color: Colors.textMuted },
  agentBadgeTextActive: { color: Colors.accent },

  // Metrics
  metricsCard: { padding: 0 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap" },
  metricItem: {
    width: "50%", paddingVertical: 16, paddingHorizontal: 18,
    alignItems: "flex-start", gap: 6,
  },
  metricItemBorder: {
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)",
  },
  metricValue: { fontSize: 16, fontWeight: "700", color: Colors.text },
  metricLabel: { fontSize: 11, color: Colors.textMuted },

  // Status
  statusCard: { padding: 0 },
  statusRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 18,
  },
  statusRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  statusDotWrap: { width: 20, height: 20, alignItems: "center", justifyContent: "center", marginRight: 12 },
  statusDotOuter: {
    position: "absolute", width: 16, height: 16, borderRadius: 8,
    backgroundColor: "rgba(52,211,153,0.15)",
  },
  statusDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#34D399" },
  statusName: { fontSize: 15, color: Colors.text, flex: 1 },
  statusValue: {
    fontSize: 12, fontWeight: "700", color: "#34D399",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  // Quick start
  quickStartCard: { padding: 0, marginBottom: 20 },
  stepRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, paddingHorizontal: 18,
  },
  stepRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  stepNum: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: "rgba(220,38,38,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  stepNumText: { fontSize: 12, fontWeight: "800", color: Colors.accent },
  stepText: { fontSize: 14, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
});
