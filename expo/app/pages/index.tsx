import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Alert, Platform, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Plus, Globe, ExternalLink, Trash2, Pin, PinOff,
  X, Check, Copy, ArrowLeft, Search, Filter,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";

const PLATFORM_EMOJI: Record<string, string> = {
  vercel: "▲", netlify: "◆", cloudflare: "☁️", "github-pages": "🐙",
  lovable: "💜", replit: "⚡", custom: "🔧", unknown: "🌐",
};

const PLATFORMS = ["vercel", "netlify", "cloudflare", "github-pages", "lovable", "replit", "custom", "unknown"];

function timeAgo(d: string | null) {
  if (!d) return "never";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SitesScreen() {
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const styles = createStylesStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const [deployments, setDeployments] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", url: "", platform: "unknown", description: "", agent_name: "", deploy_source: "" });

  const fetchDeployments = useCallback(async () => {
    if (!user) return;
    let query = supabase
      .from("pages_deployments")
      .select("*")
      .eq("user_id", user.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (filterStatus) query = query.eq("status", filterStatus);
    const { data } = await query;
    setDeployments(data ?? []);
  }, [user, filterStatus]);

  useEffect(() => { fetchDeployments(); }, [fetchDeployments]);
  const onRefresh = async () => { setRefreshing(true); await fetchDeployments(); setRefreshing(false); };

  const handleAdd = async () => {
    if (!user || !form.title || !form.url) {
      return Alert.alert("Error", "Title and URL are required");
    }

    const { error } = await supabase.from("pages_deployments").insert({
      user_id: user.id,
      title: form.title,
      url: form.url,
      platform: form.platform,
      description: form.description || null,
      agent_name: form.agent_name || null,
      deploy_source: form.deploy_source || null,
    });

    if (error) return Alert.alert("Error", error.message);
    setForm({ title: "", url: "", platform: "unknown", description: "", agent_name: "", deploy_source: "" });
    setShowAdd(false);
    fetchDeployments();
  };

  const togglePin = async (id: string, current: boolean) => {
    await supabase.from("pages_deployments").update({ is_pinned: !current }).eq("id", id);
    fetchDeployments();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("pages_deployments").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    fetchDeployments();
  };

  const deleteDeploy = (id: string, title: string) => {
    Alert.alert("Delete", `Remove "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          await supabase.from("pages_deployments").delete().eq("id", id);
          fetchDeployments();
        }
      },
    ]);
  };

  const filtered = deployments.filter(d =>
    !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const liveCount = deployments.filter(d => d.status === "live").length;
  const archivedCount = deployments.filter(d => d.status === "archived").length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🌐 ClawPages</Text>
          <Text style={styles.subtitle}>{liveCount} live · {archivedCount} archived</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(!showAdd)}>
          {showAdd ? <X size={20} color={colors.text} /> : <Plus size={20} color={colors.text} />}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={14} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search deployments..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Status filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {[null, "live", "down", "archived"].map(s => (
          <TouchableOpacity
            key={s ?? "all"}
            style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.filterText, filterStatus === s && styles.filterTextActive]}>
              {s === null ? "All" : s === "live" ? "🟢 Live" : s === "down" ? "🔴 Down" : "📦 Archived"}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add form */}
      {showAdd && (
        <View style={styles.addForm}>
          <Text style={styles.formTitle}>Add Deployment</Text>
          <TextInput style={styles.input} placeholder="Site title" placeholderTextColor={colors.textMuted} value={form.title} onChangeText={v => setForm({ ...form, title: v })} />
          <TextInput style={styles.input} placeholder="URL (https://...)" placeholderTextColor={colors.textMuted} value={form.url} onChangeText={v => setForm({ ...form, url: v })} autoCapitalize="none" keyboardType="url" />
          <TextInput style={styles.input} placeholder="Description (optional)" placeholderTextColor={colors.textMuted} value={form.description} onChangeText={v => setForm({ ...form, description: v })} />
          <TextInput style={styles.input} placeholder="Agent name (optional)" placeholderTextColor={colors.textMuted} value={form.agent_name} onChangeText={v => setForm({ ...form, agent_name: v })} />
          <Text style={styles.formLabel}>Platform</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {PLATFORMS.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.platformChip, form.platform === p && styles.platformChipActive]}
                onPress={() => setForm({ ...form, platform: p })}
              >
                <Text style={styles.platformChipText}>{PLATFORM_EMOJI[p]} {p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.submitBtn} onPress={handleAdd}>
            <Check size={16} color="#fff" />
            <Text style={styles.submitText}>Add Site</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Deployments list */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Globe size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>No deployments yet</Text>
          <Text style={styles.emptySubtext}>Add sites manually or let your agent post them via API</Text>
        </View>
      ) : (
        filtered.map(d => (
          <View key={d.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.platformEmoji}>{PLATFORM_EMOJI[d.platform] || "🌐"}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{d.title}</Text>
                  {d.is_pinned && <Pin size={12} color={colors.warning} />}
                </View>
                <Text style={styles.cardUrl} numberOfLines={1}>{d.url}</Text>
              </View>
              <View style={[styles.statusDot, {
                backgroundColor: d.status === "live" ? colors.success : d.status === "down" ? colors.danger : colors.textMuted
              }]} />
            </View>

            {d.description && <Text style={styles.cardDesc} numberOfLines={2}>{d.description}</Text>}

            <View style={styles.cardMeta}>
              {d.agent_name && <Text style={styles.metaText}>🤖 {d.agent_name}</Text>}
              {d.deploy_source && <Text style={styles.metaText}>via {d.deploy_source}</Text>}
              <Text style={styles.metaText}>{timeAgo(d.created_at)}</Text>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(d.url)}>
                <ExternalLink size={14} color={colors.info} />
                <Text style={[styles.actionText, { color: colors.info }]}>Open</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={async () => { await Clipboard.setStringAsync(d.url); Alert.alert("Copied!"); }}>
                <Copy size={14} color={colors.textSecondary} />
                <Text style={styles.actionText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => togglePin(d.id, d.is_pinned)}>
                {d.is_pinned ? <PinOff size={14} color={colors.warning} /> : <Pin size={14} color={colors.textSecondary} />}
                <Text style={styles.actionText}>{d.is_pinned ? "Unpin" : "Pin"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => {
                const next = d.status === "live" ? "archived" : "live";
                updateStatus(d.id, next);
              }}>
                <Text style={styles.actionText}>{d.status === "live" ? "Archive" : "Restore"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => deleteDeploy(d.id, d.title)}>
                <Trash2 size={14} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const createStylesStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.surfaceLight },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentDim, borderWidth: 1, borderColor: "rgba(220,38,38,0.2)", alignItems: "center", justifyContent: "center" },
  searchRow: { marginBottom: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.surfaceLight },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  filterRow: { marginBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceLight, marginRight: 8 },
  filterChipActive: { backgroundColor: colors.accentDim, borderColor: "rgba(220,38,38,0.3)" },
  filterText: { fontSize: 12, color: colors.textSecondary },
  filterTextActive: { color: colors.accent, fontWeight: "700" },
  addForm: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: colors.surfaceLight },
  formTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 14 },
  formLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted, marginBottom: 6, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: colors.surfaceLight, borderRadius: 10, padding: 12, color: colors.text, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.surfaceLight },
  platformChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.surfaceLight, marginRight: 6 },
  platformChipActive: { backgroundColor: colors.accentDim, borderColor: "rgba(220,38,38,0.3)" },
  platformChipText: { fontSize: 12, color: colors.textSecondary },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14 },
  submitText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: "center", paddingHorizontal: 40 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.surfaceLight },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  platformEmoji: { fontSize: 24 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 },
  cardUrl: { fontSize: 12, color: colors.info, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 10, lineHeight: 18 },
  cardMeta: { flexDirection: "row", gap: 12, marginTop: 10, flexWrap: "wrap" },
  metaText: { fontSize: 11, color: colors.textMuted },
  cardActions: { flexDirection: "row", gap: 6, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.surfaceLight, paddingTop: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.03)" },
  actionText: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
});
