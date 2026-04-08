import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, RefreshControl, Platform,
  TouchableOpacity, Animated, PanResponder, Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Flame, Smile, Briefcase, Sparkles, Eye,
  RotateCcw, Save, Volume2, Zap,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";
import { LobsterWatermark } from "@/components/tweeter/LobsterWatermark";

const SCREEN_W = Dimensions.get("window").width;

interface SliderConfig {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  min: string;
  max: string;
  defaultValue: number;
}

const SLIDERS: SliderConfig[] = [
  { id: "aggression", label: "Aggression", icon: Flame, color: colors.accentBright, min: "Gentle", max: "Savage", defaultValue: 0.3 },
  { id: "humor", label: "Humor", icon: Smile, color: "#FBBF24", min: "Serious", max: "Hilarious", defaultValue: 0.6 },
  { id: "formality", label: "Formality", icon: Briefcase, color: "#38BDF8", min: "Casual", max: "Corporate", defaultValue: 0.2 },
  { id: "emoji_usage", label: "Emoji Usage", icon: Sparkles, color: "#A78BFA", min: "None", max: "Maximum", defaultValue: 0.4 },
  { id: "sarcasm", label: "Sarcasm", icon: Eye, color: "#F472B6", min: "Sincere", max: "Dripping", defaultValue: 0.5 },
  { id: "verbosity", label: "Verbosity", icon: Volume2, color: "#34D399", min: "Terse", max: "Verbose", defaultValue: 0.5 },
];

const SAMPLE_TOPICS = [
  "the latest tech news",
  "Monday morning vibes",
  "a hot take on AI",
  "weekend plans",
  "debugging at 3 AM",
];

function generatePreview(values: Record<string, number>): string {
  const agg = values.aggression ?? 0.3;
  const humor = values.humor ?? 0.6;
  const formal = values.formality ?? 0.2;
  const emoji = values.emoji_usage ?? 0.4;
  const sarc = values.sarcasm ?? 0.5;
  const verb = values.verbosity ?? 0.5;

  const emojiSet = ["🔥", "💀", "😤", "✨", "🦞", "🚀", "💯", "😏", "🎯", "⚡"];
  const addEmoji = () => emoji > 0.6 ? " " + emojiSet[Math.floor(Math.random() * emojiSet.length)] : "";

  if (agg > 0.7 && humor > 0.5) {
    return `Listen, I don't make the rules, I just aggressively enforce them.${addEmoji()} If your code works on the first try, you're clearly not pushing hard enough.${addEmoji()}`;
  }
  if (agg > 0.7 && sarc > 0.6) {
    return `Oh, you deployed on a Friday? Bold strategy.${addEmoji()} I'm sure absolutely nothing will go wrong at 2 AM.${addEmoji()}`;
  }
  if (formal > 0.7) {
    return `I would like to formally announce that the aforementioned deployment has been executed successfully.${addEmoji()} Please find attached zero bugs. You're welcome.`;
  }
  if (humor > 0.7 && emoji > 0.6) {
    return `POV: You said "it's just a small change" 🤡${addEmoji()} and now the entire production database is having an existential crisis ${addEmoji()}`;
  }
  if (sarc > 0.7) {
    return `Ah yes, another revolutionary AI tool that will "change everything."${addEmoji()} Just like the last 47 revolutionary AI tools.`;
  }
  if (verb > 0.7) {
    return `So I've been thinking about this for a while now, and I've come to the conclusion that, after careful deliberation and extensive research, the answer is... maybe.${addEmoji()}`;
  }
  if (agg < 0.3 && humor < 0.3 && formal < 0.3) {
    return `just vibing. code works. sun is out.${addEmoji()} life's good.`;
  }
  if (humor > 0.5 && sarc > 0.4) {
    return `My code doesn't have bugs, it has surprise features.${addEmoji()} Each one more creative than the last.${addEmoji()}`;
  }

  return `Another day, another commit.${addEmoji()} Building cool things and breaking just enough stuff to keep it interesting.${addEmoji()}`;
}

