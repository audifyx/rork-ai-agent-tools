import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl,
  Alert, ActivityIndicator, Modal, Dimensions, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Image as ExpoImage } from "expo-image";
import { Audio, Video, ResizeMode } from "expo-av";
import { WebView } from "react-native-webview";
import {
  Upload, Trash2, FolderOpen, FileText, Image, Music, Film, Code, File,
  ChevronRight, Home, FolderClosed, ArrowLeft, X, Play, Pause, Eye,
  Code2, Volume2, Square, Archive, Grid, List, SlidersHorizontal,
  ArrowUpDown, Clock, Type, Folder, Filter, FileArchive, Globe,
  ChevronDown,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";

const { width: SW, height: SH } = Dimensions.get("window");

// ─── Helpers ───────────────────────────────────────────
const CATEGORY_ICONS: Record<string, any> = {
  image: Image, audio: Music, video: Film, text: FileText,
  code: Code, archive: FileArchive, web: Globe, general: File,
};
const CATEGORY_COLORS: Record<string, string> = {
  image: "#34D399", audio: "#A78BFA", video: "#EF4444",
  text: "#38BDF8", code: "#FBBF24", archive: "#F472B6",
  web: "#38BDF8", general: "#94A3B8",
};
const CATEGORY_LABELS: Record<string, string> = {
  all: "All", image: "Images", audio: "Audio", video: "Video",
  text: "Text", code: "Code", archive: "Archives", web: "Web", general: "Other",
};

function formatBytes(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function getCategory(mime: string | null, filename?: string): string {
  if (!mime && !filename) return "general";
  const m = (mime || "").toLowerCase();
  const ext = (filename || "").split(".").pop()?.toLowerCase() || "";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";
  if (m.includes("html") || ext === "html" || ext === "htm") return "web";
  if (m.includes("zip") || m.includes("rar") || m.includes("tar") || m.includes("gzip") ||
      m.includes("7z") || ext === "zip" || ext === "rar" || ext === "7z" || ext === "tar" || ext === "gz") return "archive";
  if (m.includes("javascript") || m.includes("json") || m.includes("xml") || m.includes("css") ||
      m.includes("python") || m.includes("yaml") || m.includes("toml") ||
      ["js", "ts", "jsx", "tsx", "py", "rb", "go", "rs", "c", "cpp", "h", "java",
       "swift", "kt", "sh", "bash", "yml", "yaml", "toml", "css", "scss", "json",
       "xml", "sql", "md", "mdx", "lua", "php"].includes(ext)) return "code";
  if (m.startsWith("text/") || ["txt", "log", "csv", "tsv", "rtf", "ini", "cfg", "conf", "env"].includes(ext)) return "text";
  return "general";
}

function isPreviewable(mime: string | null): boolean {
  if (!mime) return false;
  return (
    mime.startsWith("image/") || mime.startsWith("audio/") || mime.startsWith("video/") ||
    mime.startsWith("text/") || mime.includes("html") || mime.includes("javascript") ||
    mime.includes("json") || mime.includes("xml") || mime.includes("css")
  );
}

function getFileExt(filename: string): string {
  return (filename.split(".").pop() || "").toUpperCase();
}

type SortMode = "date" | "name" | "type" | "size";

// ─── Image Preview ─────────────────────────────────────
function ImagePreview({ url }: { url: string }) {
  return (
    <View style={pStyles.imageContainer}>
      <ExpoImage source={{ uri: url }} style={pStyles.image} contentFit="contain" transition={300} />
    </View>
  );
}

// ─── Audio Player ──────────────────────────────────────
function AudioPlayer({ url, filename }: { url: string; filename: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => { return () => { sound?.unloadAsync(); }; }, [sound]);

  const toggle = async () => {
    if (sound) {
      if (playing) { await sound.pauseAsync(); setPlaying(false); }
      else { await sound.playAsync(); setPlaying(true); }
      return;
    }
    const { sound: s } = await Audio.Sound.createAsync(
      { uri: url }, { shouldPlay: true },
      (st) => {
        if (st.isLoaded) {
          setPosition(st.positionMillis || 0);
          setDuration(st.durationMillis || 0);
          if (st.didJustFinish) { setPlaying(false); setPosition(0); }
        }
      }
    );
    setSound(s); setPlaying(true);
  };

  const stop = async () => {
    if (sound) { await sound.stopAsync(); await sound.setPositionAsync(0); setPlaying(false); setPosition(0); }
  };

  const fmt = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`; };
  const prog = duration > 0 ? position / duration : 0;

  return (
    <View style={pStyles.audioContainer}>
      <View style={pStyles.audioDisc}>
        <Volume2 size={36} color="#A78BFA" />
      </View>
      <Text style={pStyles.audioFilename} numberOfLines={1}>{filename}</Text>
      <View style={pStyles.audioRow}>
        <TouchableOpacity style={pStyles.playBtn} onPress={toggle}>{playing ? <Pause size={22} color="#fff" /> : <Play size={22} color="#fff" />}</TouchableOpacity>
        <TouchableOpacity style={pStyles.stopBtn} onPress={stop}><Square size={16} color="#94A3B8" /></TouchableOpacity>
      </View>
      <View style={pStyles.progressBar}><View style={[pStyles.progressFill, { width: `${prog * 100}%` }]} /></View>
      <View style={pStyles.timeRow}><Text style={pStyles.timeText}>{fmt(position)}</Text><Text style={pStyles.timeText}>{fmt(duration)}</Text></View>
    </View>
  );
}

// ─── Video Player ──────────────────────────────────────
function VideoPlayer({ url }: { url: string }) {
  return (
    <View style={pStyles.videoContainer}>
      <Video source={{ uri: url }} style={pStyles.video} useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay={false} />
    </View>
  );
}

// ─── HTML / Code Preview ───────────────────────────────
function HtmlCodePreview({ url, mime }: { url: string; mime: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const isHtml = mime.includes("html");

  useEffect(() => {
    (async () => {
      try { const r = await fetch(url); setCode(await r.text()); } catch { setCode("// Failed to load"); }
      setLoading(false);
    })();
  }, [url]);

  if (loading) return <ActivityIndicator color="#D4A017" style={{ marginTop: 40 }} />;

  return (
    <View style={pStyles.htmlContainer}>
      {isHtml && (
        <View style={pStyles.toggleRow}>
          <TouchableOpacity style={[pStyles.toggleBtn, !showCode && pStyles.toggleActive]} onPress={() => setShowCode(false)}>
            <Eye size={13} color={!showCode ? "#000" : "#94A3B8"} /><Text style={[pStyles.toggleText, !showCode && { color: "#000" }]}>Live Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[pStyles.toggleBtn, showCode && pStyles.toggleActive]} onPress={() => setShowCode(true)}>
            <Code2 size={13} color={showCode ? "#000" : "#94A3B8"} /><Text style={[pStyles.toggleText, showCode && { color: "#000" }]}>Source</Text>
          </TouchableOpacity>
        </View>
      )}
      {isHtml && !showCode ? (
        <View style={pStyles.webviewWrap}><WebView source={{ html: code || "" }} style={{ flex: 1, backgroundColor: "#fff" }} originWhitelist={["*"]} javaScriptEnabled /></View>
      ) : (
        <ScrollView style={pStyles.codeScroll} horizontal={false}><ScrollView horizontal><Text style={pStyles.codeText} selectable>{code}</Text></ScrollView></ScrollView>
      )}
    </View>
  );
}

// ─── Preview Modal ─────────────────────────────────────
function FilePreviewModal({ visible, file, onClose }: { visible: boolean; file: any | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!file || !visible) { setUrl(null); setLoading(true); return; }
    (async () => {
      const { data } = await supabase.storage.from("openclaw-files").createSignedUrl(file.storage_path, 3600);
      setUrl(data?.signedUrl ?? null); setLoading(false);
    })();
  }, [file, visible]);

  if (!file) return null;
  const mime = file.mime_type || "";
  const cat = file.category || getCategory(mime, file.filename);
  const Icon = CATEGORY_ICONS[cat] || File;
  const color = CATEGORY_COLORS[cat] || "#94A3B8";

  const renderPreview = () => {
    if (loading || !url) return <ActivityIndicator color="#D4A017" size="large" style={{ marginTop: 60 }} />;
    if (mime.startsWith("image/")) return <ImagePreview url={url} />;
    if (mime.startsWith("audio/")) return <AudioPlayer url={url} filename={file.filename} />;
    if (mime.startsWith("video/")) return <VideoPlayer url={url} />;
    if (mime.startsWith("text/") || mime.includes("html") || mime.includes("javascript") || mime.includes("json") || mime.includes("xml") || mime.includes("css"))
      return <HtmlCodePreview url={url} mime={mime} />;
    return (
      <View style={pStyles.unsupported}>
        <File size={48} color="#94A3B8" />
        <Text style={pStyles.unsupportedText}>No preview for this file type</Text>
        <Text style={pStyles.unsupportedMime}>{mime || "unknown"}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[pStyles.modal, { paddingTop: insets.top }]}>
        <View style={pStyles.header}>
          <View style={[pStyles.headerIcon, { backgroundColor: color + "20" }]}><Icon size={18} color={color} /></View>
          <View style={{ flex: 1 }}>
            <Text style={pStyles.headerTitle} numberOfLines={1}>{file.filename}</Text>
            <Text style={pStyles.headerMeta}>{formatBytes(file.file_size)} · {cat} · {mime}</Text>
          </View>
          <TouchableOpacity style={pStyles.closeBtn} onPress={onClose}><X size={20} color="#E8E8E8" /></TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>{renderPreview()}</View>
      </View>
    </Modal>
  );
}

// ─── Main Files Tab ────────────────────────────────────
export default function FilesTab() {
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const s = createSStyles(colors);
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [files, setFiles] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("stored_files").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setFiles(data ?? []);
  }, [user]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);
  const onRefresh = async () => { setRefreshing(true); await fetchFiles(); setRefreshing(false); };

  // ─── Upload any file ─────────────────────────────────
  const handleUpload = async () => {
    if (!user) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploading(true);
      const asset = result.assets[0];
      const filename = asset.name || `file_${Date.now()}`;
      const mime = asset.mimeType || "application/octet-stream";
      const fileSize = asset.size || 0;
      const folderPrefix = currentPath.length > 0 ? currentPath.join("/") + "/" : "";
      const storagePath = `${user.id}/${folderPrefix}${Date.now()}_${filename}`;

      // Read file as base64 and convert to blob
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const { error: uploadErr } = await supabase.storage
        .from("openclaw-files")
        .upload(storagePath, bytes, { contentType: mime });

      if (uploadErr) { Alert.alert("Upload Failed", uploadErr.message); setUploading(false); return; }

      const cat = getCategory(mime, filename);
      await supabase.from("stored_files").insert({
        user_id: user.id, filename, file_type: mime.split("/")[0] || "unknown",
        category: cat, file_size: fileSize, storage_path: storagePath, mime_type: mime,
      });
      await fetchFiles();
      setUploading(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Upload failed");
      setUploading(false);
    }
  };

  const handleDelete = async (file: any) => {
    Alert.alert("Delete File", `Delete "${file.filename}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await supabase.storage.from("openclaw-files").remove([file.storage_path]);
        await supabase.from("stored_files").delete().eq("id", file.id);
        fetchFiles();
      }},
    ]);
  };

  // ─── Sort + Filter ───────────────────────────────────
  const sortedFilteredFiles = useMemo(() => {
    let list = [...files];
    if (filterCat !== "all") list = list.filter(f => (f.category || getCategory(f.mime_type, f.filename)) === filterCat);

    list.sort((a, b) => {
      switch (sortMode) {
        case "name": return (a.filename || "").localeCompare(b.filename || "");
        case "type": return (a.category || "").localeCompare(b.category || "");
        case "size": return (b.file_size || 0) - (a.file_size || 0);
        case "date": default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return list;
  }, [files, sortMode, filterCat]);

  // ─── Folder structure from filtered files ────────────
  const currentItems = useMemo(() => {
    const pathPrefix = currentPath.length > 0 ? currentPath.join("/") + "/" : "";
    const subFolders = new Set<string>();
    const currentFiles: any[] = [];

    sortedFilteredFiles.forEach((f) => {
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
  }, [sortedFilteredFiles, currentPath]);

  // ─── Category counts for filter chips ────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: files.length };
    files.forEach(f => {
      const c = f.category || getCategory(f.mime_type, f.filename);
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [files]);

  const totalSize = files.reduce((acc, f) => acc + (f.file_size ?? 0), 0);
  const sortLabels: Record<SortMode, string> = { date: "Date", name: "Name", type: "Type", size: "Size" };
  const sortIcons: Record<SortMode, any> = { date: Clock, name: Type, type: Folder, size: ArrowUpDown };

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>File <Text style={{ color: colors.accent }}>System</Text></Text>
            <Text style={s.subtitle}>{files.length} files · {formatBytes(totalSize)}</Text>
          </View>
          <TouchableOpacity style={s.uploadBtn} onPress={handleUpload} disabled={uploading} activeOpacity={0.7}>
            {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Upload size={18} color="#fff" />}
          </TouchableOpacity>
        </View>

        {/* Sort + Filter bar */}
        <View style={s.toolbar}>
          {/* Sort buttons */}
          {(["date", "name", "type", "size"] as SortMode[]).map(mode => {
            const SIcon = sortIcons[mode];
            const active = sortMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[s.sortChip, active && s.sortChipActive]}
                onPress={() => setSortMode(mode)}
                activeOpacity={0.7}
              >
                <SIcon size={12} color={active ? "#000" : colors.textMuted} />
                <Text style={[s.sortChipText, active && s.sortChipTextActive]}>{sortLabels[mode]}</Text>
              </TouchableOpacity>
            );
          })}
          {/* Filter toggle */}
          <TouchableOpacity
            style={[s.filterToggle, showFilters && s.filterToggleActive]}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.7}
          >
            <Filter size={14} color={showFilters ? "#000" : colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Filter chips (file type) */}
        {showFilters && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 6 }}>
            {["all", "image", "audio", "video", "text", "code", "web", "archive", "general"].map(cat => {
              const count = categoryCounts[cat] || 0;
              if (cat !== "all" && count === 0) return null;
              const active = filterCat === cat;
              const CIcon = cat === "all" ? Grid : (CATEGORY_ICONS[cat] || File);
              const clr = cat === "all" ? colors.accent : (CATEGORY_COLORS[cat] || colors.textMuted);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[s.filterChip, active && { backgroundColor: clr, borderColor: clr }]}
                  onPress={() => setFilterCat(cat)}
                  activeOpacity={0.7}
                >
                  <CIcon size={12} color={active ? "#000" : clr} />
                  <Text style={[s.filterChipText, active && { color: "#000" }]}>
                    {CATEGORY_LABELS[cat]} {count > 0 ? `(${count})` : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Breadcrumb */}
        <View style={s.breadcrumb}>
          <TouchableOpacity onPress={() => setCurrentPath([])} style={s.breadcrumbItem}>
            <Home size={13} color={currentPath.length === 0 ? colors.accent : colors.textMuted} />
            <Text style={[s.breadcrumbText, currentPath.length === 0 && { color: colors.accent }]}>Root</Text>
          </TouchableOpacity>
          {currentPath.map((seg, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={11} color={colors.textMuted} />
              <TouchableOpacity onPress={() => setCurrentPath(currentPath.slice(0, i + 1))} style={s.breadcrumbItem}>
                <Text style={[s.breadcrumbText, i === currentPath.length - 1 && { color: colors.accent }]}>{seg}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* Back */}
        {currentPath.length > 0 && (
          <TouchableOpacity style={s.backBtn} onPress={() => setCurrentPath(currentPath.slice(0, -1))} activeOpacity={0.7}>
            <ArrowLeft size={15} color={colors.textSecondary} /><Text style={s.backText}>Back</Text>
          </TouchableOpacity>
        )}

        {/* Folders */}
        {currentItems.folders.map(folder => (
          <TouchableOpacity key={folder} style={s.folderRow} onPress={() => setCurrentPath([...currentPath, folder])} activeOpacity={0.7}>
            <View style={s.folderIcon}><FolderClosed size={18} color={colors.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.folderName}>{folder}</Text>
              <Text style={s.folderMeta}>Folder</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}

        {/* Files */}
        {currentItems.files.length === 0 && currentItems.folders.length === 0 ? (
          <View style={s.empty}>
            <FolderOpen size={48} color={colors.textMuted} />
            <Text style={s.emptyText}>No files here</Text>
            <Text style={s.emptySub}>Tap + to upload any file type</Text>
          </View>
        ) : (
          currentItems.files.map(file => {
            const cat = file.category || getCategory(file.mime_type, file.filename);
            const Icon = CATEGORY_ICONS[cat] || File;
            const color = CATEGORY_COLORS[cat] || "#94A3B8";
            const ext = getFileExt(file.filename);
            const canPreview = isPreviewable(file.mime_type);

            return (
              <TouchableOpacity
                key={file.id}
                style={s.fileRow}
                onPress={() => canPreview && setPreviewFile(file)}
                activeOpacity={canPreview ? 0.7 : 1}
              >
                {/* Icon + extension badge */}
                <View style={s.fileIconWrap}>
                  <View style={[s.fileIcon, { backgroundColor: color + "15" }]}>
                    <Icon size={18} color={color} />
                  </View>
                  {ext && <View style={[s.extBadge, { backgroundColor: color }]}><Text style={s.extText}>{ext}</Text></View>}
                </View>
                {/* Info */}
                <View style={s.fileInfo}>
                  <Text style={s.fileName} numberOfLines={1}>{file.filename}</Text>
                  <View style={s.fileMetaRow}>
                    <Text style={s.fileMeta}>{formatBytes(file.file_size)}</Text>
                    <View style={s.metaDot} />
                    <Text style={[s.fileMeta, { color }]}>{cat}</Text>
                    <View style={s.metaDot} />
                    <Text style={s.fileMeta}>{new Date(file.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>
                {/* Actions */}
                {canPreview && (
                  <View style={s.previewBadge}><Eye size={12} color={colors.accent} /></View>
                )}
                <TouchableOpacity onPress={() => handleDelete(file)} style={s.deleteBtn} activeOpacity={0.6}>
                  <Trash2 size={15} color={colors.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <FilePreviewModal visible={!!previewFile} file={previewFile} onClose={() => setPreviewFile(null)} />
    </>
  );
}

// ─── Styles ────────────────────────────────────────────
const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

const createSStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  title: { fontSize: 28, fontWeight: "700", color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  uploadBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },

  // Toolbar
  toolbar: { flexDirection: "row", gap: 6, marginBottom: 10, alignItems: "center" },
  sortChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceLight,
  },
  sortChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  sortChipText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  sortChipTextActive: { color: "#000" },
  filterToggle: {
    marginLeft: "auto", width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceLight,
    alignItems: "center", justifyContent: "center",
  },
  filterToggleActive: { backgroundColor: colors.accent, borderColor: colors.accent },

  // Filters
  filterRow: { marginBottom: 12 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceLight,
  },
  filterChipText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },

  // Breadcrumb
  breadcrumb: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: colors.surfaceLight, marginBottom: 10, flexWrap: "wrap",
  },
  breadcrumbItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  breadcrumbText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  backText: { fontSize: 13, color: colors.textSecondary },

  // Folders
  folderRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.surfaceLight, marginBottom: 6,
  },
  folderIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.accentDim, alignItems: "center", justifyContent: "center" },
  folderName: { fontSize: 15, fontWeight: "600", color: colors.text },
  folderMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  // Empty
  empty: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 48,
    alignItems: "center", borderWidth: 1, borderColor: colors.surfaceLight, marginTop: 8,
  },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },

  // Files
  fileRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.surface, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: colors.surfaceLight, marginBottom: 6,
  },
  fileIconWrap: { position: "relative" },
  fileIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  extBadge: {
    position: "absolute", bottom: -2, right: -4,
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4,
  },
  extText: { fontSize: 7, fontWeight: "800", color: "#000" },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: "600", color: colors.text },
  fileMetaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  fileMeta: { fontSize: 10, color: colors.textMuted },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textMuted, opacity: 0.4 },
  previewBadge: { width: 26, height: 26, borderRadius: 7, backgroundColor: colors.accentDim, alignItems: "center", justifyContent: "center" },
  deleteBtn: { padding: 7 },
});

const pStyles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  headerIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#E8E8E8" },
  headerMeta: { fontSize: 10, color: "#94A3B8", marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },

  imageContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  image: { width: SW - 32, height: SH * 0.65, borderRadius: 12 },

  audioContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 20 },
  audioDisc: { width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(167,139,250,0.1)", borderWidth: 2, borderColor: "rgba(167,139,250,0.2)", alignItems: "center", justifyContent: "center" },
  audioFilename: { fontSize: 14, fontWeight: "600", color: "#E8E8E8", textAlign: "center" },
  audioRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#A78BFA", alignItems: "center", justifyContent: "center" },
  stopBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  progressBar: { width: "100%", height: 4, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: "#A78BFA", borderRadius: 2 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  timeText: { fontSize: 11, color: "#94A3B8", fontFamily: mono },

  videoContainer: { flex: 1, justifyContent: "center", backgroundColor: "#000" },
  video: { width: SW, height: SH * 0.5, alignSelf: "center" },

  htmlContainer: { flex: 1 },
  toggleRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.08)" },
  toggleActive: { backgroundColor: "#D4A017" },
  toggleText: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },
  webviewWrap: { flex: 1, margin: 12, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  codeScroll: { flex: 1, padding: 16 },
  codeText: { fontSize: 11, color: "#999999", fontFamily: mono, lineHeight: 18 },

  unsupported: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  unsupportedText: { fontSize: 15, color: "#999999" },
  unsupportedMime: { fontSize: 12, color: "#94A3B8", fontFamily: mono },
});
