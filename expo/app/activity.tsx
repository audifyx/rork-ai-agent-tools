import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";
import ColorfulBackground from "@/components/ColorfulBackground";
import GlassCard from "@/components/GlassCard";

const TOOL_COLORS: Record<string, string> = {
  openclaw: "#EF4444",
  tweeter: "#6366F1",
  scheduler: "#14B8A6",
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

  const fetch_ = useCallback(async () => {
    if (!user) return;
    let query = supabase.from("agent_activity").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (filter) query = query.eq("tool", filter);
    const { data } = await query;
    setActivities(data ?? []);
  }, [filter, user]);

  useEffect(() => { void fetch_(); }, [fetch_]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("activity-live")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "agent_activity",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setActivities(prev => [payload.new, ...prev].slice(0, 200));
      }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user]);

  const onRefresh = async () => { setRefreshing(true); await fetch_(); setRefreshing(false); };

  const tools = ["openclaw", "tweeter", "scheduler"];

  const grouped: Record<string, any[]> = {};
  activities.forEach(a => {
    const date = new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(a);
  });

  return (
    <View style={styles.root}>
      <ColorfulBackground variant="detail" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
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

        <View style={{ paddingHorizontal: 16 }}>
          {activities.length === 0 ? (
            <GlassCard style={styles.empty}>
              <Activity size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptySub}>Agent actions will appear here as a unified timeline</Text>
            </GlassCard>
          ) : (
            Object.entries(grouped).map(([date, items]) => (
              <View key={date}>
                <Text style={styles.dateHeader}>{date}</Text>
                {items.map((a, i) => {
                  const toolColor = TOOL_COLORS[a.tool] || Colors.textMuted;
                  return (
                    <View key={a.id} style={styles.activityRow}>
                      <View style={styles.timelineCol}>
                        <View style={[styles.timelineDot, { backgroundColor: toolColor }]} />
                        {i < items.length - 1 && <View style={styles.timelineLine} />}
                      </View>
                      <GlassCard style={styles.activityCard}>
                        <View style={styles.activityHeader}>
                          <Text style={styles.activityEmoji}>{a.icon || "🤖"}</Text>
                          <View style={[styles.toolBadge, { backgroundColor: toolColor + "18" }]}>
                            <Text style={[styles.toolBadgeText, { color: toolColor }]}>{a.tool}</Text>
                          </View>
                          <Text style={styles.activityTime}>{timeAgo(a.created_at)}</Text>
                        </View>
                        <Text style={styles.activityDesc}>{a.description}</Text>
                        <Text style={styles.activityAction}>{a.action}</Text>
                      </GlassCard>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },

  filterRow: { marginBottom: 16, marginTop: 8 },
  filterPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.45)", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)",
  },
  filterActive: { backgroundColor: "rgba(255,255,255,0.75)", borderColor: "rgba(255,255,255,0.8)" },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterText: { fontSize: 13, fontWeight: "600", color: Colors.textMuted, textTransform: "capitalize" as const },
  filterTextActive: { color: Colors.text },

  empty: {
    padding: 48, alignItems: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: "center" },

  dateHeader: {
    fontSize: 12, fontWeight: "700", color: Colors.textMuted,
    letterSpacing: 1, marginTop: 16, marginBottom: 10, textTransform: "uppercase" as const,
  },

  activityRow: { flexDirection: "row", gap: 12, minHeight: 60 },
  timelineCol: { width: 20, alignItems: "center" },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 16 },
  timelineLine: { width: 1.5, flex: 1, backgroundColor: "rgba(0,0,0,0.06)", marginTop: 4 },

  activityCard: { flex: 1, padding: 14, marginBottom: 8, borderRadius: 16 },
  activityHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  activityEmoji: { fontSize: 14 },
  toolBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  toolBadgeText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  activityTime: { fontSize: 11, color: Colors.textMuted, marginLeft: "auto" as const },
  activityDesc: { fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 2 },
  activityAction: { fontSize: 11, color: Colors.textMuted, fontFamily: mono },
});
