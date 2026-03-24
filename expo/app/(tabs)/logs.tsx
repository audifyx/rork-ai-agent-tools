import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Webhook, Circle } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

export default function LogsTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [live, setLive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("webhook_logs").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setLogs(data ?? []));
  }, [user]);

  useEffect(() => {
    if (!user || !live) return;
    const channel = supabase
      .channel("webhook-logs-mobile")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "webhook_logs",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setLogs((prev) => [payload.new, ...prev].slice(0, 200));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, live]);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    const { data } = await supabase.from("webhook_logs").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(100);
    setLogs(data ?? []);
    setRefreshing(false);
  };

  const statusColor = (code: number | null) => {
    if (!code) return Colors.textMuted;
    if (code < 300) return "#34D399";
    if (code < 500) return "#FBBF24";
    return "#F87171";
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Webhook <Text style={{ color: Colors.accent }}>Logs</Text></Text>
          <Text style={styles.subtitle}>Live feed of API calls</Text>
        </View>
        <TouchableOpacity
          style={[styles.liveBtn, live && styles.liveBtnActive]}
          onPress={() => setLive(!live)}
          activeOpacity={0.7}
        >
          <Circle size={8} color={live ? "#34D399" : Colors.textMuted} fill={live ? "#34D399" : "transparent"} />
          <Text style={[styles.liveBtnText, live && styles.liveBtnTextActive]}>
            {live ? "Live" : "Paused"}
          </Text>
        </TouchableOpacity>
      </View>

      {logs.length === 0 ? (
        <View style={styles.empty}>
          <Webhook size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No webhook calls yet</Text>
          <Text style={styles.emptySubtext}>They'll appear here live when your agent starts making requests</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {logs.map((log) => (
            <View key={log.id} style={styles.logRow}>
              <View style={[styles.dot, { backgroundColor: statusColor(log.status_code) }]} />
              <View style={styles.methodBadge}>
                <Text style={styles.methodText}>{log.method}</Text>
              </View>
              <Text style={styles.endpoint} numberOfLines={1}>{log.endpoint}</Text>
              <Text style={[styles.statusCode, { color: statusColor(log.status_code) }]}>
                {log.status_code ?? "—"}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "700", color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  liveBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  liveBtnActive: { backgroundColor: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.25)" },
  liveBtnText: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },
  liveBtnTextActive: { color: "#34D399" },
  empty: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 48,
    alignItems: "center", borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary, marginTop: 16 },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: "center" },
  list: { gap: 6 },
  logRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  methodBadge: {
    backgroundColor: Colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  methodText: { fontSize: 10, fontWeight: "700", color: Colors.textSecondary, fontFamily: "monospace" },
  endpoint: { flex: 1, fontSize: 12, color: Colors.textMuted, fontFamily: "monospace" },
  statusCode: { fontSize: 14, fontWeight: "700", fontFamily: "monospace" },
});
