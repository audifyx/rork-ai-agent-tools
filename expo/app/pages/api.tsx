import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Alert, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Key, Plus, Copy, Trash2, ArrowLeft, Eye, EyeOff,
  Check, X, Shield,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

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

const API_DOCS = [
  { action: "add_deployment", desc: 'Add a deployed site', params: 'title*, url*, platform, description, agent_name, deploy_source' },
  { action: "list_deployments", desc: 'List all deployments', params: 'status, platform, limit' },
  { action: "update_deployment", desc: 'Update a deployment', params: 'id*, title, url, status, is_pinned, ...' },
  { action: "delete_deployment", desc: 'Delete a deployment', params: 'id*' },
  { action: "create_session", desc: 'Create a live preview session', params: 'session_name, html_content, agent_name' },
  { action: "push", desc: 'Push HTML to a live session', params: 'session_id*, html_content*, css_content, js_content' },
  { action: "get_session", desc: 'Get session details + HTML', params: 'session_id*' },
  { action: "list_sessions", desc: 'List all live sessions', params: '' },
  { action: "get_history", desc: 'Get version history for a session', params: 'session_id*, limit' },
  { action: "get_version", desc: 'Get a specific version snapshot', params: 'session_id*, version*' },
];

export default function APIScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const [keys, setKeys] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const fetchKeys = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pages_api_keys")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setKeys(data ?? []);
  }, [user]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);
  const onRefresh = async () => { setRefreshing(true); await fetchKeys(); setRefreshing(false); };

  const generateKey = async () => {
    if (!user) return;
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let key = "cp_";
    for (let i = 0; i < 48; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));

    const { data, error } = await supabase.from("pages_api_keys").insert({
      user_id: user.id,
      key_value: key,
      label: label.trim() || "Default",
    }).select().single();

    if (error) return Alert.alert("Error", error.message);
    setNewKey(key);
    setLabel("");
    setShowAdd(false);
    fetchKeys();
    Alert.alert("🔑 Key Generated", "Copy it now — it won't be shown again in full.");
  };

  const deleteKey = (id: string, keyLabel: string) => {
    Alert.alert("Delete Key", `Remove "${keyLabel}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          await supabase.from("pages_api_keys").delete().eq("id", id);
          fetchKeys();
        }
      },
    ]);
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🔑 API Keys</Text>
          <Text style={styles.subtitle}>{keys.length} keys · prefix: cp_</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(!showAdd)}>
          {showAdd ? <X size={18} color={Colors.text} /> : <Plus size={18} color={Colors.text} />}
        </TouchableOpacity>
      </View>

      {/* New key banner */}
      {newKey && (
        <View style={styles.newKeyBanner}>
          <Text style={styles.newKeyLabel}>New key (copy now!):</Text>
          <Text style={styles.newKeyValue} selectable numberOfLines={1}>{newKey}</Text>
          <TouchableOpacity style={styles.copyBtnLg} onPress={async () => { await Clipboard.setStringAsync(newKey); Alert.alert("Copied!"); setNewKey(null); }}>
            <Copy size={14} color="#fff" />
            <Text style={styles.copyBtnText}>Copy & Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add form */}
      {showAdd && (
        <View style={styles.addForm}>
          <TextInput style={styles.input} placeholder="Key label (optional)" placeholderTextColor={Colors.textMuted} value={label} onChangeText={setLabel} />
          <TouchableOpacity style={styles.genBtn} onPress={generateKey}>
            <Key size={14} color="#fff" />
            <Text style={styles.genBtnText}>Generate cp_ Key</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Keys list */}
      {keys.map(k => (
        <View key={k.id} style={styles.keyCard}>
          <View style={styles.keyHeader}>
            <Shield size={16} color={k.is_active ? Colors.success : Colors.textMuted} />
            <Text style={styles.keyLabel}>{k.label}</Text>
            <Text style={styles.keyTime}>Used {timeAgo(k.last_used_at)}</Text>
          </View>
          <View style={styles.keyValueRow}>
            <Text style={styles.keyValue} numberOfLines={1}>
              {revealedKeys.has(k.id) ? k.key_value : `${k.key_value?.slice(0, 10)}${"•".repeat(20)}`}
            </Text>
            <TouchableOpacity onPress={() => toggleReveal(k.id)}>
              {revealedKeys.has(k.id) ? <EyeOff size={14} color={Colors.textMuted} /> : <Eye size={14} color={Colors.textMuted} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={async () => { await Clipboard.setStringAsync(k.key_value); Alert.alert("Copied!"); }}>
              <Copy size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteKey(k.id, k.label)}>
              <Trash2 size={14} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* API Docs */}
      <Text style={styles.sectionTitle}>API REFERENCE</Text>
      <View style={styles.docsCard}>
        <Text style={styles.docsEndpoint}>POST /clawpages-api</Text>
        <Text style={styles.docsNote}>Authorization: Bearer cp_YOUR_KEY</Text>
        <Text style={styles.docsNote}>Body: {"{"} "action": "...", "params": {"{"} ... {"}"} {"}"}</Text>
      </View>

      {API_DOCS.map(doc => (
        <View key={doc.action} style={styles.docRow}>
          <Text style={styles.docAction}>{doc.action}</Text>
          <Text style={styles.docDesc}>{doc.desc}</Text>
          {doc.params ? <Text style={styles.docParams}>{doc.params}</Text> : null}
        </View>
      ))}
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
  newKeyBanner: { backgroundColor: "rgba(52,211,153,0.08)", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  newKeyLabel: { fontSize: 12, fontWeight: "700", color: Colors.success, marginBottom: 6 },
  newKeyValue: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 11, color: Colors.text, marginBottom: 10 },
  copyBtnLg: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: Colors.success, borderRadius: 10, paddingVertical: 10 },
  copyBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  addForm: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  input: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  genBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14 },
  genBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  keyCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  keyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  keyLabel: { fontSize: 14, fontWeight: "700", color: Colors.text, flex: 1 },
  keyTime: { fontSize: 11, color: Colors.textMuted },
  keyValueRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  keyValue: { flex: 1, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 11, color: Colors.textSecondary },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.5, marginTop: 24, marginBottom: 12 },
  docsCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  docsEndpoint: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 13, fontWeight: "700", color: Colors.info, marginBottom: 6 },
  docsNote: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 11, color: Colors.textMuted, marginBottom: 3 },
  docRow: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  docAction: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12, fontWeight: "700", color: Colors.accent },
  docDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  docParams: { fontSize: 11, color: Colors.textMuted, marginTop: 3, fontStyle: "italic" },
});
