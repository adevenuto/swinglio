import { Color, Font, Radius, Space } from "@/constants/design-tokens";
import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  visible: boolean;
  message: string;
  showComplete: boolean;
  showIncomplete: boolean;
  onComplete: () => void;
  onIncomplete: () => void;
  onWithdraw: () => void;
  onCancel: () => void;
};

export default function FinishRoundModal({
  visible,
  message,
  showComplete,
  showIncomplete,
  onComplete,
  onIncomplete,
  onWithdraw,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Finish Round</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          {showComplete && (
            <Pressable
              onPress={onComplete}
              style={({ pressed }) => [
                styles.button,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.buttonTextPrimary}>Mark as Complete</Text>
            </Pressable>
          )}

          {showIncomplete && (
            <Pressable
              onPress={onIncomplete}
              style={({ pressed }) => [
                styles.button,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.buttonTextPrimary}>Save as Incomplete</Text>
            </Pressable>
          )}

          <Pressable
            onPress={onWithdraw}
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.buttonTextDanger}>Withdraw (WD)</Text>
          </Pressable>

          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.button,
              styles.buttonLast,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.buttonTextCancel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: Space.xl,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.xl,
    paddingBottom: Space.lg,
    alignItems: "center",
  },
  title: {
    fontFamily: Font.bold,
    fontSize: 18,
    color: Color.neutral900,
    marginBottom: Space.xs,
  },
  message: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    textAlign: "center",
  },
  button: {
    borderTopWidth: 1,
    borderTopColor: Color.neutral200,
    paddingVertical: Space.lg,
    alignItems: "center",
  },
  buttonLast: {
    borderTopWidth: 1,
    borderTopColor: Color.neutral200,
  },
  buttonTextPrimary: {
    fontFamily: Font.semiBold,
    fontSize: 16,
    color: Color.primary,
  },
  buttonTextDanger: {
    fontFamily: Font.semiBold,
    fontSize: 16,
    color: Color.danger,
  },
  buttonTextCancel: {
    fontFamily: Font.semiBold,
    fontSize: 16,
    color: Color.info,
  },
});
