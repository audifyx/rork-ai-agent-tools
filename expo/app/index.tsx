import React, { useEffect, useRef } from "react";
import {
  StyleSheet, Text, View, Animated, Dimensions, Platform, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import Svg, {
  G, Ellipse, Path, Circle, Line, Polygon, Rect,
} from "react-native-svg";
import Colors from "@/constants/colors";

const { width, height } = Dimensions.get("window");

// Animated pulsing ring in red
function PulsingRing({ delay, size }: { delay: number; size: number }) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = () => {
      scale.setValue(0.5);
      opacity.setValue(0.5);
      Animated.parallel([
        Animated.timing(scale, { toValue: 2, duration: 3500, delay, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 3500, delay, useNativeDriver: true }),
      ]).start(() => loop());
    };
    loop();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 1.5, borderColor: Colors.accentGlow,
        transform: [{ scale }], opacity,
      }}
    />
  );
}

// Red floating particle
function RedParticle({ x, y, delay: d }: { x: number; y: number; delay: number }) {
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      ty.setValue(0); op.setValue(0);
      Animated.sequence([
        Animated.delay(d),
        Animated.parallel([
          Animated.timing(ty, { toValue: -90, duration: 4000, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(op, { toValue: 0.6, duration: 800, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0, duration: 3200, useNativeDriver: true }),
          ]),
        ]),
      ]).start(() => loop());
    };
    loop();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute", left: x, top: y,
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: Colors.accent,
        transform: [{ translateY: ty }], opacity: op,
      }}
    />
  );
}

