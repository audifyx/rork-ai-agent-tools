import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Search, X, LogOut, Palette } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";
import ColorfulBackground from "@/components/ColorfulBackground";

const { width: W, height: H } = Dimensions.get("window");
const COLS = 4;
const PAD = 16;
const CELL_W = (W - PAD * 2) / COLS;
const CELL_H = CELL_W * 1.22;
const ICON_SIZE = CELL_W * 0.62;
const ICON_R = ICON_SIZE * 0.26;
const NUM_PAGES = 2;
const STORAGE_KEY = "@openclaw_home_v5";

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
  { id: "openclaw",  name: "OpenClaw",  emoji: "🦞", color: "#EF4444", dark: "#DC2626", route: "/openclaw",           badge: "CORE", page: 0, pos: 0 },
  { id: "tweeter",   name: "Tweeter",   emoji: "🐦", color: "#6366F1", dark: "#4F46E5", route: "/tweeter",            badge: "NEW",  page: 0, pos: 1 },
  { id: "vault",     name: "Vault",     emoji: "🔐", color: "#A855F7", dark: "#9333EA", route: "/vault",              badge: null,   page: 0, pos: 2 },
  { id: "analytics", name: "Analytics", emoji: "📊", color: "#10B981", dark: "#059669", route: "/analytics",          badge: null,   page: 0, pos: 3 },
  { id: "swarm",     name: "Swarm",     emoji: "🐝", color: "#F59E0B", dark: "#D97706", route: "/swarm",              badge: "NEW",  page: 0, pos: 4 },
  { id: "pages",     name: "Pages",     emoji: "🌐", color: "#3B82F6", dark: "#2563EB", route: "/pages",              badge: null,   page: 0, pos: 5 },
  { id: "imagegen",  name: "ImageGen",  emoji: "🎨", color: "#EC4899", dark: "#DB2777", route: "/imagegen",           badge: "NEW",  page: 0, pos: 6 },
  { id: "activity",  name: "Activity",  emoji: "⚡", color: "#F97316", dark: "#EA580C", route: "/activity",           badge: null,   page: 0, pos: 7 },
  { id: "notifs",    name: "Alerts",    emoji: "🔔", color: "#EF4444", dark: "#DC2626", route: "/notifications",      badge: null,   page: 0, pos: 8 },
  { id: "settings",  name: "Settings",  emoji: "⚙️", color: "#6B7280", dark: "#4B5563", route: "/settings",           badge: null,   page: 0, pos: 9 },
  { id: "themes",    name: "Themes",    emoji: "🎨", color: "#D4A017", dark: "#B8860B", route: "/theme-settings",     badge: "NEW",  page: 0, pos: 10 },
  { id: "notebook",  name: "Notebook",  emoji: "📓", color: "#EF4444", dark: "#DC2626", route: null,                  badge: "SOON", page: 1, pos: 0 },
  { id: "scheduler", name: "Scheduler", emoji: "⏰", color: "#14B8A6", dark: "#0D9488", route: null,                  badge: "SOON", page: 1, pos: 1 },
  { id: "mailer",    name: "Mailer",    emoji: "📧", color: "#F97316", dark: "#EA580C", route: null,                  badge: "SOON", page: 1, pos: 2 },
  { id: "scraper",   name: "Scraper",   emoji: "🕷️", color: "#6366F1", dark: "#4F46E5", route: null,                  badge: "SOON", page: 1, pos: 3 },
  { id: "agentcode", name: "AgentCode", emoji: "💻", color: "#06B6D4", dark: "#0891B2", route: "https://agentcode.lovable.app/",      external: true, badge: null,  page: 1, pos: 4 },
  { id: "nexus",     name: "Nexus",     emoji: "🔮", color: "#A855F7", dark: "#9333EA", route: "https://nexus-skillhub.lovable.app/", external: true, badge: "NEW", page: 1, pos: 5 },
];

