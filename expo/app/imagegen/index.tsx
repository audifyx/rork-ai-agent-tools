import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Download,
  Image as ImageIcon,
  Sparkles,
  Star,
  Trash2,
  ChevronDown,
  ChevronUp,
  Send,
  Zap,
  BarChart3,
  RefreshCw,
  Check,
  Lock,
} from "lucide-react-native";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";
import { LobsterWatermark } from "@/components/tweeter/LobsterWatermark";

const { width: SCREEN_W } = Dimensions.get("window");
const PREVIEW_SIZE = SCREEN_W - 32;

// ── Constants ──────────────────────────────────────────────────────
const STYLES = [
  { id: "photorealistic", label: "Photo", emoji: "📷" },
  { id: "anime",          label: "Anime",  emoji: "🎌" },
  { id: "digital-art",    label: "Digital", emoji: "🖥️" },
  { id: "cinematic",      label: "Cinema", emoji: "🎬" },
  { id: "oil-painting",   label: "Oil",    emoji: "🖌️" },
  { id: "sketch",         label: "Sketch", emoji: "✏️" },
  { id: "watercolor",     label: "Water",  emoji: "🎨" },
  { id: "3d-render",      label: "3D",     emoji: "🧊" },
];

const SIZES = [
  { id: "512x512",   label: "Square S",  aspect: "1:1" },
  { id: "768x768",   label: "Square M",  aspect: "1:1" },
  { id: "1024x1024", label: "Square HD", aspect: "1:1" },
  { id: "1024x1792", label: "Portrait",  aspect: "9:16" },
  { id: "1792x1024", label: "Landscape", aspect: "16:9" },
];

const PROMPT_SUGGESTIONS = [
  "A futuristic city skyline at dusk with neon lights reflecting on wet streets",
  "A lone astronaut sitting on the edge of a crater, staring at Earth",
  "A dragon made of red gemstones perched on a volcanic mountain",
  "An ancient library filled with glowing magical books and candles",
  "A cyberpunk samurai in the rain, neon signs behind them",
  "A serene Japanese garden at sunrise with cherry blossoms falling",
  "An underwater metropolis with bioluminescent buildings",
  "A wolf made of starlight howling at the moon",
];

// ── Tiny helpers ───────────────────────────────────────────────────
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function statusColor(status: string) {
  switch (status) {
    case "done":
    case "saved":   return Colors.success;
    case "generating":
    case "pending": return Colors.warning;
    case "failed":  return Colors.danger;
    default:        return Colors.textMuted;
  }
}

// ── Sub-components ─────────────────────────────────────────────────

function StatsBanner({ stats }: { stats: any }) {
  if (!stats) return null;
  return (
    <View style={st.banner}>
      <View style={st.bannerItem}>
        <Sparkles size={13} color={Colors.accent} />
        <Text style={st.bannerVal}>{stats.total_generated ?? 0}</Text>
        <Text style={st.bannerLabel}>Generated</Text>
      </View>
      <View style={st.bannerDivider} />
      <View style={st.bannerItem}>
        <Download size={13} color={Colors.accent} />
        <Text style={st.bannerVal}>{stats.total_saved ?? 0}</Text>
        <Text style={st.bannerLabel}>Saved</Text>
      </View>
      <View style={st.bannerDivider} />
      <View style={st.bannerItem}>
        <Zap size={13} color={Colors.warning} />
        <Text style={st.bannerVal}>{stats.currently_generating ?? 0}</Text>
        <Text style={st.bannerLabel}>Queued</Text>
      </View>
      <View style={st.bannerDivider} />
      <View style={st.bannerItem}>
        <BarChart3 size={13} color={Colors.info} />
        <Text style={st.bannerVal}>{stats.favorite_style ? STYLES.find(s => s.id === stats.favorite_style)?.emoji ?? "—" : "—"}</Text>
        <Text style={st.bannerLabel}>Fav style</Text>
      </View>
    </View>
  );
}

