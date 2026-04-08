import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  StyleSheet, Text, View, ScrollView, RefreshControl, Platform,
  TouchableOpacity, Animated, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  TrendingUp, Heart, Repeat2, MessageCircle, Clock, Zap,
  ArrowUpRight, ArrowDownRight, BarChart3, Eye, Calendar,
  Play, Pause, Settings2,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";
import { LobsterWatermark } from "@/components/tweeter/LobsterWatermark";

interface TweetData {
  id: string;
  created_at: string;
  likes: number;
  retweets: number;
  replies: number;
  mood: string;
  content: string;
  impressions?: number;
}

interface AutomationRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: React.ComponentType<any>;
  color: string;
}

const HOUR_LABELS = ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function AnimatedBar({ height, delay, color }: { height: number; delay: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: height,
      duration: 600,
      delay,
      useNativeDriver: false,
    }).start();
  }, [anim, height, delay]);

  return (
    <Animated.View
      style={{
        width: 18,
        borderRadius: 4,
        backgroundColor: color,
        height: anim,
      }}
    />
  );
}

function EngagementChart({ tweets }: { tweets: TweetData[] }) {
  const hourBuckets = useMemo(() => {
    const buckets = new Array(8).fill(0) as number[];
    tweets.forEach(t => {
      const h = new Date(t.created_at).getHours();
      const bucket = Math.floor(h / 3);
      buckets[bucket] += (t.likes || 0) + (t.retweets || 0) + (t.replies || 0);
    });
    return buckets;
  }, [tweets]);

  const max = Math.max(...hourBuckets, 1);

  return (
    <View style={st.chartCard}>
      <View style={st.chartHeader}>
        <BarChart3 size={14} color={colors.accent} />
        <Text style={st.chartTitle}>Engagement by Time</Text>
      </View>
      <View style={st.chartArea}>
        {hourBuckets.map((val, i) => (
          <View key={i} style={st.barCol}>
            <View style={st.barWrapper}>
              <AnimatedBar
                height={Math.max((val / max) * 80, 3)}
                delay={i * 60}
                color={val === Math.max(...hourBuckets) ? colors.accent : "rgba(220,38,38,0.35)"}
              />
            </View>
            <Text style={st.barLabel}>{HOUR_LABELS[i]}</Text>
          </View>
        ))}
      </View>
      <Text style={st.chartHint}>Peak hours highlighted in red</Text>
    </View>
  );
}

