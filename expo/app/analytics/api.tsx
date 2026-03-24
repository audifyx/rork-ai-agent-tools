import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from "react-native";
import { Key, Eye, EyeOff, Copy, RefreshCw, Check, ChevronDown, ChevronUp } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const API_URL = `${SUPABASE_URL}/functions/v1/clawanalytics-api`;

const AGENT_DOCS = `You have access to ClawAnalytics, a full analytics platform for tracking everything across your tools.

Endpoint: POST ${SUPABASE_URL}/functions/v1/clawanalytics-api
Auth: Authorization: Bearer ca_YOUR_KEY
Content-Type: application/json
Body: { "action": "action_name", "params": { ... } }

═══ TRACKING ═══

track_event — Log any event across any tool
{ "action": "track_event", "params": { "event_type": "file_uploaded", "tool": "openclaw", "value": 1, "metadata": { "filename": "report.pdf" } } }

═══ DASHBOARDS ═══

get_dashboard — Full cross-tool overview (files, leads, tweets, secrets, errors, activity)
{ "action": "get_dashboard" }

get_tool_stats — Stats for a specific tool over a time range
{ "action": "get_tool_stats", "params": { "tool": "tweeter", "hours": 24 } }

═══ ERRORS ═══

log_error — Log an error from any tool
{ "action": "log_error", "params": { "tool": "openclaw", "action_name": "upload_file", "error_message": "Upload failed", "severity": "error" } }
Severity: warning, error, critical (critical sends push notification)

resolve_error — Mark an error as resolved
{ "action": "resolve_error", "params": { "error_id": "uuid" } }

═══ HEALTH ═══

report_health — Report tool health status
{ "action": "report_health", "params": { "tool": "openclaw", "status": "healthy", "latency_ms": 120, "success_count": 50, "error_count": 2 } }
Status: healthy, degraded, down

═══ SNAPSHOTS ═══

create_snapshot — Create a performance snapshot for a time period
{ "action": "create_snapshot", "params": { "tool": "all", "type": "daily" } }
Type: hourly, daily, weekly

═══ CUSTOM METRICS ═══

set_metric — Set or update a custom KPI
{ "action": "set_metric", "params": { "name": "Response Time", "value": 145, "unit": "ms", "tool": "openclaw", "target_value": 200, "description": "Avg API response time" } }

get_metrics — Get all custom metrics
{ "action": "get_metrics" }
Filter: { "action": "get_metrics", "params": { "tool": "openclaw" } }

═══ USAGE ═══

get_usage — Get usage tracking data
{ "action": "get_usage", "params": { "period": "monthly" } }

═══ SYSTEM ═══

whoami — Check analytics access
{ "action": "whoami" }

═══ RULES ═══
- Call track_event for every significant action across all tools
- Call report_health periodically to monitor tool status
- Call log_error when something fails (use severity: critical for urgent issues)
- Call create_snapshot daily to build historical data
- Use set_metric to track custom KPIs over time
- get_dashboard gives you a complete overview in one call`;

const ENDPOINTS = [
  { category: "Tracking", color: Colors.info, actions: [
    { name: "track_event", desc: "Log any event", params: '{ "event_type": "...", "tool": "openclaw" }' },
  ]},
  { category: "Dashboards", color: Colors.success, actions: [
    { name: "get_dashboard", desc: "Full cross-tool overview" },
    { name: "get_tool_stats", desc: "Per-tool stats", params: '{ "tool": "tweeter", "hours": 24 }' },
  ]},
  { category: "Errors", color: Colors.danger, actions: [
    { name: "log_error", desc: "Log an error", params: '{ "tool": "...", "error_message": "..." }' },
    { name: "resolve_error", desc: "Resolve an error", params: '{ "error_id": "uuid" }' },
  ]},
  { category: "Health", color: Colors.success, actions: [
    { name: "report_health", desc: "Report tool health", params: '{ "tool": "...", "status": "healthy" }' },
  ]},
  { category: "Snapshots", color: Colors.warning, actions: [
    { name: "create_snapshot", desc: "Performance snapshot", params: '{ "type": "daily" }' },
  ]},
  { category: "Metrics", color: "#A78BFA", actions: [
    { name: "set_metric", desc: "Set custom KPI", params: '{ "name": "...", "value": 100 }' },
    { name: "get_metrics", desc: "Get all metrics" },
  ]},
  { category: "System", color: Colors.textMuted, actions: [
    { name: "get_usage", desc: "Usage tracking data" },
    { name: "whoami", desc: "Analytics access info" },
  ]},
];

