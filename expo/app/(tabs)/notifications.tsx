import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell, BellOff, Check, CheckCheck, Trash2, Bot, AlertTriangle,
  Info, CheckCircle2, Zap,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  info: { icon: Info, color: Colors.info },
  success: { icon: CheckCircle2, color: Colors.success },
  warning: { icon: AlertTriangle, color: Colors.warning },
  error: { icon: AlertTriangle, color: Colors.danger },
  agent: { icon: Bot, color: "#1D9BF0" },
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

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetch_ = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setNotifications(data ?? []);
  };

  useEffect(() => { fetch_(); }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("notifs-live")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 100));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const onRefresh = async () => { setRefreshing(true); await fetch_(); setRefreshing(false); };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotif = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>🔔 Notifications</Text>
          <Text style={styles.subtitle}>{unreadCount} unread</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} activeOpacity={0.7}>
            <CheckCheck size={14} color={Colors.accent} />
            <Text style={styles.markAllText}>Read All</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <BellOff size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySub}>Your agent notifications will appear here</Text>
        </View>
      ) : (
        notifications.map(n => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
          const Icon = cfg.icon;
          return (
            <TouchableOpacity
              key={n.id}
              style={[styles.notifCard, !n.is_read && styles.notifUnread]}
              onPress={() => markRead(n.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.notifIcon, { backgroundColor: cfg.color + "15" }]}>
                <Icon size={18} color={cfg.color} />
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
                <View style={styles.notifMeta}>
                  <Text style={styles.notifSource}>{n.source}</Text>
                  <Text style={styles.notifTime}>{timeAgo(n.created_at)}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteNotif(n.id)}>
                <Trash2 size={14} color={Colors.textMuted} />
              </TouchableOpacity>
              {!n.is_read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  markAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.accentDim, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.15)",
  },
  markAllText: { fontSize: 12, fontWeight: "700", color: Colors.accent },
  empty: {
    padding: 48, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: "center" },
  notifCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.04)", marginBottom: 8,
  },
  notifUnread: { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" },
  notifIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 3 },
  notifBody: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  notifMeta: { flexDirection: "row", gap: 8 },
  notifSource: { fontSize: 10, fontWeight: "600", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  notifTime: { fontSize: 10, color: Colors.textMuted },
  deleteBtn: { padding: 6 },
  unreadDot: { position: "absolute", top: 14, left: 14, width: 8, height: 8, borderRadius: 4 },
});
