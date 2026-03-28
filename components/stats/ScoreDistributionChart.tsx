import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { ScoreCategory } from "@/hooks/use-detailed-stats";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  distribution: Record<ScoreCategory, number>;
};

const CATEGORIES: { key: ScoreCategory; label: string; color: string }[] = [
  { key: "eagle", label: "Eagle+", color: "#F59E0B" },
  { key: "birdie", label: "Birdie", color: Color.primary },
  { key: "par", label: "Par", color: "#6BB87B" },
  { key: "bogey", label: "Bogey", color: Color.neutral400 },
  { key: "doublePlus", label: "Dbl+", color: Color.danger },
];

export default function ScoreDistributionChart({ distribution }: Props) {
  const maxPct = Math.max(...Object.values(distribution), 1);

  return (
    <View style={styles.container}>
      {CATEGORIES.map(({ key, label, color }) => {
        const pct = distribution[key];
        const barWidth = maxPct > 0 ? (pct / maxPct) * 100 : 0;
        return (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: pct > 0 ? `${Math.max(barWidth, 2)}%` : 0, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={styles.pctText}>{pct}%</Text>
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
    gap: Space.md,
    borderWidth: 1,
    borderColor: Color.neutral200,
    ...Shadow.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  label: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Color.neutral700,
    width: 48,
  },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: Color.neutral100,
    borderRadius: 7,
    overflow: "hidden",
  },
  barFill: {
    height: 14,
    borderRadius: 7,
  },
  pctText: {
    fontFamily: Font.bold,
    fontSize: 13,
    color: Color.neutral900,
    width: 44,
    textAlign: "right",
  },
});
