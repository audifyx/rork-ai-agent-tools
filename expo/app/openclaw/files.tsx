import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl,
  Alert, ActivityIndicator, Modal, Dimensions, Platform, Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Image as ExpoImage } from "expo-image";
import { Audio, Video, ResizeMode } from "expo-av";
import { WebView } from "react-native-webview";
import {
  Upload, Trash2, FolderOpen, FileText, Image, Music, Film, Code, File,
  ChevronRight, Home, FolderClosed, ArrowLeft, X, Play, Pause, Eye,
  Code2, Download, Volume2, Square,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const categoryIcons: Record<string, any> = {
  image: Image, audio: Music, video: Film, text: FileText, code: Code, general: File,
};
const categoryColors: Record<string, string> = {
  image: Colors.success, audio: "#A78BFA", video: Colors.danger,
  text: Colors.info, code: Colors.warning, general: Colors.textMuted,
};

function formatBytes(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function getCategory(mime: string | null): string {
  if (!mime) return "general";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("text/") || mime.includes("html")) return "text";
  if (mime.includes("javascript") || mime.includes("json") || mime.includes("xml")) return "code";
  return "general";
}

function isPreviewable(mime: string | null): boolean {
  if (!mime) return false;
  return (
    mime.startsWith("image/") ||
    mime.startsWith("audio/") ||
    mime.startsWith("video/") ||
    mime.startsWith("text/") ||
    mime.includes("html") ||
    mime.includes("javascript") ||
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("css")
  );
}

// ─── Image Preview ─────────────────────────────────────
function ImagePreview({ url }: { url: string }) {
  return (
    <View style={previewStyles.imageContainer}>
      <ExpoImage
        source={{ uri: url }}
        style={previewStyles.image}
        contentFit="contain"
        transition={300}
      />
    </View>
  );
}

// ─── Audio Player ──────────────────────────────────────
function AudioPlayer({ url }: { url: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => { sound?.unloadAsync(); };
  }, [sound]);

  const loadAndPlay = async () => {
    if (sound) {
      if (playing) { await sound.pauseAsync(); setPlaying(false); }
      else { await sound.playAsync(); setPlaying(true); }
      return;
    }
    const { sound: s } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true },
      (status) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);
          if (status.didJustFinish) { setPlaying(false); setPosition(0); }
        }
      }
    );
    setSound(s);
    setPlaying(true);
  };

  const stopPlayback = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      setPlaying(false);
      setPosition(0);
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={previewStyles.audioContainer}>
      <View style={previewStyles.audioIcon}>
        <Volume2 size={40} color="#A78BFA" />
      </View>
      <View style={previewStyles.audioControls}>
        <View style={previewStyles.audioButtons}>
          <TouchableOpacity style={previewStyles.playBtn} onPress={loadAndPlay} activeOpacity={0.7}>
            {playing ? <Pause size={24} color="#fff" /> : <Play size={24} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity style={previewStyles.stopBtn} onPress={stopPlayback} activeOpacity={0.7}>
            <Square size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={previewStyles.progressBar}>
          <View style={[previewStyles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={previewStyles.timeRow}>
          <Text style={previewStyles.timeText}>{formatTime(position)}</Text>
          <Text style={previewStyles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Video Player ──────────────────────────────────────
function VideoPlayer({ url }: { url: string }) {
  const videoRef = useRef<Video>(null);
  return (
    <View style={previewStyles.videoContainer}>
      <Video
        ref={videoRef}
        source={{ uri: url }}
        style={previewStyles.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
      />
    </View>
  );
}

// ─── HTML/Code Preview ─────────────────────────────────
function HtmlCodePreview({ url, mime }: { url: string; mime: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const isHtml = mime.includes("html");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(url);
        const text = await res.text();
        setCode(text);
      } catch {
        setCode("// Failed to load file content");
      }
      setLoading(false);
    })();
  }, [url]);

  if (loading) return <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />;

  return (
    <View style={previewStyles.htmlContainer}>
      {/* Toggle buttons for HTML files */}
      {isHtml && (
        <View style={previewStyles.toggleRow}>
          <TouchableOpacity
            style={[previewStyles.toggleBtn, !showCode && previewStyles.toggleBtnActive]}
            onPress={() => setShowCode(false)}
            activeOpacity={0.7}
          >
            <Eye size={14} color={!showCode ? "#000" : Colors.textMuted} />
            <Text style={[previewStyles.toggleText, !showCode && previewStyles.toggleTextActive]}>Live Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[previewStyles.toggleBtn, showCode && previewStyles.toggleBtnActive]}
            onPress={() => setShowCode(true)}
            activeOpacity={0.7}
          >
            <Code2 size={14} color={showCode ? "#000" : Colors.textMuted} />
            <Text style={[previewStyles.toggleText, showCode && previewStyles.toggleTextActive]}>Source Code</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Live preview (WebView) for HTML */}
      {isHtml && !showCode ? (
        <View style={previewStyles.webviewWrapper}>
          <WebView
            source={{ html: code || "" }}
            style={previewStyles.webview}
            originWhitelist={["*"]}
            javaScriptEnabled
            scalesPageToFit
          />
        </View>
      ) : (
        /* Code view */
        <ScrollView style={previewStyles.codeScroll} horizontal={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <Text style={previewStyles.codeText} selectable>{code}</Text>
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Preview Modal ─────────────────────────────────────
function FilePreviewModal({
  visible, file, onClose,
}: {
  visible: boolean; file: any | null; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!file || !visible) { setUrl(null); setLoading(true); return; }
    (async () => {
      const { data } = await supabase.storage
        .from("openclaw-files")
        .createSignedUrl(file.storage_path, 3600);
      setUrl(data?.signedUrl ?? null);
      setLoading(false);
    })();
  }, [file, visible]);

  if (!file) return null;

  const mime = file.mime_type || "";
  const cat = file.category || getCategory(mime);
  const Icon = categoryIcons[cat] || File;
  const color = categoryColors[cat] || Colors.textMuted;

  const renderPreview = () => {
    if (loading || !url) {
      return <ActivityIndicator color={Colors.accent} size="large" style={{ marginTop: 60 }} />;
    }
    if (mime.startsWith("image/")) return <ImagePreview url={url} />;
    if (mime.startsWith("audio/")) return <AudioPlayer url={url} />;
    if (mime.startsWith("video/")) return <VideoPlayer url={url} />;
    if (
      mime.startsWith("text/") || mime.includes("html") ||
      mime.includes("javascript") || mime.includes("json") ||
      mime.includes("xml") || mime.includes("css")
    ) return <HtmlCodePreview url={url} mime={mime} />;

    return (
      <View style={previewStyles.unsupported}>
        <File size={48} color={Colors.textMuted} />
        <Text style={previewStyles.unsupportedText}>Preview not available for this file type</Text>
        <Text style={previewStyles.unsupportedMime}>{mime}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[previewStyles.modal, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={previewStyles.modalHeader}>
          <View style={[previewStyles.modalIcon, { backgroundColor: color + "20" }]}>
            <Icon size={18} color={color} />
          </View>
          <View style={previewStyles.modalInfo}>
            <Text style={previewStyles.modalTitle} numberOfLines={1}>{file.filename}</Text>
            <Text style={previewStyles.modalMeta}>
              {formatBytes(file.file_size)} · {cat} · {mime}
            </Text>
          </View>
          <TouchableOpacity style={previewStyles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Preview content */}
        <View style={previewStyles.previewBody}>
          {renderPreview()}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Files Tab ────────────────────────────────────
export default function FilesTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [files, setFiles] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<any | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("stored_files").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setFiles(data ?? []);
  }, [user]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);
  const onRefresh = async () => { setRefreshing(true); await fetchFiles(); setRefreshing(false); };

  const currentItems = useMemo(() => {
    const pathPrefix = currentPath.length > 0 ? currentPath.join("/") + "/" : "";
    const subFolders = new Set<string>();
    const currentFiles: any[] = [];

    files.forEach((f) => {
      const parts = f.storage_path.split("/");
      const relativePath = parts.slice(1).join("/");

      if (currentPath.length === 0) {
        if (parts.length > 2) subFolders.add(parts[1]);
        else currentFiles.push(f);
      } else {
        if (relativePath.startsWith(pathPrefix)) {
          const remaining = relativePath.slice(pathPrefix.length);
          if (remaining.includes("/")) subFolders.add(remaining.split("/")[0]);
          else currentFiles.push(f);
        }
      }
    });

    return { folders: Array.from(subFolders).sort(), files: currentFiles };
  }, [files, currentPath]);

  const handleUpload = async () => {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: false, quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    const asset = result.assets[0];
    const filename = asset.fileName ?? `upload_${Date.now()}.jpg`;
    const mime = asset.mimeType ?? "image/jpeg";
    const folderPrefix = currentPath.length > 0 ? currentPath.join("/") + "/" : "";
    const path = `${user.id}/${folderPrefix}${Date.now()}_${filename}`;

    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const { error: uploadErr } = await supabase.storage.from("openclaw-files").upload(path, blob, { contentType: mime });

    if (uploadErr) { Alert.alert("Upload Failed", uploadErr.message); setUploading(false); return; }

    await supabase.from("stored_files").insert({
      user_id: user.id, filename, file_type: mime.split("/")[0] || "unknown",
      category: getCategory(mime), file_size: asset.fileSize ?? 0,
      storage_path: path, mime_type: mime,
    });
    await fetchFiles();
    setUploading(false);
  };

  const handleDelete = async (file: any) => {
    Alert.alert("Delete File", `Delete "${file.filename}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await supabase.storage.from("openclaw-files").remove([file.storage_path]);
          await supabase.from("stored_files").delete().eq("id", file.id);
          fetchFiles();
        },
      },
    ]);
  };

  const totalSize = files.reduce((acc, f) => acc + (f.file_size ?? 0), 0);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>
              File <Text style={{ color: Colors.accent }}>Manager</Text>
            </Text>
            <Text style={styles.subtitle}>{files.length} files · {formatBytes(totalSize)}</Text>
          </View>
          <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload} disabled={uploading} activeOpacity={0.7}>
            {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Upload size={18} color="#fff" />}
          </TouchableOpacity>
        </View>

        {/* Breadcrumb */}
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={() => setCurrentPath([])} style={styles.breadcrumbItem} activeOpacity={0.6}>
            <Home size={14} color={currentPath.length === 0 ? Colors.accent : Colors.textMuted} />
            <Text style={[styles.breadcrumbText, currentPath.length === 0 && { color: Colors.accent }]}>Root</Text>
          </TouchableOpacity>
          {currentPath.map((seg, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={12} color={Colors.textMuted} />
              <TouchableOpacity
                onPress={() => setCurrentPath(currentPath.slice(0, i + 1))}
                style={styles.breadcrumbItem}
                activeOpacity={0.6}
              >
                <Text style={[styles.breadcrumbText, i === currentPath.length - 1 && { color: Colors.accent }]}>
                  {seg}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* Back button */}
        {currentPath.length > 0 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setCurrentPath(currentPath.slice(0, -1))}
            activeOpacity={0.7}
          >
            <ArrowLeft size={16} color={Colors.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}

        {/* Folders */}
        {currentItems.folders.map((folder) => (
          <TouchableOpacity
            key={folder}
            style={styles.folderRow}
            onPress={() => setCurrentPath([...currentPath, folder])}
            activeOpacity={0.7}
          >
            <View style={styles.folderIcon}>
              <FolderClosed size={18} color={Colors.accent} />
            </View>
            <Text style={styles.folderName}>{folder}</Text>
            <ChevronRight size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}

        {/* Files */}
        {currentItems.files.length === 0 && currentItems.folders.length === 0 ? (
          <View style={styles.empty}>
            <FolderOpen size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No files here</Text>
            <Text style={styles.emptySubtext}>Upload files or let your agent store them</Text>
          </View>
        ) : (
          currentItems.files.map((file) => {
            const Icon = categoryIcons[file.category] || File;
            const color = categoryColors[file.category] || Colors.textMuted;
            const previewable = isPreviewable(file.mime_type);
            return (
              <TouchableOpacity
                key={file.id}
                style={styles.fileRow}
                onPress={() => previewable && setPreviewFile(file)}
                activeOpacity={previewable ? 0.7 : 1}
              >
                <View style={[styles.fileIcon, { backgroundColor: color + "15" }]}>
                  <Icon size={16} color={color} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{file.filename}</Text>
                  <Text style={styles.fileMeta}>
                    {formatBytes(file.file_size)} · {file.category} · {new Date(file.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {previewable && (
                  <View style={styles.previewBadge}>
                    <Eye size={12} color={Colors.accent} />
                  </View>
                )}
                <TouchableOpacity onPress={() => handleDelete(file)} style={styles.deleteBtn} activeOpacity={0.6}>
                  <Trash2 size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Preview Modal */}
      <FilePreviewModal
        visible={!!previewFile}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </>
  );
}

// ─── Main Styles ───────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  uploadBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.accent,
    alignItems: "center", justifyContent: "center",
  },
  breadcrumb: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12, flexWrap: "wrap",
  },
  breadcrumbItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  breadcrumbText: { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, paddingVertical: 4,
  },
  backText: { fontSize: 14, color: Colors.textSecondary },
  folderRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  folderIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.accentDim, alignItems: "center", justifyContent: "center",
  },
  folderName: { fontSize: 15, fontWeight: "600", color: Colors.text, flex: 1 },
  empty: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 48,
    alignItems: "center", borderWidth: 1, borderColor: Colors.border, marginTop: 8,
  },
  emptyText: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary, marginTop: 16 },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: "center" },
  fileRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  fileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  fileMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  previewBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.accentDim, alignItems: "center", justifyContent: "center",
  },
  deleteBtn: { padding: 8 },
});

// ─── Preview Modal Styles ──────────────────────────────
const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

const previewStyles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: "#000" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalInfo: { flex: 1 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  modalMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceLight, alignItems: "center", justifyContent: "center",
  },
  previewBody: { flex: 1 },

  // Image
  imageContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  image: { width: SCREEN_W - 32, height: SCREEN_H * 0.65, borderRadius: 12 },

  // Audio
  audioContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 32,
  },
  audioIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(167,139,250,0.1)", borderWidth: 2, borderColor: "rgba(167,139,250,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  audioControls: { width: "100%", gap: 16 },
  audioButtons: { flexDirection: "row", justifyContent: "center", gap: 16 },
  playBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#A78BFA", alignItems: "center", justifyContent: "center",
  },
  stopBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surfaceLight, alignItems: "center", justifyContent: "center",
  },
  progressBar: {
    height: 4, backgroundColor: Colors.surfaceLight, borderRadius: 2, overflow: "hidden",
  },
  progressFill: { height: 4, backgroundColor: "#A78BFA", borderRadius: 2 },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  timeText: { fontSize: 11, color: Colors.textMuted, fontFamily: mono },

  // Video
  videoContainer: { flex: 1, justifyContent: "center", backgroundColor: "#000" },
  video: { width: SCREEN_W, height: SCREEN_H * 0.5, alignSelf: "center" },

  // HTML / Code
  htmlContainer: { flex: 1 },
  toggleRow: {
    flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  toggleBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
  },
  toggleBtnActive: { backgroundColor: Colors.accent },
  toggleText: { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
  toggleTextActive: { color: "#000" },
  webviewWrapper: { flex: 1, margin: 12, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  webview: { flex: 1, backgroundColor: "#fff" },
  codeScroll: { flex: 1, padding: 16 },
  codeText: {
    fontSize: 11, color: Colors.textSecondary, fontFamily: mono, lineHeight: 18,
  },

  // Unsupported
  unsupported: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  unsupportedText: { fontSize: 15, color: Colors.textSecondary },
  unsupportedMime: { fontSize: 12, color: Colors.textMuted, fontFamily: mono },
});
