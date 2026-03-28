import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

type HoleNavigationProps = {
  holeNumber: number;
  holeCount: number;
  onSave: () => void;
  onNavigate: (holeNumber: number) => void;
  onFinish?: () => void;
};

export default function HoleNavigation({
  holeNumber,
  holeCount,
  onSave,
  onNavigate,
  onFinish,
}: HoleNavigationProps) {
  const isLastHole = holeNumber >= holeCount;

  const handlePrev = () => {
    onSave();
    onNavigate(holeNumber - 1);
  };

  const handleNext = () => {
    onSave();
    if (isLastHole && onFinish) {
      onFinish();
    } else {
      onNavigate(holeNumber + 1);
    }
  };

  return (
    <View style={styles.navRow}>
      {!isLastHole && (
        <Button
          mode="outlined"
          onPress={handlePrev}
          disabled={holeNumber <= 1}
          icon="chevron-left"
          style={styles.prevButton}
          textColor={Color.neutral900}
          labelStyle={{ fontFamily: Font.medium }}
        >
          Prev
        </Button>
      )}
      <Pressable
        onPress={handleNext}
        disabled={isLastHole && !onFinish}
        style={({ pressed }) => [
          isLastHole ? styles.finishButton : styles.nextButton,
          (pressed || (isLastHole && !onFinish)) && { opacity: 0.7 },
        ]}
      >
        <LinearGradient
          colors={Color.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={isLastHole ? styles.finishGradient : styles.nextGradient}
        >
          <Feather
            name="flag"
            size={isLastHole ? 22 : 18}
            color={isLastHole ? Color.accent : Color.white}
            style={!isLastHole && { display: "none" }}
          />
          <Text style={[styles.nextLabel, isLastHole && styles.finishLabel]}>
            {isLastHole ? "Finish Round" : "Next Hole"}
          </Text>
          {!isLastHole && (
            <Feather name="chevron-right" size={18} color={Color.white} />
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  prevButton: {
    borderColor: Color.neutral300,
    borderRadius: Radius.lg,
    padding: 5,
    flex: 2,
  },
  nextButton: {
    flex: 3,
    borderRadius: Radius.lg,
    overflow: "hidden",
    ...Shadow.sm,
  },
  nextGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.sm,
    paddingVertical: Space.md + 5,
    borderRadius: Radius.lg,
  },
  nextLabel: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Color.white,
  },

  // Finish Round — full-width takeover
  finishButton: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Color.accent,
    overflow: "hidden",
    ...Shadow.lg,
  },
  finishGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.md,
    paddingVertical: Space.lg,
    borderRadius: Radius.lg - 2,
  },
  finishLabel: {
    fontSize: 17,
  },
});
