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

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={20} tint="dark" style={[styles.glass, style]}>
        <View>{children}</View>
      </BlurView>
    );
  }
  return <View style={[styles.glassFb, style]}>{children}</View>;
}

function SectionHeader({ title, icon: Icon }: { title: string; icon?: any }) {
  return (
    <View style={styles.secHeader}>
      {Icon && <Icon size={14} color={Colors.textMuted} />}
      <Text style={styles.secHeaderText}>{title}</Text>
    </View>
  );
}

export default function OpenClawDashboard() {
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
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Command <Text style={{ color: Colors.accent }}>Center</Text></Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      {/* Stat widgets */}
      <SectionHeader title="OVERVIEW" icon={Activity} />
      <View style={styles.widgetGrid}>
        <GlassCard style={styles.widgetLg}>
          <View style={styles.wRow}>
            <View style={[styles.wIcon, { backgroundColor: "rgba(56,189,248,0.12)" }]}>
              <FolderOpen size={20} color="#38BDF8" />
            </View>
            <View style={styles.wTrend}>
              <TrendingUp size={12} color={Colors.textMuted} />
              <Text style={styles.wTrendText}>{stats.recentFiles} today</Text>
            </View>
          </View>
          <Text style={[styles.wVal, { color: "#38BDF8" }]}>{stats.files}</Text>
          <Text style={styles.wLabel}>Files</Text>
          <View style={styles.meter}><View style={[styles.meterFill, { width: `${Math.min((stats.totalSize / 104857600) * 100, 100)}%`, backgroundColor: "#38BDF8" }]} /></View>
          <Text style={styles.wMeta}>{formatBytes(stats.totalSize)} used</Text>
        </GlassCard>
        <View style={styles.widgetStack}>
          <GlassCard style={styles.widgetSm}>
            <View style={[styles.wIconSm, { backgroundColor: "rgba(52,211,153,0.12)" }]}><Users size={16} color="#34D399" /></View>
            <Text style={[styles.wValSm, { color: "#34D399" }]}>{stats.leads}</Text>
            <Text style={styles.wLabelSm}>Leads</Text>
          </GlassCard>
          <GlassCard style={styles.widgetSm}>
            <View style={[styles.wIconSm, { backgroundColor: "rgba(251,191,36,0.12)" }]}><Webhook size={16} color="#FBBF24" /></View>
            <Text style={[styles.wValSm, { color: "#FBBF24" }]}>{stats.webhooks}</Text>
            <Text style={styles.wLabelSm}>API Calls</Text>
          </GlassCard>
        </View>
      </View>

      {/* Agent status */}
      <GlassCard style={styles.agentCard}>
        <View style={styles.agentRow}>
          <View style={[styles.wIcon, { backgroundColor: Colors.accentDim }]}><Bot size={20} color={Colors.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.agentTitle}>Agent Status</Text>
            <Text style={styles.agentSub}>{stats.agents} configured · Key {stats.apiKeyActive ? "active" : "inactive"}</Text>
          </View>
          <View style={[styles.agentBadge, stats.apiKeyActive && styles.agentBadgeOn]}>
            <Text style={[styles.agentBadgeText, stats.apiKeyActive && { color: Colors.accent }]}>{stats.apiKeyActive ? "Ready" : "Setup"}</Text>
          </View>
        </View>
      </GlassCard>

      {/* Metrics */}
      <SectionHeader title="METRICS" icon={Zap} />
      <GlassCard style={{ padding: 0 }}>
        <View style={styles.metricsGrid}>
          {[
            { label: "Storage", value: formatBytes(stats.totalSize), icon: HardDrive },
            { label: "24h Uploads", value: String(stats.recentFiles), icon: TrendingUp },
            { label: "API Key", value: stats.apiKeyActive ? "Active" : "None", icon: Shield },
            { label: "Endpoint", value: "Online", icon: Globe },
          ].map((m, i) => (
            <View key={m.label} style={[styles.metricItem, i < 2 && styles.metricBorder]}>
              <m.icon size={14} color={Colors.textMuted} />
              <Text style={styles.metricVal}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      {/* System */}
      <SectionHeader title="SYSTEM" icon={CircleDot} />
      <GlassCard style={{ padding: 0 }}>
        {["Database", "File Storage", "API Endpoint", "Realtime"].map((name, i, arr) => (
          <View key={name} style={[styles.statusRow, i < arr.length - 1 && styles.statusBorder]}>
            <View style={styles.dotWrap}><View style={styles.dotOuter} /><View style={styles.dotInner} /></View>
            <Text style={styles.statusName}>{name}</Text>
            <Text style={styles.statusVal}>Online</Text>
          </View>
        ))}
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text, letterSpacing: -0.8 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(52,211,153,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(52,211,153,0.15)" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34D399" },
  liveText: { fontSize: 12, fontWeight: "700", color: "#34D399" },

  secHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 24 },
  secHeaderText: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.5 },

  glass: { borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  glassFb: { borderRadius: 20, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },

  widgetGrid: { flexDirection: "row", gap: 10 },
  widgetLg: { flex: 1.2, padding: 18 },
  widgetStack: { flex: 1, gap: 10 },
  widgetSm: { flex: 1, padding: 16, alignItems: "center" },

  wRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  wIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  wIconSm: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  wTrend: { flexDirection: "row", alignItems: "center", gap: 4 },
  wTrendText: { fontSize: 11, color: Colors.textMuted },
  wVal: { fontSize: 36, fontWeight: "800", letterSpacing: -1.5 },
  wValSm: { fontSize: 28, fontWeight: "800", letterSpacing: -1 },
  wLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  wLabelSm: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  meter: { height: 3, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 14, overflow: "hidden" },
  meterFill: { height: 3, borderRadius: 2 },
  wMeta: { fontSize: 10, color: Colors.textMuted, marginTop: 6 },

  agentCard: { marginTop: 10, padding: 16 },
  agentRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  agentTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  agentSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  agentBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: Colors.border },
  agentBadgeOn: { backgroundColor: Colors.accentDim, borderColor: "rgba(220,38,38,0.2)" },
  agentBadgeText: { fontSize: 11, fontWeight: "700", color: Colors.textMuted },

  metricsGrid: { flexDirection: "row", flexWrap: "wrap" },
  metricItem: { width: "50%" as any, paddingVertical: 16, paddingHorizontal: 18, gap: 6 },
  metricBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  metricVal: { fontSize: 16, fontWeight: "700", color: Colors.text },
  metricLabel: { fontSize: 11, color: Colors.textMuted },

  statusRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 18 },
  statusBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  dotWrap: { width: 20, height: 20, alignItems: "center", justifyContent: "center", marginRight: 12 },
  dotOuter: { position: "absolute", width: 16, height: 16, borderRadius: 8, backgroundColor: "rgba(52,211,153,0.15)" },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#34D399" },
  statusName: { fontSize: 15, color: Colors.text, flex: 1 },
  statusVal: { fontSize: 12, fontWeight: "700", color: "#34D399", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
