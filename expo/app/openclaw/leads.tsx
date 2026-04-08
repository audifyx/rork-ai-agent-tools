import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Trash2, Users, Mail, Globe, X } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";

export default function LeadsTab() {
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const styles = createStylesStyles(colors);
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", website: "", phone: "", notes: "" });

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("leads").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setLeads(data ?? []);
  }, [user]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const onRefresh = async () => { setRefreshing(true); await fetchLeads(); setRefreshing(false); };

  const handleAdd = async () => {
    if (!user || !form.name) return Alert.alert("Error", "Name is required");
    const { error } = await supabase.from("leads").insert({ user_id: user.id, ...form });
    if (error) return Alert.alert("Error", error.message);
    setForm({ name: "", email: "", website: "", phone: "", notes: "" });
    setShowForm(false);
    fetchLeads();
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete Lead", `Remove "${name || "Unnamed"}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await supabase.from("leads").delete().eq("id", id);
        fetchLeads();
      }},
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Lead <Text style={{ color: colors.accent }}>Manager</Text></Text>
            <Text style={styles.subtitle}>{leads.length} contacts</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowForm(!showForm)}
            activeOpacity={0.7}
          >
            {showForm ? <X size={18} color={colors.background} /> : <Plus size={18} color={colors.background} />}
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={styles.form}>
            <TextInput style={styles.input} placeholder="Name *" placeholderTextColor={colors.textMuted}
              value={form.name} onChangeText={(v) => setForm(p => ({ ...p, name: v }))} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted}
              value={form.email} onChangeText={(v) => setForm(p => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Website" placeholderTextColor={colors.textMuted}
              value={form.website} onChangeText={(v) => setForm(p => ({ ...p, website: v }))} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={colors.textMuted}
              value={form.phone} onChangeText={(v) => setForm(p => ({ ...p, phone: v }))} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="Notes" placeholderTextColor={colors.textMuted}
              value={form.notes} onChangeText={(v) => setForm(p => ({ ...p, notes: v }))} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} activeOpacity={0.7}>
              <Text style={styles.saveBtnText}>Save Lead</Text>
            </TouchableOpacity>
          </View>
        )}

        {leads.length === 0 ? (
          <View style={styles.empty}>
            <Users size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No leads yet</Text>
            <Text style={styles.emptySubtext}>Add one or let your agent push them here</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {leads.map((lead) => (
              <View key={lead.id} style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(lead.name?.[0] ?? "?").toUpperCase()}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>{lead.name || "Unnamed"}</Text>
                  <View style={styles.metaRow}>
                    {lead.email ? <View style={styles.metaItem}><Mail size={10} color={colors.textMuted} /><Text style={styles.metaText}>{lead.email}</Text></View> : null}
                    {lead.website ? <View style={styles.metaItem}><Globe size={10} color={colors.textMuted} /><Text style={styles.metaText}>{lead.website}</Text></View> : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(lead.id, lead.name)} style={styles.deleteBtn}>
                  <Trash2 size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStylesStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "700", color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  addBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  form: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.surfaceLight, gap: 12, marginBottom: 16,
  },
  input: {
    backgroundColor: colors.surfaceLight, borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.surfaceLight,
  },
  saveBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: colors.background, fontWeight: "700", fontSize: 15 },
  empty: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 48,
    alignItems: "center", borderWidth: 1, borderColor: colors.surfaceLight,
  },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginTop: 16 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: "center" },
  list: { gap: 8 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.surfaceLight,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(52,211,153,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#34D399" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 3 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: colors.textMuted },
  deleteBtn: { padding: 8 },
});
