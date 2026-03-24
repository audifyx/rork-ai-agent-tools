import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import {
  Bot, FolderOpen, BarChart3, Mail, Globe, Clock, Lock,
  ExternalLink, Zap, LogOut, ChevronRight,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

type ToolAction = { type: "route"; path: string } | { type: "external"; url: string };

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: typeof Bot;
  color: string;
  action: ToolAction;
  badge?: string;
}

const tools: Tool[] = [
  {
    id: "openclaw",
    name: "OpenClaw Agent",
    description: "Command center for files, leads, agents, API keys & webhook logs",
    icon: Bot,
    color: Colors.accent,
    action: { type: "route", path: "/openclaw" },
    badge: "Core",
  },
  {
    id: "agentcode",
    name: "AgentCode",
    description: "AI-powered code generation & deployment",
    icon: Zap,
    color: Colors.info,
    action: { type: "external", url: "https://agentcode.lovable.app/" },
  },
  {
    id: "nexus",
    name: "Nexus SkillHub",
    description: "Browse & manage custom skills for your agents",
    icon: Globe,
    color: "#A78BFA",
    action: { type: "external", url: "https://nexus-skillhub.lovable.app/" },
    badge: "New",
  },
  {
    id: "tweeter",
    name: "Agent Tweeter",
    description: "Autonomous AI posting — evolving personality, mood-aware tweets, agent-only access",
    icon: Bot,
    color: Colors.accent,
    action: { type: "route", path: "/tweeter" },
    badge: "New",
  },
  {
    id: "clawvault",
    name: "ClawVault",
    description: "Secure API key storage — store once, agent reads when needed",
    icon: FolderOpen,
    color: Colors.accent,
    action: { type: "route", path: "/vault" },
    badge: "New",
  },
  {
    id: "clawanalytics",
    name: "ClawAnalytics",
    description: "Cross-tool analytics, error tracking, health monitoring & custom KPIs",
    icon: BarChart3,
    color: Colors.success,
    action: { type: "route", path: "/analytics" },
    badge: "New",
  },
  {
    id: "clawpages",
    name: "ClawPages",
    description: "Deployment link tracker & live HTML preview — see your agent build in real-time",
    icon: Globe,
    color: Colors.info,
    action: { type: "route", path: "/pages" },
    badge: "New",
  },
  {
    id: "clawmailer",
    name: "ClawMailer",
    description: "Email campaign automation & templates",
    icon: Mail,
    color: Colors.warning,
    action: { type: "route", path: "" },
    badge: "Coming Soon",
  },
  {
    id: "clawscraper",
    name: "ClawScraper",
    description: "Web scraping & automated content collection",
    icon: Globe,
    color: "#C084FC",
    action: { type: "route", path: "" },
    badge: "Coming Soon",
  },
  {
    id: "clawscheduler",
    name: "ClawScheduler",
    description: "Task scheduling & automated workflows",
    icon: Clock,
    color: "#22D3EE",
    action: { type: "route", path: "" },
    badge: "Coming Soon",
  },
];

function GlassCard({ children, style, disabled }: { children: React.ReactNode; style?: object; disabled?: boolean }) {
  const cardStyle = [styles.glass, disabled && styles.glassDisabled, style];

  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={15} tint="dark" style={cardStyle}>
        <View style={styles.glassInner}>{children}</View>
      </BlurView>
    );
  }

  return <View style={[styles.glassFallback, disabled && styles.glassDisabled, style]}>{children}</View>;
}

