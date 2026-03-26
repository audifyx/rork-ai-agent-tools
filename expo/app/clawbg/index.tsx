import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

export default function ClawBGScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.icon}>🎨</Text>
      <Text style={styles.title}>ClawBG</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>COMING SOON</Text>
      </View>
      <Text style={styles.desc}>
        Agent-controlled animated backgrounds.{'\n'}
        Push any HTML canvas animation to your{'\n'}
        app wallpaper in real time.
      </Text>
      <View style={styles.features}>
        {[
          '🟣  AI-generated canvas animations',
          '⚡  8 built-in presets',
          '🤖  Agent push via ok_ master key',
          '📡  Live updates via Realtime',
        ].map(f => (
          <Text key={f} style={styles.feature}>{f}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon: { fontSize: 64, marginBottom: 16 },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: 'rgba(220,38,38,0.15)',
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
    fontWeight: '800',
    letterSpacing: 2,
  },
  desc: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
  },
  features: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  feature: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