const DOCK_ITEMS = [
  { id: "activity", emoji: "⚡", label: "Activity", route: "/activity",      color: "#F97316" },
  { id: "notifs",   emoji: "🔔", label: "Alerts",   route: "/notifications", color: "#EF4444" },
  { id: "swarm",    emoji: "🐝", label: "Swarm",    route: "/swarm",         color: "#F59E0B" },
  { id: "settings", emoji: "⚙️", label: "Settings", route: "/settings",      color: "#6B7280" },
];

function GlassView({ children, style, dark }: { children?: React.ReactNode; style?: any; dark?: boolean }) {
  if (Platform.OS === "web") {
    return (
      <View style={[
        glassStyles.webGlass,
        dark && glassStyles.webGlassDark,
        style,
      ]}>
        {children}
      </View>
    );
  }
  return (
    <View style={[glassStyles.container, dark && glassStyles.containerDark, style]}>
      <BlurView intensity={50} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.35)" }]} />
      {children}
    </View>
  );
}

const glassStyles = StyleSheet.create({
  container: { overflow: "hidden", borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)" },
  containerDark: { borderColor: "rgba(255,255,255,0.12)" },
  webGlass: { borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", backgroundColor: "rgba(255,255,255,0.45)", overflow: "hidden" },
  webGlassDark: { borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(0,0,0,0.45)" },
});

function AppIcon({ app, wiggling, selected, onPress, onLongPress, badge, isDark, accentColor, textColor, textMutedColor }: {
  app: AppItem; wiggling: boolean; selected: boolean;
  onPress: () => void; onLongPress: () => void; badge?: number;
  isDark: boolean; accentColor: string; textColor: string; textMutedColor: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (wiggling) {
      const delay = Math.random() * 120;
      animRef.current = Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(rot, { toValue: 1,  duration: 85, useNativeDriver: true }),
        Animated.timing(rot, { toValue: -1, duration: 85, useNativeDriver: true }),
        Animated.timing(rot, { toValue: 1,  duration: 85, useNativeDriver: true }),
        Animated.timing(rot, { toValue: 0,  duration: 85, useNativeDriver: true }),
        Animated.delay(100),
      ]));
      animRef.current.start();
    } else {
      animRef.current?.stop();
      Animated.spring(rot, { toValue: 0, tension: 300, friction: 10, useNativeDriver: true }).start();
    }
  }, [wiggling, rot]);

  const spin = rot.interpolate({ inputRange: [-1, 1], outputRange: ["-2.8deg", "2.8deg"] });
  const pressIn  = () => !wiggling && Animated.spring(scale, { toValue: 0.88, tension: 300, friction: 10, useNativeDriver: true }).start();
  const pressOut = () => !wiggling && Animated.spring(scale, { toValue: 1,    tension: 200, friction: 8,  useNativeDriver: true }).start();
  const isSoon = app.badge === "SOON";

  return (
    <View style={{ width: CELL_W, height: CELL_H, alignItems: "center", paddingTop: 10 }}>
      <TouchableOpacity onPress={onPress} onLongPress={onLongPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1} delayLongPress={420}>
        <Animated.View style={{ alignItems: "center", transform: [{ scale }, { rotate: spin }] }}>
          {wiggling && <View style={st.delDot}><Text style={st.delDotTxt}>✕</Text></View>}
          {selected && <View style={[st.selRing, { width: ICON_SIZE + 6, height: ICON_SIZE + 6, borderRadius: ICON_R + 3, borderColor: accentColor }]} />}
          <View style={[st.iconBox, { width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_R, backgroundColor: app.color }]}>
            <Text style={{ fontSize: ICON_SIZE * 0.44, zIndex: 1 }}>{app.emoji}</Text>
            {isSoon && <View style={st.soonLay}><Text style={st.soonTxt}>SOON</Text></View>}
          </View>
          {app.badge && app.badge !== "SOON" && !wiggling && (
            <View style={[st.badgePill, { backgroundColor: app.badge === "NEW" ? accentColor : "#F59E0B" }]}>
              <Text style={st.badgeTxt}>{app.badge}</Text>
            </View>
          )}
          {(badge ?? 0) > 0 && !wiggling && (
            <View style={st.notifBubble}>
              <Text style={st.notifBubbleTxt}>{(badge ?? 0) > 99 ? "99+" : badge}</Text>
            </View>
          )}
          <Text style={[st.appLbl, { color: textColor }, isSoon && { opacity: 0.4 }]} numberOfLines={1}>{app.name}</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

function FolderIcon({ folder, apps, wiggling, onPress, onLongPress, isDark, textColor }: {
  folder: Folder; apps: AppItem[]; wiggling: boolean;
  onPress: () => void; onLongPress: () => void;
  isDark: boolean; textColor: string;
}) {
  const inside = apps.filter(a => folder.appIds.includes(a.id)).slice(0, 9);
  const rot = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (wiggling) {
      animRef.current = Animated.loop(Animated.sequence([
        Animated.timing(rot, { toValue: 1,  duration: 90, useNativeDriver: true }),
        Animated.timing(rot, { toValue: -1, duration: 90, useNativeDriver: true }),
        Animated.timing(rot, { toValue: 0,  duration: 90, useNativeDriver: true }),
        Animated.delay(130),
      ]));
      animRef.current.start();
    } else {
      animRef.current?.stop();
      Animated.spring(rot, { toValue: 0, tension: 300, friction: 10, useNativeDriver: true }).start();
    }
  }, [wiggling, rot]);

  const spin = rot.interpolate({ inputRange: [-1, 1], outputRange: ["-2.5deg", "2.5deg"] });
  const cellSz = (ICON_SIZE * 0.76) / 3;

  return (
    <View style={{ width: CELL_W, height: CELL_H, alignItems: "center", paddingTop: 10 }}>
      <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.85} delayLongPress={420}>
        <Animated.View style={{ alignItems: "center", transform: [{ rotate: spin }] }}>
          {wiggling && <View style={st.delDot}><Text style={st.delDotTxt}>✕</Text></View>}
          <View style={[st.folderBox, { width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_R, backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.45)", borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.5)" }]}>
            <View style={st.folderInner}>
              {Array.from({ length: 9 }, (_, i) => {
                const a = inside[i];
                return (
                  <View key={i} style={{ width: cellSz, height: cellSz, alignItems: "center", justifyContent: "center" }}>
                    {a && <Text style={{ fontSize: cellSz * 0.65 }}>{a.emoji}</Text>}
                  </View>
                );
              })}
            </View>
          </View>
          <Text style={[st.appLbl, { color: textColor }]} numberOfLines={1}>{folder.name}</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

