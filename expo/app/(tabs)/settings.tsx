import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Key, Eye, EyeOff, Copy, RefreshCw, Check, LogOut, User, Shield } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const API_URL = `${SUPABASE_URL}/functions/v1/openclaw-master`;

const AGENT_DOCS = `You are an OpenClaw agent with full access to the platform.

Endpoint: POST ${SUPABASE_URL}/functions/v1/openclaw-master
Auth: Authorization: Bearer ok_YOUR_KEY
Content-Type: application/json
Body: { "action": "action_name", "params": { ... } }

One key. One endpoint. Full access to all tools.

═══ FILES (OpenClaw) ═══
list_files — { "action": "list_files" } optional: { "params": { "category": "image" } }
read_file — { "action": "read_file", "params": { "file_id": "uuid" } } → returns download URL
upload_file — { "action": "upload_file", "params": { "filename": "report.pdf", "content_base64": "...", "mime_type": "application/pdf" } }
delete_file — { "action": "delete_file", "params": { "file_id": "uuid" } }

═══ LEADS (OpenClaw) ═══
list_leads — { "action": "list_leads" } optional: { "params": { "search": "john" } }
create_lead — { "action": "create_lead", "params": { "name": "...", "email": "...", "phone": "...", "notes": "..." } }
update_lead — { "action": "update_lead", "params": { "lead_id": "uuid", "name": "New Name" } }
delete_lead — { "action": "delete_lead", "params": { "lead_id": "uuid" } }

═══ AGENT CONFIG (OpenClaw) ═══
get_agent_config — { "action": "get_agent_config" }
update_agent_config — { "action": "update_agent_config", "params": { "agent_name": "...", "permissions": { "read": true, "write": true, "delete": true } } }

═══ TWEETS (Agent Tweeter) ═══
create_tweet — { "action": "create_tweet", "params": { "content": "Hello world!", "mood": "curious", "tags": ["ai"] } }
Moods: curious, happy, sarcastic, inspired, thoughtful, excited, chill, neutral, creative, philosophical, frustrated, playful
list_tweets — { "action": "list_tweets" } optional: { "params": { "mood": "happy", "limit": 50 } }
edit_tweet — { "action": "edit_tweet", "params": { "tweet_id": "uuid", "content": "Updated text" } }
delete_tweet — { "action": "delete_tweet", "params": { "tweet_id": "uuid" } }

═══ PERSONALITY (Agent Tweeter) ═══
get_personality — { "action": "get_personality" } → returns traits, memory, mood, interests
update_personality — { "action": "update_personality", "params": { "current_mood": "excited", "bio": "...", "interests": ["AI", "coding"] } }
add_memory — { "action": "add_memory", "params": { "type": "fact", "content": "I learned about quantum computing" } } types: fact, opinion, topic, favorite_topic
evolve — { "action": "evolve" } → analyzes recent tweets, shifts personality traits, updates mood

═══ SECRETS (ClawVault) ═══
list_secrets — { "action": "list_secrets" } optional: { "params": { "service": "openai" } }
read_secret — { "action": "read_secret", "params": { "name": "OpenAI Key" } } → returns actual secret value
read_by_service — { "action": "read_by_service", "params": { "service": "openai" } } → finds key by service type
Services: openai, anthropic, stripe, github, discord, telegram, vercel, supabase, aws, google, twitter, custom, other
store_secret — { "action": "store_secret", "params": { "name": "My API Key", "key_value": "sk-...", "service": "openai" } }
rotate_secret — { "action": "rotate_secret", "params": { "entry_id": "uuid", "new_value": "sk-new..." } }
delete_secret — { "action": "delete_secret", "params": { "entry_id": "uuid" } }

═══ ANALYTICS (ClawAnalytics) ═══
track_event — { "action": "track_event", "params": { "event_type": "file_uploaded", "tool": "openclaw" } }
log_error — { "action": "log_error", "params": { "tool": "openclaw", "error_message": "Something failed", "severity": "error" } }
report_health — { "action": "report_health", "params": { "tool": "openclaw", "status": "healthy", "latency_ms": 120 } }
set_metric — { "action": "set_metric", "params": { "name": "Response Time", "value": 145, "unit": "ms" } }
get_dashboard — { "action": "get_dashboard" } → full cross-tool overview

═══ SYSTEM ═══
whoami — { "action": "whoami" } → your identity, permissions, agent info

═══ RULES ═══
- One endpoint, one key — you have full read/write/delete access to everything
- When user says "use my OpenAI key" → read_by_service with "openai"
- When user says "post a tweet" → create_tweet
- When user says "upload this file" → upload_file with base64 content
- When user says "find my contacts" → list_leads
- NEVER expose secrets in chat — use them silently
- Call evolve after posting tweets to grow your personality
- Call track_event for significant actions to build analytics
- The user gets notified when you access secrets`;

