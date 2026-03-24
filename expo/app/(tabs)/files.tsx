import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl,
  Alert, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  Upload, Trash2, FolderOpen, FileText, Image, Music, Film, Code, File,
  Download, HardDrive,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const categoryIcons: Record<string, any> = {
  image: Image, audio: Music, video: Film, text: FileText, code: Code, general: File,
};
const categoryColors: Record<string, string> = {
  image: "#34D399", audio: "#A78BFA", video: "#F87171", text: "#38BDF8", code: "#FBBF24", general: Colors.textMuted,
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
  if (mime.startsWith("text/")) return "text";
  if (mime.includes("javascript") || mime.includes("json")) return "code";
  return "general";
}

export default function FilesTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [files, setFiles] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("stored_files")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setFiles(data ?? []);
  }, [user]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFiles();
    setRefreshing(false);
  };

  const handleUpload = async () => {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    const asset = result.assets[0];
    const filename = asset.fileName ?? `upload_${Date.now()}.jpg`;
    const mime = asset.mimeType ?? "image/jpeg";
    const path = `${user.id}/${Date.now()}_${filename}`;

    const response = await fetch(asset.uri);
    const blob = await response.blob();

    const { error: uploadErr } = await supabase.storage
      .from("openclaw-files")
      .upload(path, blob, { contentType: mime });

    if (uploadErr) {
      Alert.alert("Upload Failed", uploadErr.message);
      setUploading(false);
      return;
    }

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
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>
            File <Text style={{ color: Colors.accent }}>Manager</Text>
          </Text>
          <Text style={styles.subtitle}>{files.length} files · {formatBytes(totalSize)}</Text>
        </View>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={handleUpload}
          disabled={uploading}
          activeOpacity={0.7}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <Upload size={18} color={Colors.background} />
          )}
        </TouchableOpacity>
      </View>

      {files.length === 0 ? (
        <View style={styles.empty}>
          <FolderOpen size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No files yet</Text>
          <Text style={styles.emptySubtext}>Upload files or let your agent store them here</Text>
        </View>
      ) : (
        <View style={styles.fileList}>
          {files.map((file) => {
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
                    {formatBytes(file.file_size)} · {new Date(file.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(file)}
                  style={styles.deleteBtn}
                  activeOpacity={0.6}
                >
                  <Trash2 size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "700", color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  uploadBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.accent,
    alignItems: "center", justifyContent: "center",
  },
  empty: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 48,
    alignItems: "center", borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary, marginTop: 16 },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: "center" },
  fileList: { gap: 8 },
  fileRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  fileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  fileMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: 8 },
});