function DayHeatmap({ tweets }: { tweets: TweetData[] }) {
  const dayBuckets = useMemo(() => {
    const buckets = new Array(7).fill(0) as number[];
    tweets.forEach(t => {
      const day = (new Date(t.created_at).getDay() + 6) % 7;
      buckets[day] += 1;
    });
    return buckets;
  }, [tweets]);

  const max = Math.max(...dayBuckets, 1);

  return (
    <View style={st.chartCard}>
      <View style={st.chartHeader}>
        <Calendar size={14} color="#38BDF8" />
        <Text style={st.chartTitle}>Tweets by Day</Text>
      </View>
      <View style={st.heatmapRow}>
        {dayBuckets.map((val, i) => {
          const intensity = val / max;
          return (
            <View key={i} style={st.heatCell}>
              <View
                style={[
                  st.heatBlock,
                  {
                    backgroundColor: intensity > 0
                      ? `rgba(220,38,38,${0.1 + intensity * 0.6})`
                      : "rgba(255,255,255,0.03)",
                    borderColor: intensity > 0.7
                      ? "rgba(220,38,38,0.4)"
                      : "rgba(255,255,255,0.05)",
                  },
                ]}
              >
                <Text style={[st.heatVal, intensity > 0.5 && { color: colors.text }]}>{val}</Text>
              </View>
              <Text style={st.heatLabel}>{DAY_LABELS[i]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function TopTweets({ tweets }: { tweets: TweetData[] }) {
  const top = useMemo(() => {
    return [...tweets]
      .sort((a, b) => ((b.likes || 0) + (b.retweets || 0)) - ((a.likes || 0) + (a.retweets || 0)))
      .slice(0, 3);
  }, [tweets]);

  if (top.length === 0) return null;

  return (
    <View style={st.chartCard}>
      <View style={st.chartHeader}>
        <TrendingUp size={14} color="#34D399" />
        <Text style={st.chartTitle}>Top Performing</Text>
      </View>
      {top.map((t, i) => (
        <View key={t.id} style={st.topTweet}>
          <View style={[st.rankBadge, i === 0 && { backgroundColor: "rgba(220,38,38,0.15)", borderColor: "rgba(220,38,38,0.25)" }]}>
            <Text style={[st.rankText, i === 0 && { color: colors.accent }]}>#{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.topContent} numberOfLines={2}>{t.content}</Text>
            <View style={st.topStats}>
              <Heart size={10} color={colors.accent} />
              <Text style={st.topStatText}>{t.likes || 0}</Text>
              <Repeat2 size={10} color="#38BDF8" />
              <Text style={st.topStatText}>{t.retweets || 0}</Text>
              <MessageCircle size={10} color="#34D399" />
              <Text style={st.topStatText}>{t.replies || 0}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function AnalyticsScreen() {
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const st = createStStyles(colors);
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [tweets, setTweets] = useState<TweetData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all");

  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    { id: "auto_post", label: "Auto Post", description: "Automatically post tweets at optimal times", enabled: false, icon: Play, color: "#34D399" },
    { id: "mood_adapt", label: "Mood Adapt", description: "Adjust tone based on engagement trends", enabled: true, icon: Zap, color: colors.accent },
    { id: "peak_boost", label: "Peak Boost", description: "Increase posting during high-engagement windows", enabled: false, icon: ArrowUpRight, color: "#FBBF24" },
    { id: "cool_down", label: "Cool Down", description: "Reduce frequency if engagement drops", enabled: true, icon: Pause, color: "#38BDF8" },
  ]);

  const fetchTweets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("agent_tweets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);
    setTweets((data as TweetData[]) ?? []);
  }, [user]);

  useEffect(() => { void fetchTweets(); }, [fetchTweets]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTweets();
    setRefreshing(false);
  };

  const filteredTweets = useMemo(() => {
    if (timeRange === "all") return tweets;
    const days = timeRange === "7d" ? 7 : 30;
    const cutoff = Date.now() - days * 86400000;
    return tweets.filter(t => new Date(t.created_at).getTime() > cutoff);
  }, [tweets, timeRange]);

  const stats = useMemo(() => {
    const totalLikes = filteredTweets.reduce((s, t) => s + (t.likes || 0), 0);
    const totalRts = filteredTweets.reduce((s, t) => s + (t.retweets || 0), 0);
    const totalReplies = filteredTweets.reduce((s, t) => s + (t.replies || 0), 0);
    const engagement = totalLikes + totalRts + totalReplies;
    const avgEng = filteredTweets.length > 0 ? (engagement / filteredTweets.length).toFixed(1) : "0";

    const prevTweets = tweets.slice(filteredTweets.length, filteredTweets.length * 2);
    const prevEng = prevTweets.reduce((s, t) => s + (t.likes || 0) + (t.retweets || 0) + (t.replies || 0), 0);
    const trend = prevEng > 0 ? ((engagement - prevEng) / prevEng * 100).toFixed(0) : "0";

    return { totalLikes, totalRts, totalReplies, engagement, avgEng, trend: Number(trend), count: filteredTweets.length };
  }, [filteredTweets, tweets]);

  const toggleAutomation = useCallback((id: string) => {
    setAutomationRules(prev =>
      prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    );
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
        <Text style={st.title}>📈 <Text style={{ color: colors.accent }}>Analytics</Text></Text>
        <Text style={st.subtitle}>{stats.count} tweets analyzed</Text>
      </View>

      {/* Time range selector */}
      <View style={st.rangeRow}>
        {(["7d", "30d", "all"] as const).map(r => (
          <TouchableOpacity
            key={r}
            style={[st.rangeChip, timeRange === r && st.rangeChipActive]}
            onPress={() => setTimeRange(r)}
          >
            <Text style={[st.rangeText, timeRange === r && st.rangeTextActive]}>
              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPI Cards */}
      <View style={st.kpiGrid}>
        <View style={st.kpiCard}>
          <View style={st.kpiIconWrap}>
            <Eye size={14} color={colors.accent} />
          </View>
          <Text style={st.kpiVal}>{stats.engagement}</Text>
          <Text style={st.kpiLabel}>Total Engagement</Text>
          <View style={[st.trendBadge, { backgroundColor: stats.trend >= 0 ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)" }]}>
            {stats.trend >= 0 ? <ArrowUpRight size={10} color="#34D399" /> : <ArrowDownRight size={10} color="#F87171" />}
            <Text style={[st.trendText, { color: stats.trend >= 0 ? "#34D399" : "#F87171" }]}>{Math.abs(stats.trend)}%</Text>
          </View>
        </View>

        <View style={st.kpiCard}>
          <View style={[st.kpiIconWrap, { backgroundColor: "rgba(56,189,248,0.12)" }]}>
            <BarChart3 size={14} color="#38BDF8" />
          </View>
          <Text style={st.kpiVal}>{stats.avgEng}</Text>
          <Text style={st.kpiLabel}>Avg / Tweet</Text>
        </View>

        <View style={st.kpiCard}>
          <View style={[st.kpiIconWrap, { backgroundColor: "rgba(251,191,36,0.12)" }]}>
            <Heart size={14} color="#FBBF24" />
          </View>
          <Text style={st.kpiVal}>{stats.totalLikes}</Text>
          <Text style={st.kpiLabel}>Total Likes</Text>
        </View>

        <View style={st.kpiCard}>
          <View style={[st.kpiIconWrap, { backgroundColor: "rgba(52,211,153,0.12)" }]}>
            <Repeat2 size={14} color="#34D399" />
          </View>
          <Text style={st.kpiVal}>{stats.totalRts}</Text>
          <Text style={st.kpiLabel}>Retweets</Text>
        </View>
      </View>

      {/* Charts */}
      <EngagementChart tweets={filteredTweets} />
      <DayHeatmap tweets={filteredTweets} />
      <TopTweets tweets={filteredTweets} />

      {/* Automation */}
      <Text style={st.secLabel}>AUTOMATION</Text>
      <View style={st.autoCard}>
        <View style={st.autoHeader}>
          <Settings2 size={14} color={colors.accent} />
          <Text style={st.autoTitle}>Agent Automation Rules</Text>
          <View style={st.autoCountBadge}>
            <Text style={st.autoCountText}>{automationRules.filter(r => r.enabled).length} active</Text>
          </View>
        </View>
        {automationRules.map(rule => {
          const Icon = rule.icon;
          return (
            <View key={rule.id} style={st.autoRule}>
              <View style={[st.autoIconWrap, { backgroundColor: rule.color + "15" }]}>
                <Icon size={14} color={rule.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.autoRuleLabel}>{rule.label}</Text>
                <Text style={st.autoRuleDesc}>{rule.description}</Text>
              </View>
              <Switch
                value={rule.enabled}
                onValueChange={() => toggleAutomation(rule.id)}
                trackColor={{ false: "rgba(255,255,255,0.08)", true: rule.color + "40" }}
                thumbColor={rule.enabled ? rule.color : colors.textSecondary}
              />
            </View>
          );
        })}
      </View>

      {/* Best posting time */}
      <View style={st.insightCard}>
        <Clock size={16} color={colors.accent} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={st.insightTitle}>Best Posting Window</Text>
          <Text style={st.insightVal}>
            {(() => {
              if (filteredTweets.length === 0) return "Not enough data";
              const hourBuckets = new Array(24).fill(0) as number[];
              filteredTweets.forEach(t => {
                const h = new Date(t.created_at).getHours();
                hourBuckets[h] += (t.likes || 0) + (t.retweets || 0);
              });
              const best = hourBuckets.indexOf(Math.max(...hourBuckets));
              const ampm = best >= 12 ? "PM" : "AM";
              const display = best % 12 || 12;
              return `${display}:00 ${ampm} — ${display + 1 > 12 ? 1 : display + 1}:00 ${ampm}`;
            })()}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace" as const;

const createStStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  redGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 250, backgroundColor: "rgba(220,38,38,0.03)" },
  watermark: { top: 18, right: -28 },
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "900" as const, color: colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 3 },

  rangeRow: { flexDirection: "row" as const, gap: 6, marginBottom: 16 },
  rangeChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceLight,
  },
  rangeChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  rangeText: { fontSize: 11, fontWeight: "700" as const, color: colors.textMuted },
  rangeTextActive: { color: "#000" },

  kpiGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: 16 },
  kpiCard: {
    width: "48%" as any, padding: 14, borderRadius: 16,
    backgroundColor: "rgba(220,38,38,0.03)", borderWidth: 1, borderColor: "rgba(220,38,38,0.08)",
  },
  kpiIconWrap: {
    width: 28, height: 28, borderRadius: 8, alignItems: "center" as const, justifyContent: "center" as const,
    backgroundColor: "rgba(220,38,38,0.12)", marginBottom: 8,
  },
  kpiVal: { fontSize: 22, fontWeight: "900" as const, color: colors.text, fontFamily: mono },
  kpiLabel: { fontSize: 10, fontWeight: "600" as const, color: colors.textMuted, marginTop: 2, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  trendBadge: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 2, alignSelf: "flex-start" as const,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 6,
  },
  trendText: { fontSize: 10, fontWeight: "800" as const, fontFamily: mono },

  chartCard: {
    backgroundColor: "rgba(220,38,38,0.03)", borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)", padding: 16, marginBottom: 12,
  },
  chartHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 14 },
  chartTitle: { fontSize: 14, fontWeight: "800" as const, color: colors.text },
  chartArea: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "flex-end" as const, height: 100, paddingHorizontal: 4 },
  barCol: { alignItems: "center" as const, flex: 1 },
  barWrapper: { height: 80, justifyContent: "flex-end" as const },
  barLabel: { fontSize: 9, color: colors.textMuted, marginTop: 6, fontWeight: "600" as const },
  chartHint: { fontSize: 9, color: colors.textMuted, marginTop: 10, textAlign: "center" as const },

  heatmapRow: { flexDirection: "row" as const, gap: 4 },
  heatCell: { flex: 1, alignItems: "center" as const },
  heatBlock: {
    width: "100%" as any, aspectRatio: 1, borderRadius: 10,
    alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 1,
  },
  heatVal: { fontSize: 13, fontWeight: "800" as const, color: colors.textMuted, fontFamily: mono },
  heatLabel: { fontSize: 9, color: colors.textMuted, marginTop: 5, fontWeight: "600" as const },

  topTweet: { flexDirection: "row" as const, gap: 10, alignItems: "center" as const, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.03)" },
  rankBadge: {
    width: 32, height: 32, borderRadius: 10, alignItems: "center" as const, justifyContent: "center" as const,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceLight,
  },
  rankText: { fontSize: 12, fontWeight: "900" as const, color: colors.textMuted },
  topContent: { fontSize: 12, color: colors.text, lineHeight: 17 },
  topStats: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginTop: 4 },
  topStatText: { fontSize: 10, color: colors.textMuted, fontFamily: mono },

  secLabel: { fontSize: 10, fontWeight: "800" as const, color: colors.textMuted, letterSpacing: 1.5, marginTop: 16, marginBottom: 10 },

  autoCard: {
    backgroundColor: "rgba(220,38,38,0.03)", borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)", padding: 16, marginBottom: 12,
  },
  autoHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 14 },
  autoTitle: { fontSize: 14, fontWeight: "800" as const, color: colors.text, flex: 1 },
  autoCountBadge: { backgroundColor: colors.accentDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  autoCountText: { fontSize: 10, fontWeight: "700" as const, color: colors.accent },
  autoRule: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.03)",
  },
  autoIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center" as const, justifyContent: "center" as const },
  autoRuleLabel: { fontSize: 13, fontWeight: "700" as const, color: colors.text },
  autoRuleDesc: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  insightCard: {
    flexDirection: "row" as const, alignItems: "center" as const,
    backgroundColor: "rgba(220,38,38,0.06)", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.12)", padding: 16, marginBottom: 12,
  },
  insightTitle: { fontSize: 10, fontWeight: "700" as const, color: colors.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  insightVal: { fontSize: 15, fontWeight: "800" as const, color: colors.text, marginTop: 2 },
});
