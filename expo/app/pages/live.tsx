import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Alert, Platform, ActivityIndicator, Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Radio, Plus, X, Check, Trash2, ArrowLeft, RefreshCw,
  ChevronLeft, ChevronRight, Eye, Code, Clock,
  Download, FolderOpen, Share2, Copy,
} from "lucide-react-native";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
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

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const webviewRef = useRef<WebView>(null);

  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [showSource, setShowSource] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pages_live_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("last_push_at", { ascending: false });
    setSessions(data ?? []);
    // Auto-select first active session
    if (!activeSession && data && data.length > 0) {
      setActiveSession(data[0]);
    }
  }, [user]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Auto-refresh active session every 3 seconds
  useEffect(() => {
    if (!autoRefresh || !activeSession) return;
    const interval = setInterval(async () => {
      if (!activeSession?.id) return;
      const { data } = await supabase
        .from("pages_live_sessions")
        .select("*")
        .eq("id", activeSession.id)
        .maybeSingle();
      if (data && data.version !== activeSession.version) {
        setActiveSession(data);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeSession?.id, activeSession?.version]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
    if (activeSession?.id) {
      const { data } = await supabase
        .from("pages_live_sessions")
        .select("*")
        .eq("id", activeSession.id)
        .maybeSingle();
      if (data) setActiveSession(data);
    }
    setRefreshing(false);
  };

  const createSession = async () => {
    if (!user || !sessionName.trim()) return Alert.alert("Error", "Session name is required");
    const { data, error } = await supabase.from("pages_live_sessions").insert({
      user_id: user.id,
      session_name: sessionName.trim(),
      html_content: "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0a;color:#eaeaea}h1{font-size:24px;opacity:0.5}</style></head><body><h1>Waiting for agent push...</h1></body></html>",
      version: 1,
    }).select().single();

    if (error) return Alert.alert("Error", error.message);

    // Also save v1 to history
    await supabase.from("pages_live_history").insert({
      session_id: data.id,
      user_id: user.id,
      html_content: data.html_content,
      version: 1,
    });

    setSessionName("");
    setShowCreate(false);
    setActiveSession(data);
    fetchSessions();
  };

  const deleteSession = (id: string, name: string) => {
    Alert.alert("Delete Session", `Remove "${name}" and all its versions?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          await supabase.from("pages_live_sessions").delete().eq("id", id);
          if (activeSession?.id === id) setActiveSession(null);
          fetchSessions();
        }
      },
    ]);
  };

  const buildHtml = (session: any) => {
    if (!session) return "";
    let html = session.html_content || "";
    if (session.css_content) {
      html = html.replace("</head>", `<style>${session.css_content}</style></head>`);
    }
    if (session.js_content) {
      html = html.replace("</body>", `<script>${session.js_content}</script></body>`);
    }
    return html;
  };

  const downloadHtml = async () => {
    if (!activeSession) return;
    try {
      const html = buildHtml(activeSession);
      const filename = `${activeSession.session_name.replace(/[^a-zA-Z0-9]/g, "_")}_v${activeSession.version}.html`;
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, html, { encoding: FileSystem.EncodingType.UTF8 });
      if (Platform.OS === "ios") {
        await Share.share({ url: fileUri, title: filename });
      } else {
        await Share.share({ message: html, title: filename });
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save file");
    }
  };

  const saveToOpenClaw = async () => {
    if (!activeSession || !user) return;
    try {
      const html = buildHtml(activeSession);
      const filename = `${activeSession.session_name.replace(/[^a-zA-Z0-9]/g, "_")}_v${activeSession.version}.html`;
      const storagePath = `${user.id}/${Date.now()}_${filename}`;

      // Upload to Supabase Storage
      const blob = new Blob([html], { type: "text/html" });
      const { error: upErr } = await supabase.storage
        .from("openclaw-files")
        .upload(storagePath, blob, { contentType: "text/html" });

      if (upErr) throw upErr;

      // Create stored_files record
      const { error } = await supabase.from("stored_files").insert({
        user_id: user.id,
        filename,
        file_type: "text",
        mime_type: "text/html",
        category: "clawpages",
        description: `Live preview: ${activeSession.session_name} v${activeSession.version}`,
        file_size: html.length,
        storage_path: storagePath,
      });

      if (error) throw error;
      Alert.alert("✅ Saved to Files", `"${filename}" saved to OpenClaw Files under clawpages category.`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save to OpenClaw");
    }
  };

  const copySource = async () => {
    if (!activeSession) return;
    await Clipboard.setStringAsync(buildHtml(activeSession));
    Alert.alert("Copied!", "Full HTML source copied to clipboard.");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>📡 Live Preview</Text>
          <Text style={styles.subtitle}>
            {activeSession ? `v${activeSession.version} · ${timeAgo(activeSession.last_push_at)}` : "No session selected"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.autoBtn, autoRefresh && styles.autoBtnActive]}
          onPress={() => setAutoRefresh(!autoRefresh)}
        >
          <RefreshCw size={14} color={autoRefresh ? Colors.success : Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(!showCreate)}>
          {showCreate ? <X size={18} color={Colors.text} /> : <Plus size={18} color={Colors.text} />}
        </TouchableOpacity>
      </View>

      {/* Session selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionRow}>
        {sessions.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[styles.sessionChip, activeSession?.id === s.id && styles.sessionChipActive]}
            onPress={() => setActiveSession(s)}
            onLongPress={() => deleteSession(s.id, s.session_name)}
          >
            <Radio size={10} color={activeSession?.id === s.id ? Colors.accent : Colors.textMuted} />
            <Text style={[styles.sessionChipText, activeSession?.id === s.id && styles.sessionChipTextActive]} numberOfLines={1}>
              {s.session_name}
            </Text>
            <Text style={styles.sessionVersion}>v{s.version}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Create form */}
      {showCreate && (
        <View style={styles.createForm}>
          <TextInput
            style={styles.input}
            placeholder="Session name..."
            placeholderTextColor={Colors.textMuted}
            value={sessionName}
            onChangeText={setSessionName}
          />
          <TouchableOpacity style={styles.createBtn} onPress={createSession}>
            <Check size={14} color="#fff" />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Toggle source/preview */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, !showSource && styles.toggleBtnActive]}
          onPress={() => setShowSource(false)}
        >
          <Eye size={14} color={!showSource ? Colors.accent : Colors.textMuted} />
          <Text style={[styles.toggleText, !showSource && styles.toggleTextActive]}>Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, showSource && styles.toggleBtnActive]}
          onPress={() => setShowSource(true)}
        >
          <Code size={14} color={showSource ? Colors.accent : Colors.textMuted} />
          <Text style={[styles.toggleText, showSource && styles.toggleTextActive]}>Source</Text>
        </TouchableOpacity>
      </View>

      {/* Action bar */}
      {activeSession && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={downloadHtml}>
            <Download size={14} color={Colors.info} />
            <Text style={[styles.actionText, { color: Colors.info }]}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={saveToOpenClaw}>
            <FolderOpen size={14} color={Colors.success} />
            <Text style={[styles.actionText, { color: Colors.success }]}>Save to Files</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={copySource}>
            <Copy size={14} color={Colors.textSecondary} />
            <Text style={styles.actionText}>Copy HTML</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content area */}
      {!activeSession ? (
        <View style={styles.empty}>
          <Radio size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No live sessions</Text>
          <Text style={styles.emptySubtext}>Create a session, then your agent pushes HTML to it in real-time</Text>
        </View>
      ) : showSource ? (
        <ScrollView style={styles.sourceView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}>
          <Text style={styles.sourceCode} selectable>{buildHtml(activeSession)}</Text>
        </ScrollView>
      ) : (
        <View style={styles.webviewContainer}>
          <WebView
            ref={webviewRef}
            source={{ html: buildHtml(activeSession) }}
            style={styles.webview}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator color={Colors.accent} />
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: 20, fontWeight: "800", color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: "rgba(220,38,38,0.2)", alignItems: "center", justifyContent: "center" },
  autoBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  autoBtnActive: { borderColor: "rgba(52,211,153,0.3)", backgroundColor: "rgba(52,211,153,0.08)" },
  sessionRow: { marginBottom: 10, maxHeight: 40 },
  sessionChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  sessionChipActive: { backgroundColor: Colors.accentDim, borderColor: "rgba(220,38,38,0.3)" },
  sessionChipText: { fontSize: 12, color: Colors.textSecondary, maxWidth: 100 },
  sessionChipTextActive: { color: Colors.accent, fontWeight: "700" },
  sessionVersion: { fontSize: 10, color: Colors.textMuted, fontWeight: "600" },
  createForm: { flexDirection: "row", gap: 8, marginBottom: 10 },
  input: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.accent, borderRadius: 10, paddingHorizontal: 16 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  viewToggle: { flexDirection: "row", marginBottom: 10, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, backgroundColor: Colors.surface },
  toggleBtnActive: { backgroundColor: Colors.accentDim },
  toggleText: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
  toggleTextActive: { color: Colors.accent },
  actionBar: { flexDirection: "row", gap: 6, marginBottom: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  actionText: { fontSize: 11, fontWeight: "600", color: Colors.textSecondary },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 40 },
  webviewContainer: { flex: 1, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  webview: { flex: 1, backgroundColor: "#fff" },
  webviewLoading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: Colors.surface },
  sourceView: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  sourceCode: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 11, color: Colors.textSecondary, lineHeight: 18 },
});
