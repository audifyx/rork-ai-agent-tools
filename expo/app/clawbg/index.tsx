import { View, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import ColorfulBackground from "@/components/ColorfulBackground";
import GlassCard from "@/components/GlassCard";

export default function ClawBGScreen() {
  return (
    <View style={styles.root}>
      <ColorfulBackground variant="detail" />
      <View style={styles.content}>
        <Text style={styles.icon}>🎨</Text>
        <Text style={styles.title}>ClawBG</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>COMING SOON</Text>
        </View>
        <Text style={styles.desc}>
          Agent-controlled animated backgrounds.{"\n"}
          Push any HTML canvas animation to your{"\n"}
          app wallpaper in real time.
        </Text>
        <GlassCard style={styles.features}>
          {[
            "🟣  AI-generated canvas animations",
            "⚡  8 built-in presets",
            "🤖  Agent push via ok_ master key",
            "📡  Live updates via Realtime",
          ].map(f => (
            <Text key={f} style={styles.feature}>{f}</Text>
          ))}
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  icon: { fontSize: 64, marginBottom: 16 },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: "rgba(239,68,68,0.10)",
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 28,
  },
  badgeText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
  desc: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 36,
  },
  features: {
    width: "100%",
    padding: 20,
    gap: 14,
  },
  feature: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
