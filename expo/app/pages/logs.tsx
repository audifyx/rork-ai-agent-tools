import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet, Text, View, ScrollView, RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity, ArrowLeft, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const ACTION_ICONS: Record<string, string> = {
  add_deployment: "🚀",
  update_deployment: "✏️",
  delete_deployment: "🗑️",
  create_session: "📡",
  push: "⚡",
  delete_session: "❌",
  generate_key: "🔑",
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function LogsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pages_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs(data ?? []);
  }, [user]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  const onRefresh = async () => { setRefreshing(true); await fetchLogs(); setRefreshing(false); };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>📋 Pages Logs</Text>
          <Text style={styles.subtitle}>{logs.length} entries</Text>
        </View>
      </View>

      {logs.length === 0 ? (
        <View style={styles.empty}>
          <Activity size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No activity yet</Text>
          <Text style={styles.emptySubtext}>API calls and actions will appear here</Text>
        </View>
      ) : (
        logs.map(log => (
          <View key={log.id} style={styles.logItem}>
            <Text style={styles.logIcon}>{ACTION_ICONS[log.action] || "📝"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.logAction}>{log.action}</Text>
              {log.description && <Text style={styles.logDesc} numberOfLines={2}>{log.description}</Text>}
            </View>
            <Text style={styles.logTime}>{timeAgo(log.created_at)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: 22, fontWeight: "800", color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, color: Colors.textMuted },
  logItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  logIcon: { fontSize: 20 },
  logAction: { fontSize: 13, fontWeight: "700", color: Colors.text },
  logDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  logTime: { fontSize: 11, color: Colors.textMuted },
});
