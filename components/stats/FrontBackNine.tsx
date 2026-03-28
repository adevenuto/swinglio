import StatCard from "@/components/StatCard";
import { Color, Space } from "@/constants/design-tokens";
import React from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  avgFront9: number | null;
  avgBack9: number | null;
};

function formatAvg(val: number | null): string {
  if (val == null) return "\u2014";
  if (val === 0) return "E";
  return val > 0 ? `+${val}` : `${val}`;
}

function avgColor(val: number | null): string {
  if (val == null) return Color.neutral700;
  if (val < 0) return Color.primary;
  if (val > 2) return Color.danger;
  return Color.neutral700;
}

export default function FrontBackNine({ avgFront9, avgBack9 }: Props) {
  return (
    <View style={styles.row}>
      <StatCard
        compact
        label="Front 9"
        value={formatAvg(avgFront9)}
        valueColor={avgColor(avgFront9)}
        subtitle="vs par"
      />
      <StatCard
        compact
        label="Back 9"
        value={formatAvg(avgBack9)}
        valueColor={avgColor(avgBack9)}
        subtitle="vs par"
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
