import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Download, Star, Trash2, Share2, Check, Copy } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ImageDetailModal() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [image, setImage] = useState<any>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const [{ data: img }, { data: k }] = await Promise.all([
        supabase.from("generated_images").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("master_api_keys").select("key_value").eq("user_id", user.id).maybeSingle(),
      ]);
      setImage(img);
      setApiKey(k?.key_value ?? null);
      setLoading(false);
    })();
  }, [user, id]);

  const handleSave = async () => {
    if (!apiKey || !image) return;
    setSaving(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/clawimagen-api`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_image", params: { image_id: image.id } }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);
      setImage((prev: any) => ({ ...prev, is_saved: true, status: "saved" }));
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStar = async () => {
    if (!apiKey || !image) return;
    const newStarred = !image.is_starred;
    setImage((prev: any) => ({ ...prev, is_starred: newStarred }));
    await fetch(`${SUPABASE_URL}/functions/v1/clawimagen-api`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_image", params: { image_id: image.id, is_starred: newStarred } }),
    });
  };

  const handleDelete = () => {
    Alert.alert("Delete Image", "Remove this image permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          if (!apiKey || !image) return;
          await fetch(`${SUPABASE_URL}/functions/v1/clawimagen-api`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete_image", params: { image_id: image.id } }),
          });
          router.back();
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!image?.image_url) return;
    await Share.share({ url: image.image_url, message: `AI Generated: ${image.prompt}` });
  };

  const copyPrompt = async () => {
    if (!image?.prompt) return;
    await Clipboard.setStringAsync(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <View style={[st.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!image) {
    return (
      <View style={[st.container, { paddingTop: insets.top }]}>
        <Text style={{ color: Colors.textMuted }}>Image not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>
    );
  }

  const isDone = image.status === "done" || image.status === "saved";

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={st.topBar}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={st.topTitle} numberOfLines={1}>Image Detail</Text>
        <TouchableOpacity style={st.topActionBtn} onPress={handleShare} disabled={!image.image_url}>
          <Share2 size={18} color={image.image_url ? Colors.text : Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Full image */}
        <View style={st.imageContainer}>
          {isDone && image.image_url
            ? <Image source={{ uri: image.image_url }} style={st.fullImage} resizeMode="contain" />
            : (
              <View style={st.imageLoading}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={st.imageLoadingText}>{image.status === "failed" ? "Generation failed" : "Generating..."}</Text>
              </View>
            )
          }
        </View>

        {/* Info card */}
        <View style={st.infoCard}>
          {/* Actions */}
          <View style={st.actions}>
            {!image.is_saved && isDone && (
              <TouchableOpacity style={[st.actionBtn, st.actionSave]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={Colors.success} /> : <Download size={16} color={Colors.success} />}
                <Text style={[st.actionBtnText, { color: Colors.success }]}>Save to Gallery</Text>
              </TouchableOpacity>
            )}
            {image.is_saved && (
              <View style={[st.actionBtn, st.actionSaved]}>
                <Check size={16} color={Colors.success} />
                <Text style={[st.actionBtnText, { color: Colors.success }]}>Saved</Text>
              </View>
            )}
            <TouchableOpacity style={[st.actionBtn, st.actionStar]} onPress={handleStar}>
              <Star size={16} color={image.is_starred ? Colors.warning : Colors.textMuted} fill={image.is_starred ? Colors.warning : "none"} />
              <Text style={[st.actionBtnText, { color: image.is_starred ? Colors.warning : Colors.textMuted }]}>
                {image.is_starred ? "Starred" : "Star"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.actionBtn, st.actionDelete]} onPress={handleDelete}>
              <Trash2 size={16} color={Colors.danger} />
            </TouchableOpacity>
          </View>

          {/* Prompt */}
          <View style={st.section}>
            <View style={st.sectionHeaderRow}>
              <Text style={st.sectionLabel}>PROMPT</Text>
              <TouchableOpacity style={st.copyBtn} onPress={copyPrompt}>
                {copied ? <Check size={12} color={Colors.success} /> : <Copy size={12} color={Colors.textMuted} />}
                <Text style={[st.copyBtnText, copied && { color: Colors.success }]}>{copied ? "Copied!" : "Copy"}</Text>
              </TouchableOpacity>
            </View>
            <Text style={st.promptText}>{image.prompt}</Text>
          </View>

          {/* Metadata grid */}
          <View style={st.metaGrid}>
            {[
              { label: "Style",   value: image.style },
              { label: "Size",    value: `${image.width}×${image.height}` },
              { label: "Status",  value: image.status },
              { label: "Agent",   value: image.agent_name || "—" },
              { label: "Created", value: timeAgo(image.created_at) },
              { label: "Model",   value: image.model || "rork-default" },
            ].map(item => (
              <View key={item.label} style={st.metaItem}>
                <Text style={st.metaLabel}>{item.label}</Text>
                <Text style={st.metaValue} numberOfLines={1}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Tags */}
          {image.tags && image.tags.length > 0 && (
            <View style={st.section}>
              <Text style={st.sectionLabel}>TAGS</Text>
              <View style={st.tagsRow}>
                {image.tags.map((t: string) => (
                  <View key={t} style={st.tagChip}><Text style={st.tagText}>#{t}</Text></View>
                ))}
              </View>
            </View>
          )}

          {/* Error */}
          {image.error_message && (
            <View style={st.errorCard}>
              <Text style={st.errorLabel}>ERROR</Text>
              <Text style={st.errorText}>{image.error_message}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: Colors.text, textAlign: "center" },
  topActionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },

  imageContainer: { width: SCREEN_W, height: SCREEN_W, backgroundColor: "rgba(255,255,255,0.02)", marginBottom: 16 },
  fullImage: { width: "100%", height: "100%" },
  imageLoading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  imageLoadingText: { fontSize: 14, color: Colors.textMuted },

  infoCard: { marginHorizontal: 16, padding: 16, backgroundColor: "rgba(220,38,38,0.04)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(220,38,38,0.1)" },

  actions: { flexDirection: "row", gap: 8, marginBottom: 16 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  actionSave: { backgroundColor: "rgba(52,211,153,0.08)", borderColor: "rgba(52,211,153,0.2)" },
  actionSaved: { backgroundColor: "rgba(52,211,153,0.05)", borderColor: "rgba(52,211,153,0.1)" },
  actionStar: { flex: 0.6, backgroundColor: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.2)" },
  actionDelete: { flex: 0.4, backgroundColor: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.2)" },
  actionBtnText: { fontSize: 13, fontWeight: "700" },

  section: { marginBottom: 14 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.2, textTransform: "uppercase" },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  copyBtnText: { fontSize: 11, fontWeight: "600", color: Colors.textMuted },
  promptText: { fontSize: 15, color: Colors.text, lineHeight: 22 },

  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  metaItem: { width: (SCREEN_W - 80) / 3, backgroundColor: "rgba(255,255,255,0.04)", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  metaLabel: { fontSize: 9, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  metaValue: { fontSize: 12, fontWeight: "700", color: Colors.text },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagChip: { backgroundColor: "rgba(220,38,38,0.08)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(220,38,38,0.15)" },
  tagText: { fontSize: 12, fontWeight: "600", color: Colors.accent },

  errorCard: { backgroundColor: "rgba(248,113,113,0.08)", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "rgba(248,113,113,0.2)" },
  errorLabel: { fontSize: 9, fontWeight: "800", color: Colors.danger, letterSpacing: 1, marginBottom: 4 },
  errorText: { fontSize: 13, color: Colors.danger, lineHeight: 18 },
});
