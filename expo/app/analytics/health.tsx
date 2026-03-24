import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, RefreshControl, Platform } from "react-native";
import { Activity, CheckCircle2, AlertTriangle, XCircle, Wifi } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const STATUS_CONFIG: Record<string, { icon: any; color: string }> = {
  healthy: { icon: CheckCircle2, color: Colors.success },
  degraded: { icon: AlertTriangle, color: Colors.warning },
  down: { icon: XCircle, color: Colors.danger },
  unknown: { icon: Activity, color: Colors.textMuted },
};

export default function HealthScreen() {
  const { user } = useAuthStore();
  const [checks, setChecks] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("agent_health").select("*").eq("user_id", user.id).order("checked_at", { ascending: false }).limit(30);
    setChecks(data ?? []);
  };
  useEffect(() => { load(); }, [user]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Group by tool, show latest per tool
  const latestByTool: Record<string, any> = {};
  for (const c of checks) { if (!latestByTool[c.tool]) latestByTool[c.tool] = c; }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.success} />}>
      <Text style={styles.title}>💚 Health</Text>
      <Text style={styles.subtitle}>Agent tool health checks</Text>

      {Object.keys(latestByTool).length === 0 ? (
        <View style={styles.empty}><Wifi size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>No health checks yet</Text><Text style={styles.emptySub}>Your agent reports health via the analytics API</Text></View>
      ) : (
        Object.entries(latestByTool).map(([tool, c]) => {
          const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.unknown;
          const Icon = cfg.icon;
          return (
            <View key={tool} style={styles.card}>
              <View style={styles.cardRow}>
                <Icon size={20} color={cfg.color} />
                <Text style={styles.toolName}>{tool}</Text>
                <View style={[styles.statusBadge, { backgroundColor: cfg.color + "15" }]}>
                  <Text style={[styles.statusText, { color: cfg.color }]}>{c.status}</Text>
                </View>
              </View>
              <View style={styles.metricsRow}>
                {c.latency_ms != null && <View style={styles.metric}><Text style={styles.metricVal}>{c.latency_ms}ms</Text><Text style={styles.metricLabel}>Latency</Text></View>}
                <View style={styles.metric}><Text style={[styles.metricVal, { color: Colors.success }]}>{c.success_count}</Text><Text style={styles.metricLabel}>Success</Text></View>
                <View style={styles.metric}><Text style={[styles.metricVal, { color: Colors.danger }]}>{c.error_count}</Text><Text style={styles.metricLabel}>Errors</Text></View>
              </View>
              {c.last_error && <Text style={styles.lastError}>Last error: {c.last_error}</Text>}
              <Text style={styles.checkedAt}>Checked: {new Date(c.checked_at).toLocaleString()}</Text>
            </View>
          );
        })
      )}

      {checks.length > Object.keys(latestByTool).length && (
        <>
          <Text style={styles.secLabel}>HISTORY</Text>
          {checks.slice(Object.keys(latestByTool).length, 20).map(c => {
            const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.unknown;
            return (
              <View key={c.id} style={styles.historyRow}>
                <View style={[styles.dot, { backgroundColor: cfg.color }]} />
                <Text style={styles.histTool}>{c.tool}</Text>
                <Text style={[styles.histStatus, { color: cfg.color }]}>{c.status}</Text>
                <Text style={styles.histTime}>{new Date(c.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3, marginBottom: 20 },
  secLabel: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.5, marginTop: 20, marginBottom: 10 },
  empty: { padding: 48, alignItems: "center", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  card: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginBottom: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  toolName: { fontSize: 16, fontWeight: "700", color: Colors.text, flex: 1, textTransform: "capitalize" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  metricsRow: { flexDirection: "row", gap: 20, marginBottom: 8 },
  metric: { alignItems: "center" },
  metricVal: { fontSize: 18, fontWeight: "700", color: Colors.text, fontFamily: mono },
  metricLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  lastError: { fontSize: 11, color: Colors.danger, marginTop: 4 },
  checkedAt: { fontSize: 10, color: Colors.textMuted, fontFamily: mono, marginTop: 6 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  histTool: { fontSize: 13, color: Colors.text, flex: 1, textTransform: "capitalize" },
  histStatus: { fontSize: 12, fontWeight: "600", fontFamily: mono },
  histTime: { fontSize: 10, color: Colors.textMuted, fontFamily: mono },
});
