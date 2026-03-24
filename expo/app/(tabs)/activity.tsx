import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity, Filter } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const TOOL_COLORS: Record<string, string> = {
  openclaw: Colors.accent,
  tweeter: "#1D9BF0",
  scheduler: "#22D3EE",
  system: Colors.textMuted,
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const fetch_ = async () => {
    if (!user) return;
    let query = supabase.from("agent_activity").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (filter) query = query.eq("tool", filter);
    const { data } = await query;
    setActivities(data ?? []);
  };

  useEffect(() => { fetch_(); }, [user, filter]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("activity-live")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "agent_activity",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setActivities(prev => [payload.new, ...prev].slice(0, 200));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const onRefresh = async () => { setRefreshing(true); await fetch_(); setRefreshing(false); };

  const tools = ["openclaw", "tweeter", "scheduler"];

  // Group by date
  const grouped: Record<string, any[]> = {};
  activities.forEach(a => {
    const date = new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(a);
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>⚡ Activity</Text>
          <Text style={styles.subtitle}>Agent actions across all tools</Text>
        </View>
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, !filter && styles.filterActive]}
          onPress={() => setFilter(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, !filter && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {tools.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.filterPill, filter === t && styles.filterActive]}
            onPress={() => setFilter(filter === t ? null : t)}
            activeOpacity={0.7}
          >
            <View style={[styles.filterDot, { backgroundColor: TOOL_COLORS[t] || Colors.textMuted }]} />
            <Text style={[styles.filterText, filter === t && styles.filterTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activities.length === 0 ? (
        <View style={styles.empty}>
          <Activity size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptySub}>Agent actions will appear here as a unified timeline</Text>
        </View>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <View key={date}>
            <Text style={styles.dateHeader}>{date}</Text>
            {items.map((a, i) => {
              const toolColor = TOOL_COLORS[a.tool] || Colors.textMuted;
              return (
                <View key={a.id} style={styles.activityRow}>
                  {/* Timeline line */}
                  <View style={styles.timelineCol}>
                    <View style={[styles.timelineDot, { backgroundColor: toolColor }]} />
                    {i < items.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  {/* Content */}
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <Text style={styles.activityEmoji}>{a.icon || "🤖"}</Text>
                      <View style={[styles.toolBadge, { backgroundColor: toolColor + "15", borderColor: toolColor + "25" }]}>
                        <Text style={[styles.toolBadgeText, { color: toolColor }]}>{a.tool}</Text>
                      </View>
                      <Text style={styles.activityTime}>{timeAgo(a.created_at)}</Text>
                    </View>
                    <Text style={styles.activityDesc}>{a.description}</Text>
                    <Text style={styles.activityAction}>{a.action}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },

  filterRow: { marginBottom: 20 },
  filterPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  filterActive: { backgroundColor: Colors.accentDim, borderColor: "rgba(220,38,38,0.2)" },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterText: { fontSize: 12, fontWeight: "600", color: Colors.textMuted, textTransform: "capitalize" },
  filterTextActive: { color: Colors.accent },

  empty: {
    padding: 48, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: "center" },

  dateHeader: {
    fontSize: 12, fontWeight: "700", color: Colors.textMuted,
    letterSpacing: 1, marginTop: 16, marginBottom: 10, textTransform: "uppercase",
  },

  activityRow: { flexDirection: "row", gap: 12, minHeight: 60 },
  timelineCol: { width: 20, alignItems: "center" },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 1.5, flex: 1, backgroundColor: "rgba(255,255,255,0.06)", marginTop: 4 },

  activityContent: { flex: 1, paddingBottom: 16 },
  activityHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  activityEmoji: { fontSize: 14 },
  toolBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
  },
  toolBadgeText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  activityTime: { fontSize: 11, color: Colors.textMuted, marginLeft: "auto" },
  activityDesc: { fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 2 },
  activityAction: { fontSize: 11, color: Colors.textMuted, fontFamily: mono },
});
