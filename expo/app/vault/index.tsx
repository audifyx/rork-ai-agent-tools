import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Alert, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Plus, KeyRound, Eye, EyeOff, Trash2, Shield, Clock, Bot,
  X, Check, Copy, Star, StarOff,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const SERVICE_EMOJI: Record<string, string> = {
  openai: "🤖", anthropic: "🧠", stripe: "💳", github: "🐙",
  discord: "💬", telegram: "📱", vercel: "▲", supabase: "⚡",
  aws: "☁️", google: "🔍", twitter: "🐦", custom: "🔧", other: "🔑",
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

const SERVICES = ["openai", "anthropic", "stripe", "github", "discord", "telegram", "vercel", "supabase", "aws", "google", "twitter", "custom", "other"];

export default function SecretsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [secrets, setSecrets] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showOnce, setShowOnce] = useState<string | null>(null); // show key once after adding
  const [form, setForm] = useState({ name: "", service: "other", key_value: "", description: "" });

  const fetchSecrets = useCallback(async () => {
    if (!user) return;
    // Select everything EXCEPT key_value — we never show it in the app after creation
    const { data } = await supabase
      .from("vault_entries")
      .select("id, name, service, key_prefix, key_suffix, description, tags, is_active, is_revealed, read_count, last_read_at, expires_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSecrets(data ?? []);
  }, [user]);

  useEffect(() => { fetchSecrets(); }, [fetchSecrets]);
  const onRefresh = async () => { setRefreshing(true); await fetchSecrets(); setRefreshing(false); };

  const handleAdd = async () => {
    if (!user || !form.name || !form.key_value) {
      return Alert.alert("Error", "Name and secret value are required");
    }

    const { data, error } = await supabase.from("vault_entries").insert({
      user_id: user.id,
      name: form.name,
      service: form.service,
      key_value: form.key_value,
      description: form.description || null,
    }).select().single();

    if (error) return Alert.alert("Error", error.message);

    // Show the key ONE TIME only
    setShowOnce(form.key_value);
    setForm({ name: "", service: "other", key_value: "", description: "" });
    setShowAdd(false);
    fetchSecrets();

    Alert.alert(
      "🔐 Secret Stored",
      "Your secret is saved. You can see it once now — after this, only your agent can read it via the API.",
    );
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete Secret", `Permanently delete "${name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await supabase.from("vault_entries").delete().eq("id", id);
          fetchSecrets();
        },
      },
    ]);
  };

  const handleDeactivate = async (id: string) => {
    await supabase.from("vault_entries").update({ is_active: false }).eq("id", id);
    fetchSecrets();
  };

  const activeSecrets = secrets.filter(s => s.is_active);
  const inactiveSecrets = secrets.filter(s => !s.is_active);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F472B6" />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>🔐 Vault</Text>
          <Text style={styles.subtitle}>{activeSecrets.length} active secrets</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(!showAdd)} activeOpacity={0.7}>
          {showAdd ? <X size={18} color="#fff" /> : <Plus size={18} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Show once banner */}
      {showOnce && (
        <View style={styles.showOnceBanner}>
          <Text style={styles.showOnceTitle}>⚠️ Shown once — copy now</Text>
          <Text style={styles.showOnceKey} selectable>{showOnce}</Text>
          <TouchableOpacity style={styles.showOnceDismiss} onPress={() => setShowOnce(null)}>
            <Text style={styles.showOnceDismissText}>I've copied it — dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add form */}
      {showAdd && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Store a Secret</Text>

          <Text style={styles.inputLabel}>Name *</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))}
            placeholder="e.g. OpenAI Production Key" placeholderTextColor={Colors.textMuted} />

          <Text style={styles.inputLabel}>Service</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceRow}>
            {SERVICES.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.servicePill, form.service === s && styles.servicePillActive]}
                onPress={() => setForm(p => ({ ...p, service: s }))}
                activeOpacity={0.7}
              >
                <Text style={styles.serviceEmoji}>{SERVICE_EMOJI[s]}</Text>
                <Text style={[styles.serviceText, form.service === s && styles.serviceTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.inputLabel}>Secret Value *</Text>
          <TextInput style={[styles.input, styles.secretInput]} value={form.key_value}
            onChangeText={v => setForm(p => ({ ...p, key_value: v }))}
            placeholder="sk-..." placeholderTextColor={Colors.textMuted}
            secureTextEntry autoCapitalize="none" autoCorrect={false} />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput style={styles.input} value={form.description}
            onChangeText={v => setForm(p => ({ ...p, description: v }))}
            placeholder="What's this key for?" placeholderTextColor={Colors.textMuted} />

          <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} activeOpacity={0.7}>
            <Shield size={16} color="#fff" />
            <Text style={styles.saveBtnText}>Store Secret</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            After storing, the value is hidden forever in the app. Only your agent can read it via the ClawVault API.
          </Text>
        </View>
      )}

      {/* Secret cards */}
      {activeSecrets.length === 0 && !showAdd ? (
        <View style={styles.empty}>
          <KeyRound size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No secrets stored</Text>
          <Text style={styles.emptySub}>
            Store API keys here. Tell your agent "read my OpenAI key" and it'll fetch it from the vault.
          </Text>
        </View>
      ) : (
        activeSecrets.map(secret => (
          <View key={secret.id} style={styles.secretCard}>
            <View style={styles.secretRow}>
              <View style={styles.secretIcon}>
                <Text style={{ fontSize: 20 }}>{SERVICE_EMOJI[secret.service] || "🔑"}</Text>
              </View>
              <View style={styles.secretInfo}>
                <Text style={styles.secretName}>{secret.name}</Text>
                <Text style={styles.secretMasked}>
                  {secret.key_prefix}••••••••{secret.key_suffix}
                </Text>
                {secret.description && (
                  <Text style={styles.secretDesc} numberOfLines={1}>{secret.description}</Text>
                )}
              </View>
            </View>

            <View style={styles.secretMeta}>
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>{secret.service}</Text>
              </View>
              {secret.is_revealed && (
                <View style={[styles.metaChip, { backgroundColor: "rgba(251,191,36,0.1)" }]}>
                  <Bot size={10} color="#FBBF24" />
                  <Text style={[styles.metaText, { color: "#FBBF24" }]}>Read {secret.read_count}x</Text>
                </View>
              )}
              {secret.last_read_at && (
                <Text style={styles.metaTime}>Last: {timeAgo(secret.last_read_at)}</Text>
              )}
            </View>

            <View style={styles.secretActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeactivate(secret.id)}>
                <EyeOff size={14} color={Colors.textMuted} />
                <Text style={styles.actionText}>Deactivate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(secret.id, secret.name)}>
                <Trash2 size={14} color={Colors.danger} />
                <Text style={[styles.actionText, { color: Colors.danger }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Inactive secrets */}
      {inactiveSecrets.length > 0 && (
        <>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>DEACTIVATED</Text>
            <View style={styles.dividerLine} />
          </View>
          {inactiveSecrets.map(secret => (
            <View key={secret.id} style={[styles.secretCard, { opacity: 0.4 }]}>
              <View style={styles.secretRow}>
                <View style={styles.secretIcon}>
                  <Text style={{ fontSize: 20 }}>{SERVICE_EMOJI[secret.service] || "🔑"}</Text>
                </View>
                <View style={styles.secretInfo}>
                  <Text style={styles.secretName}>{secret.name}</Text>
                  <Text style={styles.secretMasked}>{secret.key_prefix}••••{secret.key_suffix}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(secret.id, secret.name)}>
                <Trash2 size={14} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  addBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#F472B6", alignItems: "center", justifyContent: "center" },

  showOnceBanner: {
    backgroundColor: "rgba(251,191,36,0.08)", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "rgba(251,191,36,0.2)", marginBottom: 16,
  },
  showOnceTitle: { fontSize: 14, fontWeight: "700", color: "#FBBF24", marginBottom: 8 },
  showOnceKey: { fontSize: 12, fontFamily: mono, color: Colors.text, backgroundColor: "rgba(0,0,0,0.3)", padding: 10, borderRadius: 8, marginBottom: 10 },
  showOnceDismiss: { alignSelf: "center" },
  showOnceDismissText: { fontSize: 13, fontWeight: "600", color: "#FBBF24" },

  formCard: {
    backgroundColor: "rgba(244,114,182,0.04)", borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: "rgba(244,114,182,0.12)", marginBottom: 16,
  },
  formTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  secretInput: { fontFamily: mono, fontSize: 13 },
  serviceRow: { marginVertical: 6 },
  servicePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginRight: 6,
    backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  servicePillActive: { backgroundColor: "rgba(244,114,182,0.12)", borderColor: "rgba(244,114,182,0.25)" },
  serviceEmoji: { fontSize: 14 },
  serviceText: { fontSize: 11, fontWeight: "600", color: Colors.textMuted, textTransform: "capitalize" },
  serviceTextActive: { color: "#F472B6" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#F472B6", borderRadius: 14, paddingVertical: 14, marginTop: 14,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  disclaimer: { fontSize: 11, color: Colors.textMuted, textAlign: "center", marginTop: 10, lineHeight: 16 },

  empty: {
    padding: 48, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: "center", lineHeight: 20 },

  secretCard: {
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginBottom: 10,
  },
  secretRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  secretIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(244,114,182,0.08)", alignItems: "center", justifyContent: "center",
  },
  secretInfo: { flex: 1 },
  secretName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  secretMasked: { fontSize: 12, fontFamily: mono, color: Colors.textMuted, marginTop: 2 },
  secretDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  secretMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(244,114,182,0.08)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  metaText: { fontSize: 10, fontWeight: "600", color: "#F472B6", textTransform: "capitalize" },
  metaTime: { fontSize: 10, color: Colors.textMuted },

  secretActions: { flexDirection: "row", gap: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.04)", paddingTop: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },

  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.04)" },
  dividerText: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.15)", letterSpacing: 1.5 },
});
