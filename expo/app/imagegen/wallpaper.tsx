import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View, Alert, StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sparkles, Check, Trash2, ChevronDown, ChevronUp } from "lucide-react-native";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";

const { width: W } = Dimensions.get("window");
const CARD_W = (W - 48) / 2;

const WALLPAPER_STYLES = [
  { id: "abstract",   label: "Abstract",   emoji: "🌀" },
  { id: "cyberpunk",  label: "Cyberpunk",  emoji: "🤖" },
  { id: "nature",     label: "Nature",     emoji: "🌿" },
  { id: "space",      label: "Space",      emoji: "🌌" },
  { id: "dark",       label: "Dark",       emoji: "🖤" },
  { id: "gradient",   label: "Gradient",   emoji: "🎨" },
  { id: "geometric",  label: "Geometric",  emoji: "◼️" },
  { id: "minimal",    label: "Minimal",    emoji: "◻️" },
];

const TOOLKIT_URL = "https://toolkit.rork.com/images/generate/";

const MODELS = [
  { key: "dalle3",       label: "DALL·E 3",     emoji: "🧠", isToolkit: true },
  { key: "flux-schnell", label: "FLUX Schnell", emoji: "⚡", isToolkit: false },
  { key: "flux-dev",     label: "FLUX Dev",     emoji: "🎨", isToolkit: false },
  { key: "playground",   label: "Playground",   emoji: "🎡", isToolkit: false },
];

const QUICK_PROMPTS = [
  "Deep red nebula swirling through dark space",
  "Black and red circuit board pattern glowing neon",
  "Abstract fluid red and black ink in water",
  "Dark volcanic landscape with glowing red lava rivers",
  "A forest at midnight with red aurora borealis",
  "Geometric red crystal formations in darkness",
  "Deep ocean bioluminescent red coral reef",
  "Minimal red gradient from dark to light",
];

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  return m < 1 ? "now" : m < 60 ? `${m}m` : `${Math.floor(m/60)}h`;
}

