import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity,
  Alert, Switch, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Save, LogOut, Moon, Bell, RefreshCw,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";
import ColorfulBackground from "@/components/ColorfulBackground";
import GlassCard from "@/components/GlassCard";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ display_name: "", bio: "", timezone: "UTC" });
  const [prefs, setPrefs] = useState({
    notifications_enabled: true, dark_mode: true, auto_refresh: true, default_tool: "openclaw",
  });
  const [saving, setSaving] = useState(false);

  const mono = Platform.OS === "ios" ? "Menlo" : "monospace";
  const subtleBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const subtleBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (data) {
      setProfile(data);
      setForm({ display_name: data.display_name || "", bio: data.bio || "", timezone: data.timezone || "UTC" });
      if (data.preferences) setPrefs(data.preferences);
    }
  }, [user]);

  useEffect(() => { void fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    if (profile) {
      await supabase.from("user_profiles").update({
        display_name: form.display_name, bio: form.bio, timezone: form.timezone, preferences: prefs,
      }).eq("user_id", user.id);
    } else {
      await supabase.from("user_profiles").insert({
        user_id: user.id, display_name: form.display_name, bio: form.bio, timezone: form.timezone, preferences: prefs,
      });
    }
    setSaving(false);
    Alert.alert("Saved", "Profile updated");
    void fetchProfile();
  };

  const initial = (form.display_name || user?.email || "?")[0].toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ColorfulBackground variant="detail" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.avatarCard}>
          <View style={[styles.avatar, { backgroundColor: colors.accentDim, borderColor: colors.accentGlow }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>{initial}</Text>
          </View>
          <Text style={[styles.displayName, { color: colors.text }]}>{form.display_name || "Set your name"}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email}</Text>
          <Text style={[styles.joined, { color: colors.textMuted }]}>Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</Text>
        </GlassCard>

        <Text style={[styles.secLabel, { color: colors.textMuted }]}>DETAILS</Text>
        <GlassCard style={styles.card}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Display Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: subtleBg, borderColor: subtleBorder, color: colors.text }]}
            value={form.display_name}
            onChangeText={v => setForm(p => ({ ...p, display_name: v }))}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Bio</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top", backgroundColor: subtleBg, borderColor: subtleBorder, color: colors.text }]}
            value={form.bio}
            onChangeText={v => setForm(p => ({ ...p, bio: v }))}
            placeholder="Tell us about yourself"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Timezone</Text>
          <TextInput
            style={[styles.input, { backgroundColor: subtleBg, borderColor: subtleBorder, color: colors.text }]}
            value={form.timezone}
            onChangeText={v => setForm(p => ({ ...p, timezone: v }))}
            placeholder="e.g. America/New_York"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
        </GlassCard>

        <Text style={[styles.secLabel, { color: colors.textMuted }]}>PREFERENCES</Text>
        <GlassCard style={styles.card}>
          {[
            { key: "notifications_enabled", label: "Notifications", icon: Bell, desc: "Receive agent notifications" },
            { key: "dark_mode", label: "Dark Mode", icon: Moon, desc: "Toggle dark appearance" },
            { key: "auto_refresh", label: "Auto Refresh", icon: RefreshCw, desc: "Realtime data updates" },
          ].map((item, i, arr) => (
            <View key={item.key} style={[styles.prefRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: subtleBorder }]}>
              <item.icon size={16} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.prefLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.prefDesc, { color: colors.textMuted }]}>{item.desc}</Text>
              </View>
              <Switch
                value={(prefs as any)[item.key]}
                onValueChange={v => setPrefs(p => ({ ...p, [item.key]: v }))}
                trackColor={{ false: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", true: colors.accentGlow }}
                thumbColor={(prefs as any)[item.key] ? colors.accent : isDark ? "#666" : "#ccc"}
              />
            </View>
          ))}
        </GlassCard>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent, shadowColor: colors.accent }]} onPress={handleSave} activeOpacity={0.7} disabled={saving}>
          <Save size={16} color="#fff" />
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Profile"}</Text>
        </TouchableOpacity>

        <Text style={[styles.secLabel, { color: colors.textMuted }]}>ACCOUNT</Text>
        <GlassCard style={styles.card}>
          <View style={[styles.infoRow, { borderBottomWidth: 1, borderBottomColor: subtleBorder }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>User ID</Text>
            <Text style={[styles.infoVal, { fontFamily: mono, color: colors.textMuted }]} numberOfLines={1}>{user?.id?.slice(0, 16)}...</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
            <Text style={[styles.infoVal, { fontFamily: mono, color: colors.textMuted }]}>{user?.email}</Text>
          </View>
        </GlassCard>

        <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.15)" }]} onPress={() => {
          Alert.alert("Sign Out", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign Out", style: "destructive", onPress: signOut },
          ]);
        }} activeOpacity={0.7}>
          <LogOut size={16} color={colors.danger} />
          <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },

  avatarCard: {
    alignItems: "center", padding: 24, marginTop: 8,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: "800" as const },
  displayName: { fontSize: 20, fontWeight: "700" as const },
  email: { fontSize: 13, marginTop: 4 },
  joined: { fontSize: 11, marginTop: 2 },

  secLabel: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.5, marginTop: 24, marginBottom: 10 },

  card: {
    padding: 16,
  },
  inputLabel: { fontSize: 12, fontWeight: "600" as const, marginBottom: 6, marginTop: 8 },
  input: {
    borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    borderWidth: 1,
  },

  prefRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  prefLabel: { fontSize: 14, fontWeight: "600" as const },
  prefDesc: { fontSize: 11, marginTop: 1 },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 16, marginTop: 20,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700" as const, color: "#fff" },

  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  infoLabel: { fontSize: 14 },
  infoVal: { fontSize: 13, maxWidth: 180, textAlign: "right" as const },

  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 16,
    borderWidth: 1, marginTop: 16, marginBottom: 20,
  },
  signOutText: { fontSize: 15, fontWeight: "600" as const },
});
