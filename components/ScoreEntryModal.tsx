import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScoreEntryModalProps = {
  visible: boolean;
  onDismiss: () => void;
  onSave: (score: string) => void;
  holeNumber: number;
  par: string;
  yardage: string;
  playerName: string;
  currentScore: string;
};

const SCORES = ["1", "2", "3", "4", "5"];

export default function ScoreEntryModal({
  visible,
  onDismiss,
  onSave,
  holeNumber,
  par,
  yardage,
  playerName,
  currentScore,
}: ScoreEntryModalProps) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(currentScore);

  useEffect(() => {
    if (visible) setValue(currentScore);
  }, [visible, currentScore]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 20) + 20 },
          ]}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.holeInfo}>
              Hole {holeNumber} · Par {par} · {yardage} yd
            </Text>
            <Text style={styles.playerName}>{playerName}</Text>
          </View>

          {/* Score buttons */}
          <View style={styles.scoreRow}>
            {SCORES.map((n) => {
              const selected = value === n;
              return (
                <Pressable
                  key={n}
                  style={[
                    styles.scoreButton,
                    selected && styles.scoreButtonSelected,
                  ]}
                  onPress={() => setValue(n)}
                >
                  <Text
                    style={[
                      styles.scoreButtonText,
                      selected && styles.scoreButtonTextSelected,
                    ]}
                  >
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button mode="outlined" onPress={() => onSave("")}>
              Clear
            </Button>
            <Button mode="outlined" onPress={() => onSave(value)}>
              Save
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  holeInfo: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  playerName: {
    fontSize: 14,
    color: "#555",
    marginTop: 2,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
  },
  scoreButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#d4d4d4",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreButtonSelected: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  scoreButtonText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  scoreButtonTextSelected: {
    color: "#fff",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
