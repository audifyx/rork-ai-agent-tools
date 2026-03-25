import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Alert, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bot, Plus, X, Check, Trash2, ArrowLeft, Key, Zap,
  Pause, Play, Copy, Shield, Brain,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const ROLES = ["assistant", "researcher", "coder", "writer", "analyst", "custom"];
const ROLE_EMOJI: Record<string, string> = {
  assistant: "🤖", researcher: "🔬", coder: "💻", writer: "✍️", analyst: "📊", custom: "⚙️",
};

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

export default function AgentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const [agents, setAgents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [orKey, setOrKey] = useState("");
  const [keySet, setKeySet] = useState(false);
  const [form, setForm] = useState({ name: "", role: "assistant", description: "", system_prompt: "" });

  const fetchAgents = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("swarm_agents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAgents(data ?? []);
  }, [user]);

  const checkKey = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("vault_entries")
      .select("id")
      .eq("user_id", user.id)
      .eq("service", "openrouter-swarm")
      .eq("is_active", true)
      .maybeSingle();
    setKeySet(!!data);
  }, [user]);

  useEffect(() => { fetchAgents(); checkKey(); }, [fetchAgents, checkKey]);
  const onRefresh = async () => { setRefreshing(true); await fetchAgents(); await checkKey(); setRefreshing(false); };

  const saveKey = async () => {
    if (!user || !orKey.trim()) return Alert.alert("Error", "Paste your OpenRouter API key");
    // Store in vault with special service tag
    const { data: existing } = await supabase.from("vault_entries")
      .select("id").eq("user_id", user.id).eq("service", "openrouter-swarm").maybeSingle();

    if (existing) {
      await supabase.from("vault_entries").update({
        key_value: orKey.trim(),
        key_prefix: orKey.trim().slice(0, 6),
        key_suffix: orKey.trim().slice(-4),
        is_active: true,
      }).eq("id", existing.id);
    } else {
      await supabase.from("vault_entries").insert({
        user_id: user.id,
        name: "OpenRouter Swarm Key",
        service: "openrouter-swarm",
        key_value: orKey.trim(),
        key_prefix: orKey.trim().slice(0, 6),
        key_suffix: orKey.trim().slice(-4),
        description: "API key for ClawSwarm sub-agents",
      });
    }

    setOrKey("");
    setShowSetup(false);
    setKeySet(true);
    Alert.alert("✅ Key Saved", "OpenRouter key stored securely in ClawVault. Your swarm is ready.");
  };

  const createAgent = async () => {
    if (!user || !form.name.trim()) return Alert.alert("Error", "Agent name is required");
    const { error } = await supabase.from("swarm_agents").insert({
      user_id: user.id,
      name: form.name.trim(),
      role: form.role,
      description: form.description || null,
      system_prompt: form.system_prompt || undefined,
      model: "stepfun/step-3.5-flash:free",
    });
    if (error) return Alert.alert("Error", error.message);
    setForm({ name: "", role: "assistant", description: "", system_prompt: "" });
    setShowCreate(false);
    fetchAgents();
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "paused" : "active";
    await supabase.from("swarm_agents").update({ status: next }).eq("id", id);
    fetchAgents();
  };

  const deleteAgent = (id: string, name: string) => {
    Alert.alert("Delete Agent", `Remove "${name}"? This deletes all conversations.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await supabase.from("swarm_agents").delete().eq("id", id);
        fetchAgents();
      }},
    ]);
  };

  const activeCount = agents.filter(a => a.status === "active").length;
  const totalTokens = agents.reduce((sum, a) => sum + (a.total_tokens_used || 0), 0);

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
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🐝 ClawSwarm</Text>
          <Text style={styles.subtitle}>{activeCount} active · {totalTokens.toLocaleString()} tokens</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(!showCreate)}>
          {showCreate ? <X size={18} color={Colors.text} /> : <Plus size={18} color={Colors.text} />}
        </TouchableOpacity>
      </View>

      {/* OpenRouter Key Setup */}
      {!keySet ? (
        <TouchableOpacity style={styles.setupBanner} onPress={() => setShowSetup(true)}>
          <Key size={18} color={Colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.setupTitle}>Set up OpenRouter API Key</Text>
            <Text style={styles.setupDesc}>Required to power your sub-agents. Tap to add your key.</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.keyOkBanner}>
          <Zap size={14} color={Colors.success} />
          <Text style={styles.keyOkText}>OpenRouter connected · stepfun/step-3.5-flash:free</Text>
          <TouchableOpacity onPress={() => setShowSetup(true)}>
            <Text style={styles.keyChangeText}>Change</Text>
          </TouchableOpacity>
        </View>
      )}

      {showSetup && (
        <View style={styles.setupForm}>
          <Text style={styles.formLabel}>OpenRouter API Key</Text>
          <TextInput
            style={styles.input}
            placeholder="sk-or-v1-..."
            placeholderTextColor={Colors.textMuted}
            value={orKey}
            onChangeText={setOrKey}
            autoCapitalize="none"
            secureTextEntry
          />
          <Text style={styles.setupHint}>Get your free key at openrouter.ai/keys</Text>
          <TouchableOpacity style={styles.submitBtn} onPress={saveKey}>
            <Shield size={14} color="#fff" />
            <Text style={styles.submitText}>Save to ClawVault</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create agent form */}
      {showCreate && (
        <View style={styles.createForm}>
          <Text style={styles.formTitle}>Create Sub-Agent</Text>
          <TextInput style={styles.input} placeholder="Agent name" placeholderTextColor={Colors.textMuted} value={form.name} onChangeText={v => setForm({ ...form, name: v })} />
          <TextInput style={styles.input} placeholder="Description (optional)" placeholderTextColor={Colors.textMuted} value={form.description} onChangeText={v => setForm({ ...form, description: v })} />
          <Text style={styles.formLabel}>Role</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {ROLES.map(r => (
              <TouchableOpacity key={r} style={[styles.roleChip, form.role === r && styles.roleChipActive]} onPress={() => setForm({ ...form, role: r })}>
                <Text style={styles.roleChipText}>{ROLE_EMOJI[r]} {r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            placeholder="Custom system prompt (optional — role default used if empty)"
            placeholderTextColor={Colors.textMuted}
            value={form.system_prompt}
            onChangeText={v => setForm({ ...form, system_prompt: v })}
            multiline
          />
          <TouchableOpacity style={styles.submitBtn} onPress={createAgent}>
            <Bot size={14} color="#fff" />
            <Text style={styles.submitText}>Create Agent</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Agents list */}
      {agents.length === 0 ? (
        <View style={styles.empty}>
          <Bot size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No sub-agents yet</Text>
          <Text style={styles.emptySubtext}>Create agents to build your swarm</Text>
        </View>
      ) : (
        agents.map(a => (
          <View key={a.id} style={[styles.card, a.status !== "active" && styles.cardPaused]}>
            <View style={styles.cardHeader}>
              <Text style={styles.agentEmoji}>{ROLE_EMOJI[a.role] || "🤖"}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.agentName}>{a.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: a.status === "active" ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)" }]}>
                    <View style={[styles.statusDot, { backgroundColor: a.status === "active" ? Colors.success : Colors.textMuted }]} />
                    <Text style={[styles.statusText, { color: a.status === "active" ? Colors.success : Colors.textMuted }]}>{a.status}</Text>
                  </View>
                </View>
                <Text style={styles.agentRole}>{a.role} · {a.total_messages || 0} msgs · {(a.total_tokens_used || 0).toLocaleString()} tokens</Text>
              </View>
            </View>
            {a.description && <Text style={styles.agentDesc} numberOfLines={2}>{a.description}</Text>}
            <Text style={styles.agentMeta}>Last active: {timeAgo(a.last_active_at)} · Created: {timeAgo(a.created_at)}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => toggleStatus(a.id, a.status)}>
                {a.status === "active" ? <Pause size={13} color={Colors.warning} /> : <Play size={13} color={Colors.success} />}
                <Text style={styles.actionText}>{a.status === "active" ? "Pause" : "Resume"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={async () => { await Clipboard.setStringAsync(a.id); Alert.alert("Copied!", "Agent ID copied"); }}>
                <Copy size={13} color={Colors.textSecondary} />
                <Text style={styles.actionText}>ID</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => deleteAgent(a.id, a.name)}>
                <Trash2 size={13} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: 22, fontWeight: "800", color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: "rgba(220,38,38,0.2)", alignItems: "center", justifyContent: "center" },
  setupBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(251,191,36,0.08)", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(251,191,36,0.2)" },
  setupTitle: { fontSize: 14, fontWeight: "700", color: Colors.warning },
  setupDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  keyOkBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(52,211,153,0.06)", borderRadius: 10, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: "rgba(52,211,153,0.15)" },
  keyOkText: { fontSize: 12, color: Colors.success, flex: 1 },
  keyChangeText: { fontSize: 11, color: Colors.textMuted, fontWeight: "600" },
  setupForm: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  formLabel: { fontSize: 11, fontWeight: "600", color: Colors.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  formTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 14 },
  input: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  setupHint: { fontSize: 11, color: Colors.textMuted, marginBottom: 12 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14 },
  submitText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  createForm: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border, marginRight: 6 },
  roleChipActive: { backgroundColor: Colors.accentDim, borderColor: "rgba(220,38,38,0.3)" },
  roleChipText: { fontSize: 12, color: Colors.textSecondary },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, color: Colors.textMuted },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardPaused: { opacity: 0.5 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  agentEmoji: { fontSize: 28 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  agentName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "600" },
  agentRole: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  agentDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 10, lineHeight: 18 },
  agentMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 8 },
  cardActions: { flexDirection: "row", gap: 6, marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.03)" },
  actionText: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600" },
});
