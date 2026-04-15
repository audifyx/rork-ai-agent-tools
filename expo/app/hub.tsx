import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert, Animated, Dimensions, Image, Linking, Modal,
  Platform, ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, Vibration, View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Search, X, LogOut, ChevronRight, Wifi, Battery, Signal, Palette } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";
import ColorfulBackground from "@/components/ColorfulBackground";
import GlassCard from "@/components/GlassCard";

const { width: W, height: H } = Dimensions.get("window");
const COLS = 4;
const PAD = 16;
const CELL_W = (W - PAD * 2) / COLS;

interface AppItem {
  id: string;
  name: string;
  emoji: string;
  color: string;
  dark: string;
  route: string | null;
  external?: boolean;
  badge: string | null;
  page: number;
  pos: number;
  folderId?: string;
}

interface Folder {
  id: string;
  name: string;
  appIds: string[];
  page: number;
  pos: number;
}

const DEFAULT_APPS: AppItem[] = [
  { id: "openclaw", name: "OpenClaw", emoji: "🦞", color: "#0078D4", dark: "#005A9E", route: "/openclaw", badge: "CORE", page: 0, pos: 0 },
  { id: "tweeter", name: "Tweeter", emoji: "🐦", color: "#6366F1", dark: "#4F46E5", route: "/tweeter", badge: "NEW", page: 0, pos: 1 },
  { id: "vault", name: "Vault", emoji: "🔐", color: "#A855F7", dark: "#9333EA", route: "/vault", badge: null, page: 0, pos: 2 },
  { id: "analytics", name: "Analytics", emoji: "📊", color: "#10B981", dark: "#059669", route: "/analytics", badge: null, page: 0, pos: 3 },
  { id: "swarm", name: "Swarm", emoji: "🐝", color: "#F59E0B", dark: "#D97706", route: "/swarm", badge: "NEW", page: 0, pos: 4 },
  { id: "pages", name: "Pages", emoji: "🌐", color: "#3B82F6", dark: "#2563EB", route: "/pages", badge: null, page: 0, pos: 5 },
  { id: "imagegen", name: "ImageGen", emoji: "🎨", color: "#EC4899", dark: "#DB2777", route: "/imagegen", badge: "NEW", page: 0, pos: 6 },
  { id: "activity", name: "Activity", emoji: "⚡", color: "#F97316", dark: "#EA580C", route: "/activity", badge: null, page: 0, pos: 7 },
  { id: "notifs", name: "Alerts", emoji: "🔔", color: "#EF4444", dark: "#DC2626", route: "/notifications", badge: null, page: 0, pos: 8 },
  { id: "settings", name: "Settings", emoji: "⚙️", color: "#6B7280", dark: "#4B5563", route: "/settings", badge: null, page: 0, pos: 9 },
  { id: "themes", name: "Themes", emoji: "🎨", color: "#0078D4", dark: "#005A9E", route: "/theme-settings", badge: "NEW", page: 0, pos: 10 },
  { id: "notebook", name: "Notebook", emoji: "📓", color: "#0078D4", dark: "#005A9E", route: null, badge: "SOON", page: 1, pos: 0 },
  { id: "scheduler", name: "Scheduler", emoji: "⏰", color: "#14B8A6", dark: "#0D9488", route: null, badge: "SOON", page: 1, pos: 1 },
  { id: "mailer", name: "Mailer", emoji: "📧", color: "#F97316", dark: "#EA580C", route: null, badge: "SOON", page: 1, pos: 2 },
  { id: "scraper", name: "Scraper", emoji: "🕷️", color: "#6366F1", dark: "#4F46E5", route: null, badge: "SOON", page: 1, pos: 3 },
  { id: "agentcode", name: "AgentCode", emoji: "💻", color: "#06B6D4", dark: "#0891B2", route: "https://agentcode.lovable.app/", external: true, badge: null, page: 1, pos: 4 },
  { id: "nexus", name: "Nexus", emoji: "🔮", color: "#A855F7", dark: "#9333EA", route: "https://nexus-skillhub.lovable.app/", external: true, badge: "NEW", page: 1, pos: 5 },
];

const TASKBAR_ITEMS = [
  { id: "activity", emoji: "⚡", label: "Activity", route: "/activity", color: "#F97316" },
  { id: "notifs", emoji: "🔔", label: "Alerts", route: "/notifications", color: "#EF4444" },
  { id: "swarm", emoji: "🐝", label: "Swarm", route: "/swarm", color: "#F59E0B" },
  { id: "settings", emoji: "⚙️", label: "Settings", route: "/settings", color: "#6B7280" },
];

const STORAGE_KEY = "@openclaw_home_v5";

