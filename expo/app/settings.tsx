import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Key, Eye, EyeOff, Copy, RefreshCw, Check, LogOut, User, Shield, Palette } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";
import ColorfulBackground from "@/components/ColorfulBackground";
import GlassCard from "@/components/GlassCard";

const API_URL = `${SUPABASE_URL}/functions/v1/openclaw-master`;
const DEFAULT_MASTER_PERMISSIONS = {
  openclaw: true,
  tweeter: true,
  imagegen: true,
  vault: true,
  analytics: true,
  pages: true,
  swarm: true,
} as const;

type MasterApiKey = {
  id: string;
  key_value: string;
  is_active: boolean;
  permissions?: Record<string, boolean> | null;
};

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

═══ IMAGEGEN (ClawImageGen) ═══
generate_image — { "action": "generate_image", "params": { "prompt": "A cinematic lobster mech in a neon city", "style": "cinematic", "size": "1024x1024", "quality": "hd", "agent_name": "OpenClaw" } }
  optional: negative_prompt, tags, quality (standard/hd), style, size, agent_name
  styles: photorealistic, anime, digital-art, oil-painting, sketch, cinematic, watercolor, 3d-render
  sizes: 512x512, 768x768, 1024x1024, 1024x1792, 1792x1024
list_images — { "action": "list_images" } optional: { "params": { "status": "done", "saved_only": true, "limit": 20, "tag": "campaign" } }
get_image — { "action": "get_image", "params": { "image_id": "uuid" } }
save_image — { "action": "save_image", "params": { "image_id": "uuid" } }
update_image — { "action": "update_image", "params": { "image_id": "uuid", "is_starred": true, "tags": ["launch"], "agent_name": "OpenClaw" } }
delete_image — { "action": "delete_image", "params": { "image_id": "uuid" } }
get_image_stats — { "action": "get_image_stats" } → image generation totals, queue, favorite style
get_image_download_url — { "action": "get_image_download_url", "params": { "image_id": "uuid" } }

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

═══ PAGES (ClawPages) ═══
add_deployment — { "action": "add_deployment", "params": { "title": "My Site", "url": "https://mysite.vercel.app", "platform": "vercel" } }
  platforms: vercel, netlify, cloudflare, github-pages, lovable, replit, custom, unknown
  optional: description, tags, agent_name, deploy_source
list_deployments — { "action": "list_deployments" } optional: { "params": { "status": "live", "platform": "vercel", "limit": 50 } }
update_deployment — { "action": "update_deployment", "params": { "id": "uuid", "status": "archived" } }
  updatable: title, url, platform, status (live/down/archived), description, tags, is_pinned, agent_name, deploy_source
delete_deployment — { "action": "delete_deployment", "params": { "id": "uuid" } }
create_session — { "action": "create_session", "params": { "session_name": "My Build" } } → creates a live preview session
  optional: html_content, css_content, js_content, agent_name
push — { "action": "push", "params": { "session_id": "uuid", "html_content": "<html>...</html>" } } → pushes HTML to live preview (user sees it in real-time)
  optional: css_content, js_content, agent_name
get_session — { "action": "get_session", "params": { "session_id": "uuid" } } → returns current HTML
list_sessions — { "action": "list_sessions" } → all live preview sessions
get_history — { "action": "get_history", "params": { "session_id": "uuid" } } → version history
get_version — { "action": "get_version", "params": { "session_id": "uuid", "version": 3 } } → specific version snapshot
delete_session — { "action": "delete_session", "params": { "session_id": "uuid" } }

═══ SWARM (ClawSwarm) ═══
setup_key — { "action": "setup_key", "params": { "api_key": "sk-or-v1-YOUR_OPENROUTER_KEY" } } → stores OpenRouter key in vault for all sub-agents
swarm_status — { "action": "swarm_status" } → active agents count, key status, model info
create_agent — { "action": "create_agent", "params": { "name": "Research Bot", "role": "researcher" } }
  roles: assistant, researcher, coder, writer, analyst, custom
  optional: description, system_prompt, model (default: stepfun/step-3.5-flash:free), permissions, personality
