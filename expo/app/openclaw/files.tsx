import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl,
  Alert, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  Upload, Trash2, FolderOpen, FileText, Image, Music, Film, Code, File,
  ChevronRight, Home, FolderClosed, MoreVertical, ArrowLeft,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

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

export default function FilesTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [files, setFiles] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("stored_files").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setFiles(data ?? []);
  }, [user]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const onRefresh = async () => { setRefreshing(true); await fetchFiles(); setRefreshing(false); };

  // Build folder structure from storage paths
  const currentItems = useMemo(() => {
    const pathPrefix = currentPath.length > 0 ? currentPath.join("/") + "/" : "";
    const subFolders = new Set<string>();
    const currentFiles: any[] = [];

    files.forEach((f) => {
      const parts = f.storage_path.split("/");
      const relativePath = parts.slice(1).join("/"); // skip user_id prefix

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

    return {
      folders: Array.from(subFolders).sort(),
      files: currentFiles,
    };
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

      {/* Breadcrumb navigation */}
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

      {/* Back button when in subfolder */}
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
          return (
            <View key={file.id} style={styles.fileRow}>
              <View style={[styles.fileIcon, { backgroundColor: color + "15" }]}>
                <Icon size={16} color={color} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{file.filename}</Text>
                <Text style={styles.fileMeta}>
                  {formatBytes(file.file_size)} · {file.category} · {new Date(file.created_at).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(file)} style={styles.deleteBtn} activeOpacity={0.6}>
                <Trash2 size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

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
  deleteBtn: { padding: 8 },
});
