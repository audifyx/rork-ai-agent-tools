import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Animated, Dimensions, PanResponder, StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

const { height } = Dimensions.get("window");

function Clock() {
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
      <Text style={cl.clockTime}>{hours}:{mins}</Text>
      <Text style={cl.clockDate}>{day}</Text>
    </View>
  );
}

const cl = StyleSheet.create({
  clockContainer: { alignItems: "center" },
  clockTime: { fontSize: 80, fontWeight: "200", color: "#fff", letterSpacing: -4, lineHeight: 86 },
  clockDate: { fontSize: 18, color: "rgba(255,255,255,0.8)", fontWeight: "400", marginTop: 4 },
});

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuthStore();

  // Lock screen state
  const [locked, setLocked] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Swipe animation
  const swipeY = useRef(new Animated.Value(0)).current;
  const lockOpacity = useRef(new Animated.Value(1)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formY = useRef(new Animated.Value(60)).current;
  const hintPulse = useRef(new Animated.Value(1)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Arrow bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: -12, duration: 800, useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Hint pulse
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

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" />

      {/* Background — deep black with subtle glow */}
      <View style={StyleSheet.absoluteFill}>
        <View style={st.bgGlow1} />
        <View style={st.bgGlow2} />
        <View style={st.bgGrid} />
      </View>

      {/* ── LOCK SCREEN ── */}
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
            {/* Lobster icon */}
            <View style={st.lockIconWrap}>
              <Text style={st.lockEmoji}>🦞</Text>
              <View style={st.lockIconRing} />
            </View>

            {/* Clock */}
            <Clock />

            {/* Notification pills */}
            <View style={st.notifArea}>
              <View style={st.notifPill}>
                <Text style={st.notifIcon}>🤖</Text>
                <View>
                  <Text style={st.notifTitle}>OpenClaw OS</Text>
                  <Text style={st.notifBody}>Your agents are ready</Text>
                </View>
              </View>
              <View style={st.notifPill}>
                <Text style={st.notifIcon}>⚡</Text>
                <View>
                  <Text style={st.notifTitle}>ClawSwarm</Text>
                  <Text style={st.notifBody}>3 sub-agents active</Text>
                </View>
              </View>
            </View>

            {/* Swipe hint */}
            <View style={[st.swipeHintArea, { paddingBottom: insets.bottom + 16 }]}>
              <Animated.View style={{ transform: [{ translateY: arrowAnim }], opacity: hintPulse }}>
                <Text style={st.swipeArrow}>↑</Text>
              </Animated.View>
              <Animated.Text style={[st.swipeHint, { opacity: hintPulse }]}>
                {Platform.OS === "web" ? "Tap to unlock" : "Swipe up to unlock"}
              </Animated.Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── LOGIN FORM ── */}
      {showForm && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Animated.View style={[st.formScreen, { paddingTop: insets.top + 20, opacity: formOpacity, transform: [{ translateY: formY }] }]}>
            {/* Header */}
            <View style={st.formHeader}>
              <View style={st.formIconWrap}>
                <Text style={{ fontSize: 40 }}>🦞</Text>
              </View>
              <Text style={st.formTitle}>OpenClaw OS</Text>
              <Text style={st.formSubtitle}>{isSignUp ? "Create your account" : "Enter your passcode"}</Text>
            </View>

            {/* Inputs */}
            <View style={st.inputsWrap}>
              <View style={st.inputRow}>
                <Text style={st.inputIcon}>📧</Text>
                <TextInput
                  style={st.input}
                  placeholder="Email address"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoFocus
                />
              </View>
              <View style={st.inputRow}>
                <Text style={st.inputIcon}>🔐</Text>
                <TextInput
                  style={st.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[st.submitBtn, loading && { opacity: 0.6 }]}
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
                <Text style={st.switchText}>
                  {isSignUp ? "Already have an account? " : "Don't have an account? "}
                  <Text style={{ color: Colors.accent, fontWeight: "700" }}>
                    {isSignUp ? "Sign In" : "Sign Up"}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  // Backgrounds
  bgGlow1: { position: "absolute", top: -100, left: -100, width: 400, height: 400, borderRadius: 200, backgroundColor: "rgba(220,38,38,0.08)" },
  bgGlow2: { position: "absolute", bottom: 0, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(220,38,38,0.05)" },
  bgGrid: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.03 },

  // Lock screen
  lockScreen: { flex: 1, alignItems: "center", justifyContent: "space-between" },
  lockIconWrap: { alignItems: "center", justifyContent: "center", position: "relative" },
  lockEmoji: { fontSize: 52, zIndex: 1 },
  lockIconRing: { position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: "rgba(220,38,38,0.3)" },

  // Notifs
  notifArea: { width: "100%", paddingHorizontal: 20, gap: 10 },
  notifPill: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  notifIcon: { fontSize: 22 },
  notifTitle: { fontSize: 13, fontWeight: "700", color: "#fff" },
  notifBody: { fontSize: 12, color: "rgba(255,255,255,0.6)" },

  // Swipe hint
  swipeHintArea: { alignItems: "center", gap: 8 },
  swipeArrow: { fontSize: 24, color: "rgba(255,255,255,0.6)" },
  swipeHint: { fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: "500", letterSpacing: 0.5 },

  // Form
  formScreen: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  formHeader: { alignItems: "center", marginBottom: 48 },
  formIconWrap: { width: 80, height: 80, borderRadius: 22, backgroundColor: "rgba(220,38,38,0.15)", borderWidth: 1, borderColor: "rgba(220,38,38,0.3)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  formTitle: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  formSubtitle: { fontSize: 15, color: "rgba(255,255,255,0.5)", marginTop: 6 },

  inputsWrap: { gap: 12 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  inputIcon: { fontSize: 18 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: "#fff" },

  submitBtn: {
    backgroundColor: Colors.accent, borderRadius: 16, paddingVertical: 18,
    alignItems: "center", marginTop: 8,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16,
    elevation: 8,
  },
  submitBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },

  switchBtn: { alignItems: "center", marginTop: 12 },
  switchText: { fontSize: 14, color: "rgba(255,255,255,0.5)" },
});
