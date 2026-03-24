import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Key, Eye, EyeOff, Copy, RefreshCw, Shield, ExternalLink,
  ChevronDown, ChevronUp, KeyRound, Bot, Trash2,
} from "lucide-react-native";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const API_URL = `${SUPABASE_URL}/functions/v1/clawvault-api`;

const ENDPOINTS = [
  {
    category: "Secrets", color: "#F472B6",
    actions: [
      { name: "list_secrets", desc: "List all secrets (names only, no values)", perm: "read" },
      { name: "read_secret", desc: "Read actual secret value by ID or name", perm: "read", params: '{ "name": "OpenAI Key" }' },
      { name: "read_by_service", desc: "Read secret by service name", perm: "read", params: '{ "service": "openai" }' },
      { name: "rotate_secret", desc: "Replace a secret's value", perm: "write", params: '{ "entry_id": "uuid", "new_value": "sk-new..." }' },
      { name: "delete_secret", desc: "Permanently delete a secret", perm: "delete", params: '{ "entry_id": "uuid" }' },
    ],
  },
  {
    category: "System", color: "#FBBF24",
    actions: [
      { name: "whoami", desc: "Get vault info and secret count", perm: "read" },
    ],
  },
];

export default function VaultAPI() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [apiKey, setApiKey] = useState<any>(null);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchKey = async () => {
    if (!user) return;
    const { data } = await supabase.from("vault_api_keys").select("*").eq("user_id", user.id).maybeSingle();
    setApiKey(data);
    setLoading(false);
  };
  useEffect(() => { fetchKey(); }, [user]);

  const generateKey = async () => {
    if (!user) return;
    const { error } = await supabase.from("vault_api_keys").insert({ user_id: user.id });
    if (error) return Alert.alert("Error", error.message);
    fetchKey();
  };

  const regenerateKey = async () => {
    if (!apiKey) return;
    const newKey = "cv_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    await supabase.from("vault_api_keys").update({ key_value: newKey }).eq("id", apiKey.id);
    fetchKey();
  };

  const masked = apiKey ? apiKey.key_value.slice(0, 6) + "••••••••" + apiKey.key_value.slice(-4) : "";
  const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>🔑 Vault API</Text>
      <Text style={styles.subtitle}>Separate key for ClawVault access</Text>

      {/* API Key */}
      {loading ? (
        <ActivityIndicator color="#F472B6" style={{ marginTop: 40 }} />
      ) : !apiKey ? (
        <View style={styles.emptyCard}>
          <KeyRound size={32} color="#F472B6" />
          <Text style={styles.emptyText}>No Vault API key yet</Text>
          <TouchableOpacity style={styles.genBtn} onPress={generateKey} activeOpacity={0.7}>
            <Text style={styles.genBtnText}>Generate Vault Key</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.keyCard}>
          <View style={styles.keyHeader}>
            <Key size={16} color="#F472B6" />
            <Text style={styles.keyLabel}>Vault API Key (cv_)</Text>
          </View>
          <Text style={[styles.keyValue, { fontFamily: mono }]}>{showKey ? apiKey.key_value : masked}</Text>
          <View style={styles.keyActions}>
            <TouchableOpacity style={styles.keyBtn} onPress={() => setShowKey(!showKey)}>
              {showKey ? <EyeOff size={13} color={Colors.textSecondary} /> : <Eye size={13} color={Colors.textSecondary} />}
              <Text style={styles.keyBtnText}>{showKey ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keyBtn} onPress={() => Alert.alert("Vault Key", apiKey.key_value)}>
              <Copy size={13} color={Colors.textSecondary} />
              <Text style={styles.keyBtnText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keyBtn} onPress={regenerateKey}>
              <RefreshCw size={13} color={Colors.textSecondary} />
              <Text style={styles.keyBtnText}>Regen</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Endpoint */}
      <View style={styles.endpointCard}>
        <ExternalLink size={14} color="#F472B6" />
        <Text style={styles.endpointLabel}>POST</Text>
        <Text style={[styles.endpointUrl, { fontFamily: mono }]} numberOfLines={2}>{API_URL}</Text>
      </View>

      {/* Endpoints */}
      <Text style={styles.secLabel}>ENDPOINTS</Text>
      {ENDPOINTS.map(group => (
        <View key={group.category} style={styles.groupCard}>
          <TouchableOpacity style={styles.groupHeader} onPress={() => setExpanded(expanded === group.category ? null : group.category)} activeOpacity={0.7}>
            <Text style={[styles.groupTitle, { color: group.color }]}>{group.category}</Text>
            <Text style={styles.groupCount}>{group.actions.length}</Text>
            {expanded === group.category ? <ChevronUp size={16} color={Colors.textMuted} /> : <ChevronDown size={16} color={Colors.textMuted} />}
          </TouchableOpacity>
          {expanded === group.category && group.actions.map(a => (
            <View key={a.name} style={styles.actionRow}>
              <Text style={[styles.actionName, { color: group.color, fontFamily: mono }]}>{a.name}</Text>
              <Text style={styles.actionDesc}>{a.desc}</Text>
              {a.params && <Text style={[styles.actionParams, { fontFamily: mono }]}>{a.params}</Text>}
            </View>
          ))}
        </View>
      ))}

      {/* Agent prompt */}
      <View style={styles.promptCard}>
        <Text style={styles.promptTitle}>🤖 Agent System Prompt</Text>
        <View style={styles.codeBox}>
          <Text style={[styles.codeText, { fontFamily: mono }]}>You have access to ClawVault — a secure API key storage.</Text>
          <Text style={[styles.codeText, { fontFamily: mono }]}>Base URL: {API_URL}</Text>
          <Text style={[styles.codeText, { fontFamily: mono }]}>Auth: Bearer cv_YOUR_KEY</Text>
          <Text style={[styles.codeText, { fontFamily: mono }]}>{'\n'}To get a user's API key:</Text>
          <Text style={[styles.codeText, { fontFamily: mono }]}>{'{ "action": "read_by_service", "params": { "service": "openai" } }'}</Text>
          <Text style={[styles.codeText, { fontFamily: mono }]}>{'\n'}Or by name:</Text>
          <Text style={[styles.codeText, { fontFamily: mono }]}>{'{ "action": "read_secret", "params": { "name": "Stripe Key" } }'}</Text>
          <Text style={[styles.codeText, { fontFamily: mono }]}>{'\n'}The user stores secrets in the app. You read them when needed.</Text>
          <Text style={[styles.codeText, { fontFamily: mono }]}>Never expose secrets in chat — use them silently in API calls.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3, marginBottom: 20 },
  secLabel: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.5, marginTop: 20, marginBottom: 10 },

  emptyCard: { padding: 40, alignItems: "center", gap: 14, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  genBtn: { backgroundColor: "#F472B6", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 },
  genBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  keyCard: { backgroundColor: "rgba(244,114,182,0.05)", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(244,114,182,0.12)" },
  keyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  keyLabel: { fontSize: 14, fontWeight: "700", color: Colors.text },
  keyValue: { fontSize: 11, color: Colors.textSecondary, marginBottom: 12 },
  keyActions: { flexDirection: "row", gap: 8 },
  keyBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.04)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  keyBtnText: { fontSize: 11, fontWeight: "600", color: Colors.textSecondary },

  endpointCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginTop: 12 },
  endpointLabel: { fontSize: 10, fontWeight: "800", color: "#F472B6" },
  endpointUrl: { fontSize: 10, color: Colors.textSecondary, flex: 1 },

  groupCard: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginBottom: 10, overflow: "hidden" },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  groupTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  groupCount: { fontSize: 11, color: Colors.textMuted },
  actionRow: { padding: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.04)" },
  actionName: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  actionDesc: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  actionParams: { fontSize: 10, color: Colors.textSecondary, backgroundColor: "rgba(255,255,255,0.03)", padding: 8, borderRadius: 6 },

  promptCard: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginTop: 10, marginBottom: 20 },
  promptTitle: { fontSize: 13, fontWeight: "700", color: "#F472B6", marginBottom: 10 },
  codeBox: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12, gap: 2 },
  codeText: { fontSize: 11, color: Colors.textSecondary, lineHeight: 18 },
});
