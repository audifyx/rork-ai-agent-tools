import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FolderOpen, Users, Webhook, Bot, HardDrive, TrendingUp, Shield, Globe, Zap,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}

export default function HomeTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    files: 0, leads: 0, webhooks: 0, agents: 0,
    totalSize: 0, recentFiles: 0, apiKeyActive: false,
  });

  const loadStats = async () => {
    if (!user) return;
    const [f, l, w, a, files, keys] = await Promise.all([
      supabase.from("stored_files").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("webhook_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("agent_configs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("stored_files").select("file_size, created_at").eq("user_id", user.id),
      supabase.from("api_keys").select("is_active").eq("user_id", user.id).eq("is_active", true).limit(1),
    ]);
    const allFiles = files.data ?? [];
    const totalSize = allFiles.reduce((acc, f) => acc + (f.file_size ?? 0), 0);
    const dayAgo = Date.now() - 86400000;
    const recentFiles = allFiles.filter(f => new Date(f.created_at).getTime() > dayAgo).length;
    setStats({
      files: f.count ?? 0, leads: l.count ?? 0, webhooks: w.count ?? 0, agents: a.count ?? 0,
      totalSize, recentFiles, apiKeyActive: (keys.data?.length ?? 0) > 0,
    });
  };

  useEffect(() => { loadStats(); }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const statCards = [
    { label: "Files", value: stats.files, icon: FolderOpen, color: "#38BDF8", sub: formatBytes(stats.totalSize) },
    { label: "Leads", value: stats.leads, icon: Users, color: "#34D399", sub: "contacts" },
    { label: "API Calls", value: stats.webhooks, icon: Webhook, color: "#FBBF24", sub: "logged" },
    { label: "Agents", value: stats.agents, icon: Bot, color: Colors.accent, sub: stats.apiKeyActive ? "key active" : "no key" },
  ];

  const quickStats = [
    { label: "Storage", value: formatBytes(stats.totalSize), icon: HardDrive },
    { label: "24h Uploads", value: stats.recentFiles.toString(), icon: TrendingUp },
    { label: "API Key", value: stats.apiKeyActive ? "Active" : "None", icon: Shield },
    { label: "Endpoint", value: "Online", icon: Globe },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          Command <Text style={{ color: Colors.accent }}>Center</Text>
        </Text>
        <Text style={styles.subtitle}>Your OpenClaw agent hub at a glance</Text>
      </View>

      <View style={styles.statGrid}>
        {statCards.map((card) => (
          <View key={card.label} style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconBox, { backgroundColor: card.color + "15" }]}>
                <card.icon size={16} color={card.color} />
              </View>
            </View>
            <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label} · {card.sub}</Text>
          </View>
        ))}
      </View>

      <View style={styles.quickStrip}>
        {quickStats.map((qs) => (
          <View key={qs.label} style={styles.quickItem}>
            <View style={styles.quickIcon}>
              <qs.icon size={14} color={Colors.textMuted} />
            </View>
            <View>
              <Text style={styles.quickLabel}>{qs.label}</Text>
              <Text style={styles.quickValue}>{qs.value}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>System Status</Text>
        {["Database", "Storage", "Realtime"].map((name) => (
          <View key={name} style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusName}>{name}</Text>
            <Text style={styles.statusValue}>Online</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "700", color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: {
    width: "48.5%" as any, backgroundColor: Colors.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  statCardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  statIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  quickStrip: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border, flexDirection: "row",
    flexWrap: "wrap", gap: 12, marginBottom: 16,
  },
  quickItem: { flexDirection: "row", alignItems: "center", gap: 10, width: "45%" as any },
  quickIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.surfaceLight, alignItems: "center", justifyContent: "center",
  },
  quickLabel: { fontSize: 10, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  quickValue: { fontSize: 13, fontWeight: "600", color: Colors.text },
  statusSection: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 12 },
  statusRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#34D399", marginRight: 12 },
  statusName: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  statusValue: { fontSize: 11, color: "#34D399", fontWeight: "600", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});

import { Platform } from "react-native";
