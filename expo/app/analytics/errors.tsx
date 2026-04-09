import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";

export default function ErrorsScreen() {
  const { colors, theme } = useTheme();

  const SEV_COLORS: Record<string, string> = { warning: colors.warning, error: colors.danger, critical: colors.accent };
  const isDark = theme.dark;
  const styles = createStylesStyles(colors);
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [errors, setErrors] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("error_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setErrors(data ?? []);
  };
  useEffect(() => { load(); }, [user]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const resolve = async (id: string) => {
    await supabase.from("error_log").update({ resolved: true }).eq("id", id);
    load();
  };

  const unresolved = errors.filter(e => !e.resolved);
  const resolved = errors.filter(e => e.resolved);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.danger} />}>
      <Text style={styles.title}>🚨 Error Log</Text>
      <Text style={styles.subtitle}>{unresolved.length} unresolved</Text>

      {errors.length === 0 ? (
        <View style={styles.empty}><CheckCircle2 size={48} color={colors.success} /><Text style={styles.emptyText}>No errors — all clear</Text></View>
      ) : (
        <>
          {unresolved.map(e => (
            <View key={e.id} style={[styles.errorCard, { borderLeftColor: SEV_COLORS[e.severity] || colors.danger }]}>
              <View style={styles.errorHeader}>
                <View style={[styles.sevBadge, { backgroundColor: (SEV_COLORS[e.severity] || colors.danger) + "15" }]}>
                  <Text style={[styles.sevText, { color: SEV_COLORS[e.severity] || colors.danger }]}>{e.severity}</Text>
                </View>
                <Text style={styles.errorTool}>{e.tool}</Text>
                <Text style={styles.errorTime}>{new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
              <Text style={styles.errorMsg}>{e.error_message}</Text>
              <Text style={styles.errorAction}>{e.action}</Text>
              <TouchableOpacity style={styles.resolveBtn} onPress={() => resolve(e.id)} activeOpacity={0.7}>
                <CheckCircle2 size={14} color={colors.success} />
                <Text style={styles.resolveText}>Resolve</Text>
              </TouchableOpacity>
            </View>
          ))}
          {resolved.length > 0 && (
            <>
              <Text style={styles.secLabel}>RESOLVED</Text>
              {resolved.slice(0, 10).map(e => (
                <View key={e.id} style={[styles.errorCard, { opacity: 0.4, borderLeftColor: colors.success }]}>
                  <Text style={styles.errorMsg}>{e.error_message}</Text>
                  <Text style={styles.errorAction}>{e.tool} · {e.action}</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";
const createStylesStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 3, marginBottom: 20 },
  secLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 1.5, marginTop: 20, marginBottom: 10 },
  empty: { padding: 48, alignItems: "center", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20, borderWidth: 1, borderColor: colors.surfaceLight },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 16 },
  errorCard: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.surfaceLight, borderLeftWidth: 3, marginBottom: 8 },
  errorHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sevText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  errorTool: { fontSize: 11, fontWeight: "600", color: colors.textMuted, fontFamily: mono, flex: 1 },
  errorTime: { fontSize: 10, color: colors.textMuted, fontFamily: mono },
  errorMsg: { fontSize: 14, color: colors.text, marginBottom: 4 },
  errorAction: { fontSize: 11, color: colors.textMuted, fontFamily: mono },
  resolveBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start" },
  resolveText: { fontSize: 12, fontWeight: "600", color: colors.success },
});
