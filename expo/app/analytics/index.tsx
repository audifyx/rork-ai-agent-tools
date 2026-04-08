import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, RefreshControl, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FolderOpen, Users, Webhook, MessageSquare, KeyRound, HardDrive, AlertTriangle } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function AnalyticsDashboard() {
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const styles = createStylesStyles(colors);
  const _insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const results = await Promise.allSettled([
        supabase.from("stored_files").select("file_size", { count: "exact" }).eq("user_id", user.id),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("webhook_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("agent_tweets").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("vault_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true),
        supabase.from("error_log").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("resolved", false),
        supabase.from("agent_activity").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
      ]);
      const safeVal = (r: PromiseSettledResult<any>) =>
        r.status === "fulfilled" ? r.value : { data: [], count: 0 };
      const files = safeVal(results[0]);
      const totalStorage = (files.data ?? []).reduce((s: number, f: any) => s + (f.file_size ?? 0), 0);
      setData({
        files: files.count ?? 0, leads: safeVal(results[1]).count ?? 0,
        webhooks: safeVal(results[2]).count ?? 0, tweets: safeVal(results[3]).count ?? 0,
        secrets: safeVal(results[4]).count ?? 0, errors: safeVal(results[5]).count ?? 0,
        storage: totalStorage, activity: safeVal(results[6]).data ?? [],
      });
    } catch (e) {
      console.log("[analytics] load failed", e);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const stats = [
    { label: "Files", value: data?.files ?? 0, icon: FolderOpen, color: colors.info },
    { label: "Leads", value: data?.leads ?? 0, icon: Users, color: colors.success },
    { label: "API Calls", value: data?.webhooks ?? 0, icon: Webhook, color: colors.warning },
    { label: "Tweets", value: data?.tweets ?? 0, icon: MessageSquare, color: "#1D9BF0" },
    { label: "Secrets", value: data?.secrets ?? 0, icon: KeyRound, color: colors.accent },
    { label: "Errors", value: data?.errors ?? 0, icon: AlertTriangle, color: colors.danger },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.success} />} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>📊 Analytics</Text>
      <Text style={styles.subtitle}>Cross-tool performance overview</Text>

      {/* Stats grid */}
      <View style={styles.grid}>
        {stats.map(s => (
          <View key={s.label} style={styles.statCard}>
            <s.icon size={16} color={s.color} />
            <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Storage meter */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <HardDrive size={16} color={colors.info} />
          <Text style={styles.cardTitle}>Storage</Text>
          <Text style={styles.cardValue}>{formatBytes(data?.storage ?? 0)}</Text>
        </View>
        <View style={styles.meter}>
          <View style={[styles.meterFill, { width: `${Math.min(((data?.storage ?? 0) / 104857600) * 100, 100)}%` }]} />
        </View>
      </View>

      {/* Recent activity */}
      <Text style={styles.secLabel}>RECENT ACTIVITY</Text>
      <View style={styles.card}>
        {(data?.activity ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No activity yet</Text>
        ) : (
          (data?.activity ?? []).map((a: any, i: number, arr: any[]) => (
            <View key={a.id} style={[styles.actRow, i < arr.length - 1 && styles.actBorder]}>
              <Text style={styles.actIcon}>{a.icon || "🤖"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.actDesc} numberOfLines={1}>{a.description}</Text>
                <Text style={styles.actMeta}>{a.tool} · {a.action}</Text>
              </View>
              <Text style={styles.actTime}>{new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";
const createStylesStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 3, marginBottom: 20 },
  secLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 1.5, marginTop: 20, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "31%" as any, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.surfaceLight, alignItems: "center", gap: 6 },
  statVal: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 10, color: colors.textMuted },
  card: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.surfaceLight, marginTop: 12 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.text, flex: 1 },
  cardValue: { fontSize: 14, fontWeight: "700", color: colors.text, fontFamily: mono },
  meter: { height: 4, backgroundColor: colors.surfaceLight, borderRadius: 2, overflow: "hidden" },
  meterFill: { height: 4, borderRadius: 2, backgroundColor: colors.info },
  actRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  actBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface },
  actIcon: { fontSize: 16 },
  actDesc: { fontSize: 13, color: colors.text },
  actMeta: { fontSize: 10, color: colors.textMuted, fontFamily: mono, marginTop: 1 },
  actTime: { fontSize: 10, color: colors.textMuted, fontFamily: mono },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: "center", paddingVertical: 20 },
});
