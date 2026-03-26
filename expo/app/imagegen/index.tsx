import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Dimensions, Image, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  View, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sparkles, Send, Download, Star, Trash2, RefreshCw, ChevronDown, ChevronUp, Check, ZoomIn } from "lucide-react-native";
import { useRouter } from "expo-router";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";
import { LobsterWatermark } from "@/components/tweeter/LobsterWatermark";

const { width: SCREEN_W } = Dimensions.get("window");
const THUMB_SIZE = (SCREEN_W - 56) / 3;

const STYLES = [
  { id: "photorealistic", label: "Photo",   emoji: "📷" },
  { id: "anime",          label: "Anime",   emoji: "🎌" },
  { id: "digital-art",    label: "Digital", emoji: "🖥️" },
  { id: "cinematic",      label: "Cinema",  emoji: "🎬" },
  { id: "oil-painting",   label: "Oil",     emoji: "🖌️" },
  { id: "sketch",         label: "Sketch",  emoji: "✏️" },
  { id: "watercolor",     label: "Water",   emoji: "🎨" },
  { id: "3d-render",      label: "3D",      emoji: "🧊" },
];

const SIZES = [
  { id: "512x512",   label: "S 1:1" },
  { id: "1024x1024", label: "HD 1:1" },
  { id: "1024x1792", label: "Portrait" },
  { id: "1792x1024", label: "Wide" },
];

const PROMPTS = [
  "A futuristic red city skyline at dusk with neon lights",
  "A cyberpunk lobster samurai in the rain",
  "A dragon made of red crystals on a volcanic mountain",
  "Deep sea bioluminescent metropolis at night",
  "A lone wolf made of starlight howling at the moon",
  "Ancient library with glowing magical tomes",
];

