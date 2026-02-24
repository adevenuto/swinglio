import React from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";

type HoleNavigationProps = {
  holeNumber: number;
  holeCount: number;
  onSave: () => void;
  onNavigate: (holeNumber: number) => void;
};

export default function HoleNavigation({
  holeNumber,
  holeCount,
  onSave,
  onNavigate,
}: HoleNavigationProps) {
  const handlePrev = () => {
    onSave();
    onNavigate(holeNumber - 1);
  };

  const handleNext = () => {
    onSave();
    onNavigate(holeNumber + 1);
  };

  return (
    <View style={styles.navRow}>
      <Button
        mode="outlined"
        onPress={handlePrev}
        disabled={holeNumber <= 1}
        icon="chevron-left"
        style={styles.navButton}
      >
        Prev
      </Button>
      <Button
        mode="outlined"
        onPress={handleNext}
        disabled={holeNumber >= holeCount}
        contentStyle={{ flexDirection: "row-reverse" }}
        icon="chevron-right"
        style={styles.navButton}
      >
        Next
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navButton: {
    borderColor: "#d4d4d4",
  },
});
