import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, RefreshControl, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Shield, Eye, RotateCw, Trash2 } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  read: { icon: Eye, color: "#F472B6", label: "Read" },
  rotate: { icon: RotateCw, color: "#FBBF24", label: "Rotated" },
  delete: { icon: Trash2, color: Colors.danger, label: "Deleted" },
  list: { icon: Shield, color: Colors.info, label: "Listed" },
};

export default function VaultLogs() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    if (!user) return;
    const { data } = await supabase.from("vault_access_logs").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    setLogs(data ?? []);
  };

  useEffect(() => { fetchLogs(); }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("vault-logs-live")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "vault_access_logs",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 200));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const onRefresh = async () => { setRefreshing(true); await fetchLogs(); setRefreshing(false); };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F472B6" />}
    >
      <Text style={styles.title}>📋 Access Log</Text>
      <Text style={styles.subtitle}>Every time your agent touches a secret</Text>

      {logs.length === 0 ? (
        <View style={styles.empty}>
          <Shield size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No access yet</Text>
          <Text style={styles.emptySub}>When your agent reads a secret, it shows here in realtime</Text>
        </View>
      ) : (
        logs.map(log => {
          const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.read;
          const Icon = cfg.icon;
          return (
            <View key={log.id} style={styles.logRow}>
              <View style={[styles.logIcon, { backgroundColor: cfg.color + "15" }]}>
                <Icon size={14} color={cfg.color} />
              </View>
              <View style={styles.logContent}>
                <Text style={styles.logName}>{log.entry_name}</Text>
                <Text style={styles.logAction}>{cfg.label}</Text>
              </View>
              <Text style={styles.logTime}>
                {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3, marginBottom: 20 },
  empty: {
    padding: 48, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: "center" },
  logRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.04)", marginBottom: 6,
  },
  logIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logContent: { flex: 1 },
  logName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  logAction: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  logTime: { fontSize: 11, color: Colors.textMuted, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
