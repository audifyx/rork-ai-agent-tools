import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BellOff, CheckCheck, Trash2, Bot, AlertTriangle,
  Info, CheckCircle2,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";
import ColorfulBackground from "@/components/ColorfulBackground";
import GlassCard from "@/components/GlassCard";

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
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
    info: { icon: Info, color: colors.info },
    success: { icon: CheckCircle2, color: colors.success },
    warning: { icon: AlertTriangle, color: colors.warning },
    error: { icon: AlertTriangle, color: colors.danger },
    agent: { icon: Bot, color: colors.accent },
  };

  const fetch_ = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setNotifications(data ?? []);
  }, [user]);

  useEffect(() => { void fetch_(); }, [fetch_]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("notifs-live")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 100));
      }).subscribe();
    return () => { void supabase.removeChannel(ch); };
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
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ColorfulBackground variant="detail" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{unreadCount} unread</Text>
          {unreadCount > 0 && (
            <TouchableOpacity style={[styles.markAllBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)" }]} onPress={markAllRead} activeOpacity={0.7}>
              <CheckCheck size={14} color={colors.accent} />
              <Text style={[styles.markAllText, { color: colors.accent }]}>Read All</Text>
            </TouchableOpacity>
          )}
        </View>

        {notifications.length === 0 ? (
          <GlassCard style={styles.empty}>
            <BellOff size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No notifications</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Your agent notifications will appear here</Text>
          </GlassCard>
        ) : (
          notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <TouchableOpacity
                key={n.id}
                activeOpacity={0.8}
                onPress={() => markRead(n.id)}
              >
                <GlassCard style={[styles.notifCard, !n.is_read && { borderColor: colors.accentGlow }]}>
                  <View style={styles.notifInner}>
                    <View style={[styles.notifIcon, { backgroundColor: cfg.color + "18" }]}>
                      <Icon size={18} color={cfg.color} />
                    </View>
                    <View style={styles.notifContent}>
                      <Text style={[styles.notifTitle, { color: colors.text }]}>{n.title}</Text>
                      <Text style={[styles.notifBody, { color: colors.textSecondary }]} numberOfLines={2}>{n.body}</Text>
                      <View style={styles.notifMeta}>
                        <Text style={[styles.notifSource, { color: colors.textMuted }]}>{n.source}</Text>
                        <Text style={[styles.notifTime, { color: colors.textMuted }]}>{timeAgo(n.created_at)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteNotif(n.id)}>
                      <Trash2 size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {!n.is_read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
                </GlassCard>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, marginTop: 8 },
  subtitle: { fontSize: 13 },
  markAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    borderWidth: 1,
  },
  markAllText: { fontSize: 12, fontWeight: "700" as const },
  empty: {
    padding: 48, alignItems: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "600" as const, marginTop: 16 },
  emptySub: { fontSize: 13, marginTop: 4, textAlign: "center" },
  notifCard: {
    marginBottom: 8, borderRadius: 18,
  },
  notifInner: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  notifIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: "700" as const, marginBottom: 3 },
  notifBody: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  notifMeta: { flexDirection: "row", gap: 8 },
  notifSource: { fontSize: 10, fontWeight: "600" as const, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  notifTime: { fontSize: 10 },
  deleteBtn: { padding: 6 },
  unreadDot: { position: "absolute", top: 14, left: 14, width: 8, height: 8, borderRadius: 4 },
});
