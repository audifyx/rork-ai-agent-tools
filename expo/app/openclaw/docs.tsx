import React, { useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import {
  Copy, Check, ExternalLink, Shield,
} from "lucide-react-native";
import { SUPABASE_URL } from "@/lib/supabase";
import Colors from "@/constants/colors";

const API_URL = `${SUPABASE_URL}/functions/v1/openclaw-api`;

const FULL_DOCS = `# OpenClaw Agent API — Complete Reference

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

---

## FILES

### list_files [read]
List all files. Optionally filter by category.
{ "action": "list_files", "params": { "category": "general" } }
Optional: category

### read_file [read]
Get file metadata + signed download URL (valid 1 hour).
{ "action": "read_file", "params": { "file_id": "uuid" } }
Required: file_id

### upload_file [write]
Upload a file via base64.
{ "action": "upload_file", "params": { "filename": "report.pdf", "content_base64": "base64string...", "mime_type": "application/pdf", "category": "reports", "description": "Q3 sales report" } }
Required: filename, content_base64
Optional: mime_type (default: application/octet-stream), category (default: general), description

### delete_file [delete]
Delete a file by ID.
{ "action": "delete_file", "params": { "file_id": "uuid" } }
Required: file_id

---

## LEADS

### list_leads [read]
List all leads/contacts. Optionally search by name, email, or notes.
{ "action": "list_leads", "params": { "search": "john" } }
Optional: search

### create_lead [write]
Create a new lead/contact.
{ "action": "create_lead", "params": { "name": "John Doe", "email": "john@example.com", "website": "https://example.com", "phone": "+15551234567", "notes": "Met at conference", "tags": ["vip", "partner"] } }
All params optional but provide at least one.

### update_lead [write]
Update an existing lead by ID.
{ "action": "update_lead", "params": { "lead_id": "uuid", "name": "Jane Doe", "email": "jane@example.com", "notes": "Updated contact" } }
Required: lead_id
Optional: name, email, website, phone, notes, tags

### delete_lead [delete]
Delete a lead by ID.
{ "action": "delete_lead", "params": { "lead_id": "uuid" } }
Required: lead_id

---

## SYSTEM

### whoami [read]
Get current user ID, permissions, and agent status.
{ "action": "whoami" }
No params.

### get_agent_config [read]
Get agent configuration and permissions.
{ "action": "get_agent_config" }
No params.

### update_agent_config [write]
Update agent configuration (upserts if none exists).
{ "action": "update_agent_config", "params": { "agent_name": "MyAgent", "webhook_url": "https://hooks.example.com/notify", "telegram_chat_id": "123456789", "permissions": { "read": true, "write": true, "delete": false }, "is_active": true } }
All params optional.

### log_webhook [write]
Manually log an API call.
{ "action": "log_webhook", "params": { "endpoint": "/my-hook", "method": "POST", "status_code": 200, "request_body": { "key": "value" }, "response_body": { "result": "ok" } } }
Optional: endpoint, method, status_code, request_body, response_body

---

## IMAGE GENERATION (ClawImageGen)

Generate images using the Rork Toolkit DALL·E 3 endpoint.
Endpoint: POST https://toolkit.rork.com/images/generate/
No auth required — uses project-level toolkit access.

### generate_image [write]
Generate an image from a text prompt via DALL·E 3.
curl -X POST https://toolkit.rork.com/images/generate/ \\
  -H "Content-Type: application/json" \\
  -d '{ "prompt": "A cyberpunk city at night", "size": "1024x1024" }'

Request body:
{ "prompt": "description of the image", "size": "1024x1024" }
Required: prompt
Optional: size ("1024x1024", "1024x1792", "1792x1024") — default "1024x1024"

Response:
{ "image": { "base64Data": "...", "mimeType": "image/png" }, "size": "1024x1024" }

The response contains the generated image as base64. To display it:
data:image/png;base64,{base64Data}

To save to OpenClaw storage, upload via upload_file with the base64 content.

### edit_image [write]
Edit an existing image using Gemini via the Rork Toolkit.
Endpoint: POST https://toolkit.rork.com/images/edit/

Request body:
{ "prompt": "make the sky red", "images": [{ "type": "image", "image": "base64..." }], "aspectRatio": "16:9" }
Required: prompt, images (array of base64 images)
Optional: aspectRatio ("1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9")

Response:
{ "image": { "base64Data": "...", "mimeType": "image/png", "aspectRatio": "16:9" } }

---

## PAGES (ClawPages)

### add_deployment [write]
Track a deployed site.
{ "action": "add_deployment", "params": { "title": "My Site", "url": "https://mysite.vercel.app", "platform": "vercel", "agent_name": "claude" } }
Required: title, url
Optional: platform (vercel/netlify/cloudflare/github-pages/lovable/replit/custom/unknown), description, tags, agent_name, deploy_source

### list_deployments [read]
List all deployment links.
{ "action": "list_deployments", "params": { "status": "live" } }
Optional: status (live/down/archived), platform, limit

### update_deployment [write]
Update a deployment.
{ "action": "update_deployment", "params": { "id": "uuid", "status": "archived", "is_pinned": true } }
Required: id
Optional: title, url, platform, status, description, tags, is_pinned, agent_name, deploy_source

### delete_deployment [delete]
Delete a deployment.
{ "action": "delete_deployment", "params": { "id": "uuid" } }
Required: id

### create_session [write]
Create a live HTML preview session.
{ "action": "create_session", "params": { "session_name": "My Build" } }
Optional: session_name, html_content, css_content, js_content, agent_name

### push [write]
Push HTML to a live session (user sees it render in real-time).
{ "action": "push", "params": { "session_id": "uuid", "html_content": "<html>...</html>" } }
Required: session_id, html_content
Optional: css_content, js_content, agent_name

### get_session [read]
Get session details + current HTML.
{ "action": "get_session", "params": { "session_id": "uuid" } }
Required: session_id

### list_sessions [read]
List all live preview sessions.
{ "action": "list_sessions" }

### get_history [read]
Get version history for a session.
{ "action": "get_history", "params": { "session_id": "uuid" } }
Required: session_id. Optional: limit

### get_version [read]
Get a specific version snapshot.
{ "action": "get_version", "params": { "session_id": "uuid", "version": 3 } }
Required: session_id, version

### delete_session [delete]
Delete a live session and all versions.
{ "action": "delete_session", "params": { "session_id": "uuid" } }
Required: session_id

---

## APP BACKGROUND (ClawBG)

Control the app's animated HTML canvas background wallpaper in real time.
Endpoint: POST ${SUPABASE_URL}/functions/v1/clawbg-api
Auth: Authorization: Bearer ok_YOUR_MASTER_KEY (requires clawbg permission)

### set_preset
Apply a built-in animated background instantly.
{ "action": "set_preset", "params": { "preset": "matrix" } }
Available presets: matrix, particles, aurora, mesh-grid, fire, starfield, pulse, noise

### set_custom
Push any self-contained HTML canvas animation as the app background (max 100KB).
{ "action": "set_custom", "params": { "html": "<!DOCTYPE html>...", "name": "My BG" } }

### get_active
Get the currently active background.
{ "action": "get_active" }

### list
List all saved backgrounds.
{ "action": "list" }

### activate
Switch to a saved background by ID.
{ "action": "activate", "params": { "bg_id": "uuid" } }

### list_presets
See all built-in preset options.
{ "action": "list_presets" }

NOTE: App updates background LIVE via Realtime — no reload needed.

---

## Agent System Prompt (paste into your AI agent)

You have access to a database command center via the OpenClaw API.

Base URL: ${API_URL}
Method: POST (always)
Auth: Bearer oc_YOUR_API_KEY
Body: { "action": "action_name", "params": { ... } }

Available actions: list_files, read_file, upload_file, delete_file, list_leads, create_lead, update_lead, delete_lead, whoami, get_agent_config, update_agent_config, log_webhook

You also have access to ClawBG for controlling the app background in real time:
ClawBG URL: ${SUPABASE_URL}/functions/v1/clawbg-api
ClawBG actions: set_preset, set_custom, get_active, list, activate, delete, list_presets
Example: POST clawbg-api with { "action": "set_preset", "params": { "preset": "matrix" } }

For every action, send a POST request with JSON body containing "action" and optional "params".
Responses always return { "success": true/false, "data": ... } or { "success": false, "error": "..." }.`;

export default function DocsTab() {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    await Clipboard.setStringAsync(FULL_DOCS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
    >
      {/* Header + Copy All */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>API <Text style={{ color: Colors.accent }}>Docs</Text></Text>
          <Text style={styles.subtitle}>OpenClaw Agent API · one copy</Text>
        </View>
        <TouchableOpacity style={[styles.copyAllBtn, copied && styles.copyAllBtnDone]} onPress={handleCopyAll} activeOpacity={0.7}>
          {copied ? <Check size={15} color={Colors.background} /> : <Copy size={15} color={Colors.background} />}
          <Text style={styles.copyAllText}>{copied ? "Copied!" : "Copy All Docs"}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <ExternalLink size={14} color={Colors.accent} />
          <Text style={styles.infoLabel}>Endpoint</Text>
        </View>
        <View style={styles.urlBox}>
          <Text style={styles.urlMethod}>POST</Text>
          <Text style={styles.urlText} numberOfLines={2}>{API_URL}</Text>
        </View>
      </View>

      <View style={styles.authCard}>
        <Shield size={14} color={Colors.accent} />
        <Text style={styles.authLabel}>Auth</Text>
        <Text style={styles.authCode}>Authorization: Bearer oc_YOUR_API_KEY</Text>
      </View>

      {/* Full docs preview */}
      <Text style={styles.secLabel}>FULL API REFERENCE</Text>
      <View style={styles.docsCard}>
        <Text style={styles.docsHint}>Tap "Copy All Docs" — copies everything below to your clipboard.</Text>
        <View style={styles.docsBox}>
          <Text style={styles.docsText} selectable>{FULL_DOCS}</Text>
        </View>
      </View>

      {/* Bottom copy button */}
      <TouchableOpacity style={[styles.bottomCopyBtn, copied && styles.bottomCopyBtnDone]} onPress={handleCopyAll} activeOpacity={0.7}>
        {copied ? <Check size={18} color={Colors.background} /> : <Copy size={18} color={Colors.background} />}
        <Text style={styles.bottomCopyText}>{copied ? "Copied to Clipboard!" : "Copy All Docs"}</Text>
      </TouchableOpacity>
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
    backgroundColor: Colors.accent, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14,
  },
  copyAllBtnDone: { backgroundColor: "#34D399" },
  copyAllText: { fontSize: 13, fontWeight: "800", color: Colors.background },

  secLabel: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.5, marginTop: 20, marginBottom: 10 },

  infoCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  infoLabel: { fontSize: 12, fontWeight: "700", color: Colors.accent },
  urlBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 10,
  },
  urlMethod: {
    fontSize: 10, fontWeight: "800", color: Colors.accent, fontFamily: mono,
    backgroundColor: Colors.accentDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  urlText: { fontSize: 10, color: Colors.textSecondary, fontFamily: mono, flex: 1 },

  authCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginTop: 10,
  },
  authLabel: { fontSize: 12, fontWeight: "700", color: Colors.accent },
  authCode: { fontSize: 11, color: Colors.textSecondary, fontFamily: mono, flex: 1 },

  docsCard: {
    backgroundColor: Colors.surface, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.border, padding: 16,
  },
  docsHint: { fontSize: 12, color: Colors.accent, fontWeight: "600", marginBottom: 12 },
  docsBox: {
    backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14,
  },
  docsText: { fontSize: 10, color: Colors.textSecondary, fontFamily: mono, lineHeight: 16 },

  bottomCopyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.accent, borderRadius: 16, paddingVertical: 16, marginTop: 16, marginBottom: 20,
  },
  bottomCopyBtnDone: { backgroundColor: "#34D399" },
  bottomCopyText: { fontSize: 16, fontWeight: "800", color: Colors.background },
});