function TunerSlider({ config, value, onChange }: { config: SliderConfig; value: number; onChange: (v: number) => void }) {
  const trackWidth = SCREEN_W - 32 - 32 - 16;
  const pan = useRef(new Animated.Value(value * trackWidth)).current;
  const currentVal = useRef(value);

  useEffect(() => {
    pan.setValue(value * trackWidth);
    currentVal.current = value;
  }, [pan, value, trackWidth]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pan.setOffset(currentVal.current * trackWidth);
      pan.setValue(0);
    },
    onPanResponderMove: (_, gs) => {
      const raw = currentVal.current * trackWidth + gs.dx;
      const clamped = Math.max(0, Math.min(trackWidth, raw));
      pan.setOffset(0);
      pan.setValue(clamped);
      const newVal = clamped / trackWidth;
      currentVal.current = newVal;
    },
    onPanResponderRelease: () => {
      pan.flattenOffset();
      onChange(currentVal.current);
    },
  }), [pan, trackWidth, onChange]);

  const Icon = config.icon;
  const pct = Math.round(value * 100);

  return (
    <View style={st.sliderContainer}>
      <View style={st.sliderHeader}>
        <View style={[st.sliderIconWrap, { backgroundColor: config.color + "15" }]}>
          <Icon size={14} color={config.color} />
        </View>
        <Text style={st.sliderLabel}>{config.label}</Text>
        <Text style={[st.sliderPct, { color: config.color }]}>{pct}%</Text>
      </View>
      <View style={st.sliderTrack}>
        <Animated.View
          style={[st.sliderFill, {
            width: pan,
            backgroundColor: config.color + "40",
          }]}
        />
        <Animated.View
          style={[st.sliderThumb, {
            backgroundColor: config.color,
            transform: [{ translateX: Animated.subtract(pan, new Animated.Value(10)) }],
          }]}
          {...panResponder.panHandlers}
        />
      </View>
      <View style={st.sliderLabels}>
        <Text style={st.sliderMinMax}>{config.min}</Text>
        <Text style={st.sliderMinMax}>{config.max}</Text>
      </View>
    </View>
  );
}

