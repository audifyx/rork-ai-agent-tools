import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/providers/ThemeProvider";

export default function ModalScreen() {
  const { colors, theme } = useTheme();
  const isDark = theme.dark;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={() => router.back()}
    >
      <Pressable style={styles.overlay} onPress={() => router.back()}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? colors.surfaceSolid : "#FFFFFF", borderColor: colors.glassBorder, borderWidth: 1 }]}>
          <Text style={[styles.title, { color: colors.text }]}>Modal</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            This is an example modal with proper fade animation. You can edit it
            in app/modal.tsx.
          </Text>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.accent }]}
            onPress={() => router.back()}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Pressable>

      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: "center",
    minWidth: 300,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold" as const,
    marginBottom: 16,
  },
  description: {
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 100,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "600" as const,
    textAlign: "center",
  },
});