// Cartoon lobster SVG
function LobsterCharacter({ size = 200 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 200 220">
      <G transform="translate(100,115)">
        {/* Body */}
        <Ellipse cx={0} cy={10} rx={32} ry={50} fill={Colors.accent} opacity={0.9} />
        {/* Belly highlight */}
        <Ellipse cx={0} cy={15} rx={20} ry={35} fill={Colors.accentBright} opacity={0.3} />
        {/* Tail segments */}
        <Path d="M-20,55 Q0,80 20,55 Q10,70 0,75 Q-10,70 -20,55Z" fill={Colors.accent} />
        <Path d="M-15,70 Q0,90 15,70 Q8,82 0,85 Q-8,82 -15,70Z" fill={Colors.accent} opacity={0.8} />
        <Path d="M-12,82 Q0,98 12,82 Q6,92 0,95 Q-6,92 -12,82Z" fill={Colors.accent} opacity={0.6} />
        {/* Left claw arm */}
        <Path d="M-30,-10 C-55,-15 -70,-40 -60,-55 C-55,-60 -45,-58 -48,-48 C-50,-40 -42,-30 -30,-25Z" fill={Colors.accent} />
        {/* Left pincer */}
        <Path d="M-60,-55 C-75,-72 -88,-55 -72,-42 C-65,-35 -55,-45 -60,-55Z" fill={Colors.accentBright} />
        <Path d="M-60,-55 C-55,-74 -42,-68 -48,-52 C-52,-45 -58,-48 -60,-55Z" fill={Colors.accent} />
        {/* Right claw arm */}
        <Path d="M30,-10 C55,-15 70,-40 60,-55 C55,-60 45,-58 48,-48 C50,-40 42,-30 30,-25Z" fill={Colors.accent} />
        {/* Right pincer */}
        <Path d="M60,-55 C75,-72 88,-55 72,-42 C65,-35 55,-45 60,-55Z" fill={Colors.accentBright} />
        <Path d="M60,-55 C55,-74 42,-68 48,-52 C52,-45 58,-48 60,-55Z" fill={Colors.accent} />
        {/* Eyes - big cartoon style */}
        <Circle cx={-14} cy={-22} r={12} fill="#000" />
        <Circle cx={14} cy={-22} r={12} fill="#000" />
        <Circle cx={-14} cy={-22} r={9} fill="#1a1a1a" />
        <Circle cx={14} cy={-22} r={9} fill="#1a1a1a" />
        <Circle cx={-11} cy={-25} r={4} fill="#fff" opacity={0.9} />
        <Circle cx={17} cy={-25} r={4} fill="#fff" opacity={0.9} />
        <Circle cx={-14} cy={-20} r={2} fill={Colors.accent} opacity={0.6} />
        <Circle cx={14} cy={-20} r={2} fill={Colors.accent} opacity={0.6} />
        {/* Mouth - happy */}
        <Path d="M-8,0 Q0,8 8,0" stroke="#000" strokeWidth={2} fill="none" strokeLinecap="round" />
        {/* Antennae */}
        <Path d="M-10,-38 C-25,-62 -35,-78 -28,-88" stroke={Colors.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Circle cx={-28} cy={-90} r={4} fill={Colors.accentBright} />
        <Path d="M10,-38 C25,-62 35,-78 28,-88" stroke={Colors.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Circle cx={28} cy={-90} r={4} fill={Colors.accentBright} />
        {/* Legs */}
        <Line x1={-25} y1={20} x2={-50} y2={38} stroke={Colors.accent} strokeWidth={3.5} strokeLinecap="round" />
        <Line x1={-22} y1={30} x2={-44} y2={50} stroke={Colors.accent} strokeWidth={3} strokeLinecap="round" />
        <Line x1={-18} y1={38} x2={-36} y2={56} stroke={Colors.accent} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={25} y1={20} x2={50} y2={38} stroke={Colors.accent} strokeWidth={3.5} strokeLinecap="round" />
        <Line x1={22} y1={30} x2={44} y2={50} stroke={Colors.accent} strokeWidth={3} strokeLinecap="round" />
        <Line x1={18} y1={38} x2={36} y2={56} stroke={Colors.accent} strokeWidth={2.5} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

// Broken glass crack overlay
function CrackOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ opacity: 0.06 }}>
        <G stroke="rgba(255,255,255,0.5)" strokeWidth={0.6} fill="none">
          <Line x1={width * 0.5} y1={height * 0.4} x2={width * 0.1} y2={height * 0.05} />
          <Line x1={width * 0.5} y1={height * 0.4} x2={width * 0.85} y2={height * 0.08} />
          <Line x1={width * 0.5} y1={height * 0.4} x2={width * 0.95} y2={height * 0.45} />
          <Line x1={width * 0.5} y1={height * 0.4} x2={width * 0.8} y2={height * 0.9} />
          <Line x1={width * 0.5} y1={height * 0.4} x2={width * 0.2} y2={height * 0.85} />
          <Line x1={width * 0.5} y1={height * 0.4} x2={width * 0.05} y2={height * 0.55} />
          {/* Secondary cracks */}
          <Line x1={width * 0.3} y1={height * 0.22} x2={width * 0.15} y2={height * 0.12} />
          <Line x1={width * 0.3} y1={height * 0.22} x2={width * 0.18} y2={height * 0.3} />
          <Line x1={width * 0.68} y1={height * 0.24} x2={width * 0.78} y2={height * 0.14} />
          <Line x1={width * 0.72} y1={height * 0.42} x2={width * 0.88} y2={height * 0.38} />
          <Line x1={width * 0.65} y1={height * 0.65} x2={width * 0.78} y2={height * 0.72} />
          <Line x1={width * 0.35} y1={height * 0.62} x2={width * 0.22} y2={height * 0.7} />
        </G>
        {/* Impact point */}
        <Circle cx={width * 0.5} cy={height * 0.4} r={8} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
        <Circle cx={width * 0.5} cy={height * 0.4} r={3} fill="rgba(220,38,38,0.2)" />
        {/* Shard reflections */}
        <Polygon
          points={`${width * 0.5},${height * 0.4} ${width * 0.3},${height * 0.22} ${width * 0.25},${height * 0.42}`}
          fill="rgba(255,255,255,0.008)"
        />
        <Polygon
          points={`${width * 0.5},${height * 0.4} ${width * 0.68},${height * 0.24} ${width * 0.72},${height * 0.42}`}
          fill="rgba(255,255,255,0.01)"
        />
      </Svg>
    </View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Animated values
  const lobsterScale = useRef(new Animated.Value(0)).current;
  const lobsterOpacity = useRef(new Animated.Value(0)).current;
  const lobsterFloat = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(25)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(15)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(lobsterScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(lobsterOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      Animated.stagger(120, [
        Animated.parallel([
          Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(titleY, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(subtitleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(subtitleY, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
        Animated.timing(footerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();

    // Lobster idle float
    Animated.loop(
      Animated.sequence([
        Animated.timing(lobsterFloat, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(lobsterFloat, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Status dot pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const particles = [
    { x: width * 0.12, y: height * 0.25, delay: 0 },
    { x: width * 0.75, y: height * 0.2, delay: 700 },
    { x: width * 0.4, y: height * 0.5, delay: 1400 },
    { x: width * 0.88, y: height * 0.35, delay: 2100 },
    { x: width * 0.2, y: height * 0.6, delay: 500 },
    { x: width * 0.65, y: height * 0.55, delay: 1100 },
    { x: width * 0.5, y: height * 0.7, delay: 1800 },
    { x: width * 0.08, y: height * 0.45, delay: 300 },
  ];

  return (
    <View style={styles.container}>
      {/* Crack overlay */}
      <CrackOverlay />

      {/* Red ambient glow */}
      <View style={styles.glowOrb} />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <RedParticle key={i} x={p.x} y={p.y} delay={p.delay} />
      ))}

      {/* Pulsing rings behind lobster */}
      <View style={styles.ringsContainer}>
        <PulsingRing delay={0} size={200} />
        <PulsingRing delay={1200} size={200} />
        <PulsingRing delay={2400} size={200} />
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        {/* Lobster + title hero */}
        <View style={styles.heroSection}>
          <Animated.View
            style={{
              transform: [{ scale: lobsterScale }, { translateY: lobsterFloat }],
              opacity: lobsterOpacity,
              marginBottom: 28,
            }}
          >
            <View style={styles.lobsterGlow}>
              <LobsterCharacter size={180} />
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }] }}>
            <Text style={styles.emoji}>🦞</Text>
            <Text style={styles.title}>OpenClaw</Text>
            <Text style={styles.titleSub}>AI Agent Tools</Text>
          </Animated.View>

          <Animated.View
            style={[styles.subtitleRow, { opacity: subtitleOpacity, transform: [{ translateY: subtitleY }] }]}
          >
            <Animated.View style={[styles.statusDot, { transform: [{ scale: dotPulse }] }]} />
            <Text style={styles.subtitle}>Command center for your AI agents</Text>
          </Animated.View>
        </View>

        {/* Footer with button */}
        <Animated.View style={[styles.footer, { opacity: footerOpacity, paddingBottom: insets.bottom + 28 }]}>
          <TouchableOpacity
            style={styles.enterButton}
            onPress={() => router.replace("/(auth)/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.enterButtonText}>Get Started</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.footerText}>Powered by OpenClaw OS v2.0</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  glowOrb: {
    position: "absolute",
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: "rgba(220,38,38,0.06)",
    top: "25%", left: "15%",
  },
  ringsContainer: {
    position: "absolute",
    top: "28%", left: 0, right: 0,
    alignItems: "center", justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  heroSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  lobsterGlow: {
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 30,
      },
      default: {},
    }),
  },
  emoji: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    letterSpacing: -1,
  },
  titleSub: {
    fontSize: 18,
    fontWeight: "500",
    color: Colors.accent,
    textAlign: "center",
    marginTop: 4,
    letterSpacing: 1,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    gap: 8,
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.accent,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
      default: {},
    }),
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "400",
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: 28,
  },
  enterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.accent,
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: "100%",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  enterButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});
