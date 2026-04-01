import StatCard from "@/components/StatCard";
import { Color, Space } from "@/constants/design-tokens";
import React from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  avgPar3: number | null;
  avgPar4: number | null;
  avgPar5: number | null;
};

function formatAvg(val: number | null): string {
  if (val == null) return "\u2014";
  if (val === 0) return "E";
  return val > 0 ? `+${val}` : `${val}`;
}

function avgColor(val: number | null): string {
  if (val == null) return Color.neutral700;
  if (val < 0) return Color.primary;
  if (val > 0.5) return Color.danger;
  return Color.neutral700;
}

export default function ParPerformance({ avgPar3, avgPar4, avgPar5 }: Props) {
  return (
    <View style={styles.row}>
      <StatCard
        compact
        label="Par 3s"
        value={formatAvg(avgPar3)}
        valueColor={avgColor(avgPar3)}
      />
      <StatCard
        compact
        label="Par 4s"
        value={formatAvg(avgPar4)}
        valueColor={avgColor(avgPar4)}
      />
      <StatCard
        compact
        label="Par 5s"
        value={formatAvg(avgPar5)}
        valueColor={avgColor(avgPar5)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Space.md,
  },
});