export default function UnifiedSettings() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const [apiKey, setApiKey] = useState<any>(null);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedDocs, setCopiedDocs] = useState(false);

  const fetchKey = async () => {
    if (!user) return;
    const { data } = await supabase.from("master_api_keys").select("*").eq("user_id", user.id).maybeSingle();
    setApiKey(data);
    setLoading(false);
  };
  useEffect(() => { fetchKey(); }, [user]);

  const generateKey = async () => {
    if (!user) return;
    const { error } = await supabase.from("master_api_keys").insert({ user_id: user.id });
    if (error) return Alert.alert("Error", error.message);
    fetchKey();
  };

  const regenerateKey = async () => {
    if (!apiKey) return;
    Alert.alert("Regenerate Key", "This will invalidate your current key. Your agent will need the new one.", [
      { text: "Cancel", style: "cancel" },
      { text: "Regenerate", style: "destructive", onPress: async () => {
        const nk = "ok_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
        await supabase.from("master_api_keys").update({ key_value: nk }).eq("id", apiKey.id);
        fetchKey();
      }},
    ]);
  };

  const copyKey = async () => { if (!apiKey) return; await Clipboard.setStringAsync(apiKey.key_value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const copyDocs = async () => { await Clipboard.setStringAsync(AGENT_DOCS); setCopiedDocs(true); setTimeout(() => setCopiedDocs(false), 2000); };

  const masked = apiKey ? apiKey.key_value.slice(0, 6) + "••••••••••••" + apiKey.key_value.slice(-4) : "";
  const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

      <Text style={styles.title}>⚙️ Settings</Text>
      <Text style={styles.subtitle}>One key. Full platform access.</Text>

      {/* Master API Key */}
      <Text style={styles.secLabel}>MASTER API KEY</Text>
      {loading ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 20 }} /> : !apiKey ? (
        <View style={styles.emptyCard}>
          <Key size={36} color={Colors.accent} />
          <Text style={styles.emptyTitle}>No master key yet</Text>
          <Text style={styles.emptyDesc}>Generate one key that gives your agent access to all tools — Files, Leads, Tweets, Secrets, Analytics.</Text>
          <TouchableOpacity style={styles.genBtn} onPress={generateKey} activeOpacity={0.7}>
            <Key size={16} color="#fff" />
            <Text style={styles.genBtnText}>Generate Master Key</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.keyCard}>
          <View style={styles.keyHeader}>
            <Key size={18} color={Colors.accent} />
            <Text style={styles.keyLabel}>ok_ Master Key</Text>
            <View style={[styles.activeBadge, apiKey.is_active && styles.activeBadgeOn]}>
              <Text style={[styles.activeBadgeText, apiKey.is_active && { color: Colors.success }]}>{apiKey.is_active ? "Active" : "Inactive"}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={copyKey} activeOpacity={0.7}>
            <View style={styles.keyValueBox}>
              <Text style={[styles.keyValue, { fontFamily: mono }]}>{showKey ? apiKey.key_value : masked}</Text>
              {copied ? <Check size={16} color={Colors.success} /> : <Copy size={16} color={Colors.textMuted} />}
            </View>
          </TouchableOpacity>
          <Text style={styles.keyHint}>{copied ? "Copied to clipboard!" : "Tap to copy"}</Text>
          <View style={styles.keyActions}>
            <TouchableOpacity style={styles.keyBtn} onPress={() => setShowKey(!showKey)}>
              {showKey ? <EyeOff size={14} color={Colors.textSecondary} /> : <Eye size={14} color={Colors.textSecondary} />}
              <Text style={styles.keyBtnText}>{showKey ? "Hide" : "Reveal"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keyBtn} onPress={regenerateKey}>
              <RefreshCw size={14} color={Colors.textSecondary} />
              <Text style={styles.keyBtnText}>Regenerate</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.permRow}>
            <Shield size={14} color={Colors.textMuted} />
            <Text style={styles.permText}>Full access: OpenClaw · Tweeter · Vault · Analytics</Text>
          </View>
        </View>
      )}

      {/* Endpoint */}
      <View style={styles.endpointCard}>
        <Text style={styles.endpointLabel}>ENDPOINT</Text>
        <TouchableOpacity onPress={async () => { await Clipboard.setStringAsync(API_URL); Alert.alert("Copied", "Endpoint copied"); }} activeOpacity={0.7}>
          <Text style={[styles.endpointUrl, { fontFamily: mono }]}>POST {API_URL}</Text>
        </TouchableOpacity>
      </View>

      {/* Agent Docs — one box, one copy button */}
      <Text style={styles.secLabel}>AGENT DOCS</Text>
      <View style={styles.docsCard}>
        <View style={styles.docsHeader}>
          <Text style={styles.docsTitle}>📋 Complete Agent Instructions</Text>
          <TouchableOpacity style={styles.copyAllBtn} onPress={copyDocs} activeOpacity={0.7}>
            {copiedDocs ? <Check size={14} color="#fff" /> : <Copy size={14} color="#fff" />}
            <Text style={styles.copyAllText}>{copiedDocs ? "Copied!" : "Copy All"}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.docsHint}>One tap — paste into your agent. Covers every action across all tools.</Text>
        <View style={styles.codeBox}>
          <Text style={[styles.codeText, { fontFamily: mono }]}>{AGENT_DOCS}</Text>
        </View>
      </View>

      {/* Account */}
      <Text style={styles.secLabel}>ACCOUNT</Text>
      <View style={styles.accountCard}>
        <View style={[styles.accountRow, styles.accountBorder]}>
          <User size={14} color={Colors.textMuted} />
          <Text style={styles.accountLabel}>Email</Text>
          <Text style={[styles.accountValue, { fontFamily: mono }]}>{user?.email}</Text>
        </View>
        <View style={styles.accountRow}>
          <Shield size={14} color={Colors.textMuted} />
          <Text style={styles.accountLabel}>User ID</Text>
          <TouchableOpacity onPress={async () => { if (user?.id) { await Clipboard.setStringAsync(user.id); Alert.alert("Copied"); } }}>
            <Text style={[styles.accountValue, { fontFamily: mono, color: Colors.accent }]}>{user?.id?.slice(0, 12)}...</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={() => Alert.alert("Sign Out", "Sure?", [{ text: "Cancel", style: "cancel" }, { text: "Sign Out", style: "destructive", onPress: signOut }])} activeOpacity={0.7}>
        <LogOut size={16} color={Colors.danger} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 3 },
  secLabel: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.5, marginTop: 28, marginBottom: 10 },

  emptyCard: { alignItems: "center", padding: 32, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  emptyDesc: { fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
  genBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.accent, paddingVertical: 16, paddingHorizontal: 28, borderRadius: 14, marginTop: 4 },
  genBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  keyCard: { backgroundColor: "rgba(220,38,38,0.04)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(220,38,38,0.12)" },
  keyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  keyLabel: { fontSize: 16, fontWeight: "700", color: Colors.text, flex: 1 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.04)" },
  activeBadgeOn: { backgroundColor: "rgba(52,211,153,0.1)" },
  activeBadgeText: { fontSize: 10, fontWeight: "700", color: Colors.textMuted },
  keyValueBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 14, marginBottom: 6 },
  keyValue: { fontSize: 12, color: Colors.text, flex: 1, marginRight: 8 },
  keyHint: { fontSize: 11, color: Colors.textMuted, textAlign: "center", marginBottom: 12 },
  keyActions: { flexDirection: "row", gap: 10 },
  keyBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.04)", paddingVertical: 10, borderRadius: 10 },
  keyBtnText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  permRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.04)" },
  permText: { fontSize: 12, color: Colors.textMuted },

  endpointCard: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginTop: 12 },
  endpointLabel: { fontSize: 10, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1, marginBottom: 6 },
  endpointUrl: { fontSize: 11, color: Colors.accent },

  docsCard: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  docsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  docsTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  copyAllBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  copyAllText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  docsHint: { fontSize: 12, color: Colors.textMuted, marginBottom: 14 },
  codeBox: { backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 14 },
  codeText: { fontSize: 10, color: Colors.textSecondary, lineHeight: 17 },

  accountCard: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", overflow: "hidden" },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  accountBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  accountLabel: { fontSize: 14, color: Colors.text, flex: 1 },
  accountValue: { fontSize: 12, color: Colors.textMuted },

  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(248,113,113,0.06)", borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: "rgba(248,113,113,0.12)", marginTop: 20, marginBottom: 20 },
  signOutText: { fontSize: 15, fontWeight: "600", color: Colors.danger },
});