export default function WallpaperScreen() {
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const st = createStStyles(colors);
  const _insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [prompt, setPrompt]   = useState("");
  const [style, setStyle]     = useState("abstract");
  const [model, setModel]     = useState("dalle3");
  const [generating, setGen]  = useState(false);
  const [wallpapers, setWps]  = useState<any[]>([]);
  const [activeWp, setActiveWp] = useState<any>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [apiKey, setApiKey]   = useState<string|null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("master_api_keys").select("key_value").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setApiKey(data?.key_value ?? null));
  }, [user]);

  const fetchWallpapers = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("ai_wallpapers")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
    setWps(data ?? []);
    const active = data?.find((w: any) => w.is_active);
    if (active) setActiveWp(active);
  }, [user]);

  useEffect(() => { void fetchWallpapers(); }, [fetchWallpapers]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("wallpapers-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_wallpapers", filter: `user_id=eq.${user.id}` }, () => void fetchWallpapers())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, fetchWallpapers]);

  useEffect(() => {
    const hasGen = wallpapers.some(w => w.status === "generating");
    if (hasGen && !pollRef.current) pollRef.current = setInterval(fetchWallpapers, 3500);
    else if (!hasGen && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [wallpapers, fetchWallpapers]);

  const callApi = async (action: string, params: any) => {
    if (!apiKey) throw new Error("No API key");
    const r = await globalThis.fetch(`${SUPABASE_URL}/functions/v1/clawimagen-api`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, params }),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || "API error");
    return d.data;
  };

  const generateWithToolkit = async () => {
    console.log("[wallpaper] generating with DALL·E 3 toolkit");
    const fullPrompt = `${style} wallpaper for mobile phone: ${prompt.trim()}`;
    const resp = await globalThis.fetch(TOOLKIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: fullPrompt, size: "1024x1792" }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "Unknown error");
      throw new Error(`Toolkit error: ${errText}`);
    }
    const result = await resp.json();
    console.log("[wallpaper] toolkit result received");
    if (apiKey) {
      try {
        await callApi("save_toolkit_wallpaper", {
          prompt: prompt.trim(),
          style,
          model: "dalle3",
          base64: result.image.base64Data,
          mime_type: result.image.mimeType,
        });
      } catch (saveErr) {
        console.log("[wallpaper] save to gallery failed", saveErr);
      }
    }
  };

  const generate = async () => {
    if (!prompt.trim()) { Alert.alert("Enter a prompt"); return; }
    setGen(true);
    try {
      const selectedModel = MODELS.find(m => m.key === model);
      if (selectedModel?.isToolkit) {
        await generateWithToolkit();
      } else {
        await callApi("generate_wallpaper", { prompt: prompt.trim(), style, model });
      }
      await fetchWallpapers();
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setGen(false); }
  };

  const applyWallpaper = async (wp: any) => {
    try {
      await callApi("set_wallpaper", { wallpaper_id: wp.id });
      setActiveWp(wp);
      await fetchWallpapers();
      Alert.alert("✅ Wallpaper Applied", "Your home screen background has been updated.");
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const deleteWallpaper = (wp: any) => {
    Alert.alert("Delete Wallpaper?", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await callApi("delete_wallpaper", { wallpaper_id: wp.id });
        if (activeWp?.id === wp.id) setActiveWp(null);
        void fetchWallpapers();
      }},
    ]);
  };

  const currentModel = MODELS.find(m => m.key === model) ?? MODELS[0];

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" />
      <View style={st.glow} />

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[st.header, { paddingTop: 8 }]}>
          <View>
            <Text style={st.title}>🖼️ AI <Text style={{ color: "#C084FC" }}>Wallpapers</Text></Text>
            <Text style={st.subtitle}>Generate custom home screen backgrounds</Text>
          </View>
        </View>

        {/* Current wallpaper preview */}
        {activeWp && (
          <View style={st.activeCard}>
            <View style={st.activeGlow} />
            <Text style={st.activeLabel}>✅ ACTIVE WALLPAPER</Text>
            {activeWp.image_url && (
              <Image source={{ uri: activeWp.image_url }} style={st.activeImg} resizeMode="cover" />
            )}
            <Text style={st.activePrompt} numberOfLines={2}>{activeWp.prompt}</Text>
            <View style={st.activeChips}>
              <View style={st.chip}><Text style={st.chipTxt}>{WALLPAPER_STYLES.find(s => s.id === activeWp.style)?.emoji} {activeWp.style}</Text></View>
            </View>
          </View>
        )}

        {/* Generator */}
        <View style={st.genCard}>
          <View style={st.genGlow} />
          <Text style={st.genTitle}>✨ Generate <Text style={{ color: "#C084FC" }}>Wallpaper</Text></Text>

          {/* Quick prompts */}
          <Text style={st.secLabel}>QUICK IDEAS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 1 }}>
            {QUICK_PROMPTS.map((p, i) => (
              <TouchableOpacity key={i} style={st.quickChip} onPress={() => setPrompt(p)}>
                <Text style={st.quickChipTxt} numberOfLines={1}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={st.promptIn}
            placeholder="Describe your perfect wallpaper..."
            placeholderTextColor={colors.textMuted}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            maxLength={1000}
          />
          <Text style={st.charCount}>{prompt.length}/1000</Text>

          {/* Style */}
          <Text style={st.secLabel}>STYLE</Text>
          <View style={st.styleGrid}>
            {WALLPAPER_STYLES.map(s => (
              <TouchableOpacity key={s.id} style={[st.styleChip, style === s.id && st.styleChipOn]} onPress={() => setStyle(s.id)}>
                <Text style={{ fontSize: 18 }}>{s.emoji}</Text>
                <Text style={[st.styleChipTxt, style === s.id && { color: "#C084FC" }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Model */}
          <Text style={[st.secLabel, { marginTop: 14 }]}>AI MODEL</Text>
          <TouchableOpacity style={st.modelRow} onPress={() => setShowModelPicker(!showModelPicker)}>
            <Text style={{ fontSize: 18 }}>{currentModel.emoji}</Text>
            <Text style={st.modelName}>{currentModel.label}</Text>
            {showModelPicker ? <ChevronUp size={15} color={colors.textMuted} /> : <ChevronDown size={15} color={colors.textMuted} />}
          </TouchableOpacity>
          {showModelPicker && (
            <View style={st.modelDrop}>
              {MODELS.map(m => (
                <TouchableOpacity key={m.key} style={[st.modelOpt, model === m.key && st.modelOptOn]} onPress={() => { setModel(m.key); setShowModelPicker(false); }}>
                  <Text style={{ fontSize: 16 }}>{m.emoji}</Text>
                  <Text style={[st.modelOptTxt, model === m.key && { color: "#C084FC" }]}>{m.label}</Text>
                  {model === m.key && <Check size={13} color="#C084FC" />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={[st.genBtn, (!prompt.trim() || generating) && st.genBtnOff]} onPress={generate} disabled={!prompt.trim() || generating} activeOpacity={0.85}>
            {generating ? <ActivityIndicator size="small" color="#fff" /> : <Sparkles size={16} color="#fff" />}
            <Text style={st.genBtnTxt}>{generating ? "Generating wallpaper..." : "Generate Wallpaper"}</Text>
          </TouchableOpacity>
        </View>

        {/* Wallpaper gallery */}
        {wallpapers.length > 0 && (
          <View style={st.gallerySection}>
            <Text style={st.galleryTitle}>🎨 Your Wallpapers <Text style={{ color: colors.textMuted, fontSize: 13 }}>({wallpapers.length})</Text></Text>
            <View style={st.galleryGrid}>
              {wallpapers.map(wp => {
                const isDone = wp.status === "done" || wp.status === "saved";
                const isGen  = wp.status === "generating";
                const isCurr = wp.id === activeWp?.id;
                return (
                  <View key={wp.id} style={[st.wpCard, isCurr && st.wpCardActive]}>
                    {/* Image */}
                    <View style={st.wpImgBox}>
                      {isDone && wp.image_url
                        ? <Image source={{ uri: wp.image_url }} style={st.wpImg} resizeMode="cover" />
                        : isGen
                          ? <View style={st.wpCenter}><ActivityIndicator size="small" color="#C084FC" /><Text style={st.wpGenTxt}>Generating...</Text></View>
                          : wp.status === "failed"
                            ? <View style={st.wpCenter}><Text style={{ fontSize: 24 }}>❌</Text></View>
                            : <View style={st.wpCenter}><Text style={{ fontSize: 28, opacity: 0.2 }}>🖼️</Text></View>
                      }
                      {isCurr && <View style={st.wpActiveBadge}><Text style={st.wpActiveBadgeTxt}>ACTIVE</Text></View>}
                    </View>

                    <Text style={st.wpPrompt} numberOfLines={2}>{wp.prompt}</Text>
                    <Text style={st.wpMeta}>{WALLPAPER_STYLES.find(s => s.id === wp.style)?.emoji} {wp.style} · {timeAgo(wp.created_at)}</Text>

                    {isDone && (
                      <View style={st.wpActions}>
                        {!isCurr && (
                          <TouchableOpacity style={[st.wpBtn, st.wpBtnApply]} onPress={() => applyWallpaper(wp)}>
                            <Text style={st.wpBtnTxt}>✅ Apply</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[st.wpBtn, st.wpBtnDel]} onPress={() => deleteWallpaper(wp)}>
                          <Trash2 size={13} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 300, backgroundColor: "rgba(147,51,234,0.03)" },
  header: { paddingHorizontal: 16, paddingBottom: 14 },
  title: { fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  activeCard: { marginHorizontal: 16, marginBottom: 14, padding: 14, backgroundColor: "rgba(147,51,234,0.07)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(147,51,234,0.2)", overflow: "hidden" },
  activeGlow: { position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(147,51,234,0.1)" },
  activeLabel: { fontSize: 9, fontWeight: "800", color: "#C084FC", letterSpacing: 1.5, marginBottom: 10 },
  activeImg: { width: "100%", height: 180, borderRadius: 12, marginBottom: 10 },
  activePrompt: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  activeChips: { flexDirection: "row", gap: 6, marginTop: 8 },
  chip: { backgroundColor: colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  chipTxt: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  genCard: { marginHorizontal: 16, marginBottom: 20, padding: 16, backgroundColor: "rgba(147,51,234,0.05)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(147,51,234,0.12)", overflow: "hidden" },
  genGlow: { position: "absolute", bottom: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(147,51,234,0.06)" },
  genTitle: { fontSize: 18, fontWeight: "900", color: colors.text, marginBottom: 14 },
  secLabel: { fontSize: 10, fontWeight: "700", color: colors.textMuted, letterSpacing: 1.2, marginBottom: 8, textTransform: "uppercase" },
  quickChip: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", maxWidth: 200 },
  quickChipTxt: { fontSize: 12, color: colors.textSecondary },
  promptIn: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, color: colors.text, fontSize: 15, lineHeight: 22, minHeight: 88, textAlignVertical: "top", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", marginBottom: 6 },
  charCount: { fontSize: 10, color: colors.textMuted, alignSelf: "flex-end", marginBottom: 12 },
  styleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  styleChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  styleChipOn: { backgroundColor: "rgba(147,51,234,0.15)", borderColor: "rgba(147,51,234,0.4)" },
  styleChipTxt: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  modelRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  modelName: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
  modelDrop: { backgroundColor: "rgba(10,10,10,0.97)", borderRadius: 14, marginBottom: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  modelOpt: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  modelOptOn: { backgroundColor: "rgba(147,51,234,0.1)" },
  modelOptTxt: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
  genBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#7C3AED", borderRadius: 16, paddingVertical: 16, marginTop: 14, shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  genBtnOff: { backgroundColor: "rgba(124,58,237,0.3)", shadowOpacity: 0 },
  genBtnTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },
  gallerySection: { marginHorizontal: 16 },
  galleryTitle: { fontSize: 17, fontWeight: "800", color: colors.text, marginBottom: 14 },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  wpCard: { width: CARD_W, backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  wpCardActive: { borderColor: "#C084FC", backgroundColor: "rgba(147,51,234,0.08)" },
  wpImgBox: { width: "100%", height: CARD_W * 1.6, backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", justifyContent: "center" },
  wpImg: { width: "100%", height: "100%" },
  wpCenter: { alignItems: "center", gap: 6 },
  wpGenTxt: { fontSize: 11, color: "#C084FC", fontWeight: "600" },
  wpActiveBadge: { position: "absolute", top: 6, left: 6, backgroundColor: "#7C3AED", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  wpActiveBadgeTxt: { fontSize: 8, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  wpPrompt: { fontSize: 12, color: colors.textSecondary, padding: 8, lineHeight: 16 },
  wpMeta: { fontSize: 10, color: colors.textMuted, paddingHorizontal: 8, paddingBottom: 8 },
  wpActions: { flexDirection: "row", gap: 6, padding: 8, paddingTop: 0 },
  wpBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  wpBtnApply: { backgroundColor: "rgba(147,51,234,0.15)", borderColor: "rgba(147,51,234,0.3)" },
  wpBtnDel: { flex: 0, width: 36, backgroundColor: "rgba(248,113,113,0.07)", borderColor: "rgba(248,113,113,0.15)" },
  wpBtnTxt: { fontSize: 12, fontWeight: "700", color: "#C084FC" },
});
