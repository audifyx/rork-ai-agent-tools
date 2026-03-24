import React, { useState } from "react";
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Zap } from "lucide-react-native";
import { useAuthStore } from "@/stores/authStore";
import Colors from "@/constants/colors";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return Alert.alert("Error", "Please fill in all fields");
    setLoading(true);
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    setLoading(false);
    if (error) Alert.alert("Error", error);
    else if (isSignUp) Alert.alert("Success", "Check your email for confirmation");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 60 }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.hero}>
        <View style={styles.iconBox}>
          <Zap size={28} color={Colors.accent} strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>AI Agent Tools</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? "Create your account" : "Sign in to continue"}
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? "Sign Up" : "Sign In"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          style={styles.switchBtn}
        >
          <Text style={styles.switchText}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <Text style={styles.switchTextAccent}>
              {isSignUp ? "Sign In" : "Sign Up"}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: "center",
    marginBottom: 48,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: Colors.accentGlow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: "700",
  },
  switchBtn: {
    alignItems: "center",
    marginTop: 16,
  },
  switchText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  switchTextAccent: {
    color: Colors.accent,
    fontWeight: "600",
  },
});
