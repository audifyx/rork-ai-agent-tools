import React, { useCallback, useEffect, useState } from "react";
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
import { useTheme } from "@/providers/ThemeProvider";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}

function GlassCard({ children, style, isDark, colors }: { children: React.ReactNode; style?: any; isDark: boolean; colors: any }) {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[{ borderRadius: 20, overflow: "hidden" as const, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.glassBorder }, style]}>
        <View>{children}</View>
      </BlurView>
    );
  }
  return <View style={[{ borderRadius: 20, overflow: "hidden" as const, backgroundColor: colors.glassBg, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.glassBorder }, style]}>{children}</View>;
}

function SectionHeader({ title, icon: Icon, colors }: { title: string; icon?: any; colors: any }) {
  return (
    <View style={styles.secHeader}>
      {Icon && <Icon size={14} color={colors.textMuted} />}
      <Text style={[styles.secHeaderText, { color: colors.textMuted }]}>{title}</Text>
    </View>
  );
}

export default function OpenClawDashboard() {
  const _insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    files: 0, leads: 0, webhooks: 0, agents: 0,
    totalSize: 0, recentFiles: 0, apiKeyActive: false,
  });

  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const results = await Promise.allSettled([
        supabase.from("stored_files").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("webhook_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("agent_configs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("stored_files").select("file_size, created_at").eq("user_id", user.id),
        supabase.from("api_keys").select("is_active").eq("user_id", user.id).eq("is_active", true).limit(1),
      ]);
      const safeCount = (r: PromiseSettledResult<any>) =>
        r.status === "fulfilled" ? (r.value?.count ?? 0) : 0;
      const safeData = (r: PromiseSettledResult<any>) =>
        r.status === "fulfilled" ? (r.value?.data ?? []) : [];
      const allFiles = safeData(results[4]);
      const totalSize = allFiles.reduce((acc: number, f: any) => acc + (f.file_size ?? 0), 0);
      const dayAgo = Date.now() - 86400000;
      const recentFiles = allFiles.filter((f: any) => new Date(f.created_at).getTime() > dayAgo).length;
      const keysData = safeData(results[5]);
      setStats({
        files: safeCount(results[0]), leads: safeCount(results[1]),
        webhooks: safeCount(results[2]), agents: safeCount(results[3]),
        totalSize, recentFiles, apiKeyActive: keysData.length > 0,
      });
    } catch (e) {
      console.log("[openclaw] loadStats failed", e);
    }
  }, [user]);

  useEffect(() => { void loadStats(); }, [user, loadStats]);
  const onRefresh = async () => { setRefreshing(true); await loadStats(); setRefreshing(false); };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Command <Text style={{ color: colors.accent }}>Center</Text></Text>
        <View style={[styles.liveBadge, { backgroundColor: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.15)" }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      <SectionHeader title="OVERVIEW" icon={Activity} colors={colors} />
      <View style={styles.widgetGrid}>
        <GlassCard style={styles.widgetLg} isDark={isDark} colors={colors}>
          <View style={styles.wRow}>
            <View style={[styles.wIcon, { backgroundColor: "rgba(56,189,248,0.12)" }]}>
              <FolderOpen size={20} color="#38BDF8" />
            </View>
            <View style={styles.wTrend}>
              <TrendingUp size={12} color={colors.textMuted} />
              <Text style={[styles.wTrendText, { color: colors.textMuted }]}>{stats.recentFiles} today</Text>
            </View>
          </View>
          <Text style={[styles.wVal, { color: "#38BDF8" }]}>{stats.files}</Text>
          <Text style={[styles.wLabel, { color: colors.textSecondary }]}>Files</Text>
          <View style={[styles.meter, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]}><View style={[styles.meterFill, { width: `${Math.min((stats.totalSize / 104857600) * 100, 100)}%`, backgroundColor: "#38BDF8" }]} /></View>
          <Text style={[styles.wMeta, { color: colors.textMuted }]}>{formatBytes(stats.totalSize)} used</Text>
        </GlassCard>
        <View style={styles.widgetStack}>
          <GlassCard style={styles.widgetSm} isDark={isDark} colors={colors}>
            <View style={[styles.wIconSm, { backgroundColor: "rgba(52,211,153,0.12)" }]}><Users size={16} color="#34D399" /></View>
            <Text style={[styles.wValSm, { color: "#34D399" }]}>{stats.leads}</Text>
            <Text style={[styles.wLabelSm, { color: colors.textMuted }]}>Leads</Text>
          </GlassCard>
          <GlassCard style={styles.widgetSm} isDark={isDark} colors={colors}>
            <View style={[styles.wIconSm, { backgroundColor: "rgba(251,191,36,0.12)" }]}><Webhook size={16} color="#FBBF24" /></View>
            <Text style={[styles.wValSm, { color: "#FBBF24" }]}>{stats.webhooks}</Text>
            <Text style={[styles.wLabelSm, { color: colors.textMuted }]}>API Calls</Text>
          </GlassCard>
        </View>
      </View>

      <GlassCard style={styles.agentCard} isDark={isDark} colors={colors}>
        <View style={styles.agentRow}>
          <View style={[styles.wIcon, { backgroundColor: colors.accentDim }]}><Bot size={20} color={colors.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.agentTitle, { color: colors.text }]}>Agent Status</Text>
            <Text style={[styles.agentSub, { color: colors.textMuted }]}>{stats.agents} configured · Key {stats.apiKeyActive ? "active" : "inactive"}</Text>
          </View>
          <View style={[styles.agentBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", borderColor: colors.border }, stats.apiKeyActive && { backgroundColor: colors.accentDim, borderColor: colors.accentGlow }]}>
            <Text style={[styles.agentBadgeText, { color: colors.textMuted }, stats.apiKeyActive && { color: colors.accent }]}>{stats.apiKeyActive ? "Ready" : "Setup"}</Text>
          </View>
        </View>
      </GlassCard>

      <SectionHeader title="METRICS" icon={Zap} colors={colors} />
      <GlassCard style={{ padding: 0 }} isDark={isDark} colors={colors}>
        <View style={styles.metricsGrid}>
          {[
            { label: "Storage", value: formatBytes(stats.totalSize), icon: HardDrive },
            { label: "24h Uploads", value: String(stats.recentFiles), icon: TrendingUp },
            { label: "API Key", value: stats.apiKeyActive ? "Active" : "None", icon: Shield },
            { label: "Endpoint", value: "Online", icon: Globe },
          ].map((m, i) => (
            <View key={m.label} style={[styles.metricItem, i < 2 && { borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }]}>
              <m.icon size={14} color={colors.textMuted} />
              <Text style={[styles.metricVal, { color: colors.text }]}>{m.value}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{m.label}</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <SectionHeader title="SYSTEM" icon={CircleDot} colors={colors} />
      <GlassCard style={{ padding: 0 }} isDark={isDark} colors={colors}>
        {["Database", "File Storage", "API Endpoint", "Realtime"].map((name, i, arr) => (
          <View key={name} style={[styles.statusRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }]}>
            <View style={styles.dotWrap}><View style={styles.dotOuter} /><View style={styles.dotInner} /></View>
            <Text style={[styles.statusName, { color: colors.text }]}>{name}</Text>
            <Text style={[styles.statusVal, { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]}>Online</Text>
          </View>
        ))}
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.8 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34D399" },
  liveText: { fontSize: 12, fontWeight: "700" as const, color: "#34D399" },

  secHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 24 },
  secHeaderText: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.5 },

  widgetGrid: { flexDirection: "row", gap: 10 },
  widgetLg: { flex: 1.2, padding: 18 },
  widgetStack: { flex: 1, gap: 10 },
  widgetSm: { flex: 1, padding: 16, alignItems: "center" },

  wRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  wIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  wIconSm: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  wTrend: { flexDirection: "row", alignItems: "center", gap: 4 },
  wTrendText: { fontSize: 11 },
  wVal: { fontSize: 36, fontWeight: "800" as const, letterSpacing: -1.5 },
  wValSm: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -1 },
  wLabel: { fontSize: 13, marginTop: 2 },
  wLabelSm: { fontSize: 12, marginTop: 2 },
  meter: { height: 3, borderRadius: 2, marginTop: 14, overflow: "hidden" },
  meterFill: { height: 3, borderRadius: 2 },
  wMeta: { fontSize: 10, marginTop: 6 },

  agentCard: { marginTop: 10, padding: 16 },
  agentRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  agentTitle: { fontSize: 15, fontWeight: "700" as const },
  agentSub: { fontSize: 12, marginTop: 2 },
  agentBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  agentBadgeText: { fontSize: 11, fontWeight: "700" as const },

  metricsGrid: { flexDirection: "row", flexWrap: "wrap" },
  metricItem: { width: "50%" as any, paddingVertical: 16, paddingHorizontal: 18, gap: 6 },
  metricVal: { fontSize: 16, fontWeight: "700" as const },
  metricLabel: { fontSize: 11 },

  statusRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 18 },
  dotWrap: { width: 20, height: 20, alignItems: "center", justifyContent: "center", marginRight: 12 },
  dotOuter: { position: "absolute", width: 16, height: 16, borderRadius: 8, backgroundColor: "rgba(52,211,153,0.15)" },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#34D399" },
  statusName: { fontSize: 15, flex: 1 },
  statusVal: { fontSize: 12, fontWeight: "700" as const, color: "#34D399" },
});
