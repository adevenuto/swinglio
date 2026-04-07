import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { HoleAverage } from "@/hooks/use-course-history";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  holeAverages: HoleAverage[];
};

function formatAvgToPar(val: number): string {
  if (val === 0) return "E";
  return val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
}

export default function HoleAveragesChart({ holeAverages }: Props) {
  if (holeAverages.length === 0) return null;

  const maxAbs = Math.max(...holeAverages.map((h) => Math.abs(h.avgToPar)), 0.1);

  return (
    <View style={styles.container}>
      {holeAverages.map((hole) => {
        const isOver = hole.avgToPar > 0;
        const isUnder = hole.avgToPar < 0;
        const barPct = Math.max((Math.abs(hole.avgToPar) / maxAbs) * 50, 1);
        const color = isUnder
          ? Color.primary
          : isOver
            ? Color.danger
            : Color.neutral400;

        return (
          <View key={hole.holeKey} style={styles.row}>
            <Text style={styles.holeLabel}>{hole.holeNumber}</Text>
            <View style={styles.barContainer}>
              {/* Left half (under par) */}
              <View style={styles.barHalf}>
                {isUnder && (
                  <View
                    style={[
                      styles.barFill,
                      styles.barLeft,
                      { width: `${barPct}%`, backgroundColor: color },
                    ]}
                  />
                )}
              </View>
              {/* Center line */}
              <View style={styles.centerLine} />
              {/* Right half (over par) */}
              <View style={styles.barHalf}>
                {isOver && (
                  <View
                    style={[
                      styles.barFill,
                      styles.barRight,
                      { width: `${barPct}%`, backgroundColor: color },
                    ]}
                  />
                )}
              </View>
            </View>
            <Text style={[styles.valueText, { color }]}>
              {formatAvgToPar(hole.avgToPar)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    padding: Space.lg,
    gap: 6,
    borderWidth: 1,
    borderColor: Color.neutral200,
    ...Shadow.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  holeLabel: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Color.neutral700,
    width: 24,
    textAlign: "right",
  },
  barContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 14,
  },
  barHalf: {
    flex: 1,
    height: 14,
    justifyContent: "center",
  },
  barFill: {
    height: 14,
    borderRadius: 7,
  },
  barLeft: {
    alignSelf: "flex-end",
  },
  barRight: {
    alignSelf: "flex-start",
  },
  centerLine: {
    width: 1,
    height: 18,
    backgroundColor: Color.neutral300,
  },
  valueText: {
    fontFamily: Font.bold,
    fontSize: 13,
    width: 44,
    textAlign: "right",
  },
});
