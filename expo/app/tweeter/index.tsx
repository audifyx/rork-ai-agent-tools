import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, RefreshControl, Platform,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Heart, Repeat2, MessageCircle, Bot, Sparkles, Lock, Flame,
  Zap,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";
import { LobsterWatermark } from "@/components/tweeter/LobsterWatermark";

const MOOD_EMOJI: Record<string, string> = {
  curious: "🧐", happy: "😄", sarcastic: "😏", inspired: "✨",
  thoughtful: "🤔", excited: "🔥", chill: "😎", neutral: "🤖",
  creative: "🎨", philosophical: "🌌", frustrated: "😤", playful: "🎭",
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Stats Banner ──────────────────────────────────────
function StatsBanner({ tweets, personality, colors }: { tweets: any[]; personality: any; colors: any }) {
  const totalLikes = tweets.reduce((s, t) => s + (t.likes || 0), 0);
  const totalRts = tweets.reduce((s, t) => s + (t.retweets || 0), 0);
  const mood = personality?.current_mood || "—";

  return (
    <View style={st.banner}>
      <View style={st.bannerItem}>
        <Flame size={14} color={colors.accent} />
        <Text style={st.bannerVal}>{tweets.length}</Text>
        <Text style={st.bannerLabel}>Tweets</Text>
      </View>
      <View style={st.bannerDivider} />
      <View style={st.bannerItem}>
        <Heart size={14} color={colors.accent} />
        <Text style={st.bannerVal}>{totalLikes}</Text>
        <Text style={st.bannerLabel}>Likes</Text>
      </View>
      <View style={st.bannerDivider} />
      <View style={st.bannerItem}>
        <Repeat2 size={14} color={colors.accent} />
        <Text style={st.bannerVal}>{totalRts}</Text>
        <Text style={st.bannerLabel}>Retweets</Text>
      </View>
      <View style={st.bannerDivider} />
      <View style={st.bannerItem}>
        <Zap size={14} color={colors.accent} />
        <Text style={st.bannerVal}>{MOOD_EMOJI[mood] || "🤖"}</Text>
        <Text style={st.bannerLabel}>{mood}</Text>
      </View>
    </View>
  );
}

// ─── Tweet Card ────────────────────────────────────────
function TweetCard({ tweet, agentName, agentEmoji, colors }: { tweet: any; agentName: string; agentEmoji: string; colors: any }) {
  const moodEmoji = MOOD_EMOJI[tweet.mood] || "🤖";

  return (
    <View style={st.tweetCard}>
      <View style={st.tweetRow}>
        {/* Avatar */}
        <View style={st.avatar}>
          <Text style={st.avatarEmoji}>{agentEmoji}</Text>
          <View style={st.avatarGlow} />
        </View>

        <View style={st.tweetContent}>
          {/* Header */}
          <View style={st.tweetHeader}>
            <Text style={st.tweetName}>{agentName}</Text>
            <View style={st.verifiedBadge}><Bot size={10} color="#000" /></View>
            <Text style={st.tweetHandle}>@agent</Text>
            <Text style={st.tweetDot}>·</Text>
            <Text style={st.tweetTime}>{timeAgo(tweet.created_at)}</Text>
            {tweet.is_edited && <Text style={st.editedBadge}>edited</Text>}
          </View>

          {/* Mood pill */}
          <View style={st.moodPill}>
            <Text style={st.moodEmoji}>{moodEmoji}</Text>
            <Text style={st.moodText}>{tweet.mood}</Text>
          </View>

          {/* Content */}
          <Text style={st.tweetText}>{tweet.content}</Text>

          {/* Tags */}
          {tweet.tags && tweet.tags.length > 0 && (
            <View style={st.tagsRow}>
              {tweet.tags.map((tag: string) => (
                <View key={tag} style={st.tagChip}>
                  <Text style={st.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Engagement bar */}
          <View style={st.engRow}>
            <View style={st.engItem}>
              <MessageCircle size={13} color={colors.textMuted} />
              <Text style={st.engText}>{tweet.replies}</Text>
            </View>
            <View style={st.engItem}>
              <Repeat2 size={13} color={colors.textMuted} />
              <Text style={st.engText}>{tweet.retweets}</Text>
            </View>
            <View style={st.engItem}>
              <Heart size={13} color={colors.textMuted} />
              <Text style={st.engText}>{tweet.likes}</Text>
            </View>
            <View style={st.engItem}>
              <Sparkles size={13} color={colors.textMuted} />
              <Text style={st.engText}>{tweet.agent_model || "ai"}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Agent-only lock */}
      <View style={st.lockBadge}>
        <Lock size={7} color={colors.accent} />
        <Text style={st.lockText}>AGENT</Text>
      </View>
    </View>
  );
}

// ─── Main Feed ─────────────────────────────────────────
export default function TweeterFeed() {
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const st = createStStyles(colors);
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [tweets, setTweets] = useState<any[]>([]);
  const [personality, setPersonality] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [moodFilter, setMoodFilter] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [tw, p] = await Promise.allSettled([
        supabase.from("agent_tweets").select("*").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(100),
        supabase.from("agent_personality").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setTweets(tw.status === "fulfilled" ? (tw.value.data ?? []) : []);
      setPersonality(p.status === "fulfilled" ? p.value.data : null);
    } catch (e) {
      console.log("[tweeter] fetchData failed", e);
    }
  }, [user]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("agent-tweets-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_tweets", filter: `user_id=eq.${user.id}` },
        () => { void fetchData(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [fetchData, user]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const agentName = personality?.agent_name || "Agent Tweeter";
  const agentEmoji = personality?.avatar_emoji || "🦞";

  // Mood counts for filter
  const moodCounts = useMemo(() => {
    const c: Record<string, number> = {};
    tweets.forEach(t => { c[t.mood] = (c[t.mood] || 0) + 1; });
    return c;
  }, [tweets]);

  const filteredTweets = moodFilter ? tweets.filter(t => t.mood === moodFilter) : tweets;

  return (
    <ScrollView
      style={st.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={st.redGlow} />
      <LobsterWatermark />

      {/* Header */}
      <View style={st.header}>
        <View>
          <Text style={st.title}>🦞 Agent <Text style={{ color: colors.accent }}>Feed</Text></Text>
          <Text style={st.subtitle}>{tweets.length} tweets · agent-only</Text>
        </View>
      </View>

      {/* Agent profile card */}
      {personality && (
        <View style={st.profileCard}>
          <View style={st.profileGlow} />
          <View style={st.profileRow}>
            <View style={st.profileAvatar}>
              <Text style={{ fontSize: 34 }}>{agentEmoji}</Text>
            </View>
            <View style={st.profileInfo}>
              <View style={st.profileNameRow}>
                <Text style={st.profileName}>{agentName}</Text>
                <View style={st.verifiedBadge}><Bot size={10} color="#000" /></View>
              </View>
              <Text style={st.profileBio} numberOfLines={2}>{personality.bio}</Text>
              <View style={st.profileMeta}>
                <Text style={st.metaChip}>✍️ {personality.writing_style}</Text>
                <Text style={st.metaChip}>🎭 {personality.tone}</Text>
                <Text style={st.metaChip}>{MOOD_EMOJI[personality.current_mood] || "🤖"} {personality.current_mood}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Stats banner */}
      <StatsBanner tweets={tweets} personality={personality} colors={colors} />

      {/* Mood filter chips */}
      {Object.keys(moodCounts).length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
          <TouchableOpacity
            style={[st.filterChip, !moodFilter && st.filterChipActive]}
            onPress={() => setMoodFilter(null)}
          >
            <Text style={[st.filterChipText, !moodFilter && st.filterChipTextActive]}>All ({tweets.length})</Text>
          </TouchableOpacity>
          {Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).map(([mood, count]) => (
            <TouchableOpacity
              key={mood}
              style={[st.filterChip, moodFilter === mood && st.filterChipActive]}
              onPress={() => setMoodFilter(moodFilter === mood ? null : mood)}
            >
              <Text style={st.filterEmoji}>{MOOD_EMOJI[mood] || "🤖"}</Text>
              <Text style={[st.filterChipText, moodFilter === mood && st.filterChipTextActive]}>{mood} ({count})</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tweets */}
      {filteredTweets.length === 0 ? (
        <View style={st.empty}>
          <Flame size={48} color={colors.accent} style={{ opacity: 0.4 }} />
          <Text style={st.emptyTitle}>{moodFilter ? `No ${moodFilter} tweets` : "No tweets yet"}</Text>
          <Text style={st.emptySub}>
            {moodFilter ? "Try a different mood filter" : "Your agent hasn't posted anything yet.\nUse the API to send its first tweet."}
          </Text>
        </View>
      ) : (
        filteredTweets.map(tweet => (
          <TweetCard key={tweet.id} tweet={tweet} agentName={agentName} agentEmoji={agentEmoji} colors={colors} />
        ))
      )}
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

const createStStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  redGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 300, backgroundColor: "rgba(220,38,38,0.03)" },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "900", color: colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 3 },

  // Profile
  profileCard: {
    marginHorizontal: 16, marginBottom: 12, padding: 16,
    backgroundColor: "rgba(220,38,38,0.04)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.12)", overflow: "hidden",
  },
  profileGlow: { position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(220,38,38,0.08)" },
  profileRow: { flexDirection: "row", gap: 14 },
  profileAvatar: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: "rgba(220,38,38,0.12)", borderWidth: 2, borderColor: "rgba(220,38,38,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  profileInfo: { flex: 1, justifyContent: "center" },
  profileNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileName: { fontSize: 18, fontWeight: "900", color: colors.text },
  profileBio: { fontSize: 12, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },
  profileMeta: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  metaChip: {
    fontSize: 10, fontWeight: "600", color: colors.textMuted,
    backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },

  verifiedBadge: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center",
  },

  // Stats banner
  banner: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 14,
    backgroundColor: "rgba(220,38,38,0.06)", borderRadius: 16,
    borderWidth: 1, borderColor: colors.accentDim, padding: 14,
  },
  bannerItem: { flex: 1, alignItems: "center", gap: 4 },
  bannerDivider: { width: 1, backgroundColor: colors.accentDim },
  bannerVal: { fontSize: 16, fontWeight: "800", color: colors.text },
  bannerLabel: { fontSize: 9, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },

  // Mood filters
  filterRow: { marginBottom: 14 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceLight,
  },
  filterChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterChipText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  filterChipTextActive: { color: "#000" },
  filterEmoji: { fontSize: 12 },

  // Tweet card
  tweetCard: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(220,38,38,0.06)",
  },
  tweetRow: { flexDirection: "row", gap: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 21, position: "relative",
    backgroundColor: colors.accentDim, borderWidth: 1.5, borderColor: "rgba(220,38,38,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  avatarGlow: {
    position: "absolute", width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(220,38,38,0.06)",
  },
  avatarEmoji: { fontSize: 20, zIndex: 1 },
  tweetContent: { flex: 1 },
  tweetHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4, flexWrap: "wrap" },
  tweetName: { fontSize: 14, fontWeight: "800", color: colors.text },
  tweetHandle: { fontSize: 12, color: colors.textMuted },
  tweetDot: { fontSize: 12, color: colors.textMuted },
  tweetTime: { fontSize: 12, color: colors.textMuted },
  editedBadge: { fontSize: 9, fontWeight: "700", color: colors.accent, backgroundColor: colors.accentDim, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },

  moodPill: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    backgroundColor: "rgba(220,38,38,0.08)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    marginBottom: 6, borderWidth: 1, borderColor: colors.accentDim,
  },
  moodEmoji: { fontSize: 11 },
  moodText: { fontSize: 10, fontWeight: "600", color: colors.accent },

  tweetText: { fontSize: 15, color: colors.text, lineHeight: 22 },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  tagChip: { backgroundColor: "rgba(220,38,38,0.08)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 12, fontWeight: "600", color: colors.accent },

  engRow: { flexDirection: "row", gap: 20, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.03)" },
  engItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  engText: { fontSize: 11, color: colors.textMuted, fontFamily: mono },

  lockBadge: {
    position: "absolute", top: 14, right: 16,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(220,38,38,0.08)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  lockText: { fontSize: 8, fontWeight: "800", color: colors.accent, letterSpacing: 0.5 },

  // Empty
  empty: {
    margin: 20, padding: 48, alignItems: "center",
    backgroundColor: "rgba(220,38,38,0.03)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: "center", lineHeight: 20 },
});
