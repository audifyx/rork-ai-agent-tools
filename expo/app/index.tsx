import React, { useEffect, useRef, useMemo, useState } from "react";
import {
  StyleSheet, Text, View, Animated, Dimensions, Platform, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import Svg, {
  G, Ellipse, Path, Circle, Line, Polygon, Defs, RadialGradient, Stop,
} from "react-native-svg";
import Colors from "@/constants/colors";

const { width, height } = Dimensions.get("window");
const CX = width / 2;
const CY = height * 0.40;

// ─── Intro Text Line ───────────────────────────────────
function IntroLine({ text, delay, style }: { text: string; delay: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  const exitOp = useRef(new Animated.Value(1)).current;
  const exitTy = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.delay(1800),
      Animated.parallel([
        Animated.timing(exitOp, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(exitTy, { toValue: -15, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  return (
    <Animated.Text style={[styles.introText, style, { opacity: Animated.multiply(opacity, exitOp), transform: [{ translateY: Animated.add(ty, exitTy) }] }]}>
      {text}
    </Animated.Text>
  );
}

// ─── Tool Icon Pill ────────────────────────────────────
function ToolPill({ emoji, label, delay, index }: { emoji: string; label: string; delay: number; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const exitOp = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;
  const exitTx = useRef(new Animated.Value(0)).current;
  const exitTy = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
      ]),
      Animated.delay(1400),
      // Fly toward center before glass shatter
      Animated.parallel([
        Animated.timing(exitOp, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(exitScale, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        Animated.timing(exitTx, { toValue: (CX - (width * 0.15 + (index % 3) * (width * 0.35))) * 0.5, duration: 400, useNativeDriver: true }),
        Animated.timing(exitTy, { toValue: (CY - (height * 0.35 + Math.floor(index / 3) * 60)) * 0.5, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  return (
    <Animated.View style={[styles.toolPill, { opacity: Animated.multiply(opacity, exitOp), transform: [{ scale: Animated.multiply(scale, exitScale) }, { translateX: exitTx }, { translateY: exitTy }] }]}>
      <Text style={styles.toolEmoji}>{emoji}</Text>
      <Text style={styles.toolLabel}>{label}</Text>
    </Animated.View>
  );
}

// ─── Glass Shard ───────────────────────────────────────
function GlassShard({ points, delay, tx, ty, rotate, duration, glint }: any) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, { toValue: glint ? 0.8 : 0.5, duration: 80, useNativeDriver: true }),
      Animated.delay(Math.max(0, 5200 - delay)),
      Animated.parallel([
        Animated.timing(translateX, { toValue: tx, duration, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: ty, duration, useNativeDriver: true }),
        Animated.timing(rot, { toValue: rotate, duration, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.1, duration, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: duration * 0.7, delay: duration * 0.3, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  const spin = rot.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View style={{ position: "absolute", left: 0, top: 0, transform: [{ translateX }, { translateY }, { rotate: spin }, { scale }], opacity }} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polygon points={points} fill={glint ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)"} stroke="rgba(255,255,255,0.18)" strokeWidth={0.5} />
      </Svg>
    </Animated.View>
  );
}

// ─── Crack Line ────────────────────────────────────────
function CrackLine({ x1, y1, x2, y2, delay }: any) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(4200 + delay),
      Animated.timing(opacity, { toValue: 0.5, duration: 40, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} />
      </Svg>
    </Animated.View>
  );
}

// ─── Impact Flash ──────────────────────────────────────
function ImpactFlash({ color, delay: d, maxScale }: { color: string; delay: number; maxScale: number }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(5200 + d),
      Animated.parallel([
        Animated.timing(opacity, { toValue: d === 0 ? 1 : 0.8, duration: 60, useNativeDriver: true }),
        Animated.spring(scale, { toValue: maxScale, tension: 250, friction: 8, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ position: "absolute", left: CX - 50, top: CY - 50, width: 100, height: 100, borderRadius: 50, backgroundColor: color, transform: [{ scale }], opacity }} pointerEvents="none" />;
}

// ─── Shockwave Ring ────────────────────────────────────
function ShockwaveRing({ delay, color, maxScale }: { delay: number; color: string; maxScale: number }) {
  const scale = useRef(new Animated.Value(0.1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(5200 + delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.6, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: maxScale, duration: 1000, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ position: "absolute", left: CX - 80, top: CY - 80, width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: color, transform: [{ scale }], opacity }} pointerEvents="none" />;
}

// ─── Spark Particle ────────────────────────────────────
function Spark({ angle, delay: d, fast }: { angle: number; delay: number; fast?: boolean }) {
  const dist = fast ? (120 + Math.random() * 200) : (60 + Math.random() * 140);
  const tx = Math.cos(angle) * dist;
  const ty = Math.sin(angle) * dist;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dur = fast ? (300 + Math.random() * 300) : (500 + Math.random() * 500);
  useEffect(() => {
    Animated.sequence([
      Animated.delay(5200 + d),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 40, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: tx, duration: dur, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: ty, duration: dur, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);
  const size = fast ? (1 + Math.random() * 2) : (2 + Math.random() * 4);
  const color = Math.random() > 0.3 ? "#fff" : Math.random() > 0.5 ? "rgba(255,255,255,0.6)" : Colors.accent;
  return <Animated.View style={{ position: "absolute", left: CX - size / 2, top: CY - size / 2, width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ translateX }, { translateY }], opacity }} pointerEvents="none" />;
}

// ─── Ember ─────────────────────────────────────────────
function Ember({ x, y, delay: d }: { x: number; y: number; delay: number }) {
  const ty = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = () => {
      ty.setValue(0); tx.setValue(0); op.setValue(0);
      Animated.sequence([
        Animated.delay(d),
        Animated.parallel([
          Animated.timing(ty, { toValue: -160, duration: 6000, useNativeDriver: true }),
          Animated.timing(tx, { toValue: (Math.random() - 0.5) * 40, duration: 6000, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(op, { toValue: 0.8, duration: 500, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0, duration: 5500, useNativeDriver: true }),
          ]),
        ]),
      ]).start(() => loop());
    };
    loop();
  }, []);
  const size = 2 + Math.random() * 2;
  return <Animated.View style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: Math.random() > 0.8 ? Colors.accent : "rgba(255,255,255,0.5)", transform: [{ translateY: ty }, { translateX: tx }], opacity: op }} />;
}

// ─── Screen Shake ──────────────────────────────────────
function ScreenShake({ children }: { children: React.ReactNode }) {
  const shakeX = useRef(new Animated.Value(0)).current;
  const shakeY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(5200),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shakeX, { toValue: 12, duration: 30, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -10, duration: 30, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 8, duration: 30, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -5, duration: 30, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 3, duration: 30, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(shakeY, { toValue: -10, duration: 30, useNativeDriver: true }),
          Animated.timing(shakeY, { toValue: 7, duration: 30, useNativeDriver: true }),
          Animated.timing(shakeY, { toValue: -4, duration: 30, useNativeDriver: true }),
          Animated.timing(shakeY, { toValue: 2, duration: 30, useNativeDriver: true }),
          Animated.timing(shakeY, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);
  return <Animated.View style={{ flex: 1, transform: [{ translateX: shakeX }, { translateY: shakeY }] }}>{children}</Animated.View>;
}

// ─── Lobster SVG ───────────────────────────────────────
function LobsterCharacter({ size = 200 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 200 220">
      <Defs>
        <RadialGradient id="bg" cx="50%" cy="45%" r="50%"><Stop offset="0%" stopColor={Colors.accentBright} stopOpacity={0.5} /><Stop offset="100%" stopColor={Colors.accent} stopOpacity={1} /></RadialGradient>
        <RadialGradient id="eg" cx="50%" cy="50%" r="50%"><Stop offset="0%" stopColor={Colors.accent} stopOpacity={0.6} /><Stop offset="100%" stopColor={Colors.accent} stopOpacity={0} /></RadialGradient>
      </Defs>
      <G transform="translate(100,115)">
        <Ellipse cx={0} cy={10} rx={34} ry={52} fill="url(#bg)" />
        <Path d="M-20,0 Q0,-5 20,0" stroke="rgba(0,0,0,0.15)" strokeWidth={1} fill="none" />
        <Path d="M-22,12 Q0,8 22,12" stroke="rgba(0,0,0,0.12)" strokeWidth={1} fill="none" />
        <Ellipse cx={0} cy={15} rx={18} ry={32} fill={Colors.accentBright} opacity={0.2} />
        <Path d="M-22,55 Q0,82 22,55 Q12,72 0,78 Q-12,72 -22,55Z" fill={Colors.accent} />
        <Path d="M-16,72 Q0,92 16,72 Q9,84 0,88 Q-9,84 -16,72Z" fill={Colors.accent} opacity={0.8} />
        <Path d="M-18,92 Q-28,108 -12,105 Q0,110 12,105 Q28,108 18,92 Q10,102 0,104 Q-10,102 -18,92Z" fill={Colors.accentBright} opacity={0.7} />
        <Path d="M-30,-10 C-58,-15 -72,-42 -62,-58 C-57,-63 -47,-60 -50,-50 C-52,-42 -44,-30 -30,-25Z" fill={Colors.accent} />
        <Path d="M-62,-58 C-78,-76 -92,-58 -75,-44 C-68,-37 -57,-47 -62,-58Z" fill={Colors.accentBright} />
        <Path d="M-62,-58 C-57,-78 -44,-70 -50,-54 C-54,-47 -60,-50 -62,-58Z" fill={Colors.accent} />
        <Path d="M30,-10 C58,-15 72,-42 62,-58 C57,-63 47,-60 50,-50 C52,-42 44,-30 30,-25Z" fill={Colors.accent} />
        <Path d="M62,-58 C78,-76 92,-58 75,-44 C68,-37 57,-47 62,-58Z" fill={Colors.accentBright} />
        <Path d="M62,-58 C57,-78 44,-70 50,-54 C54,-47 60,-50 62,-58Z" fill={Colors.accent} />
        <Circle cx={-15} cy={-24} r={18} fill="url(#eg)" />
        <Circle cx={15} cy={-24} r={18} fill="url(#eg)" />
        <Circle cx={-15} cy={-24} r={14} fill="#111" /><Circle cx={15} cy={-24} r={14} fill="#111" />
        <Circle cx={-15} cy={-24} r={11} fill="#1a1a1a" /><Circle cx={15} cy={-24} r={11} fill="#1a1a1a" />
        <Circle cx={-15} cy={-24} r={11} fill="none" stroke={Colors.accent} strokeWidth={0.8} opacity={0.4} />
        <Circle cx={15} cy={-24} r={11} fill="none" stroke={Colors.accent} strokeWidth={0.8} opacity={0.4} />
        <Circle cx={-12} cy={-27} r={5} fill="#fff" opacity={0.95} /><Circle cx={18} cy={-27} r={5} fill="#fff" opacity={0.95} />
        <Circle cx={-12} cy={-27} r={2} fill={Colors.accent} opacity={0.5} /><Circle cx={18} cy={-27} r={2} fill={Colors.accent} opacity={0.5} />
        <Circle cx={-15} cy={-21} r={3} fill={Colors.accent} opacity={0.6} /><Circle cx={15} cy={-21} r={3} fill={Colors.accent} opacity={0.6} />
        <Path d="M-10,0 Q-4,10 0,8 Q4,10 10,0" stroke="#000" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Path d="M-10,-40 C-28,-66 -38,-82 -30,-94" stroke={Colors.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Circle cx={-30} cy={-96} r={5} fill={Colors.accentBright} /><Circle cx={-30} cy={-96} r={2.5} fill="#fff" opacity={0.6} />
        <Path d="M10,-40 C28,-66 38,-82 30,-94" stroke={Colors.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Circle cx={30} cy={-96} r={5} fill={Colors.accentBright} /><Circle cx={30} cy={-96} r={2.5} fill="#fff" opacity={0.6} />
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

// ─── Animated Floating Grid Background ─────────────────
function AnimatedGrid() {
  const ty = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 2000, useNativeDriver: true }).start();
    Animated.loop(
      Animated.timing(ty, { toValue: -40, duration: 20000, useNativeDriver: true })
    ).start();
  }, []);
  // Generate grid dots
  const dots = useMemo(() => {
    const d: Array<{ x: number; y: number; r: number; bright: boolean }> = [];
    const cols = 12;
    const rows = 20;
    const spacingX = width / cols;
    const spacingY = (height + 80) / rows;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const jitterX = (Math.random() - 0.5) * 8;
        const jitterY = (Math.random() - 0.5) * 8;
        d.push({
          x: col * spacingX + spacingX / 2 + jitterX,
          y: row * spacingY + jitterY,
          r: Math.random() > 0.92 ? 1.5 : 0.8,
          bright: Math.random() > 0.95,
        });
      }
    }
    return d;
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, transform: [{ translateY: ty }] }]} pointerEvents="none">
      <Svg width={width} height={height + 80} viewBox={`0 0 ${width} ${height + 80}`}>
        {/* Subtle grid lines */}
        {Array.from({ length: 7 }, (_, i) => (
          <Line key={`vl${i}`} x1={width * (i + 1) / 8} y1={0} x2={width * (i + 1) / 8} y2={height + 80} stroke="rgba(255,255,255,0.018)" strokeWidth={0.5} />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <Line key={`hl${i}`} x1={0} y1={(height + 80) * (i + 1) / 13} x2={width} y2={(height + 80) * (i + 1) / 13} stroke="rgba(255,255,255,0.015)" strokeWidth={0.5} />
        ))}
        {/* Dots at intersections */}
        {dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.bright ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"} />
        ))}
      </Svg>
    </Animated.View>
  );
}

// ─── Main Screen ───────────────────────────────────────
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Phase tracking
  const [phase, setPhase] = useState(0);

  // Glass
  const glassOpacity = useRef(new Animated.Value(0)).current;
  // Lobster
  const lobsterScale = useRef(new Animated.Value(0.1)).current;
  const lobsterOpacity = useRef(new Animated.Value(0)).current;
  const lobsterFloat = useRef(new Animated.Value(0)).current;
  const lobsterRotate = useRef(new Animated.Value(-10)).current;
  const lobsterPunch = useRef(new Animated.Value(1)).current;
  // Brand
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(50)).current;
  const titleScale = useRef(new Animated.Value(0.7)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(20)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const footerY = useRef(new Animated.Value(40)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;
  // Effects
  const vignetteOpacity = useRef(new Animated.Value(0)).current;
  const bgPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Phase 1: Intro text (0-2.8s) — handled by IntroLine components
    setTimeout(() => setPhase(1), 100);

    // Phase 2: Tool pills (2.8s) — handled by ToolPill components
    setTimeout(() => setPhase(2), 2800);

    // Phase 3: Glass forms + lobster approaches (4.2s)
    setTimeout(() => {
      setPhase(3);
      Animated.parallel([
        Animated.timing(glassOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(lobsterOpacity, { toValue: 0.4, duration: 400, useNativeDriver: true }),
        Animated.timing(lobsterScale, { toValue: 0.6, duration: 400, useNativeDriver: true }),
      ]).start();
      // Lobster approaches
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(lobsterOpacity, { toValue: 0.8, duration: 500, useNativeDriver: true }),
          Animated.spring(lobsterScale, { toValue: 0.95, tension: 30, friction: 7, useNativeDriver: true }),
          Animated.timing(lobsterRotate, { toValue: 5, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();
    }, 4200);

    // Phase 4: SMASH (5.2s)
    setTimeout(() => {
      setPhase(4);
      Animated.parallel([
        Animated.spring(lobsterScale, { toValue: 1.25, tension: 400, friction: 5, useNativeDriver: true }),
        Animated.timing(lobsterOpacity, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(lobsterRotate, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(lobsterPunch, { toValue: 1.3, duration: 60, useNativeDriver: true }),
          Animated.spring(lobsterPunch, { toValue: 1, tension: 300, friction: 7, useNativeDriver: true }),
        ]),
        Animated.timing(glassOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(vignetteOpacity, { toValue: 0.25, duration: 60, useNativeDriver: true }),
          Animated.timing(vignetteOpacity, { toValue: 0.02, duration: 1200, useNativeDriver: true }),
        ]),
      ]).start();
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(lobsterScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();
    }, 5200);

    // Phase 5: Brand reveal (6s)
    setTimeout(() => {
      setPhase(5);
      Animated.stagger(200, [
        Animated.parallel([
          Animated.spring(titleScale, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
          Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(titleY, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(subtitleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(subtitleY, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(footerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(footerY, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]).start();
    }, 6000);

    // Idle loops
    Animated.loop(Animated.sequence([
      Animated.timing(lobsterFloat, { toValue: -12, duration: 2500, useNativeDriver: true }),
      Animated.timing(lobsterFloat, { toValue: 0, duration: 2500, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(bgPulse, { toValue: 0.012, duration: 3000, useNativeDriver: true }),
      Animated.timing(bgPulse, { toValue: 0, duration: 3000, useNativeDriver: true }),
    ])).start();
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(dotPulse, { toValue: 1.8, duration: 800, useNativeDriver: true }),
      Animated.timing(dotPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, []);

  const lobsterSpin = lobsterRotate.interpolate({ inputRange: [-10, 10], outputRange: ["-10deg", "10deg"] });

  const shards = useMemo(() => {
    const a: any[] = [];
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const r1 = 60 + Math.random() * 80, r2 = 80 + Math.random() * 100, a2 = ang + 0.3 + Math.random() * 0.4;
      a.push({ points: `${CX},${CY} ${CX + Math.cos(ang) * r1},${CY + Math.sin(ang) * r1} ${CX + Math.cos(a2) * r2},${CY + Math.sin(a2) * r2}`, tx: Math.cos(ang + 0.2) * (150 + Math.random() * 100), ty: Math.sin(ang + 0.2) * (150 + Math.random() * 100), rotate: (Math.random() - 0.5) * 180, duration: 600 + Math.random() * 300, glint: Math.random() > 0.6 });
    }
    return a;
  }, []);

  const cracks = useMemo(() => {
    const a: any[] = [];
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.3, len = 80 + Math.random() * 120;
      a.push({ x1: CX, y1: CY, x2: CX + Math.cos(ang) * len, y2: CY + Math.sin(ang) * len, delay: Math.random() * 400 });
      if (Math.random() > 0.4) {
        const mid = 0.4 + Math.random() * 0.3, bA = ang + (Math.random() - 0.5) * 1.2, bL = 30 + Math.random() * 60;
        a.push({ x1: CX + Math.cos(ang) * len * mid, y1: CY + Math.sin(ang) * len * mid, x2: CX + Math.cos(ang) * len * mid + Math.cos(bA) * bL, y2: CY + Math.sin(ang) * len * mid + Math.sin(bA) * bL, delay: 200 + Math.random() * 300 });
      }
    }
    return a;
  }, []);

  const sparks = useMemo(() => {
    const s: any[] = [];
    for (let i = 0; i < 30; i++) s.push({ angle: (i / 30) * Math.PI * 2 + Math.random() * 0.3, delay: Math.random() * 100, fast: false });
    for (let i = 0; i < 20; i++) s.push({ angle: Math.random() * Math.PI * 2, delay: 50 + Math.random() * 150, fast: true });
    return s;
  }, []);

  const embers = useMemo(() => Array.from({ length: 14 }, () => ({
    x: Math.random() * width, y: height * 0.2 + Math.random() * height * 0.6, delay: 5800 + Math.random() * 1500,
  })), []);

  const tools = [
    { emoji: "📁", label: "Files" }, { emoji: "🐦", label: "Tweeter" }, { emoji: "🔐", label: "Vault" },
    { emoji: "🌐", label: "Pages" }, { emoji: "🐝", label: "Swarm" }, { emoji: "📊", label: "Analytics" },
  ];

  return (
    <ScreenShake>
      <View style={styles.container}>
        {/* Animated grid background */}
        <AnimatedGrid />

        {/* Background effects — very subtle */}
        <Animated.View style={[styles.vignette, { opacity: bgPulse }]} pointerEvents="none" />
        <Animated.View style={[styles.vignette, { opacity: vignetteOpacity }]} pointerEvents="none" />
        <View style={[styles.glowOrb, { left: "5%", top: "15%", width: 300, height: 300, borderRadius: 150 }]} />
        <View style={[styles.glowOrb, { right: "0%", top: "40%", width: 250, height: 250, borderRadius: 125 }]} />

        {/* Phase 1: Intro text */}
        {phase >= 1 && phase < 4 && (
          <View style={styles.introContainer}>
            <IntroLine text="Your AI agents" delay={200} />
            <IntroLine text="need a command center." delay={800} style={styles.introTextAccent} />
            <IntroLine text="Files. Tweets. Secrets. Code." delay={1600} style={styles.introTextDim} />
            <IntroLine text="All in one place." delay={2200} style={styles.introTextBold} />
          </View>
        )}

        {/* Phase 2: Tool pills */}
        {phase >= 2 && phase < 4 && (
          <View style={styles.toolsGrid}>
            {tools.map((t, i) => (
              <ToolPill key={t.label} emoji={t.emoji} label={t.label} delay={2800 + i * 120} index={i} />
            ))}
          </View>
        )}

        {/* Phase 3+: Glass effects */}
        {phase >= 3 && cracks.map((c: any, i: number) => <CrackLine key={`c${i}`} {...c} />)}
        {phase >= 3 && shards.map((s: any, i: number) => <GlassShard key={`s${i}`} delay={4600 + i * 25} {...s} />)}

        {/* Phase 4: Impact */}
        {phase >= 4 && (
          <>
            <ImpactFlash color="#fff" delay={0} maxScale={4} />
            <ImpactFlash color={Colors.accent} delay={50} maxScale={5} />
            <ShockwaveRing delay={0} color="#fff" maxScale={3} />
            <ShockwaveRing delay={80} color={Colors.accent} maxScale={5} />
            <ShockwaveRing delay={200} color="rgba(255,255,255,0.15)" maxScale={6} />
            <ShockwaveRing delay={350} color={Colors.accentGlow} maxScale={7} />
            {sparks.map((s: any, i: number) => <Spark key={`sp${i}`} {...s} />)}
          </>
        )}

        {/* Embers (after shatter) */}
        {phase >= 4 && embers.map((e: any, i: number) => <Ember key={`e${i}`} {...e} />)}

        {/* Glass overlay */}
        {phase >= 3 && (
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.04)", opacity: glassOpacity }]} pointerEvents="none">
            <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
              <Line x1={0} y1={height * 0.12} x2={width} y2={height * 0.22} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
              <Line x1={0} y1={height * 0.55} x2={width} y2={height * 0.5} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
            </Svg>
          </Animated.View>
        )}

        {/* Lobster + Brand (Phase 3+) */}
        {phase >= 3 && (
          <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
            <View style={styles.heroSection}>
              <Animated.View style={{ transform: [{ scale: Animated.multiply(lobsterScale, lobsterPunch) }, { translateY: lobsterFloat }, { rotate: lobsterSpin }], opacity: lobsterOpacity, marginBottom: 28 }}>
                <View style={styles.lobsterGlow}><LobsterCharacter size={220} /></View>
              </Animated.View>

              {phase >= 5 && (
                <>
                  <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }, { scale: titleScale }] }}>
                    <Text style={styles.title}>OPENCLAW</Text>
                    <View style={styles.titleLine} />
                    <Text style={styles.titleSub}>AGENT TOOLS</Text>
                  </Animated.View>
                  <Animated.View style={[styles.subtitleRow, { opacity: subtitleOpacity, transform: [{ translateY: subtitleY }] }]}>
                    <Animated.View style={[styles.statusDot, { transform: [{ scale: dotPulse }] }]} />
                    <Text style={styles.subtitle}>Command center for your AI agents</Text>
                  </Animated.View>
                </>
              )}
            </View>

            {phase >= 5 && (
              <Animated.View style={[styles.footer, { opacity: footerOpacity, transform: [{ translateY: footerY }], paddingBottom: insets.bottom + 28 }]}>
                <TouchableOpacity style={styles.enterButton} onPress={() => router.replace("/(auth)/login")} activeOpacity={0.85}>
                  <Text style={styles.enterButtonText}>Get Started</Text>
                  <ArrowRight size={18} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.footerText}>Powered by OpenClaw OS v2.0</Text>
              </Animated.View>
            )}
          </View>
        )}
      </View>
    </ScreenShake>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.accent },
  glowOrb: { position: "absolute", backgroundColor: "rgba(220,38,38,0.015)" },
  // Intro text
  introContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, zIndex: 20 },
  introText: { fontSize: 28, fontWeight: "300", color: "rgba(255,255,255,0.8)", textAlign: "center", marginBottom: 12, letterSpacing: -0.5 },
  introTextAccent: { color: "rgba(220,38,38,0.8)", fontWeight: "600" },
  introTextDim: { fontSize: 20, color: "rgba(255,255,255,0.4)", fontWeight: "400", letterSpacing: 1 },
  introTextBold: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: -1 },
  // Tool pills
  toolsGrid: { position: "absolute", top: height * 0.32, left: 0, right: 0, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, paddingHorizontal: 30, zIndex: 15 },
  toolPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  toolEmoji: { fontSize: 16 },
  toolLabel: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  // Content
  content: { flex: 1, justifyContent: "space-between" },
  heroSection: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  lobsterGlow: {
    ...Platform.select({
      ios: { shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 30 },
      default: {},
    }),
  },
  title: { fontSize: 42, fontWeight: "900", color: Colors.text, textAlign: "center", letterSpacing: 12 },
  titleLine: {
    width: 60, height: 2, backgroundColor: Colors.accent, alignSelf: "center", marginVertical: 10, borderRadius: 1,
    ...Platform.select({ ios: { shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6 }, default: {} }),
  },
  titleSub: { fontSize: 16, fontWeight: "700", color: Colors.accent, textAlign: "center", letterSpacing: 6, textTransform: "uppercase" },
  subtitleRow: { flexDirection: "row", alignItems: "center", marginTop: 24, gap: 8 },
  statusDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent,
    ...Platform.select({ ios: { shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 }, default: {} }),
  },
  subtitle: { fontSize: 15, color: Colors.textSecondary, fontWeight: "400" },
  footer: { alignItems: "center", paddingHorizontal: 28 },
  enterButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.accent, paddingVertical: 18, paddingHorizontal: 40, borderRadius: 16, width: "100%", marginBottom: 16,
    ...Platform.select({ ios: { shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 15 }, android: { elevation: 6 }, default: {} }),
  },
  enterButtonText: { fontSize: 17, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },
  footerText: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.5 },
});