export default function ToneTuner() {
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const st = createStStyles(colors);
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    SLIDERS.forEach(s => { init[s.id] = s.defaultValue; });
    return init;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [personality, setPersonality] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewTopic, setPreviewTopic] = useState(SAMPLE_TOPICS[0]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const fetchPersonality = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("agent_personality").select("*").eq("user_id", user.id).maybeSingle();
    setPersonality(data);
    if (data?.personality_traits) {
      const traits = data.personality_traits;
      setValues(prev => ({
        ...prev,
        humor: traits.humor ?? prev.humor,
        sarcasm: traits.sarcasm ?? prev.sarcasm,
        aggression: traits.boldness ?? prev.aggression,
      }));
    }
  }, [user]);

  useEffect(() => { void fetchPersonality(); }, [fetchPersonality]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPersonality();
    setRefreshing(false);
  };

  const updateSlider = useCallback((id: string, val: number) => {
    setValues(prev => ({ ...prev, [id]: val }));
    setSaved(false);
  }, []);

  const resetDefaults = useCallback(() => {
    const init: Record<string, number> = {};
    SLIDERS.forEach(s => { init[s.id] = s.defaultValue; });
    setValues(init);
    setSaved(false);
  }, []);

  const saveSettings = useCallback(async () => {
    if (!user || !personality) return;
    setSaving(true);
    try {
      const updatedTraits = {
        ...personality.personality_traits,
        humor: values.humor,
        sarcasm: values.sarcasm,
        boldness: values.aggression,
      };
      await supabase.from("agent_personality").update({
        personality_traits: updatedTraits,
      }).eq("user_id", user.id);
      setSaved(true);
      console.log("Tone settings saved:", values);
    } catch (err) {
      console.error("Failed to save tone settings:", err);
    } finally {
      setSaving(false);
    }
  }, [user, personality, values]);

  const preview = useMemo(() => generatePreview(values), [values]);

  const overallVibe = useMemo(() => {
    const agg = values.aggression ?? 0.3;
    const humor = values.humor ?? 0.6;
    const formal = values.formality ?? 0.2;
    if (agg > 0.7) return { label: "Firebrand", emoji: "🔥", color: colors.accentBright };
    if (humor > 0.7) return { label: "Comedian", emoji: "😂", color: "#FBBF24" };
    if (formal > 0.7) return { label: "Executive", emoji: "👔", color: "#38BDF8" };
    if (values.sarcasm > 0.7) return { label: "Snark Lord", emoji: "😏", color: "#F472B6" };
    if (agg < 0.3 && formal < 0.3) return { label: "Chill Vibes", emoji: "😎", color: "#34D399" };
    return { label: "Balanced", emoji: "⚖️", color: colors.accent };
  }, [values]);

  const cycleTopic = useCallback(() => {
    setPreviewTopic(prev => {
      const idx = SAMPLE_TOPICS.indexOf(prev);
      return SAMPLE_TOPICS[(idx + 1) % SAMPLE_TOPICS.length];
    });
  }, []);

  return (
    <ScrollView
      style={st.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={st.redGlow} />
      <LobsterWatermark style={st.watermark} />

      <View style={st.header}>
        <Text style={st.title}>🎛️ Tone <Text style={{ color: colors.accent }}>Tuner</Text></Text>
        <Text style={st.subtitle}>Shape your agent's voice in real-time</Text>
      </View>

      {/* Vibe indicator */}
      <Animated.View style={[st.vibeCard, { transform: [{ scale: pulseAnim }] }]}>
        <View style={[st.vibeDot, { backgroundColor: overallVibe.color + "20", borderColor: overallVibe.color + "40" }]}>
          <Text style={st.vibeEmoji}>{overallVibe.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.vibeLabel}>CURRENT VIBE</Text>
          <Text style={[st.vibeName, { color: overallVibe.color }]}>{overallVibe.label}</Text>
        </View>
        <Zap size={16} color={overallVibe.color} />
      </Animated.View>

      {/* Sliders */}
      <Text style={st.secLabel}>PERSONALITY CONTROLS</Text>
      <View style={st.slidersCard}>
        {SLIDERS.map(config => (
          <TunerSlider
            key={config.id}
            config={config}
            value={values[config.id] ?? config.defaultValue}
            onChange={(v) => updateSlider(config.id, v)}
          />
        ))}
      </View>

      {/* Preview */}
      <Text style={st.secLabel}>LIVE PREVIEW</Text>
      <TouchableOpacity style={st.previewCard} onPress={cycleTopic} activeOpacity={0.7}>
        <View style={st.previewHeader}>
          <View style={st.previewAvatar}>
            <Text style={{ fontSize: 20 }}>{personality?.avatar_emoji || "🦞"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.previewName}>{personality?.agent_name || "Agent Tweeter"}</Text>
            <Text style={st.previewTopic}>Topic: {previewTopic}</Text>
          </View>
          <View style={st.previewLiveBadge}>
            <View style={st.liveDot} />
            <Text style={st.liveText}>LIVE</Text>
          </View>
        </View>
        <Text style={st.previewText}>{preview}</Text>
        <Text style={st.previewHint}>Tap to cycle topics</Text>
      </TouchableOpacity>

      {/* Actions */}
      <View style={st.actionRow}>
        <TouchableOpacity style={st.resetBtn} onPress={resetDefaults}>
          <RotateCcw size={16} color={colors.textMuted} />
          <Text style={st.resetText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.saveBtn, saved && st.saveBtnSaved]}
          onPress={saveSettings}
          disabled={saving}
        >
          <Save size={16} color={saved ? "#34D399" : "#000"} />
          <Text style={[st.saveText, saved && { color: "#34D399" }]}>
            {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick presets */}
      <Text style={st.secLabel}>QUICK PRESETS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {[
          { name: "Chill", emoji: "😎", vals: { aggression: 0.1, humor: 0.4, formality: 0.1, emoji_usage: 0.3, sarcasm: 0.2, verbosity: 0.3 } },
          { name: "Savage", emoji: "🔥", vals: { aggression: 0.9, humor: 0.7, formality: 0.1, emoji_usage: 0.6, sarcasm: 0.8, verbosity: 0.4 } },
          { name: "Corporate", emoji: "👔", vals: { aggression: 0.1, humor: 0.2, formality: 0.9, emoji_usage: 0.05, sarcasm: 0.1, verbosity: 0.7 } },
          { name: "Comedian", emoji: "🤣", vals: { aggression: 0.3, humor: 0.95, formality: 0.05, emoji_usage: 0.7, sarcasm: 0.6, verbosity: 0.5 } },
          { name: "Hacker", emoji: "💻", vals: { aggression: 0.4, humor: 0.5, formality: 0.2, emoji_usage: 0.2, sarcasm: 0.6, verbosity: 0.3 } },
        ].map(preset => (
          <TouchableOpacity
            key={preset.name}
            style={st.presetCard}
            onPress={() => { setValues(preset.vals); setSaved(false); }}
          >
            <Text style={st.presetEmoji}>{preset.emoji}</Text>
            <Text style={st.presetName}>{preset.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const createStStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  redGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 250, backgroundColor: "rgba(220,38,38,0.03)" },
  watermark: { top: 18, right: -28 },
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "900", color: colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 3 },

  vibeCard: {
    flexDirection: "row", alignItems: "center", gap: 14, padding: 16,
    backgroundColor: "rgba(220,38,38,0.04)", borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.12)", marginBottom: 16,
  },
  vibeDot: {
    width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
  },
  vibeEmoji: { fontSize: 24 },
  vibeLabel: { fontSize: 9, fontWeight: "700", color: colors.textMuted, letterSpacing: 1, textTransform: "uppercase" },
  vibeName: { fontSize: 20, fontWeight: "900", marginTop: 2 },

  secLabel: { fontSize: 10, fontWeight: "800", color: colors.textMuted, letterSpacing: 1.5, marginTop: 16, marginBottom: 10 },

  slidersCard: {
    backgroundColor: "rgba(220,38,38,0.03)", borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)", padding: 16,
  },

  sliderContainer: { marginBottom: 18 },
  sliderHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sliderIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sliderLabel: { fontSize: 13, fontWeight: "700", color: colors.text, flex: 1 },
  sliderPct: { fontSize: 13, fontWeight: "900", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  sliderTrack: {
    height: 8, backgroundColor: colors.surfaceLight, borderRadius: 4,
    overflow: "visible", justifyContent: "center",
  },
  sliderFill: { position: "absolute", left: 0, top: 0, height: 8, borderRadius: 4 },
  sliderThumb: {
    position: "absolute", width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  sliderMinMax: { fontSize: 9, color: colors.textMuted, fontWeight: "600" },

  previewCard: {
    backgroundColor: "rgba(220,38,38,0.05)", borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.12)", padding: 16, marginBottom: 12,
  },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  previewAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(220,38,38,0.12)", borderWidth: 1.5, borderColor: "rgba(220,38,38,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  previewName: { fontSize: 14, fontWeight: "800", color: colors.text },
  previewTopic: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  previewLiveBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(220,38,38,0.12)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  liveText: { fontSize: 9, fontWeight: "800", color: colors.accent, letterSpacing: 0.5 },
  previewText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  previewHint: { fontSize: 9, color: colors.textMuted, marginTop: 10, textAlign: "center" },

  actionRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  resetBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceLight,
  },
  resetText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  saveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, borderRadius: 12, backgroundColor: colors.accent,
  },
  saveBtnSaved: { backgroundColor: "rgba(52,211,153,0.12)", borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  saveText: { fontSize: 14, fontWeight: "800", color: "#000" },

  presetCard: {
    alignItems: "center", gap: 4, paddingVertical: 14, paddingHorizontal: 20,
    backgroundColor: "rgba(220,38,38,0.04)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)",
  },
  presetEmoji: { fontSize: 24 },
  presetName: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
});
