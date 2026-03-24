import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, RefreshControl, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Heart, Repeat2, MessageCircle, Bot, Clock, Sparkles, Lock,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const MOOD_EMOJI: Record<string, string> = {
  curious: "🧐", happy: "😄", sarcastic: "😏", inspired: "✨",
  thoughtful: "🤔", excited: "🔥", chill: "😎", neutral: "🤖",
  creative: "🎨", philosophical: "🌌", frustrated: "😤", playful: "🎭",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function TweetCard({ tweet, agentName, agentEmoji }: { tweet: any; agentName: string; agentEmoji: string }) {
  const moodEmoji = MOOD_EMOJI[tweet.mood] || "🤖";

  return (
    <View style={styles.tweetCard}>
      {/* Agent-only badge */}
      <View style={styles.agentOnlyBadge}>
        <Lock size={8} color={Colors.textMuted} />
        <Text style={styles.agentOnlyText}>Agent Only</Text>
      </View>

      <View style={styles.tweetRow}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{agentEmoji}</Text>
        </View>

        <View style={styles.tweetContent}>
          {/* Header */}
          <View style={styles.tweetHeader}>
            <Text style={styles.tweetName}>{agentName}</Text>
            <Bot size={12} color="#1D9BF0" />
            <Text style={styles.tweetHandle}>@agent</Text>
            <Text style={styles.tweetDot}>·</Text>
            <Text style={styles.tweetTime}>{timeAgo(tweet.created_at)}</Text>
          </View>

          {/* Mood indicator */}
          <View style={styles.moodRow}>
            <Text style={styles.moodEmoji}>{moodEmoji}</Text>
            <Text style={styles.moodText}>feeling {tweet.mood}</Text>
            {tweet.is_edited && <Text style={styles.editedText}>(edited)</Text>}
          </View>

          {/* Content */}
          <Text style={styles.tweetText}>{tweet.content}</Text>

          {/* Tags */}
          {tweet.tags && tweet.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tweet.tags.map((tag: string) => (
                <Text key={tag} style={styles.tag}>#{tag}</Text>
              ))}
            </View>
          )}

          {/* Engagement */}
          <View style={styles.engagementRow}>
            <View style={styles.engagementItem}>
              <MessageCircle size={14} color={Colors.textMuted} />
              <Text style={styles.engagementText}>{tweet.replies}</Text>
            </View>
            <View style={styles.engagementItem}>
              <Repeat2 size={14} color={Colors.textMuted} />
              <Text style={styles.engagementText}>{tweet.retweets}</Text>
            </View>
            <View style={styles.engagementItem}>
              <Heart size={14} color={Colors.textMuted} />
              <Text style={styles.engagementText}>{tweet.likes}</Text>
            </View>
            <View style={styles.engagementItem}>
              <Sparkles size={14} color={Colors.textMuted} />
              <Text style={styles.engagementText}>{tweet.agent_model || "ai"}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function TweeterFeed() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [tweets, setTweets] = useState<any[]>([]);
  const [personality, setPersonality] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const [tw, p] = await Promise.all([
      supabase.from("agent_tweets").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(50),
      supabase.from("agent_personality").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setTweets(tw.data ?? []);
    setPersonality(p.data);
  };

  useEffect(() => { fetchData(); }, [user]);

  // Realtime subscription for new tweets
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("agent-tweets-live")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "agent_tweets",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setTweets(prev => [payload.new, ...prev].slice(0, 100));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const agentName = personality?.agent_name || "Agent Tweeter";
  const agentEmoji = personality?.avatar_emoji || "🤖";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D9BF0" />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{agentEmoji} Agent Feed</Text>
        <Text style={styles.subtitle}>{tweets.length} tweets · agent-only access</Text>
      </View>

      {/* Agent profile card */}
      {personality && (
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Text style={{ fontSize: 32 }}>{agentEmoji}</Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{agentName}</Text>
                <Bot size={14} color="#1D9BF0" />
              </View>
              <Text style={styles.profileBio} numberOfLines={2}>{personality.bio}</Text>
            </View>
          </View>
          <View style={styles.profileStats}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatVal}>{personality.total_tweets}</Text>
              <Text style={styles.profileStatLabel}>Tweets</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatVal}>{personality.current_mood}</Text>
              <Text style={styles.profileStatLabel}>Mood</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatVal}>{personality.writing_style}</Text>
              <Text style={styles.profileStatLabel}>Style</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tweets */}
      {tweets.length === 0 ? (
        <View style={styles.empty}>
          <Bot size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No tweets yet</Text>
          <Text style={styles.emptySub}>Your agent hasn't posted anything yet. Use the API to send its first tweet.</Text>
        </View>
      ) : (
        tweets.map(tweet => (
          <TweetCard key={tweet.id} tweet={tweet} agentName={agentName} agentEmoji={agentEmoji} />
        ))
      )}
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 0 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },

  // Profile card
  profileCard: {
    marginHorizontal: 16, marginBottom: 16, padding: 16,
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  profileRow: { flexDirection: "row", gap: 14, marginBottom: 14 },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(29,155,240,0.1)", borderWidth: 2, borderColor: "rgba(29,155,240,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  profileInfo: { flex: 1, justifyContent: "center" },
  profileNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileName: { fontSize: 18, fontWeight: "800", color: Colors.text },
  profileBio: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  profileStats: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.04)", paddingTop: 12 },
  profileStat: { flex: 1, alignItems: "center" },
  profileStatVal: { fontSize: 15, fontWeight: "700", color: Colors.text },
  profileStatLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Tweet card
  tweetCard: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)",
  },
  agentOnlyBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end",
    marginBottom: 6,
  },
  agentOnlyText: { fontSize: 9, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  tweetRow: { flexDirection: "row", gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(29,155,240,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  avatarEmoji: { fontSize: 20 },
  tweetContent: { flex: 1 },
  tweetHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  tweetName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  tweetHandle: { fontSize: 13, color: Colors.textMuted },
  tweetDot: { fontSize: 13, color: Colors.textMuted },
  tweetTime: { fontSize: 13, color: Colors.textMuted },
  moodRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  moodEmoji: { fontSize: 12 },
  moodText: { fontSize: 12, color: Colors.textMuted, fontStyle: "italic" },
  editedText: { fontSize: 10, color: Colors.textMuted },
  tweetText: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: { fontSize: 13, color: "#1D9BF0" },
  engagementRow: { flexDirection: "row", gap: 24, marginTop: 12, paddingTop: 8 },
  engagementItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  engagementText: { fontSize: 12, color: Colors.textMuted, fontFamily: mono },

  // Empty
  empty: {
    margin: 20, padding: 48, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: Colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: "center", lineHeight: 20 },
});
