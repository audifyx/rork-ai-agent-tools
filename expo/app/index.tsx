import React, { useEffect, useRef } from "react";
import {
  StyleSheet, Text, View, Animated, Dimensions, Platform, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import Svg, {
  G, Ellipse, Path, Circle, Line, Polygon, Defs, RadialGradient, Stop, Rect,
} from "react-native-svg";
import Colors from "@/constants/colors";

const { width, height } = Dimensions.get("window");
const CX = width / 2;
const CY = height * 0.38;

// ─── Glass Shard ───────────────────────────────────────
// Each shard is a triangle that flies outward from the impact point
function GlassShard({
  points, delay, tx, ty, rotate, duration,
}: {
  points: string; delay: number; tx: number; ty: number; rotate: number; duration: number;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Phase 1: glass appears intact
    // Phase 2: shatter — shards fly out
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.6, duration: 80, useNativeDriver: true }),
      ]),
      Animated.delay(1400 - delay), // wait until shatter moment (1.4s)
      Animated.parallel([
        Animated.timing(translateX, { toValue: tx, duration, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: ty, duration, useNativeDriver: true }),
        Animated.timing(rot, { toValue: rotate, duration, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.3, duration, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: duration * 0.8, delay: duration * 0.2, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const spin = rot.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={{
        position: "absolute", left: 0, top: 0,
        transform: [{ translateX }, { translateY }, { rotate: spin }, { scale }],
        opacity,
      }}
      pointerEvents="none"
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polygon points={points} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />
      </Svg>
    </Animated.View>
  );
}

// ─── Crack Lines (appear on impact, before shatter) ────
function CrackLine({
  x1, y1, x2, y2, delay,
}: { x1: number; y1: number; x2: number; y2: number; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, { toValue: 0.35, duration: 60, useNativeDriver: true }),
      // Hold until shatter
      Animated.delay(1600 - delay),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.6)" strokeWidth={1} />
      </Svg>
    </Animated.View>
  );
}

// ─── Impact Flash ──────────────────────────────────────
function ImpactFlash() {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(1300),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 3, tension: 200, friction: 10, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute", left: CX - 60, top: CY - 60,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: Colors.accent,
        transform: [{ scale }], opacity,
      }}
      pointerEvents="none"
    />
  );
}

// ─── Shockwave Ring ────────────────────────────────────
function ShockwaveRing({ delay, color }: { delay: number; color: string }) {
  const scale = useRef(new Animated.Value(0.1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(1300 + delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.5, duration: 100, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 4, duration: 1200, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute", left: CX - 80, top: CY - 80,
        width: 160, height: 160, borderRadius: 80,
        borderWidth: 2, borderColor: color,
        transform: [{ scale }], opacity,
      }}
      pointerEvents="none"
    />
  );
}

// ─── Spark Particle (flies out from impact) ────────────
function Spark({ angle, delay: d }: { angle: number; delay: number }) {
  const dist = 80 + Math.random() * 160;
  const tx = Math.cos(angle) * dist;
  const ty = Math.sin(angle) * dist;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(1300 + d),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.9, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: tx, duration: 600 + Math.random() * 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: ty, duration: 600 + Math.random() * 400, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const size = 2 + Math.random() * 3;

  return (
    <Animated.View
      style={{
        position: "absolute", left: CX - size / 2, top: CY - size / 2,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: Math.random() > 0.5 ? Colors.accent : "#fff",
        transform: [{ translateX }, { translateY }], opacity,
      }}
      pointerEvents="none"
    />
  );
}

