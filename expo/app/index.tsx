import React, { useEffect, useRef, useMemo } from "react";
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
const CY = height * 0.36;

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
      Animated.delay(1400 - delay),
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

function CrackLine({ x1, y1, x2, y2, delay }: any) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, { toValue: 0.5, duration: 40, useNativeDriver: true }),
      Animated.delay(1600 - delay),
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

function ImpactFlash() {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(1300),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 4, tension: 250, friction: 8, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ position: "absolute", left: CX - 50, top: CY - 50, width: 100, height: 100, borderRadius: 50, backgroundColor: "#fff", transform: [{ scale }], opacity }} pointerEvents="none" />;
}

function RedFlash() {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(1350),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.8, duration: 80, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 5, tension: 200, friction: 10, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ position: "absolute", left: CX - 60, top: CY - 60, width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.accent, transform: [{ scale }], opacity }} pointerEvents="none" />;
}

function ShockwaveRing({ delay, color, maxScale }: { delay: number; color: string; maxScale?: number }) {
  const scale = useRef(new Animated.Value(0.1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(1300 + delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.6, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: maxScale || 4, duration: 1000, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ position: "absolute", left: CX - 80, top: CY - 80, width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: color, transform: [{ scale }], opacity }} pointerEvents="none" />;
}

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
      Animated.delay(1300 + d),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 40, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: tx, duration: dur, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: ty, duration: dur, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);
  const size = fast ? (1 + Math.random() * 2) : (2 + Math.random() * 4);
  const color = Math.random() > 0.6 ? "#fff" : Math.random() > 0.3 ? Colors.accent : Colors.accentBright;
  return <Animated.View style={{ position: "absolute", left: CX - size / 2, top: CY - size / 2, width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ translateX }, { translateY }], opacity }} pointerEvents="none" />;
}

