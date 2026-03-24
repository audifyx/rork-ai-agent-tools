import React, { useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import {
  Copy, Check, ExternalLink, FileText, Users, Settings, FolderOpen,
  Webhook, Shield, Bot, ChevronDown, ChevronUp,
} from "lucide-react-native";
import { SUPABASE_URL } from "@/lib/supabase";
import Colors from "@/constants/colors";

const API_URL = `${SUPABASE_URL}/functions/v1/openclaw-api`;

const API_DOCS = `# OpenClaw Agent API Documentation

## Base URL
POST ${API_URL}

## Authentication
Authorization: Bearer oc_YOUR_API_KEY
Content-Type: application/json

## Request Format
{ "action": "action_name", "params": { ... } }

## Response Format
{ "success": true, "data": { ... } }

## Permissions
- read: list_files, read_file, list_leads, get_agent_config, whoami
- write: upload_file, create_lead, update_lead, log_webhook, update_agent_config
- delete: delete_file, delete_lead

## Endpoints

### Files
- list_files — params: { "category": "general" } (optional)
- read_file — params: { "file_id": "uuid" }
- upload_file — params: { "filename": "report.pdf", "content_base64": "...", "mime_type": "application/pdf", "category": "reports", "description": "..." }
- delete_file — params: { "file_id": "uuid" }

### Leads
- list_leads — params: { "search": "john" } (optional)
- create_lead — params: { "name": "...", "email": "...", "website": "...", "phone": "...", "notes": "...", "tags": ["vip"] }
- update_lead — params: { "lead_id": "uuid", "name": "...", ... }
- delete_lead — params: { "lead_id": "uuid" }

### System
- whoami — no params
- get_agent_config — no params
- update_agent_config — params: { "agent_name": "...", "webhook_url": "...", "telegram_chat_id": "...", "permissions": { "read": true, "write": true, "delete": false }, "is_active": true }
- log_webhook — params: { "endpoint": "...", "method": "POST", "status_code": 200, "request_body": {...}, "response_body": {...} }

## Agent System Prompt
You have access to a database command center via the OpenClaw API.
Base URL: ${API_URL}
Method: POST (always)
Auth: Bearer oc_YOUR_API_KEY
Every request body: { "action": "action_name", "params": { ... } }
Available actions: list_files, read_file, upload_file, delete_file, list_leads, create_lead, update_lead, delete_lead, whoami, get_agent_config, update_agent_config, log_webhook`;

const ENDPOINTS = [
  {
    category: "Files",
    icon: FolderOpen,
    color: "#38BDF8",
    actions: [
      { name: "list_files", desc: "List all files for the user. Optionally filter by category.", perm: "read", params: '{ "category": "general" }  // optional' },
      { name: "read_file", desc: "Get file metadata + signed download URL (1hr)", perm: "read", params: '{ "file_id": "uuid" }' },
      { name: "upload_file", desc: "Upload a file via base64", perm: "write", params: '{ "filename": "report.pdf", "content_base64": "base64...", "mime_type": "application/pdf", "category": "reports", "description": "Q3 report" }' },
      { name: "delete_file", desc: "Delete a file by ID", perm: "delete", params: '{ "file_id": "uuid" }' },
    ],
  },
  {
    category: "Leads",
    icon: Users,
    color: "#34D399",
    actions: [
      { name: "list_leads", desc: "List all leads. Optionally search by name/email/notes.", perm: "read", params: '{ "search": "john" }  // optional' },
      { name: "create_lead", desc: "Create a new lead/contact", perm: "write", params: '{ "name": "John", "email": "john@example.com", "website": "https://...", "phone": "+1...", "notes": "...", "tags": ["vip"] }' },
      { name: "update_lead", desc: "Update any lead fields by ID", perm: "write", params: '{ "lead_id": "uuid", "name": "...", "email": "...", "notes": "..." }' },
      { name: "delete_lead", desc: "Delete a lead by ID", perm: "delete", params: '{ "lead_id": "uuid" }' },
    ],
  },
  {
    category: "System",
    icon: Settings,
    color: "#FBBF24",
    actions: [
      { name: "whoami", desc: "Get current user ID, permissions & agent status", perm: "read" },
      { name: "get_agent_config", desc: "Get agent configuration & permissions", perm: "read" },
      { name: "update_agent_config", desc: "Update agent config (upserts)", perm: "write", params: '{ "agent_name": "...", "webhook_url": "https://...", "telegram_chat_id": "123", "permissions": { "read": true, "write": true, "delete": false }, "is_active": true }' },
      { name: "log_webhook", desc: "Manually log an API call", perm: "write", params: '{ "endpoint": "/my-hook", "method": "POST", "status_code": 200, "request_body": {...}, "response_body": {...} }' },
    ],
  },
];

function EndpointGroup({ group }: { group: typeof ENDPOINTS[0] }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = group.icon;

  return (
    <View style={styles.groupCard}>
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={[styles.groupIcon, { backgroundColor: group.color + "15" }]}>
          <Icon size={16} color={group.color} />
        </View>
        <Text style={styles.groupTitle}>{group.category}</Text>
        <Text style={styles.groupCount}>{group.actions.length} actions</Text>
        {expanded ? (
          <ChevronUp size={16} color={Colors.textMuted} />
        ) : (
          <ChevronDown size={16} color={Colors.textMuted} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.actionList}>
          {group.actions.map((action) => (
            <View key={action.name} style={styles.actionRow}>
              <View style={styles.actionHeader}>
                <Text style={[styles.actionName, { color: group.color }]}>{action.name}</Text>
                <View style={[styles.permBadge, {
                  backgroundColor: action.perm === "read" ? "#38BDF815" : action.perm === "write" ? "#34D39915" : "#F8717115",
                }]}>
                  <Text style={[styles.permText, {
                    color: action.perm === "read" ? "#38BDF8" : action.perm === "write" ? "#34D399" : "#F87171",
                  }]}>{action.perm}</Text>
                </View>
              </View>
              <Text style={styles.actionDesc}>{action.desc}</Text>
              {action.params && (
                <View style={styles.paramBox}>
                  <Text style={styles.paramText}>{action.params}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function DocsTab() {
  const insets = useSafeAreaInsets();
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyText = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", `${label} copied to clipboard`);
  };

  const handleCopyAll = async () => {
    await copyText(API_DOCS, "API Documentation");
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyUrl = async () => {
    await copyText(API_URL, "API Endpoint");
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>API <Text style={{ color: Colors.accent }}>Docs</Text></Text>
          <Text style={styles.subtitle}>OpenClaw Agent API reference</Text>
        </View>
        <TouchableOpacity style={styles.copyAllBtn} onPress={handleCopyAll} activeOpacity={0.7}>
          {copiedAll ? <Check size={14} color={Colors.background} /> : <Copy size={14} color={Colors.background} />}
          <Text style={styles.copyAllText}>{copiedAll ? "Copied!" : "Copy All"}</Text>
        </TouchableOpacity>
      </View>

      {/* Endpoint URL card */}
      <View style={styles.endpointCard}>
        <View style={styles.endpointHeader}>
          <ExternalLink size={14} color={Colors.accent} />
          <Text style={styles.endpointLabel}>API Endpoint</Text>
        </View>
        <View style={styles.endpointRow}>
          <View style={styles.endpointUrlBox}>
            <Text style={styles.endpointMethod}>POST</Text>
            <Text style={styles.endpointUrl} numberOfLines={2}>{API_URL}</Text>
          </View>
          <TouchableOpacity style={styles.endpointCopy} onPress={handleCopyUrl} activeOpacity={0.7}>
            {copiedUrl ? <Check size={16} color={Colors.accent} /> : <Copy size={16} color={Colors.textMuted} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Auth card */}
      <View style={styles.authCard}>
        <View style={styles.authRow}>
          <Shield size={14} color={Colors.accent} />
          <Text style={styles.authLabel}>Authentication</Text>
        </View>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>Authorization: Bearer YOUR_API_KEY</Text>
          <Text style={styles.codeText}>Content-Type: application/json</Text>
        </View>
      </View>

      {/* Request/Response format */}
      <View style={styles.formatRow}>
        <View style={styles.formatCard}>
          <Text style={styles.formatTitle}>Request</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{'{'}</Text>
            <Text style={styles.codeText}>{'  "action": "action_name",'}</Text>
            <Text style={styles.codeText}>{'  "params": { ... }'}</Text>
            <Text style={styles.codeText}>{'}'}</Text>
          </View>
        </View>
        <View style={styles.formatCard}>
          <Text style={styles.formatTitle}>Response</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{'{'}</Text>
            <Text style={styles.codeText}>{'  "success": true,'}</Text>
            <Text style={styles.codeText}>{'  "data": { ... }'}</Text>
            <Text style={styles.codeText}>{'}'}</Text>
          </View>
        </View>
      </View>

      {/* Permissions legend */}
      <View style={styles.permLegend}>
        <Text style={styles.permLegendTitle}>Permissions</Text>
        <View style={styles.permLegendRow}>
          <View style={[styles.permDot, { backgroundColor: "#38BDF8" }]} />
          <Text style={styles.permLegendText}>read — list_files, read_file, list_leads, get_agent_config, whoami</Text>
        </View>
        <View style={styles.permLegendRow}>
          <View style={[styles.permDot, { backgroundColor: "#34D399" }]} />
          <Text style={styles.permLegendText}>write — upload_file, create_lead, update_lead, log_webhook, update_agent_config</Text>
        </View>
        <View style={styles.permLegendRow}>
          <View style={[styles.permDot, { backgroundColor: "#F87171" }]} />
          <Text style={styles.permLegendText}>delete — delete_file, delete_lead</Text>
        </View>
      </View>

      {/* Endpoint groups */}
      <Text style={styles.sectionLabel}>Endpoints</Text>
      {ENDPOINTS.map((group) => (
        <EndpointGroup key={group.category} group={group} />
      ))}

      {/* Agent system prompt */}
      <View style={styles.promptCard}>
        <View style={styles.promptHeader}>
          <Bot size={14} color={Colors.accent} />
          <Text style={styles.promptLabel}>Agent System Prompt</Text>
        </View>
        <Text style={styles.promptDesc}>Paste this into your AI agent's system prompt to give it access to OpenClaw:</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>You have access to a database command center via the OpenClaw API.</Text>
          <Text style={styles.codeText}>Base URL: {API_URL}</Text>
          <Text style={styles.codeText}>Method: POST (always)</Text>
          <Text style={styles.codeText}>Auth: Bearer oc_YOUR_API_KEY</Text>
          <Text style={styles.codeText}>Body: {'{ "action": "action_name", "params": { ... } }'}</Text>
          <Text style={styles.codeText}>{"\n"}Actions: list_files, read_file, upload_file, delete_file, list_leads, create_lead, update_lead, delete_lead, whoami, get_agent_config, update_agent_config, log_webhook</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "700", color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  copyAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  copyAllText: { fontSize: 13, fontWeight: "700", color: Colors.background },

  endpointCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  endpointHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  endpointLabel: { fontSize: 12, fontWeight: "700", color: Colors.accent },
  endpointRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  endpointUrlBox: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.surfaceLight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  endpointMethod: {
    fontSize: 11, fontWeight: "800", color: Colors.accent, fontFamily: mono,
    backgroundColor: Colors.accentDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  endpointUrl: { fontSize: 11, color: Colors.textSecondary, fontFamily: mono, flex: 1 },
  endpointCopy: { padding: 10 },

  authCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  authRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  authLabel: { fontSize: 12, fontWeight: "700", color: Colors.accent },

  formatRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  formatCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  formatTitle: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary, marginBottom: 10 },

  codeBox: {
    backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, gap: 2,
  },
  codeText: { fontSize: 11, color: Colors.textSecondary, fontFamily: mono, lineHeight: 18 },

  permLegend: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  permLegendTitle: { fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  permLegendRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  permDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  permLegendText: { fontSize: 12, color: Colors.textMuted, flex: 1, lineHeight: 18 },

  sectionLabel: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 12 },

  groupCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 10, overflow: "hidden",
  },
  groupHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 14,
  },
  groupIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  groupTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, flex: 1 },
  groupCount: { fontSize: 11, color: Colors.textMuted, marginRight: 4 },

  actionList: { borderTopWidth: 1, borderTopColor: Colors.border },
  actionRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  actionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  actionName: { fontSize: 13, fontWeight: "700", fontFamily: mono },
  permBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  permText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  actionDesc: { fontSize: 12, color: Colors.textMuted, marginBottom: 6 },
  paramBox: {
    backgroundColor: Colors.surfaceLight, borderRadius: 8, padding: 10, marginTop: 4,
  },
  paramText: { fontSize: 10, color: Colors.textSecondary, fontFamily: mono },

  promptCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginTop: 6, marginBottom: 20,
  },
  promptHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  promptLabel: { fontSize: 12, fontWeight: "700", color: Colors.accent },
  promptDesc: { fontSize: 12, color: Colors.textMuted, marginBottom: 12, lineHeight: 18 },
});