export default function AnalyticsAPI() {
  const { user } = useAuthStore();
  const [apiKey, setApiKey] = useState<any>(null);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchKey = async () => { if (!user) return; const { data } = await supabase.from("analytics_api_keys").select("*").eq("user_id", user.id).maybeSingle(); setApiKey(data); setLoading(false); };
  useEffect(() => { fetchKey(); }, [user]);

  const generateKey = async () => { if (!user) return; const { error } = await supabase.from("analytics_api_keys").insert({ user_id: user.id }); if (error) return Alert.alert("Error", error.message); fetchKey(); };
  const regenerateKey = async () => { if (!apiKey) return; const nk = "ca_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16); await supabase.from("analytics_api_keys").update({ key_value: nk }).eq("id", apiKey.id); fetchKey(); };
  const copyKey = async () => { if (!apiKey) return; await Clipboard.setStringAsync(apiKey.key_value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const copyDocs = async () => { await Clipboard.setStringAsync(AGENT_DOCS); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const masked = apiKey ? apiKey.key_value.slice(0, 6) + "••••••••" + apiKey.key_value.slice(-4) : "";
  const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>🔑 Analytics API</Text>
      <Text style={styles.subtitle}>Separate ca_ key for analytics access</Text>

      {loading ? <ActivityIndicator color={Colors.success} style={{ marginTop: 40 }} /> : !apiKey ? (
        <View style={styles.emptyCard}><Key size={32} color={Colors.success} /><Text style={styles.emptyText}>No Analytics API key yet</Text>
          <TouchableOpacity style={styles.genBtn} onPress={generateKey}><Text style={styles.genBtnText}>Generate Key</Text></TouchableOpacity></View>
      ) : (
        <View style={styles.keyCard}>
          <View style={styles.keyHeader}><Key size={16} color={Colors.success} /><Text style={styles.keyLabel}>Analytics Key (ca_)</Text></View>
          <Text style={[styles.keyValue, { fontFamily: mono }]}>{showKey ? apiKey.key_value : masked}</Text>
          <View style={styles.keyActions}>
            <TouchableOpacity style={styles.keyBtn} onPress={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={13} color={Colors.textSecondary} /> : <Eye size={13} color={Colors.textSecondary} />}<Text style={styles.keyBtnText}>{showKey ? "Hide" : "Show"}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.keyBtn} onPress={copyKey}>{copied ? <Check size={13} color={Colors.success} /> : <Copy size={13} color={Colors.textSecondary} />}<Text style={styles.keyBtnText}>{copied ? "Copied!" : "Copy"}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.keyBtn} onPress={regenerateKey}><RefreshCw size={13} color={Colors.textSecondary} /><Text style={styles.keyBtnText}>Regen</Text></TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.secLabel}>ENDPOINTS</Text>
      {ENDPOINTS.map(g => (
        <View key={g.category} style={styles.groupCard}>
          <TouchableOpacity style={styles.groupHeader} onPress={() => setExpanded(expanded === g.category ? null : g.category)}>
            <Text style={[styles.groupTitle, { color: g.color }]}>{g.category}</Text>
            <Text style={styles.groupCount}>{g.actions.length}</Text>
            {expanded === g.category ? <ChevronUp size={16} color={Colors.textMuted} /> : <ChevronDown size={16} color={Colors.textMuted} />}
          </TouchableOpacity>
          {expanded === g.category && g.actions.map(a => (
            <View key={a.name} style={styles.actionRow}>
              <Text style={[styles.actionName, { color: g.color, fontFamily: mono }]}>{a.name}</Text>
              <Text style={styles.actionDesc}>{a.desc}</Text>
              {a.params && <Text style={[styles.actionParams, { fontFamily: mono }]}>{a.params}</Text>}
            </View>
          ))}
        </View>
      ))}

      <View style={styles.docsSection}>
        <View style={styles.docsHeader}>
          <Text style={styles.docsTitle}>📋 Agent Docs</Text>
          <TouchableOpacity style={styles.copyAllBtn} onPress={copyDocs}>
            {copied ? <Check size={14} color="#fff" /> : <Copy size={14} color="#fff" />}
            <Text style={styles.copyAllText}>{copied ? "Copied!" : "Copy All"}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.docsHint}>Tap "Copy All" — paste into your agent's instructions.</Text>
        <View style={styles.codeBox}><Text style={[styles.codeText, { fontFamily: mono }]}>{AGENT_DOCS}</Text></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3, marginBottom: 20 },
  secLabel: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.5, marginTop: 20, marginBottom: 10 },
  emptyCard: { padding: 40, alignItems: "center", gap: 14, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  genBtn: { backgroundColor: Colors.success, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 },
  genBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  keyCard: { backgroundColor: "rgba(52,211,153,0.05)", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(52,211,153,0.12)" },
  keyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  keyLabel: { fontSize: 14, fontWeight: "700", color: Colors.text },
  keyValue: { fontSize: 11, color: Colors.textSecondary, marginBottom: 12 },
  keyActions: { flexDirection: "row", gap: 8 },
  keyBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.04)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  keyBtnText: { fontSize: 11, fontWeight: "600", color: Colors.textSecondary },
  groupCard: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginBottom: 10, overflow: "hidden" },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  groupTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  groupCount: { fontSize: 11, color: Colors.textMuted },
  actionRow: { padding: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.04)" },
  actionName: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  actionDesc: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  actionParams: { fontSize: 10, color: Colors.textSecondary, backgroundColor: "rgba(255,255,255,0.03)", padding: 8, borderRadius: 6 },
  docsSection: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginTop: 20, marginBottom: 20 },
  docsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  docsTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  copyAllBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.success, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  copyAllText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  docsHint: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  codeBox: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 },
  codeText: { fontSize: 11, color: Colors.textSecondary, lineHeight: 18 },
});