export default function ToolHub() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const [stats, setStats] = useState<{ files: number; leads: number; agents: number }>({ files: 0, leads: 0, agents: 0 });

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [f, l, a] = await Promise.all([
        supabase.from("stored_files").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("agent_configs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      setStats({
        files: f.count ?? 0,
        leads: l.count ?? 0,
        agents: a.count ?? 0,
      });
    };

    void load();
  }, [user]);

  const handleTool = (tool: Tool) => {
    if (tool.badge === "Coming Soon") return;

    if (tool.action.type === "external") {
      void Linking.openURL(tool.action.url);
      return;
    }

    router.push(tool.action.path as never);
  };

  const activeTools = tools.filter((tool) => tool.badge !== "Coming Soon");
  const comingSoonTools = tools.filter((tool) => tool.badge === "Coming Soon");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      testID="tool-hub-screen"
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>🦞 OpenClaw OS</Text>
          <Text style={styles.headerSub}>
            {activeTools.length} active · {comingSoonTools.length} in development
          </Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.7} testID="sign-out-button">
          <LogOut size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <GlassCard style={styles.statsBar}>
        <View style={styles.statsRow}>
          {[
            { label: "Files", value: stats.files, color: Colors.info },
            { label: "Leads", value: stats.leads, color: Colors.success },
            { label: "Agents", value: stats.agents, color: Colors.accent },
          ].map((item, index) => (
            <View key={item.label} style={[styles.statItem, index < 2 && styles.statItemBorder]}>
              <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <Text style={styles.sectionLabel}>YOUR TOOLS</Text>
      {activeTools.map((tool) => {
        const Icon = tool.icon;
        const isExternal = tool.action.type === "external";

        return (
          <TouchableOpacity key={tool.id} onPress={() => handleTool(tool)} activeOpacity={0.8} testID={`tool-card-${tool.id}`}>
            <GlassCard style={styles.toolCard}>
              <View style={styles.toolRow}>
                <View style={[styles.toolIcon, { backgroundColor: `${tool.color}18` }]}>
                  <Icon size={22} color={tool.color} />
                </View>
                <View style={styles.toolInfo}>
                  <View style={styles.toolNameRow}>
                    <Text style={styles.toolName}>{tool.name}</Text>
                    {tool.badge && (
                      <View style={[styles.badge, tool.badge === "Core" && styles.badgeCore, tool.badge === "New" && styles.badgeNew]}>
                        <Text
                          style={[
                            styles.badgeText,
                            tool.badge === "Core" && styles.badgeCoreText,
                            tool.badge === "New" && styles.badgeNewText,
                          ]}
                        >
                          {tool.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.toolDesc} numberOfLines={2}>{tool.description}</Text>
                </View>
                {isExternal ? <ExternalLink size={16} color={Colors.textMuted} /> : <ChevronRight size={18} color={Colors.textMuted} />}
              </View>
            </GlassCard>
          </TouchableOpacity>
        );
      })}

      {comingSoonTools.length > 0 && (
        <>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>IN DEVELOPMENT</Text>
            <View style={styles.dividerLine} />
          </View>

          {comingSoonTools.map((tool) => {
            const Icon = tool.icon;

            return (
              <GlassCard key={tool.id} style={styles.toolCardDisabled} disabled>
                <View style={styles.toolRow}>
                  <View style={[styles.toolIcon, { backgroundColor: "rgba(255,255,255,0.03)" }]}>
                    <Icon size={20} color={Colors.textMuted} />
                  </View>
                  <View style={styles.toolInfo}>
                    <View style={styles.toolNameRow}>
                      <Text style={styles.toolNameDisabled}>{tool.name}</Text>
                      <View style={styles.badgeSoon}>
                        <Lock size={9} color={Colors.textMuted} />
                        <Text style={styles.badgeSoonText}>Soon</Text>
                      </View>
                    </View>
                    <Text style={styles.toolDescDisabled} numberOfLines={1}>{tool.description}</Text>
                  </View>
                </View>
              </GlassCard>
            );
          })}
        </>
      )}

      <View style={styles.accountRow}>
        <Text style={styles.accountEmail} numberOfLines={1}>{user?.email}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 4,
  },
  greeting: { fontSize: 24, fontWeight: "800", color: Colors.text, letterSpacing: -0.8 },
  headerSub: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  signOutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  glass: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  glassFallback: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  glassInner: {},
  glassDisabled: { opacity: 0.4 },
  statsBar: { marginBottom: 24, padding: 0 },
  statsRow: { flexDirection: "row" },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statItemBorder: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.04)" },
  statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 12 },
  toolCard: { marginBottom: 10, padding: 16 },
  toolCardDisabled: { marginBottom: 8, padding: 14 },
  toolRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  toolIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  toolInfo: { flex: 1 },
  toolNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  toolName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  toolNameDisabled: { fontSize: 14, fontWeight: "600", color: Colors.textMuted },
  toolDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  toolDescDisabled: { fontSize: 12, color: "rgba(255,255,255,0.15)" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeCore: { backgroundColor: Colors.accentDim, borderColor: "rgba(220,38,38,0.2)" },
  badgeNew: { backgroundColor: Colors.accentDim, borderColor: "rgba(220,38,38,0.2)" },
  badgeText: { fontSize: 9, fontWeight: "800", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  badgeCoreText: { color: Colors.accent },
  badgeNewText: { color: Colors.accent },
  badgeSoon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  badgeSoonText: { fontSize: 9, fontWeight: "700", color: Colors.textMuted },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.04)" },
  dividerText: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.15)", letterSpacing: 1.5 },
  accountRow: { alignItems: "center", marginTop: 24 },
  accountEmail: { fontSize: 11, color: Colors.textMuted },
});