// ─── Floating Ember (ambient after shatter) ────────────
function Ember({ x, y, delay: d }: { x: number; y: number; delay: number }) {
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      ty.setValue(0); op.setValue(0);
      Animated.sequence([
        Animated.delay(d),
        Animated.parallel([
          Animated.timing(ty, { toValue: -120, duration: 5000, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(op, { toValue: 0.7, duration: 600, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0, duration: 4400, useNativeDriver: true }),
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
        width: 3, height: 3, borderRadius: 1.5,
        backgroundColor: Colors.accent,
        transform: [{ translateY: ty }], opacity: op,
      }}
    />
  );
}

// ─── Lobster SVG ───────────────────────────────────────
function LobsterCharacter({ size = 200 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 200 220">
      <Defs>
        <RadialGradient id="bodyGrad" cx="50%" cy="45%" r="50%">
          <Stop offset="0%" stopColor={Colors.accentBright} stopOpacity={0.5} />
          <Stop offset="100%" stopColor={Colors.accent} stopOpacity={1} />
        </RadialGradient>
      </Defs>
      <G transform="translate(100,115)">
        {/* Body with gradient */}
        <Ellipse cx={0} cy={10} rx={34} ry={52} fill="url(#bodyGrad)" />
        {/* Shell texture lines */}
        <Path d="M-20,0 Q0,-5 20,0" stroke="rgba(0,0,0,0.15)" strokeWidth={1} fill="none" />
        <Path d="M-22,12 Q0,8 22,12" stroke="rgba(0,0,0,0.12)" strokeWidth={1} fill="none" />
        <Path d="M-20,24 Q0,20 20,24" stroke="rgba(0,0,0,0.1)" strokeWidth={1} fill="none" />
        {/* Belly highlight */}
        <Ellipse cx={0} cy={15} rx={18} ry={32} fill={Colors.accentBright} opacity={0.2} />
        {/* Tail segments */}
        <Path d="M-22,55 Q0,82 22,55 Q12,72 0,78 Q-12,72 -22,55Z" fill={Colors.accent} />
        <Path d="M-16,72 Q0,92 16,72 Q9,84 0,88 Q-9,84 -16,72Z" fill={Colors.accent} opacity={0.8} />
        <Path d="M-13,84 Q0,100 13,84 Q7,94 0,97 Q-7,94 -13,84Z" fill={Colors.accent} opacity={0.6} />
        {/* Tail fan */}
        <Path d="M-18,92 Q-28,108 -12,105 Q0,110 12,105 Q28,108 18,92 Q10,102 0,104 Q-10,102 -18,92Z" fill={Colors.accentBright} opacity={0.7} />
        {/* Left claw arm */}
        <Path d="M-30,-10 C-58,-15 -72,-42 -62,-58 C-57,-63 -47,-60 -50,-50 C-52,-42 -44,-30 -30,-25Z" fill={Colors.accent} />
        {/* Left pincer */}
        <Path d="M-62,-58 C-78,-76 -92,-58 -75,-44 C-68,-37 -57,-47 -62,-58Z" fill={Colors.accentBright} />
        <Path d="M-62,-58 C-57,-78 -44,-70 -50,-54 C-54,-47 -60,-50 -62,-58Z" fill={Colors.accent} />
        {/* Claw teeth */}
        <Circle cx={-72} cy={-52} r={1.5} fill="#000" opacity={0.3} />
        <Circle cx={-66} cy={-48} r={1.5} fill="#000" opacity={0.3} />
        {/* Right claw arm */}
        <Path d="M30,-10 C58,-15 72,-42 62,-58 C57,-63 47,-60 50,-50 C52,-42 44,-30 30,-25Z" fill={Colors.accent} />
        {/* Right pincer */}
        <Path d="M62,-58 C78,-76 92,-58 75,-44 C68,-37 57,-47 62,-58Z" fill={Colors.accentBright} />
        <Path d="M62,-58 C57,-78 44,-70 50,-54 C54,-47 60,-50 62,-58Z" fill={Colors.accent} />
        <Circle cx={72} cy={-52} r={1.5} fill="#000" opacity={0.3} />
        <Circle cx={66} cy={-48} r={1.5} fill="#000" opacity={0.3} />
        {/* Eyes - big cartoon style */}
        <Circle cx={-15} cy={-24} r={14} fill="#111" />
        <Circle cx={15} cy={-24} r={14} fill="#111" />
        <Circle cx={-15} cy={-24} r={11} fill="#1a1a1a" />
        <Circle cx={15} cy={-24} r={11} fill="#1a1a1a" />
        {/* Eye glow ring */}
        <Circle cx={-15} cy={-24} r={11} fill="none" stroke={Colors.accent} strokeWidth={0.5} opacity={0.3} />
        <Circle cx={15} cy={-24} r={11} fill="none" stroke={Colors.accent} strokeWidth={0.5} opacity={0.3} />
        {/* Pupils with red glow */}
        <Circle cx={-12} cy={-27} r={5} fill="#fff" opacity={0.95} />
        <Circle cx={18} cy={-27} r={5} fill="#fff" opacity={0.95} />
        <Circle cx={-12} cy={-27} r={2} fill={Colors.accent} opacity={0.4} />
        <Circle cx={18} cy={-27} r={2} fill={Colors.accent} opacity={0.4} />
        {/* Red eye reflection */}
        <Circle cx={-15} cy={-21} r={2.5} fill={Colors.accent} opacity={0.5} />
        <Circle cx={15} cy={-21} r={2.5} fill={Colors.accent} opacity={0.5} />
        {/* Grin - confident smirk */}
        <Path d="M-10,0 Q-4,10 0,8 Q4,10 10,0" stroke="#000" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Path d="M-6,3 Q0,9 6,3" fill="#300" opacity={0.5} />
        {/* Antennae */}
        <Path d="M-10,-40 C-28,-66 -38,-82 -30,-94" stroke={Colors.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Circle cx={-30} cy={-96} r={5} fill={Colors.accentBright} />
        <Circle cx={-30} cy={-96} r={2} fill="#fff" opacity={0.5} />
        <Path d="M10,-40 C28,-66 38,-82 30,-94" stroke={Colors.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Circle cx={30} cy={-96} r={5} fill={Colors.accentBright} />
        <Circle cx={30} cy={-96} r={2} fill="#fff" opacity={0.5} />
        {/* Legs */}
        <Line x1={-26} y1={20} x2={-52} y2={40} stroke={Colors.accent} strokeWidth={3.5} strokeLinecap="round" />
        <Line x1={-23} y1={30} x2={-46} y2={52} stroke={Colors.accent} strokeWidth={3} strokeLinecap="round" />
        <Line x1={-19} y1={38} x2={-38} y2={58} stroke={Colors.accent} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={26} y1={20} x2={52} y2={40} stroke={Colors.accent} strokeWidth={3.5} strokeLinecap="round" />
        <Line x1={23} y1={30} x2={46} y2={52} stroke={Colors.accent} strokeWidth={3} strokeLinecap="round" />
        <Line x1={19} y1={38} x2={38} y2={58} stroke={Colors.accent} strokeWidth={2.5} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

// ─── Main Screen ───────────────────────────────────────
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Glass overlay opacity (visible → hidden on shatter)
  const glassOpacity = useRef(new Animated.Value(0)).current;

  // Lobster animations
  const lobsterScale = useRef(new Animated.Value(0.3)).current;
  const lobsterOpacity = useRef(new Animated.Value(0)).current;
  const lobsterFloat = useRef(new Animated.Value(0)).current;
  const lobsterRotate = useRef(new Animated.Value(-5)).current;

  // Lobster punch forward (z-axis feel via scale bump)
  const lobsterPunch = useRef(new Animated.Value(1)).current;

  // Text + UI
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(40)).current;
  const titleScale = useRef(new Animated.Value(0.8)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(20)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const footerY = useRef(new Animated.Value(30)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;

  // Red vignette glow
  const vignetteOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ── PHASE 1: Glass appears (0–400ms) ──
    Animated.parallel([
      Animated.timing(glassOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(lobsterOpacity, { toValue: 0.4, duration: 400, useNativeDriver: true }),
      Animated.timing(lobsterScale, { toValue: 0.7, duration: 400, useNativeDriver: true }),
    ]).start();

    // ── PHASE 2: Lobster approaches glass (400–1300ms) ──
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(lobsterOpacity, { toValue: 0.8, duration: 600, useNativeDriver: true }),
        Animated.spring(lobsterScale, { toValue: 0.95, tension: 40, friction: 8, useNativeDriver: true }),
        Animated.timing(lobsterRotate, { toValue: 3, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();

    // ── PHASE 3: SMASH! (1300ms) — lobster punches through ──
    Animated.sequence([
      Animated.delay(1300),
      Animated.parallel([
        // Lobster bursts to full size
        Animated.spring(lobsterScale, { toValue: 1.15, tension: 300, friction: 8, useNativeDriver: true }),
        Animated.timing(lobsterOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(lobsterRotate, { toValue: 0, duration: 200, useNativeDriver: true }),
        // Punch bump
        Animated.sequence([
          Animated.timing(lobsterPunch, { toValue: 1.2, duration: 100, useNativeDriver: true }),
          Animated.spring(lobsterPunch, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
        ]),
        // Glass shatters away
        Animated.timing(glassOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        // Red vignette flash
        Animated.sequence([
          Animated.timing(vignetteOpacity, { toValue: 0.4, duration: 100, useNativeDriver: true }),
          Animated.timing(vignetteOpacity, { toValue: 0.08, duration: 800, useNativeDriver: true }),
        ]),
      ]),
      // Settle to normal size
      Animated.spring(lobsterScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();

    // ── PHASE 4: Text reveals (1800ms+) ──
    Animated.sequence([
      Animated.delay(1800),
      Animated.stagger(150, [
        Animated.parallel([
          Animated.spring(titleScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
          Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(titleY, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(subtitleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(subtitleY, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(footerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(footerY, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    // ── Idle loops ──
    // Lobster float
    Animated.loop(
      Animated.sequence([
        Animated.timing(lobsterFloat, { toValue: -10, duration: 2200, useNativeDriver: true }),
        Animated.timing(lobsterFloat, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();

    // Status dot pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const lobsterSpin = lobsterRotate.interpolate({
    inputRange: [-10, 10],
    outputRange: ["-10deg", "10deg"],
  });

  // Generate shards radiating from center
  const shards = [
    { points: `${CX},${CY} ${CX - 80},${CY - 120} ${CX - 30},${CY - 140}`, tx: -120, ty: -180, rotate: -45, duration: 700 },
    { points: `${CX},${CY} ${CX + 30},${CY - 140} ${CX + 80},${CY - 120}`, tx: 120, ty: -180, rotate: 60, duration: 650 },
    { points: `${CX},${CY} ${CX + 100},${CY - 80} ${CX + 130},${CY - 20}`, tx: 200, ty: -60, rotate: 30, duration: 750 },
    { points: `${CX},${CY} ${CX + 120},${CY + 30} ${CX + 100},${CY + 90}`, tx: 180, ty: 120, rotate: -50, duration: 680 },
    { points: `${CX},${CY} ${CX + 50},${CY + 120} ${CX - 10},${CY + 140}`, tx: 40, ty: 200, rotate: 25, duration: 720 },
    { points: `${CX},${CY} ${CX - 60},${CY + 120} ${CX - 100},${CY + 70}`, tx: -80, ty: 180, rotate: -70, duration: 690 },
    { points: `${CX},${CY} ${CX - 130},${CY + 10} ${CX - 110},${CY - 60}`, tx: -200, ty: -40, rotate: 45, duration: 710 },
    { points: `${CX},${CY} ${CX - 100},${CY - 80} ${CX - 50},${CY - 130}`, tx: -150, ty: -160, rotate: -35, duration: 660 },
    // Inner smaller shards
    { points: `${CX},${CY} ${CX - 40},${CY - 60} ${CX + 10},${CY - 70}`, tx: -30, ty: -140, rotate: 80, duration: 600 },
    { points: `${CX},${CY} ${CX + 50},${CY - 40} ${CX + 60},${CY + 20}`, tx: 140, ty: 20, rotate: -40, duration: 620 },
    { points: `${CX},${CY} ${CX + 20},${CY + 60} ${CX - 30},${CY + 70}`, tx: 10, ty: 160, rotate: 55, duration: 640 },
    { points: `${CX},${CY} ${CX - 60},${CY + 30} ${CX - 50},${CY - 20}`, tx: -140, ty: 60, rotate: -65, duration: 630 },
  ];

  // Crack lines from impact
  const cracks = [
    { x1: CX, y1: CY, x2: CX - 100, y2: CY - 160, delay: 200 },
    { x1: CX, y1: CY, x2: CX + 110, y2: CY - 140, delay: 250 },
    { x1: CX, y1: CY, x2: CX + 140, y2: CY + 20, delay: 300 },
    { x1: CX, y1: CY, x2: CX + 80, y2: CY + 150, delay: 350 },
    { x1: CX, y1: CY, x2: CX - 40, y2: CY + 160, delay: 280 },
    { x1: CX, y1: CY, x2: CX - 130, y2: CY + 50, delay: 320 },
    { x1: CX, y1: CY, x2: CX - 120, y2: CY - 80, delay: 230 },
    // Branches
    { x1: CX - 50, y1: CY - 80, x2: CX - 90, y2: CY - 50, delay: 500 },
    { x1: CX + 55, y1: CY - 70, x2: CX + 100, y2: CY - 40, delay: 520 },
    { x1: CX + 70, y1: CY + 10, x2: CX + 110, y2: CY + 60, delay: 550 },
    { x1: CX - 65, y1: CY + 25, x2: CX - 110, y2: CY + 80, delay: 540 },
    { x1: CX + 40, y1: CY + 75, x2: CX + 70, y2: CY + 120, delay: 560 },
  ];

  // Sparks from impact
  const sparks = Array.from({ length: 20 }, (_, i) => ({
    angle: (i / 20) * Math.PI * 2 + Math.random() * 0.3,
    delay: Math.random() * 150,
  }));

  // Ambient embers
  const embers = [
    { x: width * 0.1, y: height * 0.3, delay: 2500 },
    { x: width * 0.8, y: height * 0.25, delay: 2800 },
    { x: width * 0.3, y: height * 0.55, delay: 3100 },
    { x: width * 0.9, y: height * 0.5, delay: 3400 },
    { x: width * 0.15, y: height * 0.65, delay: 2700 },
    { x: width * 0.6, y: height * 0.6, delay: 3000 },
    { x: width * 0.45, y: height * 0.75, delay: 3200 },
    { x: width * 0.05, y: height * 0.45, delay: 2600 },
    { x: width * 0.7, y: height * 0.4, delay: 2900 },
    { x: width * 0.5, y: height * 0.2, delay: 3300 },
  ];

  return (
    <View style={styles.container}>
      {/* Red vignette glow */}
      <Animated.View style={[styles.vignette, { opacity: vignetteOpacity }]} pointerEvents="none" />

      {/* Ambient red glow orbs */}
      <View style={[styles.glowOrb, { left: "10%", top: "20%" }]} />
      <View style={[styles.glowOrb, { right: "5%", top: "45%", width: 200, height: 200, borderRadius: 100 }]} />

      {/* Crack lines (appear before shatter) */}
      {cracks.map((c, i) => (
        <CrackLine key={`crack-${i}`} {...c} />
      ))}

      {/* Glass shards (fly out on shatter) */}
      {shards.map((s, i) => (
        <GlassShard key={`shard-${i}`} delay={100 + i * 30} {...s} />
      ))}

      {/* Impact flash */}
      <ImpactFlash />

      {/* Shockwave rings */}
      <ShockwaveRing delay={0} color={Colors.accent} />
      <ShockwaveRing delay={150} color="rgba(255,255,255,0.2)" />
      <ShockwaveRing delay={300} color={Colors.accentGlow} />

      {/* Sparks */}
      {sparks.map((s, i) => (
        <Spark key={`spark-${i}`} {...s} />
      ))}

      {/* Floating embers (after shatter, ambient loop) */}
      {embers.map((e, i) => (
        <Ember key={`ember-${i}`} {...e} />
      ))}

      {/* Glass overlay tint (frosted glass before shatter) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, {
          backgroundColor: "rgba(255,255,255,0.03)",
          opacity: glassOpacity,
        }]}
        pointerEvents="none"
      >
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Glass surface reflections */}
          <Rect x={0} y={0} width={width} height={height} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} rx={0} />
          <Line x1={0} y1={height * 0.15} x2={width} y2={height * 0.25} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
          <Line x1={0} y1={height * 0.6} x2={width} y2={height * 0.55} stroke="rgba(255,255,255,0.02)" strokeWidth={0.5} />
        </Svg>
      </Animated.View>

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <View style={styles.heroSection}>
          {/* Lobster */}
          <Animated.View
            style={{
              transform: [
                { scale: Animated.multiply(lobsterScale, lobsterPunch) },
                { translateY: lobsterFloat },
                { rotate: lobsterSpin },
              ],
              opacity: lobsterOpacity,
              marginBottom: 24,
            }}
          >
            <View style={styles.lobsterGlow}>
              <LobsterCharacter size={200} />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }, { scale: titleScale }] }}>
            <Text style={styles.title}>OpenClaw</Text>
            <Text style={styles.titleSub}>AI Agent Tools</Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.View
            style={[styles.subtitleRow, { opacity: subtitleOpacity, transform: [{ translateY: subtitleY }] }]}
          >
            <Animated.View style={[styles.statusDot, { transform: [{ scale: dotPulse }] }]} />
            <Text style={styles.subtitle}>Command center for your AI agents</Text>
          </Animated.View>
        </View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: footerOpacity, transform: [{ translateY: footerY }], paddingBottom: insets.bottom + 28 }]}>
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
  container: { flex: 1, backgroundColor: "#000" },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.accent,
  },
  glowOrb: {
    position: "absolute",
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(220,38,38,0.05)",
  },
  content: { flex: 1, justifyContent: "space-between" },
  heroSection: {
    flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32,
  },
  lobsterGlow: {
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 40,
      },
      default: {},
    }),
  },
  title: {
    fontSize: 46, fontWeight: "900", color: Colors.text,
    textAlign: "center", letterSpacing: -1.5,
  },
  titleSub: {
    fontSize: 18, fontWeight: "600", color: Colors.accent,
    textAlign: "center", marginTop: 4, letterSpacing: 2, textTransform: "uppercase",
  },
  subtitleRow: {
    flexDirection: "row", alignItems: "center", marginTop: 20, gap: 8,
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 10,
      },
      default: {},
    }),
  },
  subtitle: { fontSize: 15, color: Colors.textSecondary, fontWeight: "400" },
  footer: { alignItems: "center", paddingHorizontal: 28 },
  enterButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.accent, paddingVertical: 18, paddingHorizontal: 40,
    borderRadius: 16, width: "100%", marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  enterButtonText: { fontSize: 17, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },
  footerText: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.5 },
});
