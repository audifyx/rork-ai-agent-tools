import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, RefreshControl, Platform,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Activity, ChevronDown, ChevronUp, CheckCircle, AlertCircle, XCircle,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";
import { LobsterWatermark } from "@/components/tweeter/LobsterWatermark";

const ACTION_COLORS: Record<string, string> = {
  create_tweet: "#34D399", list_tweets: "#38BDF8", edit_tweet: "#FBBF24",
  delete_tweet: "#F87171", get_personality: "#A78BFA", update_personality: "#A78BFA",
  add_memory: "#F472B6", evolve: Colors.accent, whoami: "#38BDF8", get_stats: "#38BDF8",
};

export default function TweeterLogs() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("tweeter_logs").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(200);
    setLogs(data ?? []);
  }, [user]);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);
  const onRefresh = async () => { setRefreshing(true); await fetchLogs(); setRefreshing(false); };

  const statusColor = (code: number | null) => {
    if (!code) return Colors.textMuted;
    if (code < 300) return "#34D399";
    if (code < 500) return "#FBBF24";
    return "#F87171";
  };

  const StatusIcon = ({ code }: { code: number | null }) => {
    if (!code) return <Activity size={14} color={Colors.textMuted} />;
    if (code < 300) return <CheckCircle size={14} color="#34D399" />;
    if (code < 500) return <AlertCircle size={14} color="#FBBF24" />;
    return <XCircle size={14} color="#F87171" />;
  };

  // Stats
  const successCount = logs.filter(l => l.status_code && l.status_code < 300).length;
  const errorCount = logs.filter(l => l.status_code && l.status_code >= 400).length;

  return (
    <ScrollView
      style={st.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      <View style={st.redGlow} />
      <LobsterWatermark style={st.watermark} />

      <View style={st.header}>
        <Text style={st.title}>📊 API <Text style={{ color: Colors.accent }}>Logs</Text></Text>
        <Text style={st.subtitle}>{logs.length} calls logged</Text>
      </View>

      {/* Stats bar */}
      <View style={st.statsBar}>
        <View style={st.statItem}>
          <Activity size={13} color={Colors.accent} />
          <Text style={st.statVal}>{logs.length}</Text>
          <Text style={st.statLabel}>Total</Text>
        </View>
        <View style={st.statDivider} />
        <View style={st.statItem}>
          <CheckCircle size={13} color="#34D399" />
          <Text style={st.statVal}>{successCount}</Text>
          <Text style={st.statLabel}>Success</Text>
        </View>
        <View style={st.statDivider} />
        <View style={st.statItem}>
          <XCircle size={13} color="#F87171" />
          <Text style={st.statVal}>{errorCount}</Text>
          <Text style={st.statLabel}>Errors</Text>
        </View>
      </View>

      {logs.length === 0 ? (
        <View style={st.empty}>
          <Activity size={48} color={Colors.accent} style={{ opacity: 0.4 }} />
          <Text style={st.emptyText}>No API calls yet</Text>
          <Text style={st.emptySub}>Logs will appear here when your agent makes API calls.</Text>
        </View>
      ) : (
        logs.map(log => {
          const expanded = expandedId === log.id;
          const aColor = ACTION_COLORS[log.action] || Colors.textMuted;
          return (
            <TouchableOpacity
              key={log.id}
              style={st.logRow}
              onPress={() => setExpandedId(expanded ? null : log.id)}
              activeOpacity={0.7}
            >
              <View style={st.logHeader}>
                <StatusIcon code={log.status_code} />
                <View style={[st.actionBadge, { backgroundColor: aColor + "15", borderColor: aColor + "20" }]}>
                  <Text style={[st.actionText, { color: aColor }]}>{log.action}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text style={[st.statusCode, { color: statusColor(log.status_code) }]}>
                  {log.status_code ?? "—"}
                </Text>
                <Text style={st.time}>
                  {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
                {expanded ? <ChevronUp size={12} color={Colors.textMuted} /> : <ChevronDown size={12} color={Colors.textMuted} />}
              </View>

              {expanded && (
                <View style={st.logBody}>
                  {log.request_body && (
                    <View style={st.bodySection}>
                      <Text style={st.bodyLabel}>Request</Text>
                      <ScrollView horizontal>
                        <Text style={st.bodyText} selectable>{JSON.stringify(log.request_body, null, 2)}</Text>
                      </ScrollView>
                    </View>
                  )}
                  {log.response_body && (
                    <View style={st.bodySection}>
                      <Text style={[st.bodyLabel, { color: statusColor(log.status_code) }]}>Response</Text>
                      <ScrollView horizontal>
                        <Text style={st.bodyText} selectable>{JSON.stringify(log.response_body, null, 2)}</Text>
                      </ScrollView>
                    </View>
                  )}
                  <Text style={st.fullTime}>{new Date(log.created_at).toLocaleString()}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  redGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 200, backgroundColor: "rgba(220,38,38,0.03)" },
  watermark: { top: 14, right: -24 },
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "900", color: Colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },

  // Stats
  statsBar: {
    flexDirection: "row", marginBottom: 16,
    backgroundColor: "rgba(220,38,38,0.04)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)", padding: 12,
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statDivider: { width: 1, backgroundColor: "rgba(220,38,38,0.08)" },
  statVal: { fontSize: 16, fontWeight: "800", color: Colors.text },
  statLabel: { fontSize: 9, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase" },

  // Empty
  empty: {
    padding: 48, alignItems: "center",
    backgroundColor: "rgba(220,38,38,0.03)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)",
  },
  emptyText: { fontSize: 16, fontWeight: "700", color: Colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: "center", lineHeight: 20 },

  // Log row
  logRow: {
    backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.04)", marginBottom: 6,
    padding: 12,
  },
  logHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  actionText: { fontSize: 10, fontWeight: "800", fontFamily: mono },
  statusCode: { fontSize: 13, fontWeight: "800", fontFamily: mono },
  time: { fontSize: 10, color: Colors.textMuted, fontFamily: mono, width: 42, textAlign: "right" },

  // Expanded body
  logBody: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.04)" },
  bodySection: { marginBottom: 10 },
  bodyLabel: { fontSize: 10, fontWeight: "700", color: Colors.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  bodyText: { fontSize: 10, color: Colors.textSecondary, fontFamily: mono, lineHeight: 16 },
  fullTime: { fontSize: 10, color: Colors.textMuted, fontFamily: mono, marginTop: 4 },
});
