import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Dimensions, Image, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sparkles, Send, Download, Star, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react-native";
import { useRouter } from "expo-router";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";
import { LobsterWatermark } from "@/components/tweeter/LobsterWatermark";

const { width: W } = Dimensions.get("window");
const THUMB = (W - 56) / 3;

const TOOLKIT_URL = "https://toolkit.rork.com/images/generate/";

const MODELS = [
  { key: "dalle3",        label: "DALL·E 3",     tag: "Best · Toolkit", emoji: "🧠", isToolkit: true },
  { key: "flux-schnell",  label: "FLUX Schnell", tag: "Fast · Free",    emoji: "⚡", isToolkit: false },
  { key: "flux-dev",      label: "FLUX Dev",     tag: "Quality · Free", emoji: "🎨", isToolkit: false },
  { key: "flux-pro",      label: "FLUX Pro",     tag: "Best · Paid",    emoji: "💎", isToolkit: false },
  { key: "sdxl",          label: "SDXL",         tag: "Classic · Free", emoji: "🖼️", isToolkit: false },
  { key: "playground",    label: "Playground",   tag: "Aesthetic · Free",emoji: "🎡", isToolkit: false },
];

const STYLES = [
  { id: "photorealistic", label: "Photo",    emoji: "📷" },
  { id: "anime",          label: "Anime",    emoji: "🎌" },
  { id: "digital-art",    label: "Digital",  emoji: "🖥️" },
  { id: "cinematic",      label: "Cinema",   emoji: "🎬" },
  { id: "cyberpunk",      label: "Cyberpunk",emoji: "🤖" },
  { id: "fantasy",        label: "Fantasy",  emoji: "✨" },
  { id: "oil-painting",   label: "Oil",      emoji: "🖌️" },
  { id: "sketch",         label: "Sketch",   emoji: "✏️" },
  { id: "watercolor",     label: "Water",    emoji: "🎨" },
  { id: "3d-render",      label: "3D",       emoji: "🧊" },
  { id: "abstract",       label: "Abstract", emoji: "🌀" },
  { id: "minimalist",     label: "Minimal",  emoji: "◻️" },
];

const SIZES = [
  { id: "512x512",   label: "S 1:1" },
  { id: "1024x1024", label: "HD 1:1" },
  { id: "1024x1792", label: "Portrait" },
  { id: "1792x1024", label: "Wide" },
];

const PROMPTS = [
  "A cyberpunk lobster samurai in neon rain",
  "Deep red volcanic mountain at dusk",
  "Bioluminescent ocean city at night",
  "A wolf made of red starlight",
  "Ancient library with glowing magical tomes",
  "A dragon made of molten red crystals",
];

function statusColor(colors: any, s: string) {
  if (s === "done" || s === "saved") return colors.success;
  if (s === "generating") return colors.warning;
  if (s === "failed") return colors.danger;
  return colors.textMuted;
}
function ago(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  return m < 1 ? "now" : m < 60 ? `${m}m` : `${Math.floor(m/60)}h`;
}

