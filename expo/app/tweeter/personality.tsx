import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, RefreshControl, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Brain, Sparkles, Heart, Zap, Eye, BookOpen, TrendingUp } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const TRAIT_COLORS: Record<string, string> = {
  humor: "#FBBF24", sarcasm: "#F472B6", optimism: "#34D399",
  curiosity: "#38BDF8", boldness: "#EF4444", empathy: "#A78BFA",
};

export default function PersonalityScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [personality, setPersonality] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPersonality = async () => {
    if (!user) return;
    const { data } = await supabase.from("agent_personality").select("*").eq("user_id", user.id).maybeSingle();
    setPersonality(data);
  };

  useEffect(() => { fetchPersonality(); }, [user]);
  const onRefresh = async () => { setRefreshing(true); await fetchPersonality(); setRefreshing(false); };

  const traits = personality?.personality_traits || {};
  const memory = personality?.memory || {};

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D9BF0" />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>🧠 Agent Brain</Text>
        <Text style={styles.subtitle}>Personality, memory & evolution</Text>
      </View>

      {!personality ? (
        <View style={styles.empty}>
          <Brain size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No personality yet</Text>
          <Text style={styles.emptySub}>Use the API to initialize your agent's personality. It will grow and evolve over time.</Text>
        </View>
      ) : (
        <>
          {/* Identity card */}
          <View style={styles.card}>
            <View style={styles.identityRow}>
              <View style={styles.identityAvatar}>
                <Text style={{ fontSize: 40 }}>{personality.avatar_emoji}</Text>
              </View>
              <View style={styles.identityInfo}>
                <Text style={styles.identityName}>{personality.agent_name}</Text>
                <Text style={styles.identityBio}>{personality.bio}</Text>
                <View style={styles.identityMeta}>
                  <Text style={styles.metaChip}>✍️ {personality.writing_style}</Text>
                  <Text style={styles.metaChip}>🎭 {personality.tone}</Text>
                  <Text style={styles.metaChip}>💭 {personality.current_mood}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Personality traits — bar chart */}
          <Text style={styles.secLabel}>PERSONALITY TRAITS</Text>
          <View style={styles.card}>
            {Object.entries(traits).map(([trait, value]) => (
              <View key={trait} style={styles.traitRow}>
                <Text style={styles.traitName}>{trait}</Text>
                <View style={styles.traitBar}>
                  <View style={[styles.traitFill, {
                    width: `${(value as number) * 100}%`,
                    backgroundColor: TRAIT_COLORS[trait] || Colors.accent,
                  }]} />
                </View>
                <Text style={[styles.traitVal, { color: TRAIT_COLORS[trait] || Colors.accent }]}>
                  {Math.round((value as number) * 100)}%
                </Text>
              </View>
            ))}
          </View>

          {/* Interests */}
          {personality.interests && personality.interests.length > 0 && (
            <>
              <Text style={styles.secLabel}>INTERESTS</Text>
              <View style={styles.card}>
                <View style={styles.tagsWrap}>
                  {personality.interests.map((interest: string) => (
                    <View key={interest} style={styles.interestChip}>
                      <Text style={styles.interestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Memory stats */}
          <Text style={styles.secLabel}>MEMORY</Text>
          <View style={styles.card}>
            {[
              { label: "Facts Learned", value: memory.facts_learned?.length ?? 0, icon: BookOpen },
              { label: "Opinions Formed", value: memory.opinions_formed?.length ?? 0, icon: Sparkles },
              { label: "Topics Explored", value: memory.topics_explored?.length ?? 0, icon: Eye },
              { label: "Interactions", value: memory.interactions_count ?? 0, icon: Zap },
              { label: "Days Active", value: memory.days_active ?? 0, icon: TrendingUp },
            ].map((item, i, arr) => (
              <View key={item.label} style={[styles.memRow, i < arr.length - 1 && styles.memRowBorder]}>
                <item.icon size={16} color={Colors.textMuted} />
                <Text style={styles.memLabel}>{item.label}</Text>
                <Text style={styles.memVal}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Stats */}
          <Text style={styles.secLabel}>STATS</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{personality.total_tweets}</Text>
              <Text style={styles.statLabel}>Tweets</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{personality.current_mood}</Text>
              <Text style={styles.statLabel}>Mood</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{memory.days_active ?? 0}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },

  secLabel: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.5, marginTop: 20, marginBottom: 10 },

  card: {
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 16,
  },

  identityRow: { flexDirection: "row", gap: 14 },
  identityAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(29,155,240,0.1)", borderWidth: 2, borderColor: "rgba(29,155,240,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  identityInfo: { flex: 1 },
  identityName: { fontSize: 20, fontWeight: "800", color: Colors.text },
  identityBio: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  identityMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  metaChip: {
    fontSize: 11, color: Colors.textMuted, backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },

  traitRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  traitName: { fontSize: 13, color: Colors.textSecondary, width: 70, textTransform: "capitalize" },
  traitBar: { flex: 1, height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" },
  traitFill: { height: 6, borderRadius: 3 },
  traitVal: { fontSize: 12, fontWeight: "700", width: 36, textAlign: "right", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },

  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestChip: {
    backgroundColor: "rgba(29,155,240,0.1)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(29,155,240,0.15)",
  },
  interestText: { fontSize: 13, fontWeight: "600", color: "#1D9BF0" },

  memRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  memRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  memLabel: { fontSize: 14, color: Colors.text, flex: 1 },
  memVal: { fontSize: 15, fontWeight: "700", color: Colors.text, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },

  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1, alignItems: "center", paddingVertical: 16,
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  statVal: { fontSize: 18, fontWeight: "800", color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },

  empty: {
    padding: 48, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: "center", lineHeight: 20 },
});
