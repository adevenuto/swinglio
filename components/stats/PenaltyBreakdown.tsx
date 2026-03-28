import StatCard from "@/components/StatCard";
import { Color, Space } from "@/constants/design-tokens";
import React from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  penalties: { water: number; ob: number; unplayable: number } | null;
  bunkers: { greenside: number; fairway: number } | null;
  roundsCount: number;
};

export default function PenaltyBreakdownView({
  penalties,
  bunkers,
  roundsCount,
}: Props) {
  const perRound = (val: number) =>
    roundsCount > 0 ? (val / roundsCount).toFixed(1) : "0";

  return (
    <View style={styles.wrapper}>
      {penalties && (
        <View style={styles.row}>
          <StatCard
            compact
            label="Water"
            value={perRound(penalties.water)}
            subtitle="per round"
            valueColor={Color.info}
          />
          <StatCard
            compact
            label="OB"
            value={perRound(penalties.ob)}
            subtitle="per round"
            valueColor={Color.danger}
          />
        </View>
      )}
      {bunkers && (
        <View style={styles.row}>
          <StatCard
            compact
            label="Greenside"
            value={perRound(bunkers.greenside)}
            subtitle="bunkers/rd"
          />
          <StatCard
            compact
            label="Fairway"
            value={perRound(bunkers.fairway)}
            subtitle="bunkers/rd"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Space.md,
  },
  row: {
    flexDirection: "row",
    gap: Space.md,
  },
});