function useWiggle(wiggling: boolean) {
  const rot = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (wiggling) {
      const delay = Math.random() * 120;
      animRef.current = Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(rot, { toValue: 1, duration: 85, useNativeDriver: true }),
        Animated.timing(rot, { toValue: -1, duration: 85, useNativeDriver: true }),
        Animated.timing(rot, { toValue: 1, duration: 85, useNativeDriver: true }),
        Animated.timing(rot, { toValue: 0, duration: 85, useNativeDriver: true }),
        Animated.delay(100),
      ]));
      animRef.current.start();
    } else {
      animRef.current?.stop();
      Animated.spring(rot, { toValue: 0, tension: 300, friction: 10, useNativeDriver: true }).start();
    }
  }, [wiggling, rot]);

  return rot.interpolate({ inputRange: [-1, 1], outputRange: ["-2.8deg", "2.8deg"] });
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const isWin11 = theme.id === "win11_dark" || theme.id === "win11_light";

  const [apps, setApps] = useState<AppItem[]>(DEFAULT_APPS);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [page, setPage] = useState(0);
  const [wiggling, setWiggling] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  const [folderVisible, setFolderVisible] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("New Folder");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const hScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw);
        if (s.apps?.length) setApps(s.apps);
        if (s.folders?.length) setFolders(s.folders);
      } catch { /* ignore */ }
    });
  }, []);

  const save = useCallback((a: AppItem[], f: Folder[]) => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ apps: a, folders: f }));
  }, []);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const results = await Promise.allSettled([
          supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
          supabase.from("agent_tweets").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("swarm_agents").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active"),
          supabase.from("generated_images").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);
        const safeCount = (r: PromiseSettledResult<unknown>) =>
          r.status === "fulfilled" ? ((r.value as { count?: number })?.count ?? 0) : 0;
        setBadges({
          notifs: safeCount(results[0]),
          tweeter: safeCount(results[1]),
          swarm: safeCount(results[2]),
          imagegen: safeCount(results[3]),
        });
      } catch (e) {
        console.log("[hub] badge fetch failed", e);
      }
      try {
        const { data: wp } = await supabase.from("ai_wallpapers")
          .select("image_url").eq("user_id", user.id).eq("is_active", true).maybeSingle();
        if (wp?.image_url) setWallpaper(wp.image_url);
      } catch (e) {
        console.log("[hub] wallpaper fetch failed", e);
      }
    })();
  }, [user]);

  const enterWiggle = () => { Vibration.vibrate(25); setWiggling(true); setSelected([]); };
  const exitWiggle = () => { setWiggling(false); setSelected([]); };

  const handleApp = useCallback((app: AppItem) => {
    if (wiggling) {
      if (app.badge === "SOON") return;
      setSelected(p => p.includes(app.id) ? p.filter(x => x !== app.id) : [...p, app.id]);
      return;
    }
    if (app.badge === "SOON") return;
    if (app.external && app.route) { void Linking.openURL(app.route); return; }
    if (app.route) router.push(app.route as any);
  }, [wiggling, router]);

  const createFolder = () => {
    if (selected.length < 2) return;
    const firstApp = apps.find(a => a.id === selected[0]);
    const folder: Folder = {
      id: `folder_${Date.now()}`,
      name: folderName.trim() || "Folder",
      appIds: selected,
      page: firstApp?.page ?? 0,
      pos: firstApp?.pos ?? 0,
    };
    const newApps = apps.map(a => selected.includes(a.id) ? { ...a, folderId: folder.id } : a);
    const newFolders = [...folders, folder];
    setApps(newApps); setFolders(newFolders); save(newApps, newFolders);
    setShowNewFolder(false); setSelected([]); setWiggling(false); setFolderName("New Folder");
  };

  const deleteFolder = (fid: string) => {
    Alert.alert("Delete Folder", "Apps will return to the home screen.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        const newApps = apps.map(a => a.folderId === fid ? { ...a, folderId: undefined } : a);
        const newFolders = folders.filter(f => f.id !== fid);
        setApps(newApps); setFolders(newFolders); save(newApps, newFolders);
      }},
    ]);
  };

  const removeApp = (id: string) => {
    const newApps = apps.map(a => a.id === id ? { ...a, page: 99 } : a);
    setApps(newApps); save(newApps, folders);
  };

  const searchResults = search.trim()
    ? apps.filter(a => !a.folderId && a.page < 10 && a.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const pageApps = (p: number) => apps.filter(a => a.page === p && !a.folderId).sort((a, b) => a.pos - b.pos);
  const pageFolders = (p: number) => folders.filter(f => f.page === p);
  const recommendedApps = apps.filter(a => a.badge === "NEW" || a.badge === "CORE").slice(0, 6);

  const bgLayer = wallpaper ? (
    <>
      <Image source={{ uri: wallpaper }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(243,243,243,0.55)" }]} />
    </>
  ) : (
    <ColorfulBackground variant="home" />
  );

  if (isWin11) {
    return (
      <View style={[w.root, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={theme.statusBar} />
        {bgLayer}

        <Win11StatusTray insets={insets} colors={colors} isDark={isDark} />

        {showSearch ? (
          <View style={[w.searchExpandedWrap, { top: insets.top + 52 }]}>
            <View style={[w.searchExpanded, { backgroundColor: isDark ? "rgba(45,45,45,0.96)" : "rgba(255,255,255,0.96)", borderColor: colors.border }]}>
              <Search size={16} color={colors.textMuted} />
              <TextInput style={[w.searchInput, { color: colors.text }]} placeholder="Type here to search" placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} autoFocus />
              <TouchableOpacity onPress={() => { setShowSearch(false); setSearch(""); }}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {search.trim() !== "" && (
              <View style={[w.searchResults, { backgroundColor: isDark ? "rgba(44,44,44,0.98)" : "rgba(243,243,243,0.98)", borderColor: colors.border }]}>
                {searchResults.length === 0
                  ? <Text style={[w.searchNone, { color: colors.textMuted }]}>No results for &quot;{search}&quot;</Text>
                  : searchResults.map(app => (
                    <TouchableOpacity key={app.id} style={[w.searchRow, { borderBottomColor: colors.border }]} onPress={() => { setShowSearch(false); setSearch(""); handleApp(app); }}>
                      <Text style={{ fontSize: 20, marginRight: 12 }}>{app.emoji}</Text>
                      <Text style={[w.searchName, { color: colors.text }]}>{app.name}</Text>
                      <ChevronRight size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))
                }
              </View>
            )}
          </View>
        ) : (
          <View style={[w.searchPillWrap, { top: insets.top + 52, paddingHorizontal: PAD }]}>
            <TouchableOpacity style={[w.searchPill, { backgroundColor: isDark ? "rgba(45,45,45,0.80)" : "rgba(255,255,255,0.80)", borderColor: colors.border }]} onPress={() => setShowSearch(true)} activeOpacity={0.7}>
              <Search size={16} color={colors.textMuted} />
              <Text style={[w.searchPillText, { color: colors.textMuted }]}>Type here to search</Text>
            </TouchableOpacity>
          </View>
        )}

        {wiggling && (
          <View style={[w.wiggleBar, { top: insets.top + 52 }]}>
            <TouchableOpacity style={[w.wDoneBtn, { backgroundColor: colors.accent }]} onPress={exitWiggle}>
              <Text style={w.wDoneTxt}>Done</Text>
            </TouchableOpacity>
            {selected.length >= 2 && (
              <TouchableOpacity style={[w.wFolderBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", borderColor: colors.border }]} onPress={() => setShowNewFolder(true)}>
                <Text style={[w.wFolderTxt, { color: colors.text }]}>Folder ({selected.length})</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <ScrollView style={w.scrollArea} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false} scrollEnabled={!wiggling}>
          {!showSearch && !wiggling && <View style={{ height: 56 }} />}

          <View style={[w.secHead, { paddingHorizontal: PAD }]}>
            <Text style={[w.secTitle, { color: colors.text }]}>Pinned</Text>
            <TouchableOpacity onPress={() => { if (!wiggling) enterWiggle(); }}>
              <Text style={[w.secAction, { color: colors.textMuted }]}>All apps &gt;</Text>
            </TouchableOpacity>
          </View>

          <ScrollView ref={hScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEnabled={!wiggling && !showSearch} onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / W))}>
            {Array.from({ length: 2 }, (_, pi) => (
              <View key={pi} style={[w.pageView, { width: W, paddingHorizontal: PAD }]}>
                <View style={w.grid}>
                  {pageFolders(pi).map(folder => (
                    <Win11FolderTile key={folder.id} folder={folder} apps={apps} wiggling={wiggling} isDark={isDark} colors={colors} onPress={() => { if (!wiggling) { setActiveFolder(folder); setFolderVisible(true); } }} onLongPress={() => wiggling ? deleteFolder(folder.id) : enterWiggle()} />
                  ))}
                  {pageApps(pi).map(app => (
                    <Win11AppTile key={app.id} app={app} wiggling={wiggling} selected={selected.includes(app.id)} isDark={isDark} accentColor={colors.accent} colors={colors} onPress={() => handleApp(app)} onLongPress={() => { if (!wiggling) enterWiggle(); else Alert.alert(`Remove "${app.name}"?`, "", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => removeApp(app.id) }]); }} badge={badges[app.id]} />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={[w.dots, { paddingHorizontal: PAD }]}>
            {[0, 1].map(i => (
              <View key={i} style={[w.dot, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" }, page === i && [w.dotActive, { backgroundColor: colors.accent }]]} />
            ))}
          </View>

          <View style={[w.secHead, { paddingHorizontal: PAD, marginTop: 20 }]}>
            <Text style={[w.secTitle, { color: colors.text }]}>Recommended</Text>
          </View>
          <View style={[w.recList, { paddingHorizontal: PAD }]}>
            {recommendedApps.map(app => (
              <TouchableOpacity key={app.id} style={[w.recItem, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.70)", borderColor: colors.border }]} onPress={() => handleApp(app)} activeOpacity={0.7}>
                <Text style={{ fontSize: 28, marginRight: 14 }}>{app.emoji}</Text>
                <View style={w.recInfo}>
                  <Text style={[w.recName, { color: colors.text }]}>{app.name}</Text>
                  <Text style={[w.recSub, { color: colors.textMuted }]}>{app.badge === "CORE" ? "Core tool" : "Recently added"}</Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={[w.taskbar, { bottom: insets.bottom }]}>
          {Platform.OS !== "web" ? (
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(32,32,32,0.85)" : "rgba(243,243,243,0.85)" }]} />
          )}
          <View style={[w.taskbarBorder, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]} />
          <View style={w.taskbarInner}>
            {TASKBAR_ITEMS.map(d => (
              <TouchableOpacity key={d.id} onPress={() => router.push(d.route as any)} onLongPress={enterWiggle}>
                <View style={[w.tbIcon, { backgroundColor: d.color }]}>
                  <Text style={{ fontSize: 18 }}>{d.emoji}</Text>
                  {d.id === "notifs" && (badges.notifs ?? 0) > 0 && (
                    <View style={w.tbBadge}><Text style={w.tbBadgeTxt}>{badges.notifs}</Text></View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Win11FolderModal visible={folderVisible} folder={activeFolder} apps={apps} isDark={isDark} colors={colors} onClose={() => setFolderVisible(false)} onOpen={handleApp} />

        <Modal visible={showNewFolder} transparent animationType="fade" onRequestClose={() => setShowNewFolder(false)}>
          <View style={w.modalBg}>
            <View style={[w.modalBox, { backgroundColor: isDark ? "rgba(44,44,44,0.98)" : "rgba(243,243,243,0.98)", borderColor: colors.border }]}>
              <Text style={[w.modalTitle, { color: colors.text }]}>New Folder</Text>
              <View style={w.modalPreview}>
                {apps.filter(a => selected.includes(a.id)).slice(0, 4).map(a => (
                  <Text key={a.id} style={{ fontSize: 24 }}>{a.emoji}</Text>
                ))}
              </View>
              <TextInput style={[w.modalInput, { color: colors.text, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor: colors.border }]} value={folderName} onChangeText={setFolderName} placeholder="Folder name" placeholderTextColor={colors.textMuted} autoFocus />
              <View style={w.modalActions}>
                <TouchableOpacity style={[w.modalBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor: colors.border }]} onPress={() => setShowNewFolder(false)}>
                  <Text style={[w.modalBtnTxt, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.modalBtn, { backgroundColor: colors.accent }]} onPress={createFolder}>
                  <Text style={[w.modalBtnTxt, { color: "#fff" }]}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const ICON_SIZE = CELL_W * 0.62;
  const ICON_R = ICON_SIZE * 0.26;
  const CELL_H = CELL_W * 1.22;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme.statusBar} />
      {bgLayer}

      <View style={[s.top, { paddingTop: insets.top + 6 }]}>
        <View>
          <Text style={[s.greet, { color: colors.textMuted }]}>{greeting}</Text>
          <Text style={[s.uname, { color: colors.text }]}>{user?.email?.split("@")[0] ?? "agent"} 🦞</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={[s.topBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)" }]} onPress={() => router.push("/theme-settings" as any)}>
            <Palette size={16} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.topBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)" }]} onPress={() => setShowSearch(true)}>
            <Search size={16} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.topBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)" }]} onPress={() => Alert.alert("Sign Out?", "", [{ text: "Cancel", style: "cancel" }, { text: "Sign Out", style: "destructive", onPress: signOut }])}>
            <LogOut size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {showSearch && (
        <View style={[s.searchWrap, { top: insets.top + 68 }]}>
          <GlassCard style={s.searchBox} strong>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <Search size={15} color={colors.textMuted} />
              <TextInput style={[s.searchIn, { color: colors.text }]} placeholder="Search apps..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} autoFocus />
              <TouchableOpacity onPress={() => { setShowSearch(false); setSearch(""); }}>
                <X size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </GlassCard>
          {search.trim() !== "" && (
            <GlassCard style={s.searchDrop} strong>
              {searchResults.length === 0
                ? <Text style={[s.searchNone, { color: colors.textMuted }]}>No apps found</Text>
                : searchResults.map(app => (
                  <TouchableOpacity key={app.id} style={s.searchRow} onPress={() => { setShowSearch(false); setSearch(""); handleApp(app); }}>
                    <View style={[s.searchIco, { backgroundColor: app.color }]}><Text style={{ fontSize: 18 }}>{app.emoji}</Text></View>
                    <Text style={[s.searchName, { color: colors.text }]}>{app.name}</Text>
                  </TouchableOpacity>
                ))
              }
            </GlassCard>
          )}
        </View>
      )}

      {wiggling && (
        <View style={[s.wiggleBar, { top: insets.top + 68 }]}>
          <TouchableOpacity style={[s.wBtn, { backgroundColor: colors.accent }]} onPress={exitWiggle}>
            <Text style={[s.wBtnTxt, { color: "#fff" }]}>Done</Text>
          </TouchableOpacity>
          {selected.length >= 2 && (
            <TouchableOpacity style={[s.wBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)", borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.7)" }]} onPress={() => setShowNewFolder(true)}>
              <Text style={[s.wBtnTxt, { color: colors.text }]}>📁 Folder ({selected.length})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEnabled={!wiggling && !showSearch} onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / W))} style={s.pages}>
        {Array.from({ length: 2 }, (_, pi) => (
          <View key={pi} style={[s.pg, { width: W }]}>
            <View style={s.grid}>
              {pageFolders(pi).map(folder => {
                const inside = apps.filter(a => folder.appIds.includes(a.id)).slice(0, 9);
                return (
                  <TouchableOpacity key={folder.id} style={{ width: CELL_W, height: CELL_H, alignItems: "center", paddingTop: 10 }} onPress={() => { if (!wiggling) { setActiveFolder(folder); setFolderVisible(true); } }} onLongPress={() => wiggling ? deleteFolder(folder.id) : enterWiggle()}>
                    <View style={[s.folderBox, { width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_R, backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.45)", borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.5)" }]}>
                      <View style={s.folderInner}>
                        {Array.from({ length: 9 }, (_, i) => {
                          const a = inside[i];
                          const cellSz = (ICON_SIZE * 0.76) / 3;
                          return <View key={i} style={{ width: cellSz, height: cellSz, alignItems: "center", justifyContent: "center" }}>{a && <Text style={{ fontSize: cellSz * 0.65 }}>{a.emoji}</Text>}</View>;
                        })}
                      </View>
                    </View>
                    <Text style={[s.appLbl, { color: colors.text }]} numberOfLines={1}>{folder.name}</Text>
                  </TouchableOpacity>
                );
              })}
              {pageApps(pi).map(app => (
                <TouchableOpacity key={app.id} style={{ width: CELL_W, height: CELL_H, alignItems: "center", paddingTop: 10 }} onPress={() => handleApp(app)} onLongPress={() => { if (!wiggling) enterWiggle(); else Alert.alert(`Remove "${app.name}"?`, "", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => removeApp(app.id) }]); }}>
                  <View style={[s.iconBox, { width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_R, backgroundColor: app.color }]}>
                    <Text style={{ fontSize: ICON_SIZE * 0.44 }}>{app.emoji}</Text>
                    {app.badge === "SOON" && <View style={s.soonLay}><Text style={s.soonTxt}>SOON</Text></View>}
                  </View>
                  {app.badge && app.badge !== "SOON" && !wiggling && (
                    <View style={[s.badgePill, { backgroundColor: app.badge === "NEW" ? colors.accent : "#F59E0B" }]}>
                      <Text style={s.badgeTxt}>{app.badge}</Text>
                    </View>
                  )}
                  {(badges[app.id] ?? 0) > 0 && !wiggling && (
                    <View style={s.notifBubble}><Text style={s.notifBubbleTxt}>{(badges[app.id] ?? 0) > 99 ? "99+" : badges[app.id]}</Text></View>
                  )}
                  <Text style={[s.appLbl, { color: colors.text }, app.badge === "SOON" && { opacity: 0.4 }]} numberOfLines={1}>{app.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[s.dots, { bottom: insets.bottom + 98 }]}>
        {[0, 1].map(i => (
          <TouchableOpacity key={i} onPress={() => scrollRef.current?.scrollTo({ x: W * i, animated: true })}>
            <View style={[s.dot, { backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }, page === i && [s.dotOn, { backgroundColor: colors.text }]]} />
          </TouchableOpacity>
        ))}
      </View>

      {!wiggling && (
        <GlassCard style={[s.dock, { bottom: insets.bottom + 12, borderRadius: 28 }]} strong>
          <View style={s.dockInner}>
            {TASKBAR_ITEMS.map(d => (
              <TouchableOpacity key={d.id} style={s.dockItem} onPress={() => router.push(d.route as any)} onLongPress={enterWiggle}>
                <View style={[s.dockIco, { backgroundColor: d.color }]}>
                  <Text style={{ fontSize: 22 }}>{d.emoji}</Text>
                  {d.id === "notifs" && (badges.notifs ?? 0) > 0 && (
                    <View style={s.dockBadge}><Text style={s.dockBadgeTxt}>{badges.notifs}</Text></View>
                  )}
                </View>
                <Text style={[s.dockLbl, { color: colors.textMuted }]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>
      )}

      <Win11FolderModal visible={folderVisible} folder={activeFolder} apps={apps} isDark={isDark} colors={colors} onClose={() => setFolderVisible(false)} onOpen={handleApp} />

      <Modal visible={showNewFolder} transparent animationType="fade" onRequestClose={() => setShowNewFolder(false)}>
        <View style={s.mBg}>
          <View style={[s.mBox, isDark && s.mBoxDark]}>
            <Text style={[s.mTitle, { color: colors.text }]}>New Folder</Text>
            <View style={s.mPreview}>
              {apps.filter(a => selected.includes(a.id)).slice(0, 4).map(a => (
                <View key={a.id} style={[s.mPreviewIco, { backgroundColor: a.color, borderRadius: 14 }]}><Text style={{ fontSize: 18 }}>{a.emoji}</Text></View>
              ))}
            </View>
            <TextInput style={[s.mInput, { color: colors.text, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)", borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)" }]} value={folderName} onChangeText={setFolderName} placeholder="Folder name" placeholderTextColor={colors.textMuted} autoFocus />
            <View style={s.mActions}>
              <TouchableOpacity style={[s.mCancel, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)", borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)" }]} onPress={() => setShowNewFolder(false)}>
                <Text style={[s.mBtnTxt, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.mConfirm, { backgroundColor: colors.accent }]} onPress={createFolder}>
                <Text style={[s.mBtnTxt, { color: "#fff" }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Win11StatusTray({ insets, colors, isDark }: { insets: any; colors: any; isDark: boolean }) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });

  return (
    <View style={[w11.topSection, { paddingTop: insets.top + 8, paddingHorizontal: PAD }]}>
      <View style={[w11.tray, { backgroundColor: isDark ? "rgba(32,32,32,0.60)" : "rgba(255,255,255,0.60)" }]}>
        <View style={w11.trayLeft}>
          <Text style={[w11.trayTime, { color: colors.text }]}>{timeStr}</Text>
          <Text style={[w11.trayDate, { color: colors.textMuted }]}>{dateStr}</Text>
        </View>
        <View style={w11.trayIcons}>
          <Signal size={12} color={colors.textMuted} />
          <Wifi size={12} color={colors.textMuted} />
          <Battery size={12} color={colors.textMuted} />
        </View>
      </View>
    </View>
  );
}

function Win11AppTile({ app, wiggling, selected, onPress, onLongPress, badge, isDark, accentColor, colors }: {
  app: AppItem; wiggling: boolean; selected: boolean;
  onPress: () => void; onLongPress: () => void; badge?: number;
  isDark: boolean; accentColor: string; colors: any;
}) {
  const spin = useWiggle(wiggling);
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => !wiggling && Animated.spring(scale, { toValue: 0.94, tension: 300, friction: 10, useNativeDriver: true }).start();
  const pressOut = () => !wiggling && Animated.spring(scale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();
  const isSoon = app.badge === "SOON";

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1} delayLongPress={420} style={{ width: CELL_W, height: 88, paddingHorizontal: 3 }}>
      <Animated.View style={{ transform: [{ scale }, { rotate: spin }], flex: 1 }}>
        <View style={[w11.tile, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)", borderColor: colors.border }]}>
          {wiggling && <View style={w11.wiggleX}><X size={10} color="#fff" /></View>}
          {selected && <View style={[w11.selBorder, { borderColor: accentColor }]} />}
          <View style={w11.tileEmoji}>
            <Text style={{ fontSize: 24 }}>{app.emoji}</Text>
            {(badge ?? 0) > 0 && !wiggling && (
              <View style={w11.tileBadge}><Text style={w11.tileBadgeTxt}>{badge! > 99 ? "99+" : badge}</Text></View>
            )}
          </View>
          <Text style={[w11.tileLabel, { color: colors.text }, isSoon && { opacity: 0.4 }]} numberOfLines={1}>{app.name}</Text>
          {isSoon && <View style={[w11.soonBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}><Text style={[w11.soonBadgeTxt, { color: colors.textMuted }]}>Soon</Text></View>}
          {app.badge && app.badge !== "SOON" && !wiggling && <View style={[w11.newBadge, { backgroundColor: accentColor }]}><Text style={w11.newBadgeTxt}>{app.badge}</Text></View>}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function Win11FolderTile({ folder, apps, wiggling, onPress, onLongPress, isDark, colors }: {
  folder: Folder; apps: AppItem[]; wiggling: boolean;
  onPress: () => void; onLongPress: () => void;
  isDark: boolean; colors: any;
}) {
  const spin = useWiggle(wiggling);
  const inside = apps.filter(a => folder.appIds.includes(a.id)).slice(0, 4);

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.85} delayLongPress={420} style={{ width: CELL_W, height: 88, paddingHorizontal: 3 }}>
      <Animated.View style={{ transform: [{ rotate: spin }], flex: 1 }}>
        <View style={[w11.tile, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)", borderColor: colors.border }]}>
          {wiggling && <View style={w11.wiggleX}><X size={10} color="#fff" /></View>}
          <View style={w11.folderRow}>
            {inside.map(a => <Text key={a.id} style={{ fontSize: 14 }}>{a.emoji}</Text>)}
            {Array.from({ length: Math.max(0, 4 - inside.length) }, (_, i) => (
              <View key={`e${i}`} style={[w11.folderSlot, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }]} />
            ))}
          </View>
          <Text style={[w11.tileLabel, { color: colors.text }]} numberOfLines={1}>{folder.name}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function Win11FolderModal({ folder, apps, visible, onClose, onOpen, isDark, colors }: {
  folder: Folder | null; apps: AppItem[]; visible: boolean;
  onClose: () => void; onOpen: (app: AppItem) => void;
  isDark: boolean; colors: any;
}) {
  const bg = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(bg, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(sc, { toValue: 1, tension: 140, friction: 10, useNativeDriver: true }),
      ]).start();
    } else { sc.setValue(0.92); bg.setValue(0); }
  }, [visible, bg, sc]);

  if (!folder) return null;
  const inside = apps.filter(a => folder.appIds.includes(a.id));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.3)", opacity: bg }]} />
      </TouchableOpacity>
      <Animated.View style={[w11.fmBox, { opacity: bg, transform: [{ scale: sc }], backgroundColor: isDark ? "rgba(44,44,44,0.98)" : "rgba(243,243,243,0.98)", borderColor: colors.border }]}>
        <Text style={[w11.fmTitle, { color: colors.text }]}>{folder.name}</Text>
        <View style={w11.fmGrid}>
          {inside.map(app => (
            <TouchableOpacity key={app.id} style={w11.fmItem} onPress={() => { onClose(); setTimeout(() => onOpen(app), 280); }}>
              <View style={w11.fmIcon}><Text style={{ fontSize: 22 }}>{app.emoji}</Text></View>
              <Text style={[w11.fmLabel, { color: colors.text }]} numberOfLines={1}>{app.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const w = StyleSheet.create({
  root: { flex: 1 },
  topSection: { paddingBottom: 4 },
  searchPillWrap: { position: "absolute", left: 0, right: 0 },
  searchPill: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 24, borderWidth: 1 },
  searchPillText: { fontSize: 14, flex: 1 },
  searchExpandedWrap: { position: "absolute", left: 16, right: 16, zIndex: 200 },
  searchExpanded: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 24, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },
  searchResults: { maxHeight: 300, borderRadius: 8, borderWidth: 1, padding: 4, marginTop: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 12 },
  searchRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1 },
  searchName: { flex: 1, fontSize: 14, fontWeight: "500" as const },
  searchNone: { padding: 24, textAlign: "center", fontSize: 13 },
  wiggleBar: { position: "absolute", left: 16, right: 16, zIndex: 100, flexDirection: "row", alignItems: "center", gap: 10 },
  wDoneBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 6 },
  wDoneTxt: { fontSize: 13, fontWeight: "600" as const, color: "#fff" },
  wFolderBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1 },
  wFolderTxt: { fontSize: 13, fontWeight: "500" as const },
  scrollArea: { flex: 1 },
  secHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 8 },
  secTitle: { fontSize: 14, fontWeight: "600" as const },
  secAction: { fontSize: 12 },
  pageView: { paddingTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 18 },
  recList: { gap: 2, marginTop: 4 },
  recItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1 },
  recInfo: { flex: 1 },
  recName: { fontSize: 14, fontWeight: "500" as const },
  recSub: { fontSize: 12, marginTop: 1 },
  taskbar: { position: "absolute", left: 0, right: 0, overflow: "hidden" },
  taskbarBorder: { position: "absolute", top: 0, left: 0, right: 0, height: 1 },
  taskbarInner: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 20 },
  tbIcon: { width: 42, height: 42, borderRadius: 8, alignItems: "center", justifyContent: "center", position: "relative" },
  tbBadge: { position: "absolute", top: -4, right: -4, backgroundColor: "#E81123", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 2 },
  tbBadgeTxt: { fontSize: 8, fontWeight: "700" as const, color: "#fff" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalBox: { width: W - 56, borderRadius: 8, padding: 24, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 12 },
  modalTitle: { fontSize: 18, fontWeight: "600" as const, textAlign: "center", marginBottom: 16 },
  modalPreview: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 16 },
  modalInput: { borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, marginBottom: 16, textAlign: "center" },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: "center", borderWidth: 1 },
  modalBtnTxt: { fontSize: 14, fontWeight: "600" as const },
});

const w11 = StyleSheet.create({
  topSection: { paddingBottom: 4 },
  tray: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8 },
  trayLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  trayTime: { fontSize: 12, fontWeight: "600" as const },
  trayDate: { fontSize: 11 },
  trayIcons: { flexDirection: "row", gap: 6 },
  tile: { borderRadius: 8, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  tileEmoji: { marginBottom: 4, position: "relative" },
  tileLabel: { fontSize: 11, fontWeight: "500" as const, textAlign: "center" },
  tileBadge: { position: "absolute", top: -6, right: -8, backgroundColor: "#E81123", borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 2 },
  tileBadgeTxt: { fontSize: 8, fontWeight: "700" as const, color: "#fff" },
  wiggleX: { position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(239,68,68,0.9)", alignItems: "center", justifyContent: "center", zIndex: 20 },
  selBorder: { position: "absolute", top: -1, left: -1, right: -1, bottom: -1, borderRadius: 9, borderWidth: 2 },
  soonBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, marginTop: 3 },
  soonBadgeTxt: { fontSize: 8, fontWeight: "700" as const, letterSpacing: 0.3 },
  newBadge: { position: "absolute", top: 4, right: 4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  newBadgeTxt: { fontSize: 7, fontWeight: "800" as const, color: "#fff" },
  folderRow: { flexDirection: "row", flexWrap: "wrap", gap: 2, marginBottom: 4, justifyContent: "center" },
  folderSlot: { width: 18, height: 18, borderRadius: 4 },
  fmBox: { position: "absolute", left: 16, right: 16, top: H * 0.25, borderRadius: 8, borderWidth: 1, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.24, shadowRadius: 32, elevation: 16 },
  fmTitle: { fontSize: 16, fontWeight: "600" as const, textAlign: "center", marginBottom: 16 },
  fmGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  fmItem: { alignItems: "center", gap: 6, width: 66 },
  fmIcon: { width: 48, height: 48, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  fmLabel: { fontSize: 11, textAlign: "center" },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  top: { paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greet: { fontSize: 13, fontWeight: "500" as const },
  uname: { fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.5 },
  topBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  searchWrap: { position: "absolute", left: 16, right: 16, zIndex: 200 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  searchIn: { flex: 1, fontSize: 15 },
  searchDrop: { marginTop: 8, borderRadius: 20, padding: 4 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  searchIco: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  searchName: { flex: 1, fontSize: 15, fontWeight: "600" as const },
  searchNone: { padding: 20, textAlign: "center", fontSize: 14 },
  wiggleBar: { position: "absolute", left: 16, right: 16, zIndex: 100, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  wBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  wBtnTxt: { fontSize: 13, fontWeight: "700" as const },
  pages: { flex: 1 },
  pg: { paddingHorizontal: PAD, paddingTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  iconBox: { alignItems: "center", justifyContent: "center", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  appLbl: { fontSize: 11, fontWeight: "600" as const, textAlign: "center", marginTop: 6, paddingHorizontal: 2 },
  badgePill: { position: "absolute", top: 6, right: 8, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  badgeTxt: { fontSize: 7, fontWeight: "900" as const, color: "#fff" },
  notifBubble: { position: "absolute", top: 4, right: 6, backgroundColor: "#EF4444", borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 2, borderColor: "#fff" },
  notifBubbleTxt: { fontSize: 9, fontWeight: "800" as const, color: "#fff" },
  folderBox: { alignItems: "center", justifyContent: "center", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderWidth: 1 },
  folderInner: { flexDirection: "row", flexWrap: "wrap", width: undefined },
  soonLay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.4)", paddingVertical: 3, alignItems: "center" },
  soonTxt: { fontSize: 7, fontWeight: "900" as const, color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 },
  dots: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOn: { width: 20 },
  dock: { position: "absolute", left: 14, right: 14, paddingVertical: 10 },
  dockInner: { flexDirection: "row", justifyContent: "space-around" },
  dockItem: { alignItems: "center", gap: 4 },
  dockIco: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", position: "relative", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  dockLbl: { fontSize: 10, fontWeight: "600" as const },
  dockBadge: { position: "absolute", top: -4, right: -4, backgroundColor: "#EF4444", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 2, borderColor: "#fff" },
  dockBadgeTxt: { fontSize: 8, fontWeight: "800" as const, color: "#fff" },
  mBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  mBox: { width: W - 56, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 28, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  mBoxDark: { backgroundColor: "rgba(20,20,20,0.95)", borderColor: "rgba(255,255,255,0.12)" },
  mTitle: { fontSize: 20, fontWeight: "800" as const, textAlign: "center", marginBottom: 16 },
  mPreview: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 18 },
  mPreviewIco: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  mInput: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, marginBottom: 16, textAlign: "center" },
  mActions: { flexDirection: "row", gap: 10 },
  mCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 1 },
  mConfirm: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  mBtnTxt: { fontSize: 15, fontWeight: "700" as const },
});
