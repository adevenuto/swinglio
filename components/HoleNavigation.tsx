import { Color, Radius, Shadow, Space } from "@/constants/design-tokens";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";

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
      <Button
        mode="outlined"
        onPress={handlePrev}
        disabled={holeNumber <= 1}
        icon="chevron-left"
        style={styles.prevButton}
        textColor={Color.neutral900}
      >
        Prev
      </Button>
      <Button
        mode="contained"
        onPress={handleNext}
        disabled={isLastHole && !onFinish}
        contentStyle={{ flexDirection: "row-reverse" }}
        icon={isLastHole ? "flag-checkered" : "chevron-right"}
        style={styles.nextButton}
        buttonColor={Color.primary}
        textColor={Color.white}
      >
        {isLastHole ? "Finish Round" : "Next Hole"}
      </Button>
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
    flex: 1,
  },
  nextButton: {
    borderRadius: Radius.lg,
    flex: 1,
    ...Shadow.sm,
  },
});
