import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, RefreshControl, Platform, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Brain, Heart, Zap, Eye, BookOpen, TrendingUp, ChevronDown, ChevronUp,
  Flame, Star, Clock, Lightbulb, MessageSquare,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";
import { LobsterWatermark } from "@/components/tweeter/LobsterWatermark";

const TRAIT_ICONS: Record<string, any> = {
  humor: Star, sarcasm: Zap, optimism: Heart, curiosity: Eye, boldness: Flame, empathy: Heart,
};
const TRAIT_COLORS = {
  humor: "#FBBF24", sarcasm: "#F472B6", optimism: "#34D399",
  curiosity: "#38BDF8", boldness: "accent", empathy: "#A78BFA",
} as Record<string, string>;

const MOOD_EMOJI: Record<string, string> = {
  curious: "🧐", happy: "😄", sarcastic: "😏", inspired: "✨",
  thoughtful: "🤔", excited: "🔥", chill: "😎", neutral: "🤖",
  creative: "🎨", philosophical: "🌌", frustrated: "😤", playful: "🎭",
};

export default function PersonalityScreen() {
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const st = createStStyles(colors);
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [personality, setPersonality] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFacts, setShowFacts] = useState(false);
  const [showOpinions, setShowOpinions] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [showEvolution, setShowEvolution] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("agent_personality").select("*").eq("user_id", user.id).maybeSingle();
    setPersonality(data);
  }, [user]);

  useEffect(() => { void fetch_(); }, [fetch_]);
  const onRefresh = async () => { setRefreshing(true); await fetch_(); setRefreshing(false); };

  const traits = personality?.personality_traits || {};
  const memory = personality?.memory || {};
  const evoLog = personality?.evolution_log || [];

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
        <Text style={st.title}>🧠 Agent <Text style={{ color: colors.accent }}>Brain</Text></Text>
        <Text style={st.subtitle}>Personality, memory & evolution</Text>
      </View>

      {!personality ? (
        <View style={st.empty}>
          <Brain size={48} color={colors.accent} style={{ opacity: 0.4 }} />
          <Text style={st.emptyTitle}>No personality yet</Text>
          <Text style={st.emptySub}>Use the API to initialize your agent's brain. It will grow and evolve over time.</Text>
        </View>
      ) : (
        <>
          {/* Identity */}
          <View style={st.card}>
            <View style={st.cardGlow} />
            <View style={st.identityRow}>
              <View style={st.identityAvatar}>
                <Text style={{ fontSize: 42 }}>{personality.avatar_emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.identityName}>{personality.agent_name}</Text>
                <Text style={st.identityBio}>{personality.bio}</Text>
                <View style={st.chipRow}>
                  <View style={st.chip}><Text style={st.chipText}>✍️ {personality.writing_style}</Text></View>
                  <View style={st.chip}><Text style={st.chipText}>🎭 {personality.tone}</Text></View>
                  <View style={[st.chip, { backgroundColor: colors.accentDim, borderColor: "rgba(220,38,38,0.15)" }]}>
                    <Text style={[st.chipText, { color: colors.accent }]}>{MOOD_EMOJI[personality.current_mood] || "🤖"} {personality.current_mood}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Personality Traits */}
          <Text style={st.secLabel}>PERSONALITY TRAITS</Text>
          <View style={st.card}>
            {Object.entries(traits).map(([trait, value]) => {
              const TIcon = TRAIT_ICONS[trait] || Zap;
              const colorKey = TRAIT_COLORS[trait];
              const color = colorKey === "accent" ? colors.accent : (colorKey || colors.accent);
              const pct = Math.round((value as number) * 100);
              return (
                <View key={trait} style={st.traitRow}>
                  <View style={[st.traitIcon, { backgroundColor: color + "15" }]}>
                    <TIcon size={12} color={color} />
                  </View>
                  <Text style={st.traitName}>{trait}</Text>
                  <View style={st.traitBar}>
                    <View style={[st.traitFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[st.traitVal, { color }]}>{pct}%</Text>
                </View>
              );
            })}
          </View>

          {/* Interests */}
          {personality.interests?.length > 0 && (
            <>
              <Text style={st.secLabel}>INTERESTS</Text>
              <View style={st.card}>
                <View style={st.tagsWrap}>
                  {personality.interests.map((i: string) => (
                    <View key={i} style={st.interestChip}><Text style={st.interestText}>{i}</Text></View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Memory */}
          <Text style={st.secLabel}>MEMORY BANKS</Text>
          <View style={st.card}>
            {/* Summary stats */}
            <View style={st.memStats}>
              {[
                { label: "Facts", val: memory.facts_learned?.length ?? 0, icon: BookOpen, color: "#38BDF8" },
                { label: "Opinions", val: memory.opinions_formed?.length ?? 0, icon: Lightbulb, color: "#FBBF24" },
                { label: "Topics", val: memory.topics_explored?.length ?? 0, icon: MessageSquare, color: "#34D399" },
                { label: "Interactions", val: memory.interactions_count ?? 0, icon: Zap, color: colors.accent },
              ].map(item => (
                <View key={item.label} style={st.memStatBox}>
                  <item.icon size={14} color={item.color} />
                  <Text style={st.memStatVal}>{item.val}</Text>
                  <Text style={st.memStatLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Expandable memory lists */}
            {(memory.facts_learned?.length > 0) && (
              <ExpandableList title="Facts Learned" items={memory.facts_learned} color="#38BDF8" expanded={showFacts} onToggle={() => setShowFacts(!showFacts)} colors={colors} />
            )}
            {(memory.opinions_formed?.length > 0) && (
              <ExpandableList title="Opinions Formed" items={memory.opinions_formed} color="#FBBF24" expanded={showOpinions} onToggle={() => setShowOpinions(!showOpinions)} colors={colors} />
            )}
            {(memory.topics_explored?.length > 0) && (
              <ExpandableList title="Topics Explored" items={memory.topics_explored} color="#34D399" expanded={showTopics} onToggle={() => setShowTopics(!showTopics)} colors={colors} />
            )}
          </View>

          {/* Mood History */}
          {memory.mood_history?.length > 0 && (
            <>
              <Text style={st.secLabel}>MOOD TIMELINE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.moodTimeline} contentContainerStyle={{ paddingHorizontal: 16, gap: 4 }}>
                {memory.mood_history.slice(-30).map((mood: string, i: number) => (
                  <View key={i} style={st.moodDot}>
                    <Text style={{ fontSize: 16 }}>{MOOD_EMOJI[mood] || "🤖"}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* Evolution Log */}
          {evoLog.length > 0 && (
            <>
              <Text style={st.secLabel}>EVOLUTION LOG</Text>
              <TouchableOpacity style={st.card} onPress={() => setShowEvolution(!showEvolution)} activeOpacity={0.7}>
                <View style={st.evoHeader}>
                  <TrendingUp size={14} color={colors.accent} />
                  <Text style={st.evoTitle}>{evoLog.length} evolution{evoLog.length !== 1 ? "s" : ""}</Text>
                  {showEvolution ? <ChevronUp size={14} color={colors.textMuted} /> : <ChevronDown size={14} color={colors.textMuted} />}
                </View>
                {showEvolution && evoLog.slice(-5).reverse().map((entry: any, i: number) => (
                  <View key={i} style={st.evoRow}>
                    <View style={st.evoDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.evoMood}>→ {entry.new_mood} ({entry.tweets_analyzed} tweets analyzed)</Text>
                      <Text style={st.evoTime}>{new Date(entry.timestamp).toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
              </TouchableOpacity>
            </>
          )}

          {/* Stats */}
          <Text style={st.secLabel}>OVERVIEW</Text>
          <View style={st.statsRow}>
            <View style={st.statBox}>
              <Flame size={16} color={colors.accent} />
              <Text style={st.statVal}>{personality.total_tweets}</Text>
              <Text style={st.statLabel}>Tweets</Text>
            </View>
            <View style={st.statBox}>
              <Clock size={16} color={colors.accent} />
              <Text style={st.statVal}>{memory.days_active ?? 0}</Text>
              <Text style={st.statLabel}>Days</Text>
            </View>
            <View style={st.statBox}>
              <Zap size={16} color={colors.accent} />
              <Text style={st.statVal}>{memory.interactions_count ?? 0}</Text>
              <Text style={st.statLabel}>Calls</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function ExpandableList({ title, items, color, expanded, onToggle, colors: _colors }: { title: string; items: string[]; color: string; expanded: boolean; onToggle: () => void; colors: any }) {
  return (
    <View style={st.expandable}>
      <TouchableOpacity style={st.expandHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={[st.expandDot, { backgroundColor: color }]} />
        <Text style={st.expandTitle}>{title} ({items.length})</Text>
        {expanded ? <ChevronUp size={14} color={_colors.textMuted} /> : <ChevronDown size={14} color={_colors.textMuted} />}
      </TouchableOpacity>
      {expanded && items.map((item, i) => (
        <View key={i} style={st.expandItem}>
          <Text style={st.expandItemText}>• {item}</Text>
        </View>
      ))}
    </View>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

const createStStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  redGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 250, backgroundColor: "rgba(220,38,38,0.03)" },
  watermark: { top: 18, right: -28 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "900", color: colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  secLabel: { fontSize: 10, fontWeight: "800", color: colors.textMuted, letterSpacing: 1.5, marginTop: 20, marginBottom: 10 },

  card: {
    backgroundColor: "rgba(220,38,38,0.03)", borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)", padding: 16, overflow: "hidden",
  },
  cardGlow: { position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(220,38,38,0.06)" },

  // Identity
  identityRow: { flexDirection: "row", gap: 14 },
  identityAvatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: colors.accentDim, borderWidth: 2, borderColor: "rgba(220,38,38,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  identityName: { fontSize: 20, fontWeight: "900", color: colors.text },
  identityBio: { fontSize: 12, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  chip: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceLight,
  },
  chipText: { fontSize: 10, fontWeight: "600", color: colors.textMuted },

  // Traits
  traitRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  traitIcon: { width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  traitName: { fontSize: 12, color: colors.textSecondary, width: 65, textTransform: "capitalize", fontWeight: "600" },
  traitBar: { flex: 1, height: 8, backgroundColor: colors.surfaceLight, borderRadius: 4, overflow: "hidden" },
  traitFill: { height: 8, borderRadius: 4 },
  traitVal: { fontSize: 11, fontWeight: "800", width: 34, textAlign: "right", fontFamily: mono },

  // Interests
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  interestChip: {
    backgroundColor: "rgba(220,38,38,0.08)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(220,38,38,0.12)",
  },
  interestText: { fontSize: 12, fontWeight: "700", color: colors.accent },

  // Memory
  memStats: { flexDirection: "row", gap: 8, marginBottom: 14 },
  memStatBox: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 12 },
  memStatVal: { fontSize: 16, fontWeight: "800", color: colors.text },
  memStatLabel: { fontSize: 9, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase" },

  expandable: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.surface, paddingTop: 10 },
  expandHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  expandDot: { width: 8, height: 8, borderRadius: 4 },
  expandTitle: { fontSize: 13, fontWeight: "700", color: colors.text, flex: 1 },
  expandItem: { paddingLeft: 16, paddingVertical: 4 },
  expandItemText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  // Mood timeline
  moodTimeline: { marginBottom: 10 },
  moodDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(220,38,38,0.06)", borderWidth: 1, borderColor: colors.accentDim,
    alignItems: "center", justifyContent: "center",
  },

  // Evolution
  evoHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  evoTitle: { fontSize: 14, fontWeight: "700", color: colors.text, flex: 1 },
  evoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 12, paddingLeft: 4 },
  evoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 4 },
  evoMood: { fontSize: 12, fontWeight: "600", color: colors.text },
  evoTime: { fontSize: 10, color: colors.textMuted, marginTop: 2, fontFamily: mono },

  // Stats
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: {
    flex: 1, alignItems: "center", gap: 6, paddingVertical: 16,
    backgroundColor: "rgba(220,38,38,0.04)", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)",
  },
  statVal: { fontSize: 20, fontWeight: "900", color: colors.text },
  statLabel: { fontSize: 9, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },

  // Empty
  empty: {
    padding: 48, alignItems: "center",
    backgroundColor: "rgba(220,38,38,0.03)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: "center", lineHeight: 20 },
});
