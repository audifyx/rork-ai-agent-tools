import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Animated,
  Dimensions,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Zap, ArrowRight } from "lucide-react-native";
import Colors from "@/constants/colors";

const { width } = Dimensions.get("window");

function AnimatedRing({ delay, size }: { delay: number; size: number }) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const animate = () => {
      scale.setValue(0.4);
      opacity.setValue(0.6);
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.8,
          duration: 3000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 3000,
          delay,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    animate();
  }, [delay, scale, opacity]);

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

function FloatingParticle({
  startX,
  startY,
  particleDelay,
}: {
  startX: number;
  startY: number;
  particleDelay: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const particleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(0);
      particleOpacity.setValue(0);
      Animated.sequence([
        Animated.delay(particleDelay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -80,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(particleOpacity, {
              toValue: 0.7,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(particleOpacity, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => animate());
    };
    animate();
  }, [particleDelay, translateY, particleOpacity]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          top: startY,
          transform: [{ translateY }],
          opacity: particleOpacity,
        },
      ]}
    />
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(15)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(150, [
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslateY, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(subtitleOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(subtitleTranslateY, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, {
          toValue: 1.4,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(dotPulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [
    titleOpacity,
    titleTranslateY,
    subtitleOpacity,
    subtitleTranslateY,
    iconScale,
    iconOpacity,
    footerOpacity,
    dotPulse,
  ]);

  const particles = [
    { x: width * 0.15, y: 300, delay: 0 },
    { x: width * 0.7, y: 250, delay: 800 },
    { x: width * 0.4, y: 400, delay: 1600 },
    { x: width * 0.85, y: 350, delay: 2400 },
    { x: width * 0.25, y: 500, delay: 600 },
    { x: width * 0.6, y: 450, delay: 1200 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.particleLayer}>
        {particles.map((p, i) => (
          <FloatingParticle
            key={i}
            startX={p.x}
            startY={p.y}
            particleDelay={p.delay}
          />
        ))}
      </View>

      <View style={styles.ringsContainer}>
        <AnimatedRing delay={0} size={180} />
        <AnimatedRing delay={1000} size={180} />
        <AnimatedRing delay={2000} size={180} />
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <View style={styles.heroSection}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: iconScale }],
                opacity: iconOpacity,
              },
            ]}
          >
            <View style={styles.iconInner}>
              <Zap size={32} color={Colors.accent} strokeWidth={2.5} />
            </View>
          </Animated.View>

          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }}
          >
            <Text style={styles.welcomeLabel}>Welcome to</Text>
            <Text style={styles.title}>AI Agent Tools</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.subtitleRow,
              {
                opacity: subtitleOpacity,
                transform: [{ translateY: subtitleTranslateY }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.statusDot,
                { transform: [{ scale: dotPulse }] },
              ]}
            />
            <Text style={styles.subtitle}>Your intelligent assistant</Text>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.footer,
            { opacity: footerOpacity, paddingBottom: insets.bottom + 32 },
          ]}
        >
          <TouchableOpacity
            style={styles.enterButton}
            onPress={() => router.replace("/(auth)/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.enterButtonText}>Get Started</Text>
            <ArrowRight size={18} color={Colors.background} />
          </TouchableOpacity>
          <Text style={styles.footerText}>
            Powered by advanced AI agents
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  particleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: "absolute" as const,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  ringsContainer: {
    position: "absolute" as const,
    top: "35%" as unknown as number,
    left: 0,
    right: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ring: {
    position: "absolute" as const,
    borderWidth: 1,
    borderColor: Colors.accentGlow,
  },
  content: {
    flex: 1,
    justifyContent: "space-between" as const,
  },
  heroSection: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 36,
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: Colors.accentGlow,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  welcomeLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginBottom: 8,
    fontWeight: "300" as const,
  },
  title: {
    fontSize: 38,
    fontWeight: "700" as const,
    color: Colors.text,
    textAlign: "center" as const,
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 20,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      },
      default: {},
    }),
  },
  subtitle: {
    fontSize: 17,
    color: Colors.textSecondary,
    fontWeight: "400" as const,
  },
  footer: {
    alignItems: "center" as const,
    paddingHorizontal: 32,
  },
  enterButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: Colors.accent,
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: "100%" as any,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  enterButtonText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.background,
    letterSpacing: 0.3,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});