create_swarm — { "action": "create_swarm", "params": { "agents": [{"name": "Coder", "role": "coder"}, {"name": "Writer", "role": "writer"}] } } → batch create up to 10
list_agents — { "action": "list_agents" } optional: { "params": { "status": "active" } }
get_agent — { "action": "get_agent", "params": { "agent_id": "uuid" } } → full agent details + memory
update_agent — { "action": "update_agent", "params": { "agent_id": "uuid", "status": "paused" } }
delete_agent — { "action": "delete_agent", "params": { "agent_id": "uuid" } }
chat — { "action": "chat", "params": { "agent_id": "uuid", "message": "Research the latest AI news" } } → sends message, gets AI reply
get_messages — { "action": "get_messages", "params": { "agent_id": "uuid" } } → conversation history
clear_messages — { "action": "clear_messages", "params": { "agent_id": "uuid" } } → wipe conversation
add_memory — { "action": "add_memory", "params": { "agent_id": "uuid", "content": "User prefers short answers", "type": "fact" } }
send_to_agent — { "action": "send_to_agent", "params": { "from_agent_id": "uuid", "to_agent_id": "uuid", "message": "Please review this" } }
read_inbox — { "action": "read_inbox", "params": { "agent_id": "uuid" } } → inter-agent messages

═══ RULES ═══
- One endpoint, one key — you have full read/write/delete access to everything
- When user says "use my OpenAI key" → read_by_service with "openai"
- When user says "post a tweet" → create_tweet
- When user says "upload this file" → upload_file with base64 content
- When user says "find my contacts" → list_leads
- When user says "generate an image" or "make artwork" → generate_image
- When user says "deploy" or "save this site" → add_deployment with the final URL
- When building HTML live → create_session then push updates as you code
- NEVER expose secrets in chat — use them silently
- Call evolve after posting tweets to grow your personality
- Call track_event for significant actions to build analytics
- The user gets notified when you access secrets`;

export default function UnifiedSettings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const isWin11 = theme.id === "win11_dark" || theme.id === "win11_light";
  const [apiKey, setApiKey] = useState<MasterApiKey | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedDocs, setCopiedDocs] = useState(false);

  const subtleBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const subtleBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const cardBg = isWin11
    ? (isDark ? "rgba(45,45,45,0.60)" : "rgba(255,255,255,0.70)")
    : undefined;

  const fetchKey = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("master_api_keys").select("*").eq("user_id", user.id).maybeSingle();
    if (data) {
      const mergedPermissions: Record<string, boolean> = {
        ...DEFAULT_MASTER_PERMISSIONS,
        ...(data.permissions ?? {}),
      };
      const currentPermissions = data.permissions ?? {};
      const permissionsChanged = Object.keys(mergedPermissions).some(key => mergedPermissions[key] !== currentPermissions[key]);
      if (permissionsChanged) {
        await supabase.from("master_api_keys").update({ permissions: mergedPermissions }).eq("id", data.id);
      }
      setApiKey({
        id: data.id,
        key_value: data.key_value,
        is_active: data.is_active,
        permissions: mergedPermissions,
      });
    } else {
      setApiKey(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void fetchKey(); }, [fetchKey]);

  const generateKey = async () => {
    if (!user) return;
    const { error } = await supabase.from("master_api_keys").insert({
      user_id: user.id,
      permissions: DEFAULT_MASTER_PERMISSIONS,
    });
    if (error) return Alert.alert("Error", error.message);
    await fetchKey();
  };

  const regenerateKey = async () => {
    if (!apiKey) return;
    Alert.alert("Regenerate Key", "This will invalidate your current key. Your agent will need the new one.", [
      { text: "Cancel", style: "cancel" },
      { text: "Regenerate", style: "destructive", onPress: async () => {
        const nk = "ok_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
        await supabase.from("master_api_keys").update({ key_value: nk }).eq("id", apiKey.id);
        await fetchKey();
      }},
    ]);
  };

  const copyKey = async () => { if (!apiKey) return; await Clipboard.setStringAsync(apiKey.key_value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const copyDocs = async () => { await Clipboard.setStringAsync(AGENT_DOCS); setCopiedDocs(true); setTimeout(() => setCopiedDocs(false), 2000); };

  const masked = apiKey ? apiKey.key_value.slice(0, 6) + "••••••••••••" + apiKey.key_value.slice(-4) : "";
  const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ColorfulBackground variant="detail" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>

        <Text style={[styles.subtitle, { color: colors.textMuted }]}>One key. Full platform access.</Text>

        <TouchableOpacity
          style={[styles.themeBtn, { backgroundColor: colors.accentDim, borderColor: colors.accentGlow }]}
          onPress={() => router.push("/theme-settings" as any)}
          activeOpacity={0.7}
        >
          <Palette size={20} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.themeBtnTitle, { color: colors.text }]}>UI Themes</Text>
            <Text style={[styles.themeBtnSub, { color: colors.textMuted }]}>Current: {theme.emoji} {theme.name}</Text>
          </View>
          <View style={styles.themePreviewRow}>
            {theme.preview.map((c, i) => (
              <View key={i} style={[styles.themePreviewDot, { backgroundColor: c }]} />
            ))}
          </View>
        </TouchableOpacity>

        <Text style={[styles.secLabel, { color: colors.textMuted }]}>MASTER API KEY</Text>
        {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} /> : !apiKey ? (
          <GlassCard style={[styles.emptyCard, isWin11 && { borderRadius: 8 }]}>
            <Key size={36} color={colors.accent} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No master key yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Generate one key that gives your agent access to all tools — OpenClaw, Tweeter, ImageGen, Vault, Analytics, Pages, Swarm.</Text>
            <TouchableOpacity style={[styles.genBtn, { backgroundColor: colors.accent, shadowColor: colors.accent }]} onPress={generateKey} activeOpacity={0.7}>
              <Key size={16} color="#fff" />
              <Text style={styles.genBtnText}>Generate Master Key</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          <GlassCard style={[styles.keyCard, isWin11 && { borderRadius: 8 }]}>
            <View style={styles.keyHeader}>
              <Key size={18} color={colors.accent} />
              <Text style={[styles.keyLabel, { color: colors.text }]}>ok_ Master Key</Text>
              <View style={[styles.activeBadge, apiKey.is_active && { backgroundColor: "rgba(16,185,129,0.12)" }]}>
                <Text style={[styles.activeBadgeText, { color: colors.textMuted }, apiKey.is_active && { color: colors.success }]}>{apiKey.is_active ? "Active" : "Inactive"}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={copyKey} activeOpacity={0.7}>
              <View style={[styles.keyValueBox, { backgroundColor: subtleBg }]}>
                <Text style={[styles.keyValue, { fontFamily: mono, color: colors.text }]}>{showKey ? apiKey.key_value : masked}</Text>
                {copied ? <Check size={16} color={colors.success} /> : <Copy size={16} color={colors.textMuted} />}
              </View>
            </TouchableOpacity>
            <Text style={[styles.keyHint, { color: colors.textMuted }]}>{copied ? "Copied to clipboard!" : "Tap to copy"}</Text>
            <View style={styles.keyActions}>
              <TouchableOpacity style={[styles.keyBtn, { backgroundColor: subtleBg }]} onPress={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff size={14} color={colors.textSecondary} /> : <Eye size={14} color={colors.textSecondary} />}
                <Text style={[styles.keyBtnText, { color: colors.textSecondary }]}>{showKey ? "Hide" : "Reveal"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.keyBtn, { backgroundColor: subtleBg }]} onPress={regenerateKey}>
                <RefreshCw size={14} color={colors.textSecondary} />
                <Text style={[styles.keyBtnText, { color: colors.textSecondary }]}>Regenerate</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.permRow, { borderTopColor: subtleBorder }]}>
              <Shield size={14} color={colors.textMuted} />
              <Text style={[styles.permText, { color: colors.textMuted }]}>Full access: OpenClaw · Tweeter · ImageGen · Vault · Analytics · Pages · Swarm</Text>
            </View>
          </GlassCard>
        )}

        <GlassCard style={[styles.endpointCard, isWin11 && { borderRadius: 8 }]}>
          <Text style={[styles.endpointLabel, { color: colors.textMuted }]}>ENDPOINT</Text>
          <TouchableOpacity onPress={async () => { await Clipboard.setStringAsync(API_URL); Alert.alert("Copied", "Endpoint copied"); }} activeOpacity={0.7}>
            <Text style={[styles.endpointUrl, { fontFamily: mono, color: colors.accent }]}>POST {API_URL}</Text>
          </TouchableOpacity>
        </GlassCard>

        <Text style={[styles.secLabel, { color: colors.textMuted }]}>AGENT DOCS</Text>
        <GlassCard style={[styles.docsCard, isWin11 && { borderRadius: 8 }]}>
          <View style={styles.docsHeader}>
            <Text style={[styles.docsTitle, { color: colors.text }]}>📋 Agent Instructions</Text>
            <TouchableOpacity style={[styles.copyAllBtn, { backgroundColor: colors.accent, shadowColor: colors.accent }]} onPress={copyDocs} activeOpacity={0.7}>
              {copiedDocs ? <Check size={14} color="#fff" /> : <Copy size={14} color="#fff" />}
              <Text style={styles.copyAllText}>{copiedDocs ? "Copied!" : "Copy All"}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.docsHint, { color: colors.textMuted }]}>One tap — paste into your agent. Covers every action across all tools.</Text>
          <View style={[styles.codeBox, { backgroundColor: subtleBg }]}>
            <Text style={[styles.codeText, { fontFamily: mono, color: colors.textSecondary }]}>{AGENT_DOCS}</Text>
          </View>
        </GlassCard>

        <Text style={[styles.secLabel, { color: colors.textMuted }]}>ACCOUNT</Text>
        <GlassCard style={[styles.accountCard, isWin11 && { borderRadius: 8 }]}>
          <View style={[styles.accountRow, { borderBottomWidth: 1, borderBottomColor: subtleBorder }]}>
            <User size={14} color={colors.textMuted} />
            <Text style={[styles.accountLabel, { color: colors.text }]}>Email</Text>
            <Text style={[styles.accountValue, { fontFamily: mono, color: colors.textMuted }]}>{user?.email}</Text>
          </View>
          <View style={styles.accountRow}>
            <Shield size={14} color={colors.textMuted} />
            <Text style={[styles.accountLabel, { color: colors.text }]}>User ID</Text>
            <TouchableOpacity onPress={async () => { if (user?.id) { await Clipboard.setStringAsync(user.id); Alert.alert("Copied"); } }}>
              <Text style={[styles.accountValue, { fontFamily: mono, color: colors.accent }]}>{user?.id?.slice(0, 12)}...</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.15)" }]} onPress={() => Alert.alert("Sign Out", "Sure?", [{ text: "Cancel", style: "cancel" }, { text: "Sign Out", style: "destructive", onPress: signOut }])} activeOpacity={0.7}>
          <LogOut size={16} color={colors.danger} />
          <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  subtitle: { fontSize: 13, marginTop: 8, paddingHorizontal: 0 },
  secLabel: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.5, marginTop: 28, marginBottom: 10 },

  themeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
  },
  themeBtnTitle: { fontSize: 16, fontWeight: "700" as const },
  themeBtnSub: { fontSize: 12, marginTop: 2 },
  themePreviewRow: { flexDirection: "row", gap: 4 },
  themePreviewDot: { width: 18, height: 18, borderRadius: 6 },

  emptyCard: { alignItems: "center", padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" as const },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  genBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 16, paddingHorizontal: 28, borderRadius: 16, marginTop: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  genBtnText: { fontSize: 16, fontWeight: "700" as const, color: "#fff" },

  keyCard: { padding: 20 },
  keyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  keyLabel: { fontSize: 16, fontWeight: "700" as const, flex: 1 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.04)" },
  activeBadgeText: { fontSize: 10, fontWeight: "700" as const },
  keyValueBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, padding: 14, marginBottom: 6 },
  keyValue: { fontSize: 12, flex: 1, marginRight: 8 },
  keyHint: { fontSize: 11, textAlign: "center", marginBottom: 12 },
  keyActions: { flexDirection: "row", gap: 10 },
  keyBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12 },
  keyBtnText: { fontSize: 12, fontWeight: "600" as const },
  permRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  permText: { fontSize: 12 },

  endpointCard: { padding: 14, marginTop: 12 },
  endpointLabel: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 1, marginBottom: 6 },
  endpointUrl: { fontSize: 11 },

  docsCard: { padding: 20 },
  docsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  docsTitle: { fontSize: 16, fontWeight: "800" as const },
  copyAllBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  copyAllText: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
  docsHint: { fontSize: 12, marginBottom: 14 },
  codeBox: { borderRadius: 14, padding: 14 },
  codeText: { fontSize: 10, lineHeight: 17 },

  accountCard: { padding: 0, overflow: "hidden" },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  accountLabel: { fontSize: 14, flex: 1 },
  accountValue: { fontSize: 12 },

  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 16, borderWidth: 1, marginTop: 20, marginBottom: 20 },
  signOutText: { fontSize: 15, fontWeight: "600" as const },
});
