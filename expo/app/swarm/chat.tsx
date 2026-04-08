import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  Alert, Platform, ActivityIndicator, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send, ArrowLeft, Trash2, ChevronDown } from "lucide-react-native";
import { useRouter } from "expo-router";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/providers/ThemeProvider";

const ROLE_EMOJI: Record<string, string> = {
  assistant: "🤖", researcher: "🔬", coder: "💻", writer: "✍️", analyst: "📊", custom: "⚙️",
};

export default function ChatScreen() {
  const { colors, theme } = useTheme();
  const isDark = theme.dark;
  const styles = createStylesStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);

  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const fetchAgents = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("swarm_agents")
      .select("id, name, role, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setAgents(data ?? []);
    if (!selectedAgent && data && data.length > 0) setSelectedAgent(data[0]);
  }, [user, selectedAgent]);

  useEffect(() => { void fetchAgents(); }, [fetchAgents]);

  const fetchMessages = useCallback(async () => {
    if (!selectedAgent) return;
    const { data } = await supabase.from("swarm_messages")
      .select("id, role, content, tokens_used, created_at")
      .eq("agent_id", selectedAgent.id)
      .eq("user_id", user?.id)
      .neq("role", "system")
      .order("created_at", { ascending: true })
      .limit(50);
    setMessages(data ?? []);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [selectedAgent, user]);

  useEffect(() => { void fetchMessages(); }, [fetchMessages]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedAgent || !user || sending) return;
    const msg = input.trim();
    setInput("");
    setSending(true);

    // Optimistically add user message
    setMessages(prev => [...prev, { id: "temp-user", role: "user", content: msg, created_at: new Date().toISOString() }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      // Get master key
      const { data: keyData } = await supabase.from("master_api_keys").select("key_value").eq("user_id", user.id).maybeSingle();
      if (!keyData) throw new Error("No master key found");

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/clawswarm-api`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${keyData.key_value}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "chat", params: { agent_id: selectedAgent.id, message: msg } }),
      });

      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "Chat failed");

      // Refresh messages from DB
      await fetchMessages();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send message");
      // Remove optimistic message
      setMessages(prev => prev.filter(m => m.id !== "temp-user"));
    } finally {
      setSending(false);
    }
  };

  const clearChat = () => {
    if (!selectedAgent) return;
    Alert.alert("Clear Chat", `Delete all messages with ${selectedAgent.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
        await supabase.from("swarm_messages").delete().eq("agent_id", selectedAgent.id).eq("user_id", user?.id);
        setMessages([]);
      }},
    ]);
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top + 12 }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.agentPicker} onPress={() => setShowPicker(!showPicker)}>
          <Text style={styles.agentPickerEmoji}>{selectedAgent ? (ROLE_EMOJI[selectedAgent.role] || "🤖") : "🤖"}</Text>
          <Text style={styles.agentPickerName} numberOfLines={1}>{selectedAgent?.name || "Select agent"}</Text>
          <ChevronDown size={14} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearBtn} onPress={clearChat}>
          <Trash2 size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Agent picker dropdown */}
      {showPicker && (
        <View style={styles.pickerDropdown}>
          {agents.map(a => (
            <TouchableOpacity key={a.id} style={[styles.pickerItem, selectedAgent?.id === a.id && styles.pickerItemActive]} onPress={() => { setSelectedAgent(a); setShowPicker(false); }}>
              <Text style={styles.pickerEmoji}>{ROLE_EMOJI[a.role] || "🤖"}</Text>
              <Text style={[styles.pickerName, selectedAgent?.id === a.id && styles.pickerNameActive]}>{a.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Messages */}
      <ScrollView ref={scrollRef} style={styles.messagesArea} contentContainerStyle={{ paddingVertical: 10, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {messages.length === 0 && selectedAgent && (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatEmoji}>{ROLE_EMOJI[selectedAgent.role] || "🤖"}</Text>
            <Text style={styles.emptyChatText}>Start chatting with {selectedAgent.name}</Text>
          </View>
        )}
        {messages.map((m, i) => (
          <View key={m.id || i} style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleAgent]}>
            {m.role !== "user" && <Text style={styles.bubbleLabel}>{selectedAgent?.name || "Agent"}</Text>}
            <Text style={[styles.bubbleText, m.role === "user" && styles.bubbleTextUser]} selectable>{m.content}</Text>
            {m.tokens_used > 0 && <Text style={styles.bubbleTokens}>{m.tokens_used} tokens</Text>}
          </View>
        ))}
        {sending && (
          <View style={[styles.bubble, styles.bubbleAgent]}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.textInput}
          placeholder={selectedAgent ? `Message ${selectedAgent.name}...` : "Select an agent first"}
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={4000}
          editable={!!selectedAgent && !sending}
        />
        <TouchableOpacity style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!input.trim() || sending}>
          <Send size={18} color={input.trim() && !sending ? "#fff" : colors.textMuted} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStylesStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.surfaceLight },
  agentPicker: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.surfaceLight },
  agentPickerEmoji: { fontSize: 18 },
  agentPickerName: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
  clearBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.surfaceLight },
  pickerDropdown: { backgroundColor: colors.surface, borderRadius: 12, padding: 6, marginBottom: 8, borderWidth: 1, borderColor: colors.surfaceLight },
  pickerItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 8 },
  pickerItemActive: { backgroundColor: colors.accentDim },
  pickerEmoji: { fontSize: 18 },
  pickerName: { fontSize: 14, color: colors.textSecondary },
  pickerNameActive: { color: colors.accent, fontWeight: "700" },
  messagesArea: { flex: 1 },
  emptyChat: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyChatEmoji: { fontSize: 48 },
  emptyChatText: { fontSize: 14, color: colors.textMuted },
  bubble: { maxWidth: "85%", borderRadius: 14, padding: 12, marginBottom: 8 },
  bubbleUser: { backgroundColor: colors.accent, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleAgent: { backgroundColor: colors.surface, alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.surfaceLight },
  bubbleLabel: { fontSize: 10, fontWeight: "700", color: colors.accent, marginBottom: 4 },
  bubbleText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  bubbleTextUser: { color: "#fff" },
  bubbleTokens: { fontSize: 10, color: colors.textMuted, marginTop: 4, alignSelf: "flex-end" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.surfaceLight },
  textInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, color: colors.text, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: colors.surfaceLight },
  sendBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceLight },
});