function LivePreview({ image, onSave, onStar, onDelete }: { image: any; onSave: () => void; onStar: () => void; onDelete: () => void }) {
  const isGenerating = image.status === "generating" || image.status === "pending";
  const isDone = image.status === "done" || image.status === "saved";
  const isFailed = image.status === "failed";

  return (
    <View style={st.previewCard}>
      {/* Glow */}
      <View style={st.previewGlow} />

      {/* Status row */}
      <View style={st.previewStatusRow}>
        <View style={[st.statusDot, { backgroundColor: statusColor(image.status) }]} />
        <Text style={[st.statusText, { color: statusColor(image.status) }]}>{image.status.toUpperCase()}</Text>
        <Text style={st.previewTime}>{timeAgo(image.created_at)}</Text>
        <View style={st.lockBadge}>
          <Lock size={7} color={Colors.accent} />
          <Text style={st.lockText}>AGENT</Text>
        </View>
      </View>

      {/* Image area */}
      <View style={[st.imageBox, { height: PREVIEW_SIZE }]}>
        {isGenerating && (
          <View style={st.generatingOverlay}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={st.generatingText}>Generating...</Text>
            <Text style={st.generatingPrompt} numberOfLines={2}>{image.prompt}</Text>
          </View>
        )}
        {isDone && image.image_url && (
          <Image source={{ uri: image.image_url }} style={st.previewImage} resizeMode="cover" />
        )}
        {isFailed && (
          <View style={st.failedOverlay}>
            <Text style={{ fontSize: 40 }}>❌</Text>
            <Text style={st.failedText}>Generation failed</Text>
            <Text style={st.failedSub} numberOfLines={2}>{image.error_message || "Unknown error"}</Text>
          </View>
        )}
        {/* Placeholder when image_url not yet set */}
        {isDone && !image.image_url && (
          <View style={st.generatingOverlay}>
            <ImageIcon size={48} color={Colors.textMuted} style={{ opacity: 0.3 }} />
            <Text style={st.generatingText}>Image ready</Text>
          </View>
        )}
      </View>

      {/* Prompt pill */}
      <View style={st.promptPill}>
        <Text style={st.promptPillText} numberOfLines={2}>{image.prompt}</Text>
      </View>

      {/* Style / size chips */}
      <View style={st.chipRow}>
        <View style={st.chip}><Text style={st.chipText}>{STYLES.find(s => s.id === image.style)?.emoji} {image.style}</Text></View>
        <View style={st.chip}><Text style={st.chipText}>{image.width}×{image.height}</Text></View>
        {image.agent_name && <View style={[st.chip, st.chipAccent]}><Text style={[st.chipText, { color: Colors.accent }]}>by {image.agent_name}</Text></View>}
      </View>

      {/* Action buttons */}
      {isDone && (
        <View style={st.previewActions}>
          {!image.is_saved && (
            <TouchableOpacity style={st.actionBtn} onPress={onSave}>
              <Download size={16} color={Colors.success} />
              <Text style={[st.actionBtnText, { color: Colors.success }]}>Save</Text>
            </TouchableOpacity>
          )}
          {image.is_saved && (
            <View style={[st.actionBtn, st.actionBtnSaved]}>
              <Check size={16} color={Colors.success} />
              <Text style={[st.actionBtnText, { color: Colors.success }]}>Saved</Text>
            </View>
          )}
          <TouchableOpacity style={st.actionBtn} onPress={onStar}>
            <Star size={16} color={image.is_starred ? Colors.warning : Colors.textMuted} fill={image.is_starred ? Colors.warning : "none"} />
            <Text style={[st.actionBtnText, { color: image.is_starred ? Colors.warning : Colors.textMuted }]}>
              {image.is_starred ? "Starred" : "Star"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.actionBtn, st.actionBtnDanger]} onPress={onDelete}>
            <Trash2 size={16} color={Colors.danger} />
            <Text style={[st.actionBtnText, { color: Colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function GalleryThumb({ image, onPress }: { image: any; onPress: () => void }) {
  const isDone = image.status === "done" || image.status === "saved";
  return (
    <TouchableOpacity style={st.thumb} onPress={onPress} activeOpacity={0.8}>
      {isDone && image.image_url
        ? <Image source={{ uri: image.image_url }} style={st.thumbImage} resizeMode="cover" />
        : (
          <View style={st.thumbPlaceholder}>
            {(image.status === "generating" || image.status === "pending")
              ? <ActivityIndicator size="small" color={Colors.accent} />
              : <ImageIcon size={20} color={Colors.textMuted} />}
          </View>
        )
      }
      {image.is_starred && <View style={st.thumbStar}><Star size={10} color={Colors.warning} fill={Colors.warning} /></View>}
      {image.is_saved && <View style={st.thumbSaved}><Download size={9} color={Colors.success} /></View>}
      <View style={[st.thumbStatus, { backgroundColor: statusColor(image.status) + "33" }]}>
        <Text style={[st.thumbStatusText, { color: statusColor(image.status) }]}>{image.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────
export default function ImageGenScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("photorealistic");
  const [selectedSize, setSelectedSize] = useState("1024x1024");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeImage, setActiveImage] = useState<any>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // ── Load master API key ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("master_api_keys").select("key_value").eq("user_id", user.id).maybeSingle();
      setApiKey(data?.key_value ?? null);
    })();
  }, [user]);

  // ── Fetch images + stats ────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user || !apiKey) return;
    const [{ data: imgs }, { data: s }] = await Promise.all([
      supabase.from("generated_images").select("id, prompt, image_url, style, width, height, status, is_saved, is_starred, agent_name, created_at, error_message").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      fetch(`${SUPABASE_URL}/functions/v1/clawimagen-api`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_stats" }),
      }).then(r => r.json()).then(r => r.data),
    ]);
    setImages(imgs ?? []);
    setStats(s);
    // Update activeImage if it's in the list
    if (activeImage) {
      const updated = imgs?.find((i: any) => i.id === activeImage.id);
      if (updated) setActiveImage(updated);
    }
  }, [user, apiKey, activeImage]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // ── Realtime subscription ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("imagegen-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "generated_images", filter: `user_id=eq.${user.id}` }, () => { void fetchData(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [fetchData, user]);

  // ── Poll while generating ───────────────────────────────────────
  useEffect(() => {
    const hasGenerating = images.some(i => i.status === "generating" || i.status === "pending");
    if (hasGenerating && !pollRef.current) {
      pollRef.current = setInterval(() => { void fetchData(); }, 3000);
    } else if (!hasGenerating && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [images, fetchData]);

  // ── Generate ────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) { Alert.alert("Prompt required", "Enter a prompt to generate an image."); return; }
    if (!apiKey) { Alert.alert("No API key", "Configure your master API key first."); return; }
    setGenerating(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/clawimagen-api`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          params: {
            prompt: prompt.trim(),
            negative_prompt: negPrompt.trim() || undefined,
            style: selectedStyle,
            size: selectedSize,
            quality,
            agent_name: "Manual",
          },
        }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "Generation failed");
      await fetchData();
      // Set new image as active
      const newImg = images.find(i => i.id === data.data.id) || { ...data.data, status: "pending", created_at: new Date().toISOString() };
      setActiveImage(newImg);
      setShowGallery(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  // ── Save ────────────────────────────────────────────────────────
  const handleSave = async (image: any) => {
    if (!apiKey) return;
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/clawimagen-api`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_image", params: { image_id: image.id } }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);
      void fetchData();
    } catch (err: any) { Alert.alert("Error", err.message); }
  };

  // ── Star ────────────────────────────────────────────────────────
  const handleStar = async (image: any) => {
    if (!apiKey) return;
    await fetch(`${SUPABASE_URL}/functions/v1/clawimagen-api`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_image", params: { image_id: image.id, is_starred: !image.is_starred } }),
    });
    void fetchData();
  };

  // ── Delete ──────────────────────────────────────────────────────
  const handleDelete = (image: any) => {
    Alert.alert("Delete Image", "Remove this image permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          if (!apiKey) return;
          await fetch(`${SUPABASE_URL}/functions/v1/clawimagen-api`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete_image", params: { image_id: image.id } }),
          });
          if (activeImage?.id === image.id) setActiveImage(null);
          void fetchData();
        },
      },
    ]);
  };

  const randomSuggestion = () => {
    setPrompt(PROMPT_SUGGESTIONS[Math.floor(Math.random() * PROMPT_SUGGESTIONS.length)]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        ref={scrollRef}
        style={st.container}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Background glow */}
        <View style={st.redGlow} />
        <LobsterWatermark />

        {/* Header */}
        <View style={st.header}>
          <View>
            <Text style={st.title}>🎨 Agent <Text style={{ color: Colors.accent }}>ImageGen</Text></Text>
            <Text style={st.subtitle}>AI-powered image generation · agent-controlled</Text>
          </View>
          <TouchableOpacity style={st.refreshBtn} onPress={() => { setRefreshing(true); fetchData().finally(() => setRefreshing(false)); }}>
            <RefreshCw size={16} color={refreshing ? Colors.accent : Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Stats banner */}
        <StatsBanner stats={stats} />

        {/* ── LIVE PREVIEW ──────────────────────────────────── */}
        {activeImage ? (
          <LivePreview
            image={activeImage}
            onSave={() => handleSave(activeImage)}
            onStar={() => handleStar(activeImage)}
            onDelete={() => handleDelete(activeImage)}
          />
        ) : (
          <View style={st.previewPlaceholder}>
            <View style={st.previewGlow} />
            <ImageIcon size={64} color={Colors.accent} style={{ opacity: 0.15 }} />
            <Text style={st.placeholderTitle}>No image selected</Text>
            <Text style={st.placeholderSub}>Generate an image below or tap one from the gallery</Text>
          </View>
        )}

        {/* ── KEYPAD / PROMPT PANEL ─────────────────────────── */}
        <View style={st.keypad}>
          <View style={st.keypadGlow} />

          {/* Keypad header */}
          <View style={st.keypadHeader}>
            <Text style={st.keypadTitle}>⌨️ Prompt <Text style={{ color: Colors.accent }}>Keypad</Text></Text>
            <TouchableOpacity style={st.suggestionBtn} onPress={randomSuggestion}>
              <Sparkles size={14} color={Colors.accent} />
              <Text style={st.suggestionBtnText}>Inspire me</Text>
            </TouchableOpacity>
          </View>

          {/* Main prompt */}
          <TextInput
            style={st.promptInput}
            placeholder="Describe what you want to generate..."
            placeholderTextColor={Colors.textMuted}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            maxLength={2000}
          />
          <Text style={st.charCount}>{prompt.length}/2000</Text>

          {/* Style selector */}
          <Text style={st.sectionLabel}>STYLE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.styleRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
            {STYLES.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[st.styleChip, selectedStyle === s.id && st.styleChipActive]}
                onPress={() => setSelectedStyle(s.id)}
              >
                <Text style={st.styleEmoji}>{s.emoji}</Text>
                <Text style={[st.styleLabel, selectedStyle === s.id && st.styleLabelActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Size selector */}
          <Text style={st.sectionLabel}>SIZE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.styleRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
            {SIZES.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[st.sizeChip, selectedSize === s.id && st.styleChipActive]}
                onPress={() => setSelectedSize(s.id)}
              >
                <Text style={[st.sizeLabel, selectedSize === s.id && st.styleLabelActive]}>{s.label}</Text>
                <Text style={st.sizeAspect}>{s.aspect}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quality toggle */}
          <View style={st.qualityRow}>
            <Text style={st.sectionLabel}>QUALITY</Text>
            <View style={st.qualityToggle}>
              {(["standard", "hd"] as const).map(q => (
                <TouchableOpacity
                  key={q}
                  style={[st.qualityBtn, quality === q && st.qualityBtnActive]}
                  onPress={() => setQuality(q)}
                >
                  <Text style={[st.qualityBtnText, quality === q && st.qualityBtnTextActive]}>
                    {q === "hd" ? "⚡ HD" : "Standard"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Advanced toggle */}
          <TouchableOpacity style={st.advancedToggle} onPress={() => setShowAdvanced(!showAdvanced)}>
            <Text style={st.advancedToggleText}>Advanced options</Text>
            {showAdvanced ? <ChevronUp size={14} color={Colors.textMuted} /> : <ChevronDown size={14} color={Colors.textMuted} />}
          </TouchableOpacity>

          {showAdvanced && (
            <View style={st.advancedPanel}>
              <Text style={st.sectionLabel}>NEGATIVE PROMPT</Text>
              <TextInput
                style={[st.promptInput, { minHeight: 60 }]}
                placeholder="What to avoid (e.g. blurry, low quality, extra limbs)..."
                placeholderTextColor={Colors.textMuted}
                value={negPrompt}
                onChangeText={setNegPrompt}
                multiline
                maxLength={500}
              />
            </View>
          )}

          {/* Generate button */}
          <TouchableOpacity
            style={[st.generateBtn, (!prompt.trim() || generating) && st.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={!prompt.trim() || generating}
            activeOpacity={0.85}
          >
            {generating
              ? <ActivityIndicator size="small" color="#fff" />
              : <Send size={18} color="#fff" />
            }
            <Text style={st.generateBtnText}>{generating ? "Queuing..." : "Generate Image"}</Text>
            <View style={st.generateBtnBadge}><Sparkles size={12} color="rgba(255,255,255,0.6)" /></View>
          </TouchableOpacity>
        </View>

        {/* ── GALLERY ───────────────────────────────────────── */}
        {images.length > 0 && (
          <View style={st.gallerySection}>
            <TouchableOpacity style={st.galleryHeader} onPress={() => setShowGallery(!showGallery)}>
              <Text style={st.galleryTitle}>🖼️ Gallery <Text style={{ color: Colors.textMuted, fontSize: 14 }}>({images.length})</Text></Text>
              {showGallery ? <ChevronUp size={16} color={Colors.textMuted} /> : <ChevronDown size={16} color={Colors.textMuted} />}
            </TouchableOpacity>

            {showGallery && (
              <View style={st.galleryGrid}>
                {images.map(img => (
                  <GalleryThumb
                    key={img.id}
                    image={img}
                    onPress={() => { setActiveImage(img); setShowGallery(false); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
                  />
                ))}
              </View>
            )}

            {!showGallery && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
                {images.slice(0, 10).map(img => (
                  <GalleryThumb
                    key={img.id}
                    image={img}
                    onPress={() => { setActiveImage(img); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* No images empty state */}
        {images.length === 0 && !generating && (
          <View style={st.empty}>
            <ImageIcon size={48} color={Colors.accent} style={{ opacity: 0.3 }} />
            <Text style={st.emptyTitle}>No images yet</Text>
            <Text style={st.emptySub}>Write a prompt above and hit Generate to create your first image.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  redGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 400, backgroundColor: "rgba(220,38,38,0.025)" },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "900", color: Colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },

  // Stats banner
  banner: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 16,
    backgroundColor: "rgba(220,38,38,0.05)", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.1)", padding: 14,
  },
  bannerItem: { flex: 1, alignItems: "center", gap: 4 },
  bannerDivider: { width: 1, backgroundColor: "rgba(220,38,38,0.1)" },
  bannerVal: { fontSize: 16, fontWeight: "800", color: Colors.text },
  bannerLabel: { fontSize: 9, fontWeight: "600", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },

  // Preview
  previewCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: "rgba(220,38,38,0.04)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.12)", overflow: "hidden",
    padding: 14,
  },
  previewGlow: { position: "absolute", top: -60, right: -60, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(220,38,38,0.06)" },
  previewStatusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  previewTime: { fontSize: 11, color: Colors.textMuted, flex: 1 },
  lockBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(220,38,38,0.08)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  lockText: { fontSize: 8, fontWeight: "800", color: Colors.accent, letterSpacing: 0.5 },
  imageBox: {
    width: "100%", borderRadius: 14, overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  previewImage: { width: "100%", height: "100%" },
  generatingOverlay: { alignItems: "center", justifyContent: "center", gap: 12, padding: 20 },
  generatingText: { fontSize: 16, fontWeight: "700", color: Colors.accent },
  generatingPrompt: { fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 19 },
  failedOverlay: { alignItems: "center", justifyContent: "center", gap: 8, padding: 20 },
  failedText: { fontSize: 16, fontWeight: "700", color: Colors.danger },
  failedSub: { fontSize: 12, color: Colors.textMuted, textAlign: "center" },

  promptPill: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 10,
    marginTop: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
  },
  promptPillText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  chipAccent: { backgroundColor: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.15)" },
  chipText: { fontSize: 11, fontWeight: "600", color: Colors.textMuted },

  previewActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  actionBtnSaved: { backgroundColor: "rgba(52,211,153,0.08)", borderColor: "rgba(52,211,153,0.2)" },
  actionBtnDanger: { backgroundColor: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.15)" },
  actionBtnText: { fontSize: 13, fontWeight: "700" },

  previewPlaceholder: {
    marginHorizontal: 16, marginBottom: 16, height: 220,
    backgroundColor: "rgba(220,38,38,0.03)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden",
  },
  placeholderTitle: { fontSize: 16, fontWeight: "700", color: Colors.textMuted },
  placeholderSub: { fontSize: 12, color: Colors.textMuted, opacity: 0.6, textAlign: "center", paddingHorizontal: 24 },

  // Keypad
  keypad: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: "rgba(220,38,38,0.04)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.1)", overflow: "hidden",
    padding: 16,
  },
  keypadGlow: { position: "absolute", bottom: -40, left: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(220,38,38,0.05)" },
  keypadHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  keypadTitle: { fontSize: 18, fontWeight: "900", color: Colors.text },
  suggestionBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(220,38,38,0.1)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: "rgba(220,38,38,0.2)" },
  suggestionBtnText: { fontSize: 12, fontWeight: "700", color: Colors.accent },

  promptInput: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14,
    padding: 14, color: Colors.text, fontSize: 15, lineHeight: 22,
    minHeight: 100, textAlignVertical: "top",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
    marginBottom: 6,
  },
  charCount: { fontSize: 10, color: Colors.textMuted, alignSelf: "flex-end", marginBottom: 12 },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.2, marginBottom: 8, textTransform: "uppercase" },
  styleRow: { marginBottom: 14 },
  styleChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  styleChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  styleEmoji: { fontSize: 14 },
  styleLabel: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },
  styleLabelActive: { color: "#fff" },

  sizeChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  sizeLabel: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },
  sizeAspect: { fontSize: 10, color: Colors.textMuted, opacity: 0.6, marginTop: 2 },

  qualityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  qualityToggle: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  qualityBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  qualityBtnActive: { backgroundColor: Colors.accent },
  qualityBtnText: { fontSize: 12, fontWeight: "700", color: Colors.textMuted },
  qualityBtnTextActive: { color: "#fff" },

  advancedToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, marginBottom: 4 },
  advancedToggleText: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },
  advancedPanel: { marginBottom: 8 },

  generateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.accent, borderRadius: 16, paddingVertical: 16, marginTop: 8,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 8,
  },
  generateBtnDisabled: { backgroundColor: "rgba(220,38,38,0.3)", shadowOpacity: 0 },
  generateBtnText: { fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },
  generateBtnBadge: { position: "absolute", right: 16 },

  // Gallery
  gallerySection: { marginHorizontal: 16, marginBottom: 20 },
  galleryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  galleryTitle: { fontSize: 18, fontWeight: "800", color: Colors.text },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  thumb: {
    width: (SCREEN_W - 48) / 3,
    height: (SCREEN_W - 48) / 3,
    borderRadius: 12, overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  thumbStar: { position: "absolute", top: 5, right: 5, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6, padding: 3 },
  thumbSaved: { position: "absolute", top: 5, left: 5, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6, padding: 3 },
  thumbStatus: { position: "absolute", bottom: 4, left: 4, right: 4, borderRadius: 6, paddingVertical: 2, alignItems: "center" },
  thumbStatusText: { fontSize: 8, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },

  // Empty
  empty: {
    margin: 16, padding: 48, alignItems: "center",
    backgroundColor: "rgba(220,38,38,0.02)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.06)",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: "center", lineHeight: 20 },
});