export default function ImageGenScreen() {
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const st = createStStyles(colors);
  const _insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();

  const [prompt, setPrompt]         = useState("");
  const [negPrompt, setNegPrompt]   = useState("");
  const [style, setStyle]           = useState("photorealistic");
  const [size, setSize]             = useState("1024x1024");
  const [quality, setQuality]       = useState<"standard"|"hd">("standard");
  const [model, setModel]           = useState("dalle3");
  const [showAdv, setShowAdv]       = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const [apiKey, setApiKey]         = useState<string|null>(null);
  const [generating, setGenerating] = useState(false);
  const [images, setImages]         = useState<any[]>([]);
  const [active, setActive]         = useState<any>(null);
  const [showGallery, setShowGallery] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("master_api_keys").select("key_value").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setApiKey(data?.key_value ?? null));
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("generated_images")
      .select("id,prompt,image_url,style,width,height,status,is_saved,is_starred,openrouter_model,agent_name,created_at,error_message")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setImages(data ?? []);
    if (active) { const u = data?.find((i: any) => i.id === active.id); if (u) setActive(u); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, active?.id]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("imagegen-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "generated_images", filter: `user_id=eq.${user.id}` }, fetchData)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, fetchData]);

  useEffect(() => {
    const hasGen = images.some(i => i.status === "generating" || i.status === "pending");
    if (hasGen && !pollRef.current) pollRef.current = setInterval(fetchData, 4000);
    else if (!hasGen && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [images, fetchData]);

  const call = async (action: string, params: any) => {
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

  const generateWithToolkit = async (): Promise<any> => {
    console.log("[imagegen] generating with DALL·E 3 toolkit");
    const fullPrompt = `${style} style: ${prompt.trim()}${negPrompt ? `. Avoid: ${negPrompt}` : ""}`;
    const resp = await fetch(TOOLKIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: fullPrompt, size }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "Unknown error");
      throw new Error(`Toolkit error: ${errText}`);
    }
    const result = await resp.json();
    console.log("[imagegen] toolkit result received, size:", result.size);
    const base64Uri = `data:${result.image.mimeType};base64,${result.image.base64Data}`;

    if (user && apiKey) {
      try {
        const saveResp = await call("save_toolkit_image", {
          prompt: prompt.trim(),
          style,
          size,
          quality,
          model: "dalle3",
          base64: result.image.base64Data,
          mime_type: result.image.mimeType,
          agent_name: "Manual",
        });
        console.log("[imagegen] saved toolkit image to gallery", saveResp?.id);
        return saveResp;
      } catch (saveErr) {
        console.log("[imagegen] save to gallery failed, showing inline", saveErr);
      }
    }
    return {
      id: `toolkit-${Date.now()}`,
      prompt: prompt.trim(),
      image_url: base64Uri,
      style,
      width: parseInt(size.split("x")[0]),
      height: parseInt(size.split("x")[1]),
      status: "done",
      is_saved: false,
      is_starred: false,
      openrouter_model: "dall-e-3",
      agent_name: "Manual",
      created_at: new Date().toISOString(),
    };
  };

  const generate = async () => {
    if (!prompt.trim()) { Alert.alert("Prompt required"); return; }
    setGenerating(true);
    try {
      const selectedModel = MODELS.find(m => m.key === model);
      let data: any;
      if (selectedModel?.isToolkit) {
        data = await generateWithToolkit();
        await fetchData();
      } else {
        data = await call("generate", { prompt: prompt.trim(), negative_prompt: negPrompt || undefined, style, size, quality, model, agent_name: "Manual" });
        await fetchData();
      }
      setActive(data);
      setShowGallery(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setGenerating(false); }
  };

  const isDone = (img: any) => img?.status === "done" || img?.status === "saved";
  const isGen  = (img: any) => img?.status === "generating" || img?.status === "pending";

  const activeModel = MODELS.find(m => m.key === model) ?? MODELS[0];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView ref={scrollRef} style={st.root} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={st.glow} /><LobsterWatermark />

        {/* Wallpaper button */}
        <View style={st.topRow}>
          <Text style={st.title}>🎨 <Text style={{ color: colors.accent }}>ImageGen</Text></Text>
          <TouchableOpacity style={st.wallpaperBtn} onPress={() => router.push("/imagegen/wallpaper" as any)}>
            <Text style={{ fontSize: 16 }}>🖼️</Text>
            <Text style={st.wallpaperBtnTxt}>AI Wallpapers</Text>
          </TouchableOpacity>
        </View>

        {/* Live preview */}
        {active ? (
          <View style={st.preview}>
            <View style={st.previewGlow} />
            <View style={st.statusRow}>
              <View style={[st.dot, { backgroundColor: statusColor(colors, active.status) }]} />
              <Text style={[st.statusTxt, { color: statusColor(colors, active.status) }]}>{active.status.toUpperCase()}</Text>
              <Text style={st.timeTxt}>{ago(active.created_at)} ago</Text>
              {active.openrouter_model && <Text style={st.modelTag} numberOfLines={1}>via {active.openrouter_model?.split("/").pop()?.split(":")[0] ?? "AI"}</Text>}
              <TouchableOpacity style={st.zoomBtn} onPress={() => router.push({ pathname: "/imagegen/image", params: { id: active.id } } as any)}>
                <Text style={{ fontSize: 13 }}>🔍</Text>
              </TouchableOpacity>
            </View>
            <View style={[st.imgBox, { height: W - 64 }]}>
              {isDone(active) && active.image_url
                ? <Image source={{ uri: active.image_url }} style={st.img} resizeMode="cover" />
                : isGen(active)
                  ? <View style={st.imgCenter}><ActivityIndicator size="large" color={colors.accent} /><Text style={st.genTxt}>Generating with {activeModel.emoji} {activeModel.label}...</Text><Text style={st.genPrompt} numberOfLines={2}>{active.prompt}</Text></View>
                  : active.status === "failed"
                    ? <View style={st.imgCenter}><Text style={{ fontSize: 36 }}>❌</Text><Text style={[st.genTxt, { color: colors.danger }]}>Failed</Text><Text style={st.genPrompt}>{active.error_message}</Text></View>
                    : <View style={st.imgCenter}><Text style={{ fontSize: 48, opacity: 0.15 }}>🎨</Text></View>
              }
            </View>
            <Text style={st.promptPrev} numberOfLines={2}>{active.prompt}</Text>
            <View style={st.chipRow}>
              <View style={st.chip}><Text style={st.chipTxt}>{STYLES.find(s => s.id === active.style)?.emoji} {active.style}</Text></View>
              <View style={st.chip}><Text style={st.chipTxt}>{active.width}×{active.height}</Text></View>
            </View>
            {isDone(active) && (
              <View style={st.actRow}>
                {!active.is_saved
                  ? <TouchableOpacity style={[st.act, st.actSave]} onPress={async () => { await call("save_image", { image_id: active.id }); void fetchData(); }}><Download size={14} color={colors.success} /><Text style={[st.actTxt, { color: colors.success }]}>Save</Text></TouchableOpacity>
                  : <View style={[st.act, st.actSaved]}><Check size={14} color={colors.success} /><Text style={[st.actTxt, { color: colors.success }]}>Saved</Text></View>
                }
                <TouchableOpacity style={[st.act, st.actStar]} onPress={async () => { await call("update_image", { image_id: active.id, is_starred: !active.is_starred }); void fetchData(); }}>
                  <Star size={14} color={active.is_starred ? colors.warning : colors.textMuted} fill={active.is_starred ? colors.warning : "none"} />
                </TouchableOpacity>
                <TouchableOpacity style={[st.act, st.actDel]} onPress={() => Alert.alert("Delete?", "", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await call("delete_image", { image_id: active.id }); setActive(null); void fetchData(); } }])}>
                  <Trash2 size={14} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={st.emptyPreview}>
            <Text style={{ fontSize: 52, opacity: 0.12 }}>🎨</Text>
            <Text style={st.emptyTxt}>No image selected</Text>
            <Text style={st.emptySub}>Generate one below or pick from gallery</Text>
          </View>
        )}

        {/* Keypad */}
        <View style={st.keypad}>
          <View style={st.keypadGlow} />
          <View style={st.keypadHead}>
            <Text style={st.keypadTitle}>⌨️ Prompt <Text style={{ color: colors.accent }}>Keypad</Text></Text>
            <TouchableOpacity style={st.inspireBtn} onPress={() => setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])}>
              <Sparkles size={12} color={colors.accent} />
              <Text style={st.inspireTxt}>Inspire</Text>
            </TouchableOpacity>
          </View>

          <TextInput style={st.promptIn} placeholder="Describe your image..." placeholderTextColor={colors.textMuted} value={prompt} onChangeText={setPrompt} multiline maxLength={2000} />
          <Text style={st.charCount}>{prompt.length}/2000</Text>

          {/* Model picker */}
          <Text style={st.secLabel}>AI MODEL</Text>
          <TouchableOpacity style={st.modelRow} onPress={() => setShowModelPicker(!showModelPicker)}>
            <View style={st.modelLeft}>
              <Text style={{ fontSize: 20 }}>{activeModel.emoji}</Text>
              <View>
                <Text style={st.modelName}>{activeModel.label}</Text>
                <Text style={st.modelTag2}>{activeModel.tag}</Text>
              </View>
            </View>
            {showModelPicker ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />}
          </TouchableOpacity>
          {showModelPicker && (
            <View style={st.modelDrop}>
              {MODELS.map(m => (
                <TouchableOpacity key={m.key} style={[st.modelOption, model === m.key && st.modelOptionActive]} onPress={() => { setModel(m.key); setShowModelPicker(false); }}>
                  <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.modelOptionName, model === m.key && { color: colors.accent }]}>{m.label}</Text>
                    <Text style={st.modelOptionTag}>{m.tag}</Text>
                  </View>
                  {model === m.key && <Check size={14} color={colors.accent} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Style */}
          <Text style={[st.secLabel, { marginTop: 14 }]}>STYLE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 7, paddingHorizontal: 1 }}>
            {STYLES.map(s => (
              <TouchableOpacity key={s.id} style={[st.chip2, style === s.id && st.chip2On]} onPress={() => setStyle(s.id)}>
                <Text style={{ fontSize: 12 }}>{s.emoji}</Text>
                <Text style={[st.chip2Txt, style === s.id && { color: "#fff" }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Size */}
          <Text style={st.secLabel}>SIZE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 7, paddingHorizontal: 1 }}>
            {SIZES.map(s => (
              <TouchableOpacity key={s.id} style={[st.chip2, size === s.id && st.chip2On]} onPress={() => setSize(s.id)}>
                <Text style={[st.chip2Txt, size === s.id && { color: "#fff" }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quality */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={st.secLabel}>QUALITY</Text>
            <View style={st.qToggle}>
              {(["standard","hd"] as const).map(q => (
                <TouchableOpacity key={q} style={[st.qBtn, quality === q && st.qBtnOn]} onPress={() => setQuality(q)}>
                  <Text style={[st.qTxt, quality === q && { color: "#fff" }]}>{q === "hd" ? "⚡ HD" : "Standard"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Advanced */}
          <TouchableOpacity style={st.advToggle} onPress={() => setShowAdv(!showAdv)}>
            <Text style={st.advTxt}>Negative prompt</Text>
            {showAdv ? <ChevronUp size={13} color={colors.textMuted} /> : <ChevronDown size={13} color={colors.textMuted} />}
          </TouchableOpacity>
          {showAdv && <TextInput style={[st.promptIn, { minHeight: 60, marginBottom: 8 }]} placeholder="What to avoid..." placeholderTextColor={colors.textMuted} value={negPrompt} onChangeText={setNegPrompt} multiline maxLength={500} />}

          <TouchableOpacity style={[st.genBtn, (!prompt.trim() || generating) && st.genBtnOff]} onPress={generate} disabled={!prompt.trim() || generating} activeOpacity={0.85}>
            {generating ? <ActivityIndicator size="small" color="#fff" /> : <Send size={16} color="#fff" />}
            <Text style={st.genBtnTxt}>{generating ? `Generating with ${activeModel.label}...` : `Generate · ${activeModel.emoji} ${activeModel.label}`}</Text>
          </TouchableOpacity>
        </View>

        {/* Gallery */}
        {images.length > 0 && (
          <View style={st.gallery}>
            <TouchableOpacity style={st.galleryHead} onPress={() => setShowGallery(!showGallery)}>
              <Text style={st.galleryTitle}>🖼️ Gallery <Text style={{ color: colors.textMuted, fontSize: 13 }}>({images.length})</Text></Text>
              {showGallery ? <ChevronUp size={15} color={colors.textMuted} /> : <ChevronDown size={15} color={colors.textMuted} />}
            </TouchableOpacity>
            {showGallery ? (
              <View style={st.galleryGrid}>
                {images.map(img => (
                  <TouchableOpacity key={img.id} style={st.thumb} onPress={() => { setActive(img); setShowGallery(false); scrollRef.current?.scrollTo({ y: 0, animated: true }); }} activeOpacity={0.8}>
                    {isDone(img) && img.image_url ? <Image source={{ uri: img.image_url }} style={st.thumbImg} resizeMode="cover" /> : <View style={st.thumbPh}>{isGen(img) ? <ActivityIndicator size="small" color={colors.accent} /> : <Text>🎨</Text>}</View>}
                    {img.is_starred && <View style={st.thumbStar}><Star size={9} color={colors.warning} fill={colors.warning} /></View>}
                    <View style={[st.thumbStatus, { backgroundColor: statusColor(colors, img.status) + "33" }]}><Text style={[st.thumbStatusTxt, { color: statusColor(colors, img.status) }]}>{img.status}</Text></View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 1 }}>
                {images.slice(0, 8).map(img => (
                  <TouchableOpacity key={img.id} style={[st.thumb, { width: THUMB, height: THUMB }]} onPress={() => { setActive(img); scrollRef.current?.scrollTo({ y: 0, animated: true }); }} activeOpacity={0.8}>
                    {isDone(img) && img.image_url ? <Image source={{ uri: img.image_url }} style={st.thumbImg} resizeMode="cover" /> : <View style={st.thumbPh}>{isGen(img) ? <ActivityIndicator size="small" color={colors.accent} /> : <Text>🎨</Text>}</View>}
                    {img.is_starred && <View style={st.thumbStar}><Star size={9} color={colors.warning} fill={colors.warning} /></View>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 260, backgroundColor: "rgba(220,38,38,0.025)" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, marginBottom: 14 },
  title: { fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: -0.8 },
  wallpaperBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(147,51,234,0.15)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: "rgba(147,51,234,0.3)" },
  wallpaperBtnTxt: { fontSize: 12, fontWeight: "700", color: "#C084FC" },
  preview: { marginHorizontal: 16, marginBottom: 14, padding: 14, backgroundColor: "rgba(220,38,38,0.05)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(220,38,38,0.12)", overflow: "hidden" },
  previewGlow: { position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(220,38,38,0.07)" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusTxt: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  timeTxt: { fontSize: 11, color: colors.textMuted, flex: 1 },
  modelTag: { fontSize: 10, color: colors.textMuted, backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  zoomBtn: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center" },
  imgBox: { width: "100%", borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", justifyContent: "center" },
  img: { width: "100%", height: "100%" },
  imgCenter: { alignItems: "center", gap: 10, padding: 20 },
  genTxt: { fontSize: 14, fontWeight: "700", color: colors.accent, textAlign: "center" },
  genPrompt: { fontSize: 12, color: colors.textMuted, textAlign: "center" },
  promptPrev: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  chipTxt: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  actRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  act: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  actSave: { backgroundColor: "rgba(52,211,153,0.08)", borderColor: "rgba(52,211,153,0.2)" },
  actSaved: { backgroundColor: "rgba(52,211,153,0.05)", borderColor: "rgba(52,211,153,0.1)" },
  actStar: { flex: 0.5, backgroundColor: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.2)" },
  actDel:  { flex: 0.5, backgroundColor: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.15)" },
  actTxt: { fontSize: 13, fontWeight: "700" },
  emptyPreview: { marginHorizontal: 16, height: 180, backgroundColor: "rgba(220,38,38,0.02)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(220,38,38,0.07)", borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 },
  emptyTxt: { fontSize: 15, fontWeight: "700", color: colors.textMuted },
  emptySub: { fontSize: 12, color: colors.textMuted, opacity: 0.6, textAlign: "center", paddingHorizontal: 24 },
  keypad: { marginHorizontal: 16, marginBottom: 20, padding: 16, backgroundColor: "rgba(220,38,38,0.04)", borderRadius: 20, borderWidth: 1, borderColor: colors.accentDim, overflow: "hidden" },
  keypadGlow: { position: "absolute", bottom: -40, left: -40, width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(220,38,38,0.05)" },
  keypadHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  keypadTitle: { fontSize: 17, fontWeight: "900", color: colors.text },
  inspireBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.accentDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: "rgba(220,38,38,0.2)" },
  inspireTxt: { fontSize: 12, fontWeight: "700", color: colors.accent },
  promptIn: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, color: colors.text, fontSize: 15, lineHeight: 22, minHeight: 88, textAlignVertical: "top", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", marginBottom: 6 },
  charCount: { fontSize: 10, color: colors.textMuted, alignSelf: "flex-end", marginBottom: 12 },
  secLabel: { fontSize: 10, fontWeight: "700", color: colors.textMuted, letterSpacing: 1.2, marginBottom: 8, textTransform: "uppercase" },
  modelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  modelLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  modelName: { fontSize: 14, fontWeight: "700", color: colors.text },
  modelTag2: { fontSize: 11, color: colors.textMuted },
  modelDrop: { backgroundColor: "rgba(10,10,10,0.97)", borderRadius: 14, marginBottom: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  modelOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  modelOptionActive: { backgroundColor: "rgba(220,38,38,0.08)" },
  modelOptionName: { fontSize: 14, fontWeight: "600", color: colors.text },
  modelOptionTag: { fontSize: 11, color: colors.textMuted },
  chip2: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  chip2On: { backgroundColor: colors.accent, borderColor: colors.accent },
  chip2Txt: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  qToggle: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  qBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  qBtnOn: { backgroundColor: colors.accent },
  qTxt: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  advToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, marginBottom: 4 },
  advTxt: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  genBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 16, marginTop: 8, shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  genBtnOff: { backgroundColor: "rgba(220,38,38,0.3)", shadowOpacity: 0 },
  genBtnTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },
  gallery: { marginHorizontal: 16, marginBottom: 20 },
  galleryHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  galleryTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: THUMB, height: THUMB, borderRadius: 12, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceLight },
  thumbImg: { width: "100%", height: "100%" },
  thumbPh: { flex: 1, alignItems: "center", justifyContent: "center" },
  thumbStar: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 5, padding: 2 },
  thumbStatus: { position: "absolute", bottom: 3, left: 3, right: 3, borderRadius: 5, paddingVertical: 2, alignItems: "center" },
  thumbStatusTxt: { fontSize: 7, fontWeight: "800", textTransform: "uppercase" },
});
