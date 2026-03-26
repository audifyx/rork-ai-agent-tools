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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>👤 Profile</Text>

      {/* Avatar + name card */}
      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.displayName}>{form.display_name || "Set your name"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.joined}>Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</Text>
      </View>

      {/* Edit form */}
      <Text style={styles.secLabel}>DETAILS</Text>
      <View style={styles.card}>
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
      </View>

      {/* Preferences */}
      <Text style={styles.secLabel}>PREFERENCES</Text>
      <View style={styles.card}>
        {[
          { key: "notifications_enabled", label: "Notifications", icon: Bell, desc: "Receive agent notifications" },
          { key: "dark_mode", label: "Dark Mode", icon: Moon, desc: "Always on (it's the only way)" },
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
              trackColor={{ false: Colors.surfaceLight, true: Colors.accentDim }}
              thumbColor={(prefs as any)[item.key] ? Colors.accent : Colors.textMuted}
            />
          </View>
        ))}
      </View>

      {/* Save */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.7} disabled={saving}>
        <Save size={16} color="#fff" />
        <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Profile"}</Text>
      </TouchableOpacity>

      {/* Account info */}
      <Text style={styles.secLabel}>ACCOUNT</Text>
      <View style={styles.card}>
        <View style={[styles.infoRow, styles.prefBorder]}>
          <Text style={styles.infoLabel}>User ID</Text>
          <Text style={styles.infoVal} numberOfLines={1}>{user?.id?.slice(0, 16)}...</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoVal}>{user?.email}</Text>
        </View>
      </View>

      {/* Sign out */}
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
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text, letterSpacing: -0.8, marginBottom: 20 },

  avatarCard: {
    alignItems: "center", padding: 24,
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.accentDim, borderWidth: 2, borderColor: "rgba(220,38,38,0.2)",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: "800", color: Colors.accent },
  displayName: { fontSize: 20, fontWeight: "700", color: Colors.text },
  email: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  joined: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  secLabel: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.5, marginTop: 24, marginBottom: 10 },

  card: {
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 16,
  },
  inputLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },

  prefRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  prefBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  prefLabel: { fontSize: 14, fontWeight: "600", color: Colors.text },
  prefDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16, marginTop: 20,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoVal: { fontSize: 13, color: Colors.textMuted, fontFamily: mono, maxWidth: 180, textAlign: "right" },

  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(248,113,113,0.08)", borderRadius: 14, paddingVertical: 16,
    borderWidth: 1, borderColor: "rgba(248,113,113,0.15)", marginTop: 16, marginBottom: 20,
  },
  signOutText: { fontSize: 15, fontWeight: "600", color: Colors.danger },
});