function statusColor(s: string) {
  if (s === "done" || s === "saved") return Colors.success;
  if (s === "generating" || s === "pending") return Colors.warning;
  if (s === "failed") return Colors.danger;
  return Colors.textMuted;
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

export default function ImageGenScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();

  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [style, setStyle] = useState("photorealistic");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [showAdv, setShowAdv] = useState(false);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("master_api_keys").select("key_value").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setApiKey(data?.key_value ?? null));
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [{ data: imgs }] = await Promise.all([
      supabase.from("generated_images")
        .select("id, prompt, image_url, style, width, height, status, is_saved, is_starred, agent_name, created_at, error_message")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setImages(imgs ?? []);
    if (active) {
      const upd = imgs?.find((i: any) => i.id === active.id);
      if (upd) setActive(upd);
    }
  }, [user, active]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("imagegen-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "generated_images", filter: `user_id=eq.${user.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData, user]);

  // Poll while generating
  useEffect(() => {
    const hasGen = images.some(i => i.status === "generating" || i.status === "pending");
    if (hasGen && !pollRef.current) pollRef.current = setInterval(fetchData, 3000);
    else if (!hasGen && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [images, fetchData]);

  const callAPI = async (action: string, params: any) => {
    if (!apiKey) throw new Error("No API key");
    const r = await fetch(`${SUPABASE_URL}/functions/v1/clawimagen-api`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, params }),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || "API error");
    return d.data;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { Alert.alert("Prompt required", "Describe what you want to generate."); return; }
    setGenerating(true);
    try {
      const data = await callAPI("generate", { prompt: prompt.trim(), negative_prompt: negPrompt || undefined, style, size, quality, agent_name: "Manual" });
      await fetchData();
      const newImg = images.find(i => i.id === data.id) || { ...data, status: "pending", created_at: new Date().toISOString() };
      setActive(newImg);
      setShowGallery(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setGenerating(false); }
  };

  const handleSave = async (img: any) => {
    try { await callAPI("save_image", { image_id: img.id }); fetchData(); }
    catch (e: any) { Alert.alert("Error", e.message); }
  };

  const handleStar = async (img: any) => {
    await callAPI("update_image", { image_id: img.id, is_starred: !img.is_starred });
    fetchData();
  };

  const handleDelete = (img: any) => {
    Alert.alert("Delete", "Remove this image permanently?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await callAPI("delete_image", { image_id: img.id });
        if (active?.id === img.id) setActive(null);
        fetchData();
      }},
    ]);
  };

  const isDone = (img: any) => img?.status === "done" || img?.status === "saved";
  const isGen = (img: any) => img?.status === "generating" || img?.status === "pending";

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView ref={scrollRef} style={st.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={st.redGlow} />
        <LobsterWatermark />

        {/* ── LIVE PREVIEW ── */}
        {active ? (
          <View style={st.previewCard}>
            <View style={st.previewGlow} />

            {/* Status */}
            <View style={st.statusRow}>
              <View style={[st.statusDot, { backgroundColor: statusColor(active.status) }]} />
              <Text style={[st.statusLabel, { color: statusColor(active.status) }]}>{active.status.toUpperCase()}</Text>
              <Text style={st.statusTime}>{timeAgo(active.created_at)} ago</Text>
              <TouchableOpacity style={st.zoomBtn} onPress={() => router.push({ pathname: "/imagegen/image", params: { id: active.id } } as any)}>
                <ZoomIn size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Image area */}
            <View style={[st.imageBox, { height: SCREEN_W - 64 }]}>
              {isDone(active) && active.image_url
                ? <Image source={{ uri: active.image_url }} style={st.previewImg} resizeMode="cover" />
                : isGen(active)
                  ? <View style={st.imageCenter}><ActivityIndicator size="large" color={Colors.accent} /><Text style={st.imageGenText}>Generating...</Text><Text style={st.imageGenPrompt} numberOfLines={2}>{active.prompt}</Text></View>
                  : active.status === "failed"
                    ? <View style={st.imageCenter}><Text style={{ fontSize: 36 }}>❌</Text><Text style={[st.imageGenText, { color: Colors.danger }]}>Failed</Text><Text style={st.imageGenPrompt}>{active.error_message}</Text></View>
                    : <View style={st.imageCenter}><Text style={{ fontSize: 48, opacity: 0.2 }}>🎨</Text></View>
              }
            </View>

            {/* Prompt */}
            <Text style={st.previewPrompt} numberOfLines={2}>{active.prompt}</Text>

            {/* Chips */}
            <View style={st.chipRow}>
              <View style={st.chip}><Text style={st.chipTxt}>{STYLES.find(s => s.id === active.style)?.emoji} {active.style}</Text></View>
              <View style={st.chip}><Text style={st.chipTxt}>{active.width}×{active.height}</Text></View>
              {active.agent_name && <View style={[st.chip, { backgroundColor: "rgba(220,38,38,0.1)", borderColor: "rgba(220,38,38,0.2)" }]}><Text style={[st.chipTxt, { color: Colors.accent }]}>by {active.agent_name}</Text></View>}
            </View>

            {/* Actions */}
            {isDone(active) && (
              <View style={st.actionRow}>
                {!active.is_saved
                  ? <TouchableOpacity style={[st.actionBtn, st.actionSave]} onPress={() => handleSave(active)}><Download size={15} color={Colors.success} /><Text style={[st.actionTxt, { color: Colors.success }]}>Save</Text></TouchableOpacity>
                  : <View style={[st.actionBtn, st.actionSaved]}><Check size={15} color={Colors.success} /><Text style={[st.actionTxt, { color: Colors.success }]}>Saved</Text></View>
                }
                <TouchableOpacity style={[st.actionBtn, st.actionStar]} onPress={() => handleStar(active)}>
                  <Star size={15} color={active.is_starred ? Colors.warning : Colors.textMuted} fill={active.is_starred ? Colors.warning : "none"} />
                  <Text style={[st.actionTxt, { color: active.is_starred ? Colors.warning : Colors.textMuted }]}>{active.is_starred ? "Starred" : "Star"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.actionBtn, st.actionDel]} onPress={() => handleDelete(active)}>
                  <Trash2 size={15} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={st.previewPlaceholder}>
            <Text style={{ fontSize: 56, opacity: 0.15 }}>🎨</Text>
            <Text style={st.placeholderTxt}>No image selected</Text>
            <Text style={st.placeholderSub}>Generate one below or pick from gallery</Text>
          </View>
        )}

        {/* ── KEYPAD ── */}
        <View style={st.keypad}>
          <View style={st.keypadGlow} />

          <View style={st.keypadHeader}>
            <Text style={st.keypadTitle}>⌨️ Prompt <Text style={{ color: Colors.accent }}>Keypad</Text></Text>
            <TouchableOpacity style={st.inspireBtn} onPress={() => setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])}>
              <Sparkles size={13} color={Colors.accent} />
              <Text style={st.inspireTxt}>Inspire</Text>
            </TouchableOpacity>
          </View>

          <TextInput style={st.promptInput} placeholder="Describe what you want to create..." placeholderTextColor={Colors.textMuted} value={prompt} onChangeText={setPrompt} multiline maxLength={2000} />
          <Text style={st.charCount}>{prompt.length}/2000</Text>

          {/* Style */}
          <Text style={st.sectionLabel}>STYLE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
            {STYLES.map(s => (
              <TouchableOpacity key={s.id} style={[st.chip2, style === s.id && st.chip2Active]} onPress={() => setStyle(s.id)}>
                <Text style={st.chip2Emoji}>{s.emoji}</Text>
                <Text style={[st.chip2Txt, style === s.id && { color: "#fff" }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Size */}
          <Text style={st.sectionLabel}>SIZE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
            {SIZES.map(s => (
              <TouchableOpacity key={s.id} style={[st.chip2, size === s.id && st.chip2Active]} onPress={() => setSize(s.id)}>
                <Text style={[st.chip2Txt, size === s.id && { color: "#fff" }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quality */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={st.sectionLabel}>QUALITY</Text>
            <View style={st.qualityToggle}>
              {(["standard", "hd"] as const).map(q => (
                <TouchableOpacity key={q} style={[st.qualityBtn, quality === q && st.qualityBtnActive]} onPress={() => setQuality(q)}>
                  <Text style={[st.qualityTxt, quality === q && { color: "#fff" }]}>{q === "hd" ? "⚡ HD" : "Standard"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Advanced */}
          <TouchableOpacity style={st.advToggle} onPress={() => setShowAdv(!showAdv)}>
            <Text style={st.advToggleTxt}>Negative prompt</Text>
            {showAdv ? <ChevronUp size={13} color={Colors.textMuted} /> : <ChevronDown size={13} color={Colors.textMuted} />}
          </TouchableOpacity>
          {showAdv && (
            <TextInput style={[st.promptInput, { minHeight: 60, marginBottom: 8 }]} placeholder="What to avoid (blurry, low quality...)" placeholderTextColor={Colors.textMuted} value={negPrompt} onChangeText={setNegPrompt} multiline maxLength={500} />
          )}

          {/* Generate button */}
          <TouchableOpacity style={[st.genBtn, (!prompt.trim() || generating) && st.genBtnDisabled]} onPress={handleGenerate} disabled={!prompt.trim() || generating} activeOpacity={0.85}>
            {generating ? <ActivityIndicator size="small" color="#fff" /> : <Send size={17} color="#fff" />}
            <Text style={st.genBtnTxt}>{generating ? "Queueing..." : "Generate Image"}</Text>
            <Sparkles size={14} color="rgba(255,255,255,0.5)" style={{ position: "absolute", right: 16 }} />
          </TouchableOpacity>
        </View>

        {/* ── GALLERY ── */}
        {images.length > 0 && (
          <View style={st.gallerySection}>
            <TouchableOpacity style={st.galleryHeader} onPress={() => setShowGallery(!showGallery)}>
              <Text style={st.galleryTitle}>🖼️ Gallery <Text style={{ color: Colors.textMuted, fontSize: 14 }}>({images.length})</Text></Text>
              {showGallery ? <ChevronUp size={16} color={Colors.textMuted} /> : <ChevronDown size={16} color={Colors.textMuted} />}
            </TouchableOpacity>

            {showGallery ? (
              <View style={st.galleryGrid}>
                {images.map(img => (
                  <TouchableOpacity key={img.id} style={st.thumb} onPress={() => { setActive(img); setShowGallery(false); scrollRef.current?.scrollTo({ y: 0, animated: true }); }} activeOpacity={0.8}>
                    {isDone(img) && img.image_url
                      ? <Image source={{ uri: img.image_url }} style={st.thumbImg} resizeMode="cover" />
                      : <View style={st.thumbPlaceholder}>{isGen(img) ? <ActivityIndicator size="small" color={Colors.accent} /> : <Text style={{ fontSize: 20 }}>🎨</Text>}</View>
                    }
                    {img.is_starred && <View style={st.thumbStar}><Star size={9} color={Colors.warning} fill={Colors.warning} /></View>}
                    <View style={[st.thumbStatus, { backgroundColor: statusColor(img.status) + "33" }]}>
                      <Text style={[st.thumbStatusTxt, { color: statusColor(img.status) }]}>{img.status}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
                {images.slice(0, 8).map(img => (
                  <TouchableOpacity key={img.id} style={[st.thumb, { width: THUMB_SIZE, height: THUMB_SIZE }]} onPress={() => { setActive(img); scrollRef.current?.scrollTo({ y: 0, animated: true }); }} activeOpacity={0.8}>
                    {isDone(img) && img.image_url
                      ? <Image source={{ uri: img.image_url }} style={st.thumbImg} resizeMode="cover" />
                      : <View style={st.thumbPlaceholder}>{isGen(img) ? <ActivityIndicator size="small" color={Colors.accent} /> : <Text>🎨</Text>}</View>
                    }
                    {img.is_starred && <View style={st.thumbStar}><Star size={9} color={Colors.warning} fill={Colors.warning} /></View>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {images.length === 0 && !generating && (
          <View style={st.empty}>
            <Text style={{ fontSize: 48, opacity: 0.2 }}>🎨</Text>
            <Text style={st.emptyTitle}>No images yet</Text>
            <Text style={st.emptySub}>Write a prompt and hit Generate to create your first image.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  redGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 300, backgroundColor: "rgba(220,38,38,0.025)" },

  // Preview
  previewCard: { margin: 16, padding: 14, backgroundColor: "rgba(220,38,38,0.05)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(220,38,38,0.12)", overflow: "hidden" },
  previewGlow: { position: "absolute", top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(220,38,38,0.07)" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5, flex: 1 },
  statusTime: { fontSize: 11, color: Colors.textMuted },
  zoomBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
  imageBox: { width: "100%", borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(220,38,38,0.08)", alignItems: "center", justifyContent: "center" },
  previewImg: { width: "100%", height: "100%" },
  imageCenter: { alignItems: "center", gap: 10, padding: 20 },
  imageGenText: { fontSize: 15, fontWeight: "700", color: Colors.accent },
  imageGenPrompt: { fontSize: 12, color: Colors.textMuted, textAlign: "center" },
  previewPrompt: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  chipTxt: { fontSize: 11, color: Colors.textMuted, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  actionSave: { backgroundColor: "rgba(52,211,153,0.08)", borderColor: "rgba(52,211,153,0.2)" },
  actionSaved: { backgroundColor: "rgba(52,211,153,0.05)", borderColor: "rgba(52,211,153,0.1)" },
  actionStar: { flex: 0.7, backgroundColor: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.2)" },
  actionDel: { flex: 0.4, backgroundColor: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.15)" },
  actionTxt: { fontSize: 13, fontWeight: "700" },

  previewPlaceholder: { margin: 16, height: 200, backgroundColor: "rgba(220,38,38,0.03)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(220,38,38,0.07)", borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 8 },
  placeholderTxt: { fontSize: 15, fontWeight: "700", color: Colors.textMuted },
  placeholderSub: { fontSize: 12, color: Colors.textMuted, opacity: 0.6, textAlign: "center", paddingHorizontal: 24 },

  // Keypad
  keypad: { marginHorizontal: 16, marginBottom: 20, padding: 16, backgroundColor: "rgba(220,38,38,0.04)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(220,38,38,0.1)", overflow: "hidden" },
  keypadGlow: { position: "absolute", bottom: -40, left: -40, width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(220,38,38,0.05)" },
  keypadHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  keypadTitle: { fontSize: 17, fontWeight: "900", color: Colors.text },
  inspireBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(220,38,38,0.1)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: "rgba(220,38,38,0.2)" },
  inspireTxt: { fontSize: 12, fontWeight: "700", color: Colors.accent },
  promptInput: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14, color: Colors.text, fontSize: 15, lineHeight: 22, minHeight: 90, textAlignVertical: "top", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", marginBottom: 6 },
  charCount: { fontSize: 10, color: Colors.textMuted, alignSelf: "flex-end", marginBottom: 12 },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.2, marginBottom: 8, textTransform: "uppercase" },
  chip2: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  chip2Active: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chip2Emoji: { fontSize: 13 },
  chip2Txt: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },
  qualityToggle: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  qualityBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  qualityBtnActive: { backgroundColor: Colors.accent },
  qualityTxt: { fontSize: 12, fontWeight: "700", color: Colors.textMuted },
  advToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, marginBottom: 4 },
  advToggleTxt: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },
  genBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: Colors.accent, borderRadius: 16, paddingVertical: 16, marginTop: 8, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  genBtnDisabled: { backgroundColor: "rgba(220,38,38,0.3)", shadowOpacity: 0 },
  genBtnTxt: { fontSize: 16, fontWeight: "800", color: "#fff" },

  // Gallery
  gallerySection: { marginHorizontal: 16, marginBottom: 20 },
  galleryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  galleryTitle: { fontSize: 17, fontWeight: "800", color: Colors.text },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 12, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  thumbImg: { width: "100%", height: "100%" },
  thumbPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  thumbStar: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 5, padding: 2 },
  thumbStatus: { position: "absolute", bottom: 3, left: 3, right: 3, borderRadius: 5, paddingVertical: 2, alignItems: "center" },
  thumbStatusTxt: { fontSize: 7, fontWeight: "800", textTransform: "uppercase" },

  // Empty
  empty: { margin: 16, padding: 40, alignItems: "center", backgroundColor: "rgba(220,38,38,0.02)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(220,38,38,0.06)" },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: Colors.textSecondary, marginTop: 12 },
  emptySub: { fontSize: 12, color: Colors.textMuted, marginTop: 4, textAlign: "center", lineHeight: 18 },
});
