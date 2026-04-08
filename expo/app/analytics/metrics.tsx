import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, RefreshControl, Platform } from "react-native";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";

const TREND_CONFIG: Record<string, { icon: any; color: string }> = {
  up: { icon: TrendingUp, color: colors.success },
  down: { icon: TrendingDown, color: colors.danger },
  stable: { icon: Minus, color: colors.textMuted },
};

export default function MetricsScreen() {
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const styles = createStylesStyles(colors);
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("custom_metrics").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    setMetrics(data ?? []);
  };
  useEffect(() => { load(); }, [user]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.success} />}>
      <Text style={styles.title}>🎯 Metrics</Text>
      <Text style={styles.subtitle}>Custom KPIs tracked by your agent</Text>

      {metrics.length === 0 ? (
        <View style={styles.empty}><Target size={48} color={colors.textMuted} /><Text style={styles.emptyText}>No metrics yet</Text><Text style={styles.emptySub}>Your agent sets metrics via set_metric action</Text></View>
      ) : (
        metrics.map(m => {
          const trend = TREND_CONFIG[m.trend] || TREND_CONFIG.stable;
          const TrendIcon = trend.icon;
          const progress = m.target_value ? Math.min((m.value / m.target_value) * 100, 100) : null;
          return (
            <View key={m.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.metricName}>{m.name}</Text>
                <View style={[styles.trendBadge, { backgroundColor: trend.color + "15" }]}>
                  <TrendIcon size={12} color={trend.color} />
                  <Text style={[styles.trendText, { color: trend.color }]}>{m.trend}</Text>
                </View>
              </View>
              <View style={styles.valueRow}>
                <Text style={styles.metricValue}>{m.value}</Text>
                <Text style={styles.metricUnit}>{m.unit}</Text>
                {m.previous_value != null && (
                  <Text style={[styles.prevValue, { color: trend.color }]}>
                    {m.value > m.previous_value ? "+" : ""}{(m.value - m.previous_value).toFixed(1)}
                  </Text>
                )}
              </View>
              {m.description && <Text style={styles.desc}>{m.description}</Text>}
              {progress != null && (
                <View style={styles.progressWrap}>
                  <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
                  <Text style={styles.progressText}>{progress.toFixed(0)}% of {m.target_value}</Text>
                </View>
              )}
              <View style={styles.metaRow}>
                <Text style={styles.metaTool}>{m.tool}</Text>
                {m.tags?.length > 0 && m.tags.map((t: string) => <Text key={t} style={styles.metaTag}>#{t}</Text>)}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";
const createStylesStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 3, marginBottom: 20 },
  empty: { padding: 48, alignItems: "center", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20, borderWidth: 1, borderColor: colors.surfaceLight },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  card: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.surfaceLight, marginBottom: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  metricName: { fontSize: 16, fontWeight: "700", color: colors.text },
  trendBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  trendText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 6 },
  metricValue: { fontSize: 32, fontWeight: "800", color: colors.text, fontFamily: mono },
  metricUnit: { fontSize: 13, color: colors.textMuted },
  prevValue: { fontSize: 13, fontWeight: "600", fontFamily: mono },
  desc: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  progressWrap: { marginTop: 8, gap: 4 },
  progressBar: { height: 4, backgroundColor: colors.surfaceLight, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.success },
  progressText: { fontSize: 10, color: colors.textMuted },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  metaTool: { fontSize: 10, fontWeight: "600", color: colors.textMuted, fontFamily: mono, textTransform: "uppercase" },
  metaTag: { fontSize: 10, color: colors.info },
});
