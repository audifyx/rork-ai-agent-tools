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
import Colors from "@/constants/colors";
import ColorfulBackground from "@/components/ColorfulBackground";
import GlassCard from "@/components/GlassCard";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ display_name: "", bio: "", timezone: "UTC" });
  const [prefs, setPrefs] = useState({
    notifications_enabled: true, dark_mode: true, auto_refresh: true, default_tool: "openclaw",
  });
  const [saving, setSaving] = useState(false);

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
    <View style={styles.root}>
      <ColorfulBackground variant="detail" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.displayName}>{form.display_name || "Set your name"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.joined}>Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</Text>
        </GlassCard>

        <Text style={styles.secLabel}>DETAILS</Text>
        <GlassCard style={styles.card}>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={form.display_name}
            onChangeText={v => setForm(p => ({ ...p, display_name: v }))}
            placeholder="Your name"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            value={form.bio}
            onChangeText={v => setForm(p => ({ ...p, bio: v }))}
            placeholder="Tell us about yourself"
            placeholderTextColor={Colors.textMuted}
            multiline
          />
          <Text style={styles.inputLabel}>Timezone</Text>
          <TextInput
            style={styles.input}
            value={form.timezone}
            onChangeText={v => setForm(p => ({ ...p, timezone: v }))}
            placeholder="e.g. America/New_York"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
        </GlassCard>

        <Text style={styles.secLabel}>PREFERENCES</Text>
        <GlassCard style={styles.card}>
          {[
            { key: "notifications_enabled", label: "Notifications", icon: Bell, desc: "Receive agent notifications" },
            { key: "dark_mode", label: "Dark Mode", icon: Moon, desc: "Toggle dark appearance" },
            { key: "auto_refresh", label: "Auto Refresh", icon: RefreshCw, desc: "Realtime data updates" },
          ].map((item, i, arr) => (
            <View key={item.key} style={[styles.prefRow, i < arr.length - 1 && styles.prefBorder]}>
              <item.icon size={16} color={Colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.prefLabel}>{item.label}</Text>
                <Text style={styles.prefDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={(prefs as any)[item.key]}
                onValueChange={v => setPrefs(p => ({ ...p, [item.key]: v }))}
                trackColor={{ false: "rgba(0,0,0,0.08)", true: "rgba(220,38,38,0.25)" }}
                thumbColor={(prefs as any)[item.key] ? Colors.accent : "#ccc"}
              />
            </View>
          ))}
        </GlassCard>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.7} disabled={saving}>
          <Save size={16} color="#fff" />
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Profile"}</Text>
        </TouchableOpacity>

        <Text style={styles.secLabel}>ACCOUNT</Text>
        <GlassCard style={styles.card}>
          <View style={[styles.infoRow, styles.prefBorder]}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoVal} numberOfLines={1}>{user?.id?.slice(0, 16)}...</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoVal}>{user?.email}</Text>
          </View>
        </GlassCard>

        <TouchableOpacity style={styles.signOutBtn} onPress={() => {
          Alert.alert("Sign Out", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign Out", style: "destructive", onPress: signOut },
          ]);
        }} activeOpacity={0.7}>
          <LogOut size={16} color={Colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },

  avatarCard: {
    alignItems: "center", padding: 24, marginTop: 8,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(99,102,241,0.12)", borderWidth: 2, borderColor: "rgba(99,102,241,0.2)",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#6366F1" },
  displayName: { fontSize: 20, fontWeight: "700", color: Colors.text },
  email: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  joined: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  secLabel: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.5, marginTop: 24, marginBottom: 10 },

  card: {
    padding: 16,
  },
  inputLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: "rgba(0,0,0,0.04)", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
  },

  prefRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  prefBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.04)" },
  prefLabel: { fontSize: 14, fontWeight: "600", color: Colors.text },
  prefDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.accent, borderRadius: 16, paddingVertical: 16, marginTop: 20,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoVal: { fontSize: 13, color: Colors.textMuted, fontFamily: mono, maxWidth: 180, textAlign: "right" as const },

  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 16, paddingVertical: 16,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.15)", marginTop: 16, marginBottom: 20,
  },
  signOutText: { fontSize: 15, fontWeight: "600", color: Colors.danger },
});
