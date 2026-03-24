import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, RefreshControl, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

export default function TweeterLogs() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    if (!user) return;
    const { data } = await supabase.from("tweeter_logs").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(100);
    setLogs(data ?? []);
  };

  useEffect(() => { fetchLogs(); }, [user]);
  const onRefresh = async () => { setRefreshing(true); await fetchLogs(); setRefreshing(false); };

  const statusColor = (code: number | null) => {
    if (!code) return Colors.textMuted;
    if (code < 300) return "#34D399";
    if (code < 500) return "#FBBF24";
    return "#F87171";
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D9BF0" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>📊 API Logs</Text>
        <Text style={styles.subtitle}>{logs.length} calls logged</Text>
      </View>

      {logs.length === 0 ? (
        <View style={styles.empty}>
          <Activity size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No API calls yet</Text>
        </View>
      ) : (
        logs.map(log => (
          <View key={log.id} style={styles.logRow}>
            <View style={[styles.dot, { backgroundColor: statusColor(log.status_code) }]} />
            <View style={styles.actionBadge}>
              <Text style={styles.actionText}>{log.action}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Text style={[styles.statusCode, { color: statusColor(log.status_code) }]}>
              {log.status_code ?? "—"}
            </Text>
            <Text style={styles.time}>
              {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  empty: {
    padding: 48, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { fontSize: 14, color: Colors.textMuted, marginTop: 16 },
  logRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.04)", marginBottom: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actionBadge: { backgroundColor: "rgba(29,155,240,0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actionText: { fontSize: 11, fontWeight: "700", color: "#1D9BF0", fontFamily: mono },
  statusCode: { fontSize: 13, fontWeight: "700", fontFamily: mono },
  time: { fontSize: 11, color: Colors.textMuted, fontFamily: mono, width: 50, textAlign: "right" },
});
