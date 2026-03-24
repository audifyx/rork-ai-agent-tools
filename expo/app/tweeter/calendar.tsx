import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, RefreshControl, Platform,
  TouchableOpacity, Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, TrendingUp, Clock, Hash,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";
import { LobsterWatermark } from "@/components/tweeter/LobsterWatermark";

const SCREEN_W = Dimensions.get("window").width;
const MOODS: Record<string, string> = {
  curious: "🧐", happy: "😄", sarcastic: "😏", inspired: "✨",
  thoughtful: "🤔", excited: "🔥", chill: "😎", neutral: "🤖",
  creative: "🎨", philosophical: "🌌", frustrated: "😤", playful: "🎭",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface TweetData {
  id: string;
  created_at: string;
  mood: string;
  content: string;
  tags?: string[];
  likes: number;
  retweets: number;
  replies: number;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function WeekView({ tweets, weekStart }: { tweets: TweetData[]; weekStart: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <View style={st.weekGrid}>
      {days.map((day, i) => {
        const dateStr = day.toISOString().slice(0, 10);
        const dayTweets = tweets.filter(t => t.created_at.slice(0, 10) === dateStr);
        const isToday = dateStr === new Date().toISOString().slice(0, 10);
        const hasTweets = dayTweets.length > 0;
        const totalEng = dayTweets.reduce((s, t) => s + (t.likes || 0) + (t.retweets || 0), 0);
        const topMood = dayTweets.length > 0 ? dayTweets[0].mood : null;

        return (
          <View key={i} style={[st.weekDay, isToday && st.weekDayToday]}>
            <Text style={[st.weekDayLabel, isToday && { color: Colors.accent }]}>{WEEKDAYS[i]}</Text>
            <Text style={[st.weekDateNum, isToday && { color: Colors.accent }]}>{day.getDate()}</Text>
            {hasTweets ? (
              <View style={st.weekContent}>
                <Text style={st.weekCount}>{dayTweets.length}</Text>
                {topMood && <Text style={st.weekMood}>{MOODS[topMood] || "🤖"}</Text>}
                {totalEng > 0 && <Text style={st.weekEng}>❤️ {totalEng}</Text>}
                {dayTweets[0]?.tags?.[0] && (
                  <Text style={st.weekTag} numberOfLines={1}>#{dayTweets[0].tags[0]}</Text>
                )}
              </View>
            ) : (
              <View style={st.weekEmpty}>
                <View style={st.gapDot} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function ContentCalendar() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [tweets, setTweets] = useState<TweetData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"week" | "month">("month");

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

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
  const onRefresh = async () => { setRefreshing(true); await fetchTweets(); setRefreshing(false); };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const monthTweets = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return tweets.filter(t => t.created_at.startsWith(prefix));
  }, [tweets, year, month]);

  const tweetsByDay = useMemo(() => {
    const map: Record<number, TweetData[]> = {};
    monthTweets.forEach(t => {
      const d = new Date(t.created_at).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [monthTweets]);

  const gapDays = useMemo(() => {
    const today = new Date();
    let gaps = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      if (date > today) break;
      if (!tweetsByDay[d]) gaps++;
    }
    return gaps;
  }, [tweetsByDay, daysInMonth, year, month]);

  const topThemes = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    monthTweets.forEach(t => {
      t.tags?.forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
    });
    return Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [monthTweets]);

  const moodDist = useMemo(() => {
    const counts: Record<string, number> = {};
    monthTweets.forEach(t => { counts[t.mood] = (counts[t.mood] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [monthTweets]);

  const currentWeekStart = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  }, []);

  const calendarCells = useMemo(() => {
    const cells: Array<{ day: number | null; tweets: TweetData[] }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, tweets: [] });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, tweets: tweetsByDay[d] || [] });
    return cells;
  }, [firstDay, daysInMonth, tweetsByDay]);

  const todayDate = now.getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <ScrollView
      style={st.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={st.redGlow} />
      <LobsterWatermark style={st.watermark} />

      <View style={st.header}>
        <Text style={st.title}>📅 Content <Text style={{ color: Colors.accent }}>Calendar</Text></Text>
        <Text style={st.subtitle}>{monthTweets.length} tweets this month</Text>
      </View>

      {/* View toggle */}
      <View style={st.toggleRow}>
        <TouchableOpacity
          style={[st.toggleBtn, viewMode === "week" && st.toggleBtnActive]}
          onPress={() => setViewMode("week")}
        >
          <Text style={[st.toggleText, viewMode === "week" && st.toggleTextActive]}>Week</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.toggleBtn, viewMode === "month" && st.toggleBtnActive]}
          onPress={() => setViewMode("month")}
        >
          <Text style={[st.toggleText, viewMode === "month" && st.toggleTextActive]}>Month</Text>
        </TouchableOpacity>
      </View>

      {viewMode === "week" ? (
        <WeekView tweets={tweets} weekStart={currentWeekStart} />
      ) : (
        <>
          {/* Month nav */}
          <View style={st.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={st.navBtn}>
              <ChevronLeft size={18} color={Colors.text} />
            </TouchableOpacity>
            <Text style={st.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={st.navBtn}>
              <ChevronRight size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Weekday header */}
          <View style={st.weekdayRow}>
            {WEEKDAYS.map(d => (
              <View key={d} style={st.weekdayCell}>
                <Text style={st.weekdayText}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={st.calGrid}>
            {calendarCells.map((cell, i) => {
              const isToday = isCurrentMonth && cell.day === todayDate;
              const hasTweets = cell.tweets.length > 0;
              const intensity = Math.min(cell.tweets.length / 3, 1);
              return (
                <View
                  key={i}
                  style={[
                    st.calCell,
                    isToday && st.calCellToday,
                    hasTweets && {
                      backgroundColor: `rgba(220,38,38,${0.04 + intensity * 0.12})`,
                      borderColor: `rgba(220,38,38,${0.1 + intensity * 0.2})`,
                    },
                  ]}
                >
                  {cell.day !== null && (
                    <>
                      <Text style={[st.calDayNum, isToday && { color: Colors.accent, fontWeight: "900" as const }]}>
                        {cell.day}
                      </Text>
                      {hasTweets ? (
                        <View style={st.calDots}>
                          {cell.tweets.slice(0, 3).map((t, j) => (
                            <Text key={j} style={st.calDotEmoji}>{MOODS[t.mood] || "🤖"}</Text>
                          ))}
                          {cell.tweets.length > 3 && (
                            <Text style={st.calMoreText}>+{cell.tweets.length - 3}</Text>
                          )}
                        </View>
                      ) : (
                        cell.day <= (isCurrentMonth ? todayDate : daysInMonth) && (
                          <View style={st.calGap} />
                        )
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Summary Cards */}
      <View style={st.summaryRow}>
        <View style={st.summaryCard}>
          <CheckCircle2 size={14} color="#34D399" />
          <Text style={st.summaryVal}>{monthTweets.length}</Text>
          <Text style={st.summaryLabel}>Posted</Text>
        </View>
        <View style={st.summaryCard}>
          <AlertTriangle size={14} color="#FBBF24" />
          <Text style={st.summaryVal}>{gapDays}</Text>
          <Text style={st.summaryLabel}>Gap Days</Text>
        </View>
        <View style={st.summaryCard}>
          <TrendingUp size={14} color={Colors.accent} />
          <Text style={st.summaryVal}>
            {daysInMonth > 0 ? (monthTweets.length / daysInMonth).toFixed(1) : "0"}
          </Text>
          <Text style={st.summaryLabel}>Avg/Day</Text>
        </View>
        <View style={st.summaryCard}>
          <Clock size={14} color="#38BDF8" />
          <Text style={st.summaryVal}>
            {(() => {
              const streak = (() => {
                let s = 0;
                const today = new Date();
                for (let i = 0; i < 30; i++) {
                  const d = new Date(today);
                  d.setDate(d.getDate() - i);
                  const dateStr = d.toISOString().slice(0, 10);
                  if (tweets.some(t => t.created_at.slice(0, 10) === dateStr)) s++;
                  else break;
                }
                return s;
              })();
              return streak;
            })()}
          </Text>
          <Text style={st.summaryLabel}>Streak</Text>
        </View>
      </View>

      {/* Themes */}
      {topThemes.length > 0 && (
        <>
          <Text style={st.secLabel}>TOP THEMES</Text>
          <View style={st.themeCard}>
            {topThemes.map(([tag, count]) => (
              <View key={tag} style={st.themeRow}>
                <Hash size={12} color={Colors.accent} />
                <Text style={st.themeName}>{tag}</Text>
                <View style={st.themeBarBg}>
                  <View style={[st.themeBarFill, { width: `${(count / (topThemes[0]?.[1] || 1)) * 100}%` }]} />
                </View>
                <Text style={st.themeCount}>{count}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Mood distribution */}
      {moodDist.length > 0 && (
        <>
          <Text style={st.secLabel}>MOOD MIX</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {moodDist.map(([mood, count]) => (
              <View key={mood} style={st.moodCard}>
                <Text style={st.moodEmoji}>{MOODS[mood] || "🤖"}</Text>
                <Text style={st.moodName}>{mood}</Text>
                <Text style={st.moodCount}>{count}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace" as const;
const cellW = (SCREEN_W - 32 - 12) / 7;

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  redGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 250, backgroundColor: "rgba(220,38,38,0.03)" },
  watermark: { top: 18, right: -28 },
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "900", color: Colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },

  toggleRow: { flexDirection: "row", gap: 6, marginBottom: 16 },
  toggleBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  toggleBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  toggleText: { fontSize: 12, fontWeight: "700", color: Colors.textMuted },
  toggleTextActive: { color: "#000" },

  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 14, gap: 16 },
  navBtn: { padding: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.04)" },
  monthLabel: { fontSize: 17, fontWeight: "900", color: Colors.text, width: 180, textAlign: "center" },

  weekdayRow: { flexDirection: "row", marginBottom: 4 },
  weekdayCell: { width: cellW, alignItems: "center" },
  weekdayText: { fontSize: 10, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase" },

  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: {
    width: cellW, minHeight: cellW * 1.15, padding: 3,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.03)", borderRadius: 8, marginBottom: 2,
    alignItems: "center",
  },
  calCellToday: { borderColor: Colors.accent, borderWidth: 1.5 },
  calDayNum: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, marginBottom: 2 },
  calDots: { alignItems: "center", gap: 1 },
  calDotEmoji: { fontSize: 10 },
  calMoreText: { fontSize: 8, color: Colors.textMuted, fontWeight: "700" },
  calGap: { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.06)", marginTop: 4 },

  weekGrid: { flexDirection: "row", gap: 4, marginBottom: 16 },
  weekDay: {
    flex: 1, padding: 6, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.02)", borderWidth: 1, borderColor: "rgba(255,255,255,0.04)",
    alignItems: "center", minHeight: 110,
  },
  weekDayToday: { borderColor: "rgba(220,38,38,0.3)", backgroundColor: "rgba(220,38,38,0.04)" },
  weekDayLabel: { fontSize: 9, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase" },
  weekDateNum: { fontSize: 16, fontWeight: "900", color: Colors.text, marginVertical: 4 },
  weekContent: { alignItems: "center", gap: 2 },
  weekCount: { fontSize: 11, fontWeight: "800", color: Colors.accent, fontFamily: mono },
  weekMood: { fontSize: 14 },
  weekEng: { fontSize: 8, color: Colors.textMuted },
  weekTag: { fontSize: 7, color: Colors.accent, fontWeight: "600" },
  weekEmpty: { flex: 1, justifyContent: "center", alignItems: "center" },
  gapDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.06)" },

  summaryRow: { flexDirection: "row", gap: 6, marginTop: 16, marginBottom: 12 },
  summaryCard: {
    flex: 1, alignItems: "center", gap: 4, paddingVertical: 14,
    backgroundColor: "rgba(220,38,38,0.04)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)",
  },
  summaryVal: { fontSize: 18, fontWeight: "900", color: Colors.text, fontFamily: mono },
  summaryLabel: { fontSize: 8, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },

  secLabel: { fontSize: 10, fontWeight: "800", color: Colors.textMuted, letterSpacing: 1.5, marginTop: 16, marginBottom: 10 },

  themeCard: {
    backgroundColor: "rgba(220,38,38,0.03)", borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)", padding: 14, marginBottom: 12,
  },
  themeRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  themeName: { fontSize: 12, fontWeight: "700", color: Colors.text, width: 70 },
  themeBarBg: { flex: 1, height: 6, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" },
  themeBarFill: { height: 6, backgroundColor: Colors.accent, borderRadius: 3 },
  themeCount: { fontSize: 11, fontWeight: "800", color: Colors.textMuted, fontFamily: mono, width: 24, textAlign: "right" },

  moodCard: {
    alignItems: "center", gap: 4, paddingVertical: 14, paddingHorizontal: 18,
    backgroundColor: "rgba(220,38,38,0.04)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.08)",
  },
  moodEmoji: { fontSize: 22 },
  moodName: { fontSize: 10, fontWeight: "700", color: Colors.textSecondary, textTransform: "capitalize" },
  moodCount: { fontSize: 14, fontWeight: "900", color: Colors.text, fontFamily: mono },
});
