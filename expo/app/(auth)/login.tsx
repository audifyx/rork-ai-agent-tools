import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Animated, Dimensions, PanResponder, StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";
import ColorfulBackground from "@/components/ColorfulBackground";
import GlassCard from "@/components/GlassCard";

const { height } = Dimensions.get("window");

function Clock() {
  const { colors } = useTheme();
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hours = time.getHours().toString().padStart(2, "0");
  const mins = time.getMinutes().toString().padStart(2, "0");
  const day = time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <View style={cl.clockContainer}>
      <Text style={[cl.clockTime, { color: colors.text }]}>{hours}:{mins}</Text>
      <Text style={[cl.clockDate, { color: colors.textSecondary }]}>{day}</Text>
    </View>
  );
}

const cl = StyleSheet.create({
  clockContainer: { alignItems: "center" },
  clockTime: { fontSize: 76, fontWeight: "200" as const, letterSpacing: -4, lineHeight: 82 },
  clockDate: { fontSize: 17, fontWeight: "400" as const, marginTop: 4 },
});

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuthStore();
  const { colors, theme } = useTheme();
  const isDark = theme.dark;

  const [locked, setLocked] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const swipeY = useRef(new Animated.Value(0)).current;
  const lockOpacity = useRef(new Animated.Value(1)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formY = useRef(new Animated.Value(60)).current;
  const hintPulse = useRef(new Animated.Value(1)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: -12, duration: 800, useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(hintPulse, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
        Animated.timing(hintPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [arrowAnim, hintPulse]);

  const unlock = useCallback(() => {
    Animated.parallel([
      Animated.timing(lockOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(swipeY, { toValue: -height, duration: 500, useNativeDriver: true }),
    ]).start(() => {
      setLocked(false);
      setShowForm(true);
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(formY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    });
  }, [lockOpacity, swipeY, formOpacity, formY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10 && g.dy < 0,
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) swipeY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -80) {
          unlock();
        } else {
          Animated.spring(swipeY, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleSubmit = async () => {
    if (!email || !password) return Alert.alert("Error", "Please fill in all fields");
    setLoading(true);
    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
    setLoading(false);
    if (error) Alert.alert("Error", error);
    else if (isSignUp) Alert.alert("Check your email", "We sent you a confirmation link.");
  };

  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";

  return (
    <View style={[st.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme.statusBar} />
      <ColorfulBackground variant="login" />

      {locked && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: lockOpacity, transform: [{ translateY: swipeY }] }]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={Platform.OS === "web" ? unlock : undefined}
            style={[st.lockScreen, { paddingTop: insets.top + 40 }]}
          >
            <View style={st.lockIconWrap}>
              <Text style={st.lockEmoji}>🦞</Text>
              <View style={[st.lockIconRing, { borderColor: isDark ? "rgba(212,160,23,0.3)" : "rgba(99,102,241,0.3)" }]} />
            </View>

            <Clock />

            <View style={st.notifArea}>
              <GlassCard style={st.notifPill}>
                <Text style={st.notifIcon}>🤖</Text>
                <View>
                  <Text style={[st.notifTitle, { color: colors.text }]}>OpenClaw OS</Text>
                  <Text style={[st.notifBody, { color: colors.textSecondary }]}>Your agents are ready</Text>
                </View>
              </GlassCard>
              <GlassCard style={st.notifPill}>
                <Text style={st.notifIcon}>⚡</Text>
                <View>
                  <Text style={[st.notifTitle, { color: colors.text }]}>ClawSwarm</Text>
                  <Text style={[st.notifBody, { color: colors.textSecondary }]}>3 sub-agents active</Text>
                </View>
              </GlassCard>
            </View>

            <View style={[st.swipeHintArea, { paddingBottom: insets.bottom + 16 }]}>
              <Animated.View style={{ transform: [{ translateY: arrowAnim }], opacity: hintPulse }}>
                <Text style={[st.swipeArrow, { color: colors.textMuted }]}>↑</Text>
              </Animated.View>
              <Animated.Text style={[st.swipeHint, { color: colors.textMuted, opacity: hintPulse }]}>
                {Platform.OS === "web" ? "Tap to unlock" : "Swipe up to unlock"}
              </Animated.Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {showForm && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Animated.View style={[st.formScreen, { paddingTop: insets.top + 20, opacity: formOpacity, transform: [{ translateY: formY }] }]}>
            <View style={st.formHeader}>
              <View style={[st.formIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)" }]}>
                <Text style={{ fontSize: 40 }}>🦞</Text>
              </View>
              <Text style={[st.formTitle, { color: colors.text }]}>OpenClaw OS</Text>
              <Text style={[st.formSubtitle, { color: colors.textSecondary }]}>{isSignUp ? "Create your account" : "Enter your passcode"}</Text>
            </View>

            <GlassCard style={st.formCard} strong>
              <View style={st.inputsWrap}>
                <View style={[st.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                  <Text style={st.inputIcon}>📧</Text>
                  <TextInput
                    style={[st.input, { color: colors.text }]}
                    placeholder="Email address"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoFocus
                  />
                </View>
                <View style={[st.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                  <Text style={st.inputIcon}>🔐</Text>
                  <TextInput
                    style={[st.input, { color: colors.text }]}
                    placeholder="Password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={[st.submitBtn, { backgroundColor: colors.accent, shadowColor: colors.accent }, loading && { opacity: 0.6 }]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={st.submitBtnText}>{isSignUp ? "Create Account" : "Sign In"}</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={st.switchBtn}>
                  <Text style={[st.switchText, { color: colors.textSecondary }]}>
                    {isSignUp ? "Already have an account? " : "Don't have an account? "}
                    <Text style={{ color: colors.accent, fontWeight: "700" as const }}>
                      {isSignUp ? "Sign In" : "Sign Up"}
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },

  lockScreen: { flex: 1, alignItems: "center", justifyContent: "space-between" },
  lockIconWrap: { alignItems: "center", justifyContent: "center", position: "relative" },
  lockEmoji: { fontSize: 52, zIndex: 1 },
  lockIconRing: { position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 1.5 },

  notifArea: { width: "100%", paddingHorizontal: 20, gap: 10 },
  notifPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  notifIcon: { fontSize: 22 },
  notifTitle: { fontSize: 13, fontWeight: "700" as const },
  notifBody: { fontSize: 12 },

  swipeHintArea: { alignItems: "center", gap: 8 },
  swipeArrow: { fontSize: 24 },
  swipeHint: { fontSize: 14, fontWeight: "500" as const, letterSpacing: 0.5 },

  formScreen: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  formHeader: { alignItems: "center", marginBottom: 36 },
  formIconWrap: { width: 80, height: 80, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  formTitle: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5 },
  formSubtitle: { fontSize: 15, marginTop: 6 },

  formCard: { padding: 24, borderRadius: 28 },
  inputsWrap: { gap: 12 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1 },
  inputIcon: { fontSize: 18 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16 },

  submitBtn: {
    borderRadius: 16, paddingVertical: 18,
    alignItems: "center", marginTop: 8,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 16,
    elevation: 8,
  },
  submitBtnText: { fontSize: 17, fontWeight: "700" as const, color: "#fff" },

  switchBtn: { alignItems: "center", marginTop: 12 },
  switchText: { fontSize: 14 },
});