function FolderModal({ folder, apps, visible, onClose, onOpen, isDark, textColor }: {
  folder: Folder | null; apps: AppItem[]; visible: boolean;
  onClose: () => void; onOpen: (app: AppItem) => void;
  isDark: boolean; textColor: string;
}) {
  const bg = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.78)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(bg, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sc, { toValue: 1, tension: 130, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      sc.setValue(0.78); bg.setValue(0);
    }
  }, [visible, bg, sc]);

  if (!folder) return null;
  const inside = apps.filter(a => folder.appIds.includes(a.id));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)", opacity: bg }]} />
      </TouchableOpacity>
      <Animated.View style={[st.folderModal, isDark && st.folderModalDark, { opacity: bg, transform: [{ scale: sc }] }]}>
        <Text style={[st.folderModalTitle, { color: textColor }]}>{folder.name}</Text>
        <View style={st.folderModalGrid}>
          {inside.map(app => (
            <TouchableOpacity key={app.id} style={st.folderModalItem}
              onPress={() => { onClose(); setTimeout(() => onOpen(app), 280); }}>
              <View style={[st.folderModalIcon, { backgroundColor: app.color, borderRadius: 16 }]}>
                <Text style={{ fontSize: 26 }}>{app.emoji}</Text>
              </View>
              <Text style={[st.folderModalLbl, { color: textColor }]} numberOfLines={1}>{app.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { colors, theme } = useTheme();
  const isDark = theme.dark;

  const [apps,    setApps]    = useState<AppItem[]>(DEFAULT_APPS);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [page,    setPage]    = useState(0);
  const [wiggling,  setWiggling]  = useState(false);
  const [selected,  setSelected]  = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  const [folderVisible, setFolderVisible] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName,    setFolderName]    = useState("New Folder");
  const [search,     setSearch]     = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [badges,    setBadges]    = useState<Record<string, number>>({});
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw);
        if (s.apps?.length)    setApps(s.apps);
        if (s.folders?.length) setFolders(s.folders);
      } catch {}
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
          supabase.from("agent_tweets").select("id",  { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("swarm_agents").select("id",  { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active"),
          supabase.from("generated_images").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);
        const safeCount = (r: PromiseSettledResult<any>) =>
          r.status === "fulfilled" ? (r.value?.count ?? 0) : 0;
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
  const exitWiggle  = () => { setWiggling(false); setSelected([]); };

  const handleApp = (app: AppItem) => {
    if (wiggling) {
      if (app.badge === "SOON") return;
      setSelected(p => p.includes(app.id) ? p.filter(x => x !== app.id) : [...p, app.id]);
      return;
    }
    if (app.badge === "SOON") return;
    if (app.external && app.route) { void Linking.openURL(app.route); return; }
    if (app.route) router.push(app.route as any);
  };

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
    const newApps    = apps.map(a => selected.includes(a.id) ? { ...a, folderId: folder.id } : a);
    const newFolders = [...folders, folder];
    setApps(newApps); setFolders(newFolders); save(newApps, newFolders);
    setShowNewFolder(false); setSelected([]); setWiggling(false); setFolderName("New Folder");
  };

  const deleteFolder = (fid: string) => {
    Alert.alert("Delete Folder", "Apps will return to the home screen.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        const newApps    = apps.map(a => a.folderId === fid ? { ...a, folderId: undefined } : a);
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

  const pageApps    = (p: number) => apps.filter(a => a.page === p && !a.folderId).sort((a, b) => a.pos - b.pos);
  const pageFolders = (p: number) => folders.filter(f => f.page === p);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <View style={[st.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme.statusBar} />

      {wallpaper ? (
        <>
          <Image source={{ uri: wallpaper }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(242,240,245,0.55)" }]} />
        </>
      ) : (
        <ColorfulBackground variant="home" />
      )}

      <View style={[st.top, { paddingTop: insets.top + 6 }]}>
        {showSearch ? (
          <GlassView style={st.searchBox} dark={isDark}>
            <Search size={15} color={colors.textMuted} />
            <TextInput
              style={[st.searchIn, { color: colors.text }]}
              placeholder="Search apps..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearch(""); }}>
              <X size={15} color={colors.textMuted} />
            </TouchableOpacity>
          </GlassView>
        ) : (
          <>
            <View>
              <Text style={[st.greet, { color: colors.textMuted }]}>{greeting}</Text>
              <Text style={[st.uname, { color: colors.text }]}>{user?.email?.split("@")[0] ?? "agent"} 🦞</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                style={[st.topBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)" }]}
                onPress={() => router.push("/theme-settings" as any)}
              >
                <Palette size={16} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.topBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)" }]}
                onPress={() => setShowSearch(true)}
              >
                <Search size={16} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.topBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)" }]}
                onPress={() =>
                  Alert.alert("Sign Out?", "", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Sign Out", style: "destructive", onPress: signOut },
                  ])
                }
              >
                <LogOut size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {showSearch && search.trim() !== "" && (
        <GlassView style={[st.searchDrop, { top: insets.top + 68 }]} dark={isDark}>
          {searchResults.length === 0
            ? <Text style={[st.searchNone, { color: colors.textMuted }]}>No apps found</Text>
            : searchResults.map(app => (
              <TouchableOpacity key={app.id} style={[st.searchRow, { borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
                onPress={() => { setShowSearch(false); setSearch(""); handleApp(app); }}>
                <View style={[st.searchIco, { backgroundColor: app.color, borderRadius: 12 }]}>
                  <Text style={{ fontSize: 18 }}>{app.emoji}</Text>
                </View>
                <Text style={[st.searchName, { color: colors.text }]}>{app.name}</Text>
                <Text style={[st.searchSub, { color: colors.textMuted }]}>{app.badge === "SOON" ? "Coming Soon" : "Tap to open"}</Text>
              </TouchableOpacity>
            ))
          }
        </GlassView>
      )}

      {wiggling && (
        <View style={[st.wiggleBar, { top: insets.top + 68 }]}>
          <TouchableOpacity style={[st.wBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)", borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.7)" }]} onPress={exitWiggle}>
            <Text style={[st.wBtnTxt, { color: colors.text }]}>Done</Text>
          </TouchableOpacity>
          {selected.length >= 2 && (
            <TouchableOpacity
              style={[st.wBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
              onPress={() => setShowNewFolder(true)}
            >
              <Text style={[st.wBtnTxt, { color: "#fff" }]}>📁 Folder ({selected.length})</Text>
            </TouchableOpacity>
          )}
          {selected.length < 2 && (
            <Text style={[st.wTip, { color: colors.textMuted }]}>
              {selected.length === 0 ? "Tap apps to select · Long press to remove" : "Select 1 more to create a folder"}
            </Text>
          )}
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!wiggling && !showSearch}
        onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / W))}
        style={st.pages}
      >
        {Array.from({ length: NUM_PAGES }, (_, pi) => (
          <View key={pi} style={[st.pg, { width: W }]}>
            <View style={st.grid}>
              {pageFolders(pi).map(folder => (
                <FolderIcon
                  key={folder.id} folder={folder} apps={apps} wiggling={wiggling}
                  isDark={isDark} textColor={colors.text}
                  onPress={() => { if (!wiggling) { setActiveFolder(folder); setFolderVisible(true); } }}
                  onLongPress={() => wiggling ? deleteFolder(folder.id) : enterWiggle()}
                />
              ))}
              {pageApps(pi).map(app => (
                <AppIcon
                  key={app.id} app={app} wiggling={wiggling} selected={selected.includes(app.id)}
                  isDark={isDark} accentColor={colors.accent} textColor={colors.text} textMutedColor={colors.textMuted}
                  onPress={() => handleApp(app)}
                  onLongPress={() => {
                    if (!wiggling) {
                      enterWiggle();
                    } else {
                      Alert.alert(`Remove "${app.name}"?`, "It will be hidden from your home screen.", [
                        { text: "Cancel", style: "cancel" },
                        { text: "Remove", style: "destructive", onPress: () => removeApp(app.id) },
                      ]);
                    }
                  }}
                  badge={badges[app.id]}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[st.dots, { bottom: insets.bottom + 98 }]}>
        {Array.from({ length: NUM_PAGES }, (_, i) => (
          <TouchableOpacity key={i} onPress={() => scrollRef.current?.scrollTo({ x: W * i, animated: true })}>
            <View style={[st.dot, { backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }, page === i && [st.dotOn, { backgroundColor: colors.text }]]} />
          </TouchableOpacity>
        ))}
      </View>

      {!wiggling && (
        <GlassView style={[st.dock, { bottom: insets.bottom + 12, borderRadius: 28 }]} dark={isDark}>
          <View style={st.dockInner}>
            {DOCK_ITEMS.map(d => (
              <TouchableOpacity key={d.id} style={st.dockItem}
                onPress={() => router.push(d.route as any)}
                onLongPress={enterWiggle}
              >
                <View style={[st.dockIco, { backgroundColor: d.color }]}>
                  <Text style={{ fontSize: 22 }}>{d.emoji}</Text>
                  {d.id === "notifs" && (badges.notifs ?? 0) > 0 && (
                    <View style={st.dockBadge}>
                      <Text style={st.dockBadgeTxt}>{badges.notifs}</Text>
                    </View>
                  )}
                </View>
                <Text style={[st.dockLbl, { color: colors.textMuted }]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassView>
      )}

      <FolderModal
        visible={folderVisible} folder={activeFolder} apps={apps}
        isDark={isDark} textColor={colors.text}
        onClose={() => setFolderVisible(false)} onOpen={handleApp}
      />

      <Modal visible={showNewFolder} transparent animationType="fade" onRequestClose={() => setShowNewFolder(false)}>
        <View style={st.mBg}>
          <View style={[st.mBox, isDark && st.mBoxDark]}>
            <Text style={[st.mTitle, { color: colors.text }]}>New Folder</Text>
            <View style={st.mPreview}>
              {apps.filter(a => selected.includes(a.id)).slice(0, 4).map(a => (
                <View key={a.id} style={[st.mPreviewIco, { backgroundColor: a.color, borderRadius: 14 }]}>
                  <Text style={{ fontSize: 18 }}>{a.emoji}</Text>
                </View>
              ))}
            </View>
            <TextInput
              style={[st.mInput, { color: colors.text, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)", borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)" }]}
              value={folderName} onChangeText={setFolderName}
              placeholder="Folder name" placeholderTextColor={colors.textMuted}
              selectTextOnFocus autoFocus
            />
            <View style={st.mActions}>
              <TouchableOpacity style={[st.mCancel, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)", borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)" }]} onPress={() => setShowNewFolder(false)}>
                <Text style={[st.mBtnTxt, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.mConfirm, { backgroundColor: colors.accent }]} onPress={createFolder}>
                <Text style={[st.mBtnTxt, { color: "#fff" }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },

  top: { paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greet: { fontSize: 13, fontWeight: "500" as const },
  uname: { fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.5 },
  topBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },

  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  searchIn: { flex: 1, fontSize: 15 },
  searchDrop: { position: "absolute", left: 16, right: 16, zIndex: 200, maxHeight: 300, borderRadius: 20, padding: 4 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: 1 },
  searchIco: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  searchName: { flex: 1, fontSize: 15, fontWeight: "600" as const },
  searchSub: { fontSize: 11 },
  searchNone: { padding: 20, textAlign: "center", fontSize: 14 },

  wiggleBar: { position: "absolute", left: 16, right: 16, zIndex: 100, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  wBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  wBtnTxt: { fontSize: 13, fontWeight: "700" as const },
  wTip: { fontSize: 12, fontStyle: "italic" as const },

  pages: { flex: 1 },
  pg: { paddingHorizontal: PAD, paddingTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap" },

  iconBox: { alignItems: "center", justifyContent: "center", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  appLbl: { fontSize: 11, fontWeight: "600" as const, textAlign: "center", marginTop: 6, paddingHorizontal: 2 },
  badgePill: { position: "absolute", top: 6, right: (CELL_W - ICON_SIZE) / 2 - 8, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  badgeTxt: { fontSize: 7, fontWeight: "900" as const, color: "#fff" },
  notifBubble: { position: "absolute", top: 4, right: (CELL_W - ICON_SIZE) / 2 - 10, backgroundColor: "#EF4444", borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 2, borderColor: "#fff" },
  notifBubbleTxt: { fontSize: 9, fontWeight: "800" as const, color: "#fff" },
  delDot: { position: "absolute", top: 4, left: (CELL_W - ICON_SIZE) / 2 - 12, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", zIndex: 20 },
  delDotTxt: { fontSize: 11, fontWeight: "900" as const, color: "#fff" },
  selRing: { position: "absolute", top: -3, borderWidth: 2.5 },
  soonLay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.4)", paddingVertical: 3, alignItems: "center" },
  soonTxt: { fontSize: 7, fontWeight: "900" as const, color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 },

  folderBox: { alignItems: "center", justifyContent: "center", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderWidth: 1 },
  folderInner: { flexDirection: "row", flexWrap: "wrap", width: ICON_SIZE * 0.76, height: ICON_SIZE * 0.76 },

  folderModal: { position: "absolute", left: 20, right: 20, top: H * 0.28, backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)", padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  folderModalDark: { backgroundColor: "rgba(20,20,20,0.92)", borderColor: "rgba(255,255,255,0.12)" },
  folderModalTitle: { fontSize: 18, fontWeight: "800" as const, textAlign: "center", marginBottom: 18 },
  folderModalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "center" },
  folderModalItem: { alignItems: "center", gap: 6, width: 70 },
  folderModalIcon: { width: 54, height: 54, alignItems: "center", justifyContent: "center" },
  folderModalLbl: { fontSize: 11, textAlign: "center" },

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