function Ember({ x, y, delay: d }: { x: number; y: number; delay: number }) {
  const ty = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = () => {
      ty.setValue(0); tx.setValue(0); op.setValue(0);
      const drift = (Math.random() - 0.5) * 40;
      Animated.sequence([
        Animated.delay(d),
        Animated.parallel([
          Animated.timing(ty, { toValue: -160, duration: 6000, useNativeDriver: true }),
          Animated.timing(tx, { toValue: drift, duration: 6000, useNativeDriver: true }),
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
  return <Animated.View style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: Math.random() > 0.5 ? Colors.accent : Colors.accentBright, transform: [{ translateY: ty }, { translateX: tx }], opacity: op }} />;
}

function ScreenShake({ children }: { children: React.ReactNode }) {
  const shakeX = useRef(new Animated.Value(0)).current;
  const shakeY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(1300),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shakeX, { toValue: 10, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -8, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 6, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -4, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 2, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(shakeY, { toValue: -8, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeY, { toValue: 5, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeY, { toValue: -3, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeY, { toValue: 2, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeY, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);
  return <Animated.View style={{ flex: 1, transform: [{ translateX: shakeX }, { translateY: shakeY }] }}>{children}</Animated.View>;
}

function LobsterCharacter({ size = 200 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 200 220">
      <Defs>
        <RadialGradient id="bodyGrad" cx="50%" cy="45%" r="50%">
          <Stop offset="0%" stopColor={Colors.accentBright} stopOpacity={0.5} />
          <Stop offset="100%" stopColor={Colors.accent} stopOpacity={1} />
        </RadialGradient>
        <RadialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={Colors.accent} stopOpacity={0.6} />
          <Stop offset="100%" stopColor={Colors.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <G transform="translate(100,115)">
        <Ellipse cx={0} cy={10} rx={34} ry={52} fill="url(#bodyGrad)" />
        <Path d="M-20,0 Q0,-5 20,0" stroke="rgba(0,0,0,0.15)" strokeWidth={1} fill="none" />
        <Path d="M-22,12 Q0,8 22,12" stroke="rgba(0,0,0,0.12)" strokeWidth={1} fill="none" />
        <Path d="M-20,24 Q0,20 20,24" stroke="rgba(0,0,0,0.1)" strokeWidth={1} fill="none" />
        <Ellipse cx={0} cy={15} rx={18} ry={32} fill={Colors.accentBright} opacity={0.2} />
        <Path d="M-22,55 Q0,82 22,55 Q12,72 0,78 Q-12,72 -22,55Z" fill={Colors.accent} />
        <Path d="M-16,72 Q0,92 16,72 Q9,84 0,88 Q-9,84 -16,72Z" fill={Colors.accent} opacity={0.8} />
        <Path d="M-13,84 Q0,100 13,84 Q7,94 0,97 Q-7,94 -13,84Z" fill={Colors.accent} opacity={0.6} />
        <Path d="M-18,92 Q-28,108 -12,105 Q0,110 12,105 Q28,108 18,92 Q10,102 0,104 Q-10,102 -18,92Z" fill={Colors.accentBright} opacity={0.7} />
        <Path d="M-30,-10 C-58,-15 -72,-42 -62,-58 C-57,-63 -47,-60 -50,-50 C-52,-42 -44,-30 -30,-25Z" fill={Colors.accent} />
        <Path d="M-62,-58 C-78,-76 -92,-58 -75,-44 C-68,-37 -57,-47 -62,-58Z" fill={Colors.accentBright} />
        <Path d="M-62,-58 C-57,-78 -44,-70 -50,-54 C-54,-47 -60,-50 -62,-58Z" fill={Colors.accent} />
        <Circle cx={-72} cy={-52} r={1.5} fill="#000" opacity={0.3} />
        <Circle cx={-66} cy={-48} r={1.5} fill="#000" opacity={0.3} />
        <Path d="M30,-10 C58,-15 72,-42 62,-58 C57,-63 47,-60 50,-50 C52,-42 44,-30 30,-25Z" fill={Colors.accent} />
        <Path d="M62,-58 C78,-76 92,-58 75,-44 C68,-37 57,-47 62,-58Z" fill={Colors.accentBright} />
        <Path d="M62,-58 C57,-78 44,-70 50,-54 C54,-47 60,-50 62,-58Z" fill={Colors.accent} />
        <Circle cx={72} cy={-52} r={1.5} fill="#000" opacity={0.3} />
        <Circle cx={66} cy={-48} r={1.5} fill="#000" opacity={0.3} />
        <Circle cx={-15} cy={-24} r={18} fill="url(#eyeGlow)" />
        <Circle cx={15} cy={-24} r={18} fill="url(#eyeGlow)" />
        <Circle cx={-15} cy={-24} r={14} fill="#111" />
        <Circle cx={15} cy={-24} r={14} fill="#111" />
        <Circle cx={-15} cy={-24} r={11} fill="#1a1a1a" />
        <Circle cx={15} cy={-24} r={11} fill="#1a1a1a" />
        <Circle cx={-15} cy={-24} r={11} fill="none" stroke={Colors.accent} strokeWidth={0.8} opacity={0.4} />
        <Circle cx={15} cy={-24} r={11} fill="none" stroke={Colors.accent} strokeWidth={0.8} opacity={0.4} />
        <Circle cx={-12} cy={-27} r={5} fill="#fff" opacity={0.95} />
        <Circle cx={18} cy={-27} r={5} fill="#fff" opacity={0.95} />
        <Circle cx={-12} cy={-27} r={2} fill={Colors.accent} opacity={0.5} />
        <Circle cx={18} cy={-27} r={2} fill={Colors.accent} opacity={0.5} />
        <Circle cx={-15} cy={-21} r={3} fill={Colors.accent} opacity={0.6} />
        <Circle cx={15} cy={-21} r={3} fill={Colors.accent} opacity={0.6} />
        <Path d="M-10,0 Q-4,10 0,8 Q4,10 10,0" stroke="#000" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Path d="M-6,3 Q0,9 6,3" fill="#300" opacity={0.5} />
        <Path d="M-10,-40 C-28,-66 -38,-82 -30,-94" stroke={Colors.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Circle cx={-30} cy={-96} r={5} fill={Colors.accentBright} />
        <Circle cx={-30} cy={-96} r={2.5} fill="#fff" opacity={0.6} />
        <Path d="M10,-40 C28,-66 38,-82 30,-94" stroke={Colors.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Circle cx={30} cy={-96} r={5} fill={Colors.accentBright} />
        <Circle cx={30} cy={-96} r={2.5} fill="#fff" opacity={0.6} />
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

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const glassOpacity = useRef(new Animated.Value(0)).current;
  const lobsterScale = useRef(new Animated.Value(0.2)).current;
  const lobsterOpacity = useRef(new Animated.Value(0)).current;
  const lobsterFloat = useRef(new Animated.Value(0)).current;
  const lobsterRotate = useRef(new Animated.Value(-8)).current;
  const lobsterPunch = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(50)).current;
  const titleScale = useRef(new Animated.Value(0.7)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(20)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const footerY = useRef(new Animated.Value(40)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;
  const vignetteOpacity = useRef(new Animated.Value(0)).current;
  const bgPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(glassOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(lobsterOpacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      Animated.timing(lobsterScale, { toValue: 0.6, duration: 400, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(lobsterOpacity, { toValue: 0.7, duration: 500, useNativeDriver: true }),
        Animated.spring(lobsterScale, { toValue: 0.9, tension: 30, friction: 7, useNativeDriver: true }),
        Animated.timing(lobsterRotate, { toValue: 5, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
    Animated.sequence([
      Animated.delay(1300),
      Animated.parallel([
        Animated.spring(lobsterScale, { toValue: 1.2, tension: 350, friction: 6, useNativeDriver: true }),
        Animated.timing(lobsterOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(lobsterRotate, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(lobsterPunch, { toValue: 1.25, duration: 80, useNativeDriver: true }),
          Animated.spring(lobsterPunch, { toValue: 1, tension: 250, friction: 8, useNativeDriver: true }),
        ]),
        Animated.timing(glassOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(vignetteOpacity, { toValue: 0.5, duration: 80, useNativeDriver: true }),
          Animated.timing(vignetteOpacity, { toValue: 0.06, duration: 1000, useNativeDriver: true }),
        ]),
      ]),
      Animated.spring(lobsterScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(1800),
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
      ]),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(lobsterFloat, { toValue: -12, duration: 2500, useNativeDriver: true }),
      Animated.timing(lobsterFloat, { toValue: 0, duration: 2500, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(bgPulse, { toValue: 0.04, duration: 3000, useNativeDriver: true }),
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
    const base: any[] = [];
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const r1 = 60 + Math.random() * 80;
      const r2 = 80 + Math.random() * 100;
      const a2 = angle + 0.3 + Math.random() * 0.4;
      base.push({
        points: `${CX},${CY} ${CX + Math.cos(angle) * r1},${CY + Math.sin(angle) * r1} ${CX + Math.cos(a2) * r2},${CY + Math.sin(a2) * r2}`,
        tx: Math.cos(angle + 0.2) * (150 + Math.random() * 100),
        ty: Math.sin(angle + 0.2) * (150 + Math.random() * 100),
        rotate: (Math.random() - 0.5) * 180,
        duration: 600 + Math.random() * 300,
        glint: Math.random() > 0.6,
      });
    }
    return base;
  }, []);

  const cracks = useMemo(() => {
    const base: any[] = [];
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const len = 80 + Math.random() * 120;
      base.push({ x1: CX, y1: CY, x2: CX + Math.cos(angle) * len, y2: CY + Math.sin(angle) * len, delay: 200 + Math.random() * 400 });
      if (Math.random() > 0.4) {
        const mid = 0.4 + Math.random() * 0.3;
        const bAngle = angle + (Math.random() - 0.5) * 1.2;
        const bLen = 30 + Math.random() * 60;
        base.push({ x1: CX + Math.cos(angle) * len * mid, y1: CY + Math.sin(angle) * len * mid, x2: CX + Math.cos(angle) * len * mid + Math.cos(bAngle) * bLen, y2: CY + Math.sin(angle) * len * mid + Math.sin(bAngle) * bLen, delay: 400 + Math.random() * 300 });
      }
    }
    return base;
  }, []);

  const sparks = useMemo(() => {
    const s: any[] = [];
    for (let i = 0; i < 30; i++) s.push({ angle: (i / 30) * Math.PI * 2 + Math.random() * 0.3, delay: Math.random() * 100, fast: false });
    for (let i = 0; i < 20; i++) s.push({ angle: Math.random() * Math.PI * 2, delay: 50 + Math.random() * 150, fast: true });
    return s;
  }, []);

  const embers = useMemo(() => Array.from({ length: 16 }, () => ({
    x: Math.random() * width, y: height * 0.2 + Math.random() * height * 0.6, delay: 2200 + Math.random() * 1500,
  })), []);

  return (
    <ScreenShake>
      <View style={styles.container}>
        <Animated.View style={[styles.vignette, { opacity: bgPulse }]} pointerEvents="none" />
        <Animated.View style={[styles.vignette, { opacity: vignetteOpacity }]} pointerEvents="none" />
        <View style={[styles.glowOrb, { left: "5%", top: "15%", width: 300, height: 300, borderRadius: 150 }]} />
        <View style={[styles.glowOrb, { right: "0%", top: "40%", width: 250, height: 250, borderRadius: 125 }]} />
        <View style={[styles.glowOrb, { left: "30%", bottom: "10%", width: 200, height: 200, borderRadius: 100 }]} />
        {cracks.map((c: any, i: number) => <CrackLine key={`c${i}`} {...c} />)}
        {shards.map((s: any, i: number) => <GlassShard key={`s${i}`} delay={80 + i * 25} {...s} />)}
        <ImpactFlash />
        <RedFlash />
        <ShockwaveRing delay={0} color="#fff" maxScale={3} />
        <ShockwaveRing delay={80} color={Colors.accent} maxScale={5} />
        <ShockwaveRing delay={200} color="rgba(255,255,255,0.15)" maxScale={6} />
        <ShockwaveRing delay={350} color={Colors.accentGlow} maxScale={7} />
        {sparks.map((s: any, i: number) => <Spark key={`sp${i}`} {...s} />)}
        {embers.map((e: any, i: number) => <Ember key={`e${i}`} {...e} />)}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.04)", opacity: glassOpacity }]} pointerEvents="none">
          <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <Line x1={0} y1={height * 0.12} x2={width} y2={height * 0.22} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
            <Line x1={0} y1={height * 0.55} x2={width} y2={height * 0.5} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
            <Line x1={width * 0.3} y1={0} x2={width * 0.35} y2={height} stroke="rgba(255,255,255,0.02)" strokeWidth={0.5} />
          </Svg>
        </Animated.View>
        <View style={[styles.content, { paddingTop: insets.top + 30 }]}>
          <View style={styles.heroSection}>
            <Animated.View style={{ transform: [{ scale: Animated.multiply(lobsterScale, lobsterPunch) }, { translateY: lobsterFloat }, { rotate: lobsterSpin }], opacity: lobsterOpacity, marginBottom: 28 }}>
              <View style={styles.lobsterGlow}><LobsterCharacter size={220} /></View>
            </Animated.View>
            <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }, { scale: titleScale }] }}>
              <Text style={styles.title}>OPENCLAW</Text>
              <View style={styles.titleLine} />
              <Text style={styles.titleSub}>AGENT TOOLS</Text>
            </Animated.View>
            <Animated.View style={[styles.subtitleRow, { opacity: subtitleOpacity, transform: [{ translateY: subtitleY }] }]}>
              <Animated.View style={[styles.statusDot, { transform: [{ scale: dotPulse }] }]} />
              <Text style={styles.subtitle}>Command center for your AI agents</Text>
            </Animated.View>
          </View>
          <Animated.View style={[styles.footer, { opacity: footerOpacity, transform: [{ translateY: footerY }], paddingBottom: insets.bottom + 28 }]}>
            <TouchableOpacity style={styles.enterButton} onPress={() => router.replace("/(auth)/login")} activeOpacity={0.85}>
              <Text style={styles.enterButtonText}>Get Started</Text>
              <ArrowRight size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.footerText}>Powered by OpenClaw OS v2.0</Text>
          </Animated.View>
        </View>
      </View>
    </ScreenShake>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.accent },
  glowOrb: { position: "absolute", backgroundColor: "rgba(220,38,38,0.04)" },
  content: { flex: 1, justifyContent: "space-between" },
  heroSection: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  lobsterGlow: {
    ...Platform.select({
      ios: { shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 50 },
      default: {},
    }),
  },
  title: { fontSize: 42, fontWeight: "900", color: Colors.text, textAlign: "center", letterSpacing: 12 },
  titleLine: {
    width: 60, height: 2, backgroundColor: Colors.accent, alignSelf: "center", marginVertical: 10, borderRadius: 1,
    ...Platform.select({
      ios: { shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10 },
      default: {},
    }),
  },
  titleSub: { fontSize: 16, fontWeight: "700", color: Colors.accent, textAlign: "center", letterSpacing: 6, textTransform: "uppercase" },
  subtitleRow: { flexDirection: "row", alignItems: "center", marginTop: 24, gap: 8 },
  statusDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent,
    ...Platform.select({
      ios: { shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12 },
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
      ios: { shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 25 },
      android: { elevation: 10 },
      default: {},
    }),
  },
  enterButtonText: { fontSize: 17, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },
  footerText: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.5 },
});
