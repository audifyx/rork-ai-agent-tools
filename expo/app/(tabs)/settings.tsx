import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  Alert, Platform, Switch, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-linking";
import {
  User, Key, Bot, FileText, Activity, Eye, EyeOff, Copy, RefreshCw,
  Shield, Save, LogOut, Check, ChevronRight,
} from "lucide-react-native";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

type Section = "account" | "apikeys" | "agent" | "docs";

export default function SettingsTab() {
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>("account");

  const sections: { id: Section; label: string; icon: any }[] = [
    { id: "account", label: "Account", icon: User },
    { id: "apikeys", label: "API Keys", icon: Key },
    { id: "agent", label: "Agent", icon: Bot },
    { id: "docs", label: "Docs", icon: FileText },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
    >
      <Text style={styles.title}><Text style={{ color: Colors.accent }}>Settings</Text></Text>
      <Text style={styles.subtitle}>Account, API, agent config & docs</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
        {sections.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.pill, section === s.id && styles.pillActive]}
            onPress={() => setSection(s.id)}
            activeOpacity={0.7}
          >
            <s.icon size={14} color={section === s.id ? Colors.background : Colors.textMuted} />
            <Text style={[styles.pillText, section === s.id && styles.pillTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {section === "account" && <AccountSection />}
      {section === "apikeys" && <ApiKeysSection />}
      {section === "agent" && <AgentSection />}
      {section === "docs" && <DocsSection />}
    </ScrollView>
  );
}

function AccountSection() {
  const { user, signOut } = useAuthStore();

  const copyId = () => {
    if (user?.id) {
      // Using a simple Alert to show copied ID since Clipboard needs expo-clipboard
      Alert.alert("User ID", user.id);
    }
  };

  return (
    <View style={styles.section}>
      <SettingRow label="Email" value={user?.email ?? "—"} />
      <SettingRow label="User ID" value={user?.id?.slice(0, 12) + "..." ?? "—"} onPress={copyId} />
      <SettingRow label="Joined" value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"} />
      <TouchableOpacity style={styles.dangerBtn} onPress={() => {
        Alert.alert("Sign Out", "Are you sure?", [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Out", style: "destructive", onPress: signOut },
        ]);
      }} activeOpacity={0.7}>
        <LogOut size={16} color="#F87171" />
        <Text style={styles.dangerBtnText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

function ApiKeysSection() {
  const { user } = useAuthStore();
  const [apiKey, setApiKey] = useState<any>(null);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchKey = async () => {
    if (!user) return;
    const { data } = await supabase.from("api_keys").select("*").eq("user_id", user.id).single();
    setApiKey(data);
    setLoading(false);
  };
  useEffect(() => { fetchKey(); }, [user]);

  const generateKey = async () => {
    if (!user) return;
    const { error } = await supabase.from("api_keys").insert({ user_id: user.id });
    if (error) return Alert.alert("Error", error.message);
    fetchKey();
  };

  const regenerateKey = async () => {
    if (!apiKey) return;
    const newKey = "oc_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    await supabase.from("api_keys").update({ key_value: newKey }).eq("id", apiKey.id);
    fetchKey();
  };

  if (loading) return <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />;

  if (!apiKey) return (
    <View style={styles.emptyCard}>
      <Key size={32} color={Colors.accent} />
      <Text style={styles.emptyCardText}>No API key yet</Text>
      <TouchableOpacity style={styles.accentBtn} onPress={generateKey} activeOpacity={0.7}>
        <Text style={styles.accentBtnText}>Generate API Key</Text>
      </TouchableOpacity>
    </View>
  );

  const masked = apiKey.key_value.slice(0, 6) + "••••••••••" + apiKey.key_value.slice(-4);

  return (
    <View style={styles.section}>
      <View style={styles.keyBox}>
        <Text style={styles.keyLabel}>Your API Key</Text>
        <Text style={styles.keyValue}>{showKey ? apiKey.key_value : masked}</Text>
        <View style={styles.keyActions}>
          <TouchableOpacity style={styles.keyBtn} onPress={() => setShowKey(!showKey)}>
            {showKey ? <EyeOff size={14} color={Colors.textSecondary} /> : <Eye size={14} color={Colors.textSecondary} />}
            <Text style={styles.keyBtnText}>{showKey ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keyBtn} onPress={() => Alert.alert("API Key", apiKey.key_value)}>
            <Copy size={14} color={Colors.textSecondary} />
            <Text style={styles.keyBtnText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keyBtn} onPress={regenerateKey}>
            <RefreshCw size={14} color={Colors.textSecondary} />
            <Text style={styles.keyBtnText}>Regen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function AgentSection() {
  const { user } = useAuthStore();
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState({
    agent_name: "OpenClaw Agent", webhook_url: "", telegram_chat_id: "",
    permissions: { read: true, write: true, delete: false }, is_active: true,
  });

  const fetchConfig = async () => {
    if (!user) return;
    const { data } = await supabase.from("agent_configs").select("*").eq("user_id", user.id).maybeSingle();
    if (data) {
      const perms = typeof data.permissions === "object" && data.permissions !== null
        ? data.permissions as { read: boolean; write: boolean; delete: boolean }
        : { read: true, write: true, delete: false };
      setConfig(data);
      setForm({ agent_name: data.agent_name, webhook_url: data.webhook_url ?? "", telegram_chat_id: data.telegram_chat_id ?? "", permissions: perms, is_active: data.is_active });
    }
  };
  useEffect(() => { fetchConfig(); }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const payload = { agent_name: form.agent_name, webhook_url: form.webhook_url || null, telegram_chat_id: form.telegram_chat_id || null, permissions: form.permissions, is_active: form.is_active };
    if (config) {
      await supabase.from("agent_configs").update(payload).eq("id", config.id);
    } else {
      await supabase.from("agent_configs").insert({ user_id: user.id, ...payload });
    }
    Alert.alert("Saved", "Agent configuration updated");
    fetchConfig();
  };

  return (
    <View style={styles.section}>
      <Text style={styles.inputLabel}>Agent Name</Text>
      <TextInput style={styles.input} value={form.agent_name} onChangeText={(v) => setForm(p => ({ ...p, agent_name: v }))} placeholderTextColor={Colors.textMuted} />

      <Text style={styles.inputLabel}>Telegram Chat ID</Text>
      <TextInput style={styles.input} value={form.telegram_chat_id} onChangeText={(v) => setForm(p => ({ ...p, telegram_chat_id: v }))} placeholder="e.g. 123456789" placeholderTextColor={Colors.textMuted} />

      <Text style={styles.inputLabel}>Webhook URL</Text>
      <TextInput style={styles.input} value={form.webhook_url} onChangeText={(v) => setForm(p => ({ ...p, webhook_url: v }))} placeholder="https://..." placeholderTextColor={Colors.textMuted} autoCapitalize="none" />

      <Text style={[styles.inputLabel, { marginTop: 16 }]}>Permissions</Text>
      {(["read", "write", "delete"] as const).map(perm => (
        <View key={perm} style={styles.switchRow}>
          <Text style={styles.switchLabel}>{perm.charAt(0).toUpperCase() + perm.slice(1)} access</Text>
          <Switch
            value={form.permissions[perm]}
            onValueChange={(v) => setForm(p => ({ ...p, permissions: { ...p.permissions, [perm]: v } }))}
            trackColor={{ false: Colors.surfaceLight, true: Colors.accentDim }}
            thumbColor={form.permissions[perm] ? Colors.accent : Colors.textMuted}
          />
        </View>
      ))}

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Agent Active</Text>
        <Switch
          value={form.is_active}
          onValueChange={(v) => setForm(p => ({ ...p, is_active: v }))}
          trackColor={{ false: Colors.surfaceLight, true: Colors.accentDim }}
          thumbColor={form.is_active ? Colors.accent : Colors.textMuted}
        />
      </View>

      <TouchableOpacity style={styles.accentBtn} onPress={handleSave} activeOpacity={0.7}>
        <Save size={16} color={Colors.background} />
        <Text style={styles.accentBtnText}>Save Configuration</Text>
      </TouchableOpacity>
    </View>
  );
}

function DocsSection() {
  const apiUrl = `${SUPABASE_URL}/functions/v1/openclaw-api`;

  return (
    <View style={styles.section}>
      <View style={styles.docCard}>
        <Text style={styles.docTitle}>API Endpoint</Text>
        <Text style={styles.docCode}>POST {apiUrl}</Text>
      </View>
      <View style={styles.docCard}>
        <Text style={styles.docTitle}>Authentication</Text>
        <Text style={styles.docCode}>Authorization: Bearer YOUR_API_KEY</Text>
      </View>
      <View style={styles.docCard}>
        <Text style={styles.docTitle}>Request Format</Text>
        <Text style={styles.docCode}>{'{ "action": "action_name", "params": { ... } }'}</Text>
      </View>
      <View style={styles.docCard}>
        <Text style={styles.docTitle}>Available Actions</Text>
        <Text style={styles.docList}>Files: list_files, read_file, upload_file, delete_file</Text>
        <Text style={styles.docList}>Leads: list_leads, create_lead, update_lead, delete_lead</Text>
        <Text style={styles.docList}>System: log_webhook, get_agent_config, whoami</Text>
      </View>
    </View>
  );
}

function SettingRow({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.6 : 1}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue} numberOfLines={1}>{value}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: "700", color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4, marginBottom: 16 },
  pillRow: { marginBottom: 20 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, marginRight: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText: { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
  pillTextActive: { color: Colors.background },
  section: { gap: 12 },
  settingRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  settingLabel: { fontSize: 14, fontWeight: "500", color: Colors.text },
  settingValue: { fontSize: 13, color: Colors.textMuted, maxWidth: 180, textAlign: "right", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  dangerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(248,113,113,0.1)", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "rgba(248,113,113,0.2)", marginTop: 8,
  },
  dangerBtnText: { fontSize: 15, fontWeight: "600", color: "#F87171" },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 40,
    alignItems: "center", borderWidth: 1, borderColor: Colors.border, gap: 16,
  },
  emptyCardText: { fontSize: 15, color: Colors.textSecondary },
  accentBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.accent, borderRadius: 14, padding: 16, marginTop: 8,
  },
  accentBtnText: { fontSize: 15, fontWeight: "700", color: Colors.background },
  keyBox: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  keyLabel: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 10 },
  keyValue: { fontSize: 12, color: Colors.textSecondary, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", marginBottom: 14 },
  keyActions: { flexDirection: "row", gap: 10 },
  keyBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.surfaceLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  keyBtnText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  inputLabel: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 4 },
  input: {
    backgroundColor: Colors.surfaceLight, borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  switchRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  switchLabel: { fontSize: 14, color: Colors.text, textTransform: "capitalize" },
  docCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  docTitle: { fontSize: 13, fontWeight: "700", color: Colors.accent, marginBottom: 8 },
  docCode: { fontSize: 12, color: Colors.textSecondary, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  docList: { fontSize: 12, color: Colors.textMuted, marginTop: 4, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
